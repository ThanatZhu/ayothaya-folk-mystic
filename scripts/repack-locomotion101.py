"""Extract intact connected sprites into clean cells without repainting or resizing."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO.parent.parent if REPO.parent.name == "work" else REPO.parent
RAW = ROOT / "outputs/animation-life101/locomotion"
THRESHOLD = 115  # Same visible-pixel threshold as import-locomotion101.py.


def components(mask):
    """Eight-connected scanline components, using only NumPy and the stdlib."""
    parents, runs, previous = [], [], []

    def root(label):
        while parents[label] != label:
            parents[label] = parents[parents[label]]
            label = parents[label]
        return label

    for y, row in enumerate(mask):
        edges = np.flatnonzero(np.diff(np.r_[False, row, False]))
        current = []
        for x0, x1 in edges.reshape(-1, 2):
            x0, x1 = int(x0), int(x1)
            matches = [label for a, b, label in previous if a <= x1 and b >= x0]
            label = len(parents)
            parents.append(label)
            for other in matches:
                parents[root(other)] = root(label)
            runs.append((y, x0, x1, label))
            current.append((x0, x1, label))
        previous = current
    result = {}
    for y, x0, x1, label in runs:
        label = root(label)
        item = result.setdefault(label, {"area": 0, "box": [x0, y, x1, y + 1], "runs": []})
        item["area"] += x1 - x0
        b = item["box"]
        b[:] = [min(b[0], x0), min(b[1], y), max(b[2], x1), max(b[3], y + 1)]
        item["runs"].append((y, x0, x1))
    return sorted(result.values(), key=lambda c: c["area"], reverse=True)


def gap(a, b):
    return math.hypot(max(a[0] - b[2], b[0] - a[2], 0),
                      max(a[1] - b[3], b[1] - a[3], 0))


def extract(image, grid, expected=4):
    rgba = np.array(image.convert("RGBA"))
    parts = components(rgba[:, :, 3] >= THRESHOLD)
    if len(parts) < expected:
        raise ValueError(f"only {len(parts)} connected objects for {expected} characters")
    major = parts[:expected]
    if major[-1]["area"] < 1000:
        raise ValueError("a character component is unexpectedly small")
    if len(parts) > expected and parts[expected]["area"] > major[-1]["area"] * .15:
        raise ValueError("extra substantial component; inspect detached gear or touching sprites")
    cols, rows = grid
    major.sort(key=lambda p: (p["box"][1] + p["box"][3]) / 2)
    ordered = []
    for row in range(rows):
        ordered.extend(sorted(major[row * cols:(row + 1) * cols],
                              key=lambda p: (p["box"][0] + p["box"][2]) / 2))
    # Include tiny detached outlines within four source pixels of their character.
    omitted = []
    for part in parts[expected:]:
        nearest = min(ordered, key=lambda p: gap(part["box"], p["box"]))
        if gap(part["box"], nearest["box"]) <= 4:
            nearest["runs"].extend(part["runs"])
            nearest["area"] += part["area"]
            a, b = nearest["box"], part["box"]
            a[:] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
        else:
            omitted.append({"area": part["area"], "box": part["box"]})
    if sum(p["area"] for p in omitted) > sum(p["area"] for p in ordered) * .001:
        raise ValueError("too many detached visible pixels; manual review required")
    cutouts = []
    for part in ordered:
        x0, y0, x1, y1 = part["box"]
        pixels = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
        for y, start, end in part["runs"]:
            pixels[y - y0, start - x0:end - x0] = rgba[y, start:end]
        cutouts.append(Image.fromarray(pixels))
    return cutouts, ordered, omitted


def repack(metadata, dry_run=False):
    item = json.loads(metadata.read_text(encoding="utf-8-sig"))
    if not isinstance(item, dict) or item.get("action") not in ("walk", "run"):
        return None
    if item.get("calibration"):
        raise ValueError(f"{metadata.name}: calibration exists; recalculate it after repacking")
    png = metadata.with_suffix(".png")
    raw = png.with_name(png.stem + "-raw.png")
    original = raw if raw.exists() else png
    image = Image.open(original).convert("RGBA")
    grid = item.get("grid", [4, 1] if image.width / image.height > 2 else [2, 2])
    cutouts, parts, omitted = extract(image, grid, len(item["actors"]))
    cell_w = math.ceil((max(im.width for im in cutouts) + 48) / 8) * 8
    cell_h = math.ceil((max(im.height for im in cutouts) + 48) / 8) * 8
    output = Image.new("RGBA", (cell_w * grid[0], cell_h * grid[1]))
    cells = {}
    for i, (actor, cutout) in enumerate(zip(item["actors"], cutouts)):
        x, y = i % grid[0] * cell_w, i // grid[0] * cell_h
        # Integer translation only: every kept RGBA pixel is byte-for-byte original.
        output.paste(cutout, (x + (cell_w - cutout.width) // 2, y + cell_h - 24 - cutout.height))
        cells[actor] = [x, y, cell_w, cell_h]
    provenance = {
        "method": "connected-alpha-extraction-and-integer-translation",
        "raw": str(raw.relative_to(ROOT)).replace("\\", "/"),
        "rawSha256": hashlib.sha256(original.read_bytes()).hexdigest(),
        "alphaThreshold": THRESHOLD,
        "rawDimensions": list(image.size),
        "packedDimensions": list(output.size),
        "actorBounds": {actor: part["box"] for actor, part in zip(item["actors"], parts)},
        "visiblePixelCounts": {actor: part["area"] for actor, part in zip(item["actors"], parts)},
        "omittedDetachedPixels": omitted,
        "artChanges": "none; no repaint, scaling, warping, mirroring, or body-part movement",
    }
    if not dry_run:
        if not raw.exists():
            shutil.copy2(png, raw)
        record = metadata.with_name(metadata.stem + "-raw.record")
        if not record.exists():
            shutil.copy2(metadata, record)
        output.save(png)
        item.update({"grid": grid, "cells": cells, "repack": provenance})
        metadata.write_text(json.dumps(item, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"file": metadata.name, "sprites": len(parts), "size": list(output.size),
            "omittedPixels": sum(p["area"] for p in omitted)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("groups", nargs="+")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    for group in args.groups:
        for metadata in sorted(RAW.glob(f"{group}-*.json")):
            result = repack(metadata, args.dry_run)
            if result:
                print(json.dumps(result))

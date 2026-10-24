"""Read source alpha and write atlas metadata; never resample or edit PNG pixels."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "assets/monsters-chapter2"


def bounds(mask):
    yy, xx = np.nonzero(mask)
    if not len(xx):
        raise ValueError("Empty sprite region")
    return [int(xx.min()), int(yy.min()), int(xx.max()-xx.min()+1), int(yy.max()-yy.min()+1)]


def gap(profile, center, radius):
    lo, hi = max(1, int(center-radius)), min(len(profile)-1, int(center+radius))
    indexes = np.arange(lo, hi)
    # Pick the nearest empty separator, tolerating generated sheets with uneven spacing.
    empty = indexes[profile[lo:hi] == 0]
    if len(empty):
        return int(empty[np.argmin(abs(empty-center))])
    raise ValueError(f"No transparent separator near {center}: source needs review")


def components(mask):
    """Run-length connected components, retaining alpha masks as metadata only."""
    parents, runs, previous = [], [], []

    def root(n):
        while parents[n] != n:
            parents[n] = parents[parents[n]]
            n = parents[n]
        return n

    for y, row in enumerate(mask):
        edges = np.flatnonzero(np.diff(np.r_[False, row, False].astype(np.int8)))
        current = []
        cursor = 0
        for x0, x1 in zip(edges[::2], edges[1::2]):
            n = len(parents)
            parents.append(n)
            while cursor < len(previous) and previous[cursor][1] < x0:
                cursor += 1
            j = cursor
            while j < len(previous) and previous[j][0] <= x1:
                parents[root(previous[j][2])] = root(n)
                j += 1
            current.append((int(x0), int(x1), n))
            runs.append((y, int(x0), int(x1), n))
        previous = current
    groups = {}
    for y, x0, x1, n in runs:
        groups.setdefault(root(n), []).append((y, x0, x1))
    major = sorted(groups.values(), key=lambda rs: sum(b-a for _, a, b in rs), reverse=True)[:8]
    assert len(major) == 8, "Expected eight separate creature silhouettes"
    # Row order comes from torso centers; downed poses remain in the second row.
    major.sort(key=lambda rs: (min(y for y, _, _ in rs)+max(y for y, _, _ in rs))/2)
    ordered = []
    for row in (major[:4], major[4:]):
        row.sort(key=lambda rs: (min(a for _, a, _ in rs)+max(b for _, _, b in rs))/2)
        ordered.extend(row)
    return ordered


def main():
    manifest = json.loads((ART / "designs.json").read_text(encoding="utf-8-sig"))
    specs = json.loads((ART / "production-prompts-v2.json").read_text(encoding="utf-8-sig"))
    heights = {m["id"]: m["height"] for m in specs["idles"]}
    report = []
    names = ["idle", "move-a", "move-b", "windup", "strike", "hurt", "recover", "down"]
    for map_ in manifest["maps"]:
        for monster in map_["monsters"]:
            id_ = monster["id"]
            source = f"{id_}-idle-v1.png"
            image = Image.open(ART / source).convert("RGBA")
            alpha = np.asarray(image)[:, :, 3]
            assert (alpha == 0).mean() > .15, f"{id_}: missing transparent background"
            monster.update(art=source, sourceSize=list(image.size), contentRect=bounds(alpha >= 8),
                           height=heights.get(id_, monster.get("height")), gameReady=False,
                           stage="animation-review", animation=f"animations/{id_}.json")
            sheet = f"{id_}-poses-v1.png"
            atlas_image = Image.open(ART / "animations" / sheet).convert("RGBA")
            pixels = np.asarray(atlas_image)
            mask = pixels[:, :, 3] >= 8
            height, width = mask.shape
            frames, hashes, edge_pixels = [], [], []
            for index, rs in enumerate(components(mask)):
                x, y = min(a for _, a, _ in rs), min(yy for yy, _, _ in rs)
                w, h = max(b for _, _, b in rs)-x, max(yy for yy, _, _ in rs)-y+1
                assert w > 40 and h > 40
                area = sum(b-a for _, a, b in rs)
                assert area > 4000, f"{id_}: merged or missing pose"
                # Clip metadata separates wings/tails even where generated cell bounding boxes overlap.
                clip = [[yy-y, a-x, b-a] for yy, a, b in rs]
                frames.append({"name": names[index], "rect": [x, y, w, h],
                               "anchor": [round(w/2, 2), h], "clipRows": clip})
                hashes.append(hashlib.sha256(pixels[y:y+h, x:x+w].tobytes()).hexdigest())
                edge_pixels.append(sum(b-a for yy, a, b in rs if yy in (0, height-1))
                                   +sum(int(a == 0)+int(b == width) for _, a, b in rs))
            assert len(set(hashes)) == 8, f"{id_}: duplicated poses"
            meta = {"version": 1, "id": id_, "source": sheet, "sourceSize": [width, height],
                    "columns": 4, "rows": 2, "frames": frames,
                    "idlePixels": frames[0]["rect"][3], "bodyHeight": monster["height"],
                    "scalePolicy": "one scale from idlePixels for every pose",
                    "clips": {
                        "idle": {"frames": [0], "durations": [1000], "loop": True},
                        "move": {"frames": [1, 0, 2, 0], "durations": [180, 100, 180, 100], "loop": True},
                        "attack": {"frames": [0, 3, 4, 6, 0], "durations": [180, 340, 140, 260, 200], "loop": True},
                        "hurt": {"frames": [0, 5, 6, 0], "durations": [200, 200, 260, 240], "loop": True},
                        "down": {"frames": [5, 7], "durations": [160, 1000], "loop": False}},
                    "review": "Eight authored key poses. Review motion before live spawn integration."}
            if id_ in ("bamboo-bat", "leaf-flame-bird", "wind-mountain-bird"):
                meta["clips"]["move"] = {"frames": [1, 0, 2, 6], "durations": [150]*4, "loop": True}
            if id_ in ("stone-mist-hare", "cave-crystal-toad"):
                meta["clips"]["move"] = {"frames": [0, 1, 2, 6], "durations": [150, 150, 160, 180], "loop": True}
            if id_ == "stone-garuda":
                frames[4]["flipX"] = True
            # Dense generated masks are machine data; compact them for mobile transfer.
            (ART / "animations" / f"{id_}.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":"))+"\n", encoding="utf-8")
            report.append({"id": id_, "sourceSize": [width, height], "frames": 8,
                           "transparentFraction": round(float((pixels[:, :, 3] == 0).mean()), 3),
                           "poseHeightRatios": [round(f["rect"][3]/meta["idlePixels"], 3) for f in frames],
                           "boundaryForeground": edge_pixels,
                           "sourceSHA256": hashlib.sha256((ART / "animations" / sheet).read_bytes()).hexdigest()})
    manifest.update(version=2, status="animation-review",
                    note="ภาพครบ 25 ตัว / 5 แมพ พร้อมชุดท่าหลักตัวละ 8 เฟรมสำหรับพรีวิว ยังไม่เชื่อมจุดเกิด ดาเมจ ดรอป หรือเควส เมืองลับแลเป็นเมืองปลอดภัย")
    (ART / "designs.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    out = ROOT / "outputs/monster-chapter2"
    out.mkdir(parents=True, exist_ok=True)
    (out / "atlas-inspection.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"creatures": len(report), "poses": sum(r["frames"] for r in report),
                      "boundaryWarnings": [{"id": r["id"], "counts": r["boundaryForeground"]} for r in report if any(r["boundaryForeground"])]}))


if __name__ == "__main__":
    main()

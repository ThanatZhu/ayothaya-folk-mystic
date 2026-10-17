# Re-grid a hand-off monster animation sheet (any size, 8 frames per row drawn roughly in a row) into the game's
# 8 × rows × 256 px layout read by monster-art.js, plus its metadata. One uniform scale per row (the monster never
# grows between frames), each frame's centre of mass on the cell centre, every frame standing on one baseline.
# Extra objects in a row beyond its 8 frames (projectiles, sparks drawn between frames) are saved as separate effects.
# usage: python scripts/normalize-monster-sheet.py <in.png> <out.png> <out.json> --bands 362 [--effects-dir DIR]
import argparse, json, os
from collections import deque
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('png'); ap.add_argument('meta')
ap.add_argument('--bands', default=''); ap.add_argument('--effects-dir', default=None)
a = ap.parse_args()
CELL, FRAMES, BASE, MAXH, MAXW, FAINT = 256, 8, 250, 232, 248, 8
im = np.array(Image.open(a.src).convert('RGBA')); H, W = im.shape[:2]; alpha = im[..., 3]

def components(m):
    h, w = m.shape; label = np.zeros((h, w), np.int32); n = 0
    for y, x in zip(*np.nonzero(m)):
        if label[y, x]: continue
        n += 1; label[y, x] = n; q = deque([(y, x)])
        while q:
            cy, cx = q.popleft()
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = n; q.append((ny, nx))
    return label, n

cuts = [0] + [int(v) for v in a.bands.split(',') if v] + [H]
out = Image.new('RGBA', (FRAMES * CELL, (len(cuts) - 1) * CELL), (0, 0, 0, 0)); scales = []
for row, (b0, b1) in enumerate(zip(cuts, cuts[1:])):
    label, n = components(alpha[b0:b1] >= FAINT); img = im[b0:b1]
    area = np.bincount(label.ravel(), minlength=n + 1)
    box = {}
    for k in range(1, n + 1):
        ys, xs = np.nonzero(label == k); box[k] = (ys.min(), xs.min(), ys.max(), xs.max())
    big = sorted((k for k in box if area[k] > 3000), key=lambda k: -area[k])
    frames = sorted(big[:FRAMES], key=lambda k: box[k][1]); effects = big[FRAMES:]
    groups = {k: [k] for k in frames}
    for k in box:
        if k in frames or k in effects or area[k] < 6: continue
        ys, xs = np.nonzero(label == k); cy, cx = ys.mean(), xs.mean()
        g = lambda f: max(0, box[f][0] - cy, cy - box[f][2]) + max(0, box[f][1] - cx, cx - box[f][3])
        best = min(frames, key=g)
        if g(best) < 60: groups[best].append(k)          # embers, ribbons, sparks of that frame
    crops = []
    for f in frames:
        keep = np.isin(label, groups[f]); ys, xs = np.nonzero(keep)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        piece = img[y0:y1, x0:x1].copy(); piece[~keep[y0:y1, x0:x1]] = 0
        w = piece[..., 3].astype(float); cx = (w.sum(0) * np.arange(x1 - x0)).sum() / w.sum()
        crops.append((Image.fromarray(piece), cx))
    s = min(MAXH / max(c.height for c, _ in crops), MAXW / max(c.width for c, _ in crops))
    for i, (c, cx) in enumerate(crops):
        r = c.convert('RGBa').resize((round(c.width * s), round(c.height * s)), Image.LANCZOS).convert('RGBA')
        x = i * CELL + round(CELL / 2 - cx * s); x = max(i * CELL, min(x, i * CELL + CELL - r.width))  # stay in the cell
        out.alpha_composite(r, (x, row * CELL + BASE - r.height))
        print(f'row {row + 1} frame {i + 1}: {c.width}x{c.height} -> {r.width}x{r.height}, {len(groups[frames[i]])} piece(s)')
    scales.append(1)
    for j, k in enumerate(effects):
        print(f'row {row + 1}: extra object {box[k][3] - box[k][1] + 1}x{box[k][2] - box[k][0] + 1} at x={box[k][1]} kept out of the frames')
        if a.effects_dir:
            ys, xs = np.nonzero(label == k); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            piece = img[y0:y1, x0:x1].copy(); piece[label[y0:y1, x0:x1] != k] = 0
            os.makedirs(a.effects_dir, exist_ok=True); Image.fromarray(piece).save(os.path.join(a.effects_dir, f'row{row + 1}-effect{j + 1}.png'))
out.save(a.png)
# monster-art.js draws rect (x,y,w,h) into a 256 canvas at (128 − w·s/2, 244 − h·s): full cells keep the
# centre-of-mass alignment and the shared baseline made above.
rows = len(cuts) - 1
json.dump({'version': 49, 'width': FRAMES * CELL, 'height': rows * CELL, 'columns': FRAMES,
           'rects': [[c * CELL, r * CELL, CELL, CELL] for r in range(rows) for c in range(FRAMES)], 'scales': scales},
          open(a.meta, 'w'), indent=1)
print('scale per row', [round(min(MAXH, 1), 3) for _ in scales])

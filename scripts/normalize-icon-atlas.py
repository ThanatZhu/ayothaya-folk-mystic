# Re-grid a hand-off icon atlas: pull each icon out by its shape (not the cell lines, so icons that cross a border
# stay whole), drop stray specks, scale to a common size (premultiplied, so no dark/white fringes) and centre it in
# its 256 px cell. Faint smoke/glow (alpha >= 8) counts as part of the icon and is kept.
# usage: python scripts/normalize-icon-atlas.py <in.png> <out.png> [--size 190 | --fit 170x230] [--order grid|reading]
#        [--count N] [--transpose 6,10,14] [--bands 303] [--cols 6 --rows 4]
#   grid    : piece belongs to the cell that holds its centre (icons drawn roughly on the 6x4 grid)
#   reading : whole objects sorted into rows then left→right (cards drawn off-grid), first N go to cells 1..N
#   bands  : y lines where touching rows are cut apart before finding objects (cards drawn edge to edge)
#   count  : only cells 1..N may hold an icon; small fragments always join the nearest big piece
#   transpose: mirror those cells across the top-left↔bottom-right diagonal (turns a "\" weapon into "/", light stays top-left)
import argparse
from collections import deque
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--size', type=int, default=190); ap.add_argument('--fit', default=None)
ap.add_argument('--order', default='grid'); ap.add_argument('--count', type=int, default=None)
ap.add_argument('--transpose', default=''); ap.add_argument('--bands', default=''); ap.add_argument('--cols', type=int, default=6); ap.add_argument('--rows', type=int, default=4)
a = ap.parse_args()
CELL, PAD, FAINT, SPECK = 256, 96, 8, 24
im = np.array(Image.open(a.src).convert('RGBA'))
H, W = im.shape[:2]
alpha = im[..., 3]
mask = alpha >= FAINT
flip = {int(v) for v in a.transpose.split(',') if v}

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

def fit(crop):
    if a.fit:
        bw, bh = map(int, a.fit.split('x')); s = min(bw / crop.width, bh / crop.height)
    else:
        s = a.size / max(crop.size)
    p = crop.convert('RGBa').resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS)
    return p.convert('RGBA')

cuts = [0] + [int(v) for v in a.bands.split(',') if v] + [H]; label = np.zeros((H, W), np.int32); n = 0
for b0, b1 in zip(cuts, cuts[1:]):            # label each band on its own so touching rows stay apart
    l, m = components(mask[b0:b1]); label[b0:b1][l > 0] = l[l > 0] + n; n += m
area = np.bincount(label.ravel(), minlength=n + 1)
peak = np.zeros(n + 1, np.int32); np.maximum.at(peak, label.ravel(), alpha.ravel())
real = [k for k in range(1, n + 1) if not (area[k] < SPECK and peak[k] < 160)]   # tiny faint dots = residue
cells = {}
def bbox(k):
    ys, xs = np.nonzero(label == k); return ys.min(), xs.min(), ys.max(), xs.max(), ys, xs
def gap(b, y, x): return max(0, b[0] - y, y - b[2]) + max(0, b[1] - x, x - b[3])
if a.order == 'grid':
    big = [k for k in real if area[k] >= 1500]; boxes = {k: bbox(k) for k in real}; home = {}
    for k in big:
        ys, xs = boxes[k][4], boxes[k][5]; w = alpha[ys, xs].astype(float)
        cx, cy = (xs * w).sum() / w.sum(), (ys * w).sum() / w.sum()
        home[k] = int(cy // CELL) * a.cols + int(cx // CELL)
    for k in real:
        if k not in home:   # sparks, shards, droplets: belong to the closest big piece
            ys, xs = boxes[k][4], boxes[k][5]; cy, cx = ys.mean(), xs.mean()
            near = min(big, key=lambda b: gap(boxes[b], cy, cx))
            if gap(boxes[near], cy, cx) > 60: print('dropped loose fragment at', int(cx), int(cy)); continue
            home[k] = home[near]
        if a.count and home[k] >= a.count: print(f'piece in cell {home[k] + 1} beyond --count, dropped'); continue
        cells.setdefault(home[k], []).append(k)
else:  # reading order of whole objects: big pieces define objects, small ones join the nearest object
    big = [k for k in real if area[k] > 4000]; small = [k for k in real if area[k] <= 4000]
    box = {}
    for k in big:
        ys, xs = np.nonzero(label == k); box[k] = (ys.min(), xs.min(), ys.max(), xs.max())
    rows = []
    for k in sorted(big, key=lambda k: box[k][0]):
        cy = (box[k][0] + box[k][2]) / 2
        for r in rows:
            if abs(r[0] - cy) < 120: r[1].append(k); break
        else: rows.append([cy, [k]])
    order = [k for r in sorted(rows) for k in sorted(r[1], key=lambda k: box[k][1])][:a.count]
    for i, k in enumerate(order): cells[i] = [k]
    for k in small:
        ys, xs = np.nonzero(label == k); cy, cx = ys.mean(), xs.mean()
        best = min(range(len(order)), key=lambda i: max(0, box[order[i]][0] - cy, cy - box[order[i]][2]) + max(0, box[order[i]][1] - cx, cx - box[order[i]][3]))
        if max(0, box[order[best]][0] - cy, cy - box[order[best]][2], box[order[best]][1] - cx, cx - box[order[best]][3]) < 40: cells[best].append(k)

out = Image.new('RGBA', (a.cols * CELL, a.rows * CELL), (0, 0, 0, 0))
for i in sorted(cells):
    if i >= a.cols * a.rows: print('ignored piece outside the grid', i); continue
    keep = np.isin(label, cells[i])
    ys, xs = np.nonzero(keep); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    piece = im[y0:y1, x0:x1].copy(); piece[~keep[y0:y1, x0:x1]] = 0     # neighbours (even faint) never come along
    crop = Image.fromarray(piece)
    if i + 1 in flip: crop = crop.transpose(Image.Transpose.TRANSPOSE)
    crop = fit(crop)
    cx0, cy0 = i % a.cols * CELL, i // a.cols * CELL
    out.alpha_composite(crop, (cx0 + (CELL - crop.width) // 2, cy0 + (CELL - crop.height) // 2))
    print(f'{i + 1:2d}: {len(cells[i])} piece(s) {x1 - x0}x{y1 - y0} -> {crop.size}{"  (transposed)" if i + 1 in flip else ""}')
out.save(a.dst)
print('residue specks dropped:', n - len(real))

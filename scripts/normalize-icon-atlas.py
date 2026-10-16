# Re-grid a hand-off icon atlas: pull each icon out by its shape (not the cell lines, so icons that cross a border
# stay whole), drop faint halos, scale to a common size and centre it in its 256 px cell.
# usage: python normalize_atlas.py <in.png> <out.png> [target=200] [cols=6] [rows=4]
import sys
from collections import deque
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
TARGET = int(sys.argv[3]) if len(sys.argv) > 3 else 200
COLS = int(sys.argv[4]) if len(sys.argv) > 4 else 6
ROWS = int(sys.argv[5]) if len(sys.argv) > 5 else 4
CELL, PAD, SOLID, HALO = 256, 48, 40, 18
im = np.array(Image.open(src).convert('RGBA'))
H, W = im.shape[:2]
alpha = im[..., 3]
solid = alpha > SOLID

def components(mask):
    h, w = mask.shape; label = np.zeros((h, w), np.int32); n = 0
    for y, x in zip(*np.nonzero(mask)):
        if label[y, x]: continue
        n += 1; label[y, x] = n; q = deque([(y, x)])
        while q:
            cy, cx = q.popleft()
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = n; q.append((ny, nx))
    return label, n

out = Image.new('RGBA', (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
for i in range(COLS * ROWS):
    cx0, cy0 = i % COLS * CELL, i // COLS * CELL
    x0, y0 = max(0, cx0 - PAD), max(0, cy0 - PAD); x1, y1 = min(W, cx0 + CELL + PAD), min(H, cy0 + CELL + PAD)
    label, n = components(solid[y0:y1, x0:x1])
    keep = np.zeros(label.shape, bool)
    for k in range(1, n + 1):
        ys, xs = np.nonzero(label == k)
        my, mx = ys.mean() + y0, xs.mean() + x0          # a piece belongs to the cell that holds its centre
        if cx0 <= mx < cx0 + CELL and cy0 <= my < cy0 + CELL: keep |= label == k
    if not keep.any(): continue
    ys, xs = np.nonzero(keep)
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    piece = im[y0:y1, x0:x1].copy()
    other = solid[y0:y1, x0:x1] & ~keep                    # neighbours' solid pixels never come along
    piece[other] = 0
    piece[piece[..., 3] < HALO] = 0                        # faint coloured halo
    crop = Image.fromarray(piece[by0:by1, bx0:bx1])
    s = TARGET / max(crop.size)
    crop = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS)
    out.alpha_composite(crop, (cx0 + (CELL - crop.width) // 2, cy0 + (CELL - crop.height) // 2))
    print(f'{i + 1:2d} kept {n} pieces -> {crop.size}')
out.save(dst)

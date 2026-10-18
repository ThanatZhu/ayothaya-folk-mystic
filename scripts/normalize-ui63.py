"""Re-grid the ChatGPT UI icon hand-off with Blender's Python (no PIL on this laptop). Never modifies the source.
blender -b --python scripts/normalize-ui63.py -- <in.png> <out.png> [--count 20] [--size 180] [--cut 0.16]
- alpha below --cut is cleared: removes the soft halo/glow the generator painted around each icon
- pieces are grouped by connected shape and assigned to the 256 px cell that holds their centre
- each cell's art is scaled to fit --size and centred; unused cells stay fully transparent
"""
import bpy, sys
import numpy as np
from collections import deque
args = sys.argv[sys.argv.index('--') + 1:]
src, dst = args[0], args[1]
opt = lambda k, d: type(d)(args[args.index(k) + 1]) if k in args else d
COUNT, SIZE, CUT, CELL, COLS, ROWS, SPECK = opt('--count', 20), opt('--size', 180), opt('--cut', .16), 256, 6, 4, 40

img = bpy.data.images.load(src)
W, H = img.size
px = np.empty(W * H * 4, np.float32); img.pixels.foreach_get(px)
px = px.reshape(H, W, 4)[::-1].copy()            # row 0 = top
px[px[..., 3] < CUT] = 0
mask = px[..., 3] > 0

label = np.zeros((H, W), np.int32); n = 0; pieces = []
for y, x in zip(*np.nonzero(mask)):
    if label[y, x]: continue
    n += 1; label[y, x] = n; q = deque([(y, x)]); ys = []; xs = []
    while q:
        cy, cx = q.popleft(); ys.append(cy); xs.append(cx)
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not label[ny, nx]:
                label[ny, nx] = n; q.append((ny, nx))
    pieces.append((n, len(ys), min(ys), max(ys), min(xs), max(xs), sum(ys) / len(ys), sum(xs) / len(xs)))

big = [p for p in pieces if p[1] >= SPECK]
cells = {}
for p in big:
    c = int(p[6] // CELL) * COLS + int(p[7] // CELL)
    cells.setdefault(c, []).append(p)
out = np.zeros((ROWS * CELL, COLS * CELL, 4), np.float32)
report = []
for c in range(COUNT):
    ps = cells.get(c, [])
    if not ps: report.append((c + 1, 'EMPTY')); continue
    y0, y1 = min(p[2] for p in ps), max(p[3] for p in ps) + 1
    x0, x1 = min(p[4] for p in ps), max(p[5] for p in ps) + 1
    keep = np.isin(label[y0:y1, x0:x1], [p[0] for p in ps])
    crop = px[y0:y1, x0:x1].copy(); crop[~keep] = 0
    h, w = crop.shape[:2]; s = SIZE / max(h, w); nh, nw = max(1, round(h * s)), max(1, round(w * s))
    # scale through a Blender image (premultiply first so edges do not pick up dark fringes)
    pre = crop.copy(); pre[..., :3] *= pre[..., 3:4]
    tmp = bpy.data.images.new('crop', w, h, alpha=True, float_buffer=True)
    tmp.pixels.foreach_set(pre[::-1].ravel()); tmp.scale(nw, nh)
    sc = np.empty(nw * nh * 4, np.float32); tmp.pixels.foreach_get(sc); bpy.data.images.remove(tmp)
    sc = sc.reshape(nh, nw, 4)[::-1]
    a = sc[..., 3:4]; sc[..., :3] = np.where(a > 1e-4, sc[..., :3] / np.maximum(a, 1e-4), 0)
    r, k = divmod(c, COLS); oy = r * CELL + (CELL - nh) // 2; ox = k * CELL + (CELL - nw) // 2
    out[oy:oy + nh, ox:ox + nw] = np.clip(sc, 0, 1)
    report.append((c + 1, len(ps), (x1 - x0, y1 - y0)))
res = bpy.data.images.new('ui63', COLS * CELL, ROWS * CELL, alpha=True)
res.pixels.foreach_set(out[::-1].ravel()); res.filepath_raw = dst; res.file_format = 'PNG'; res.save()
stray = sorted({c + 1 for c in cells if c >= COUNT})
print('UI63', report, 'stray cells', stray)

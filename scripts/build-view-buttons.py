# blender -b -P scripts/build-view-buttons.py -- <buttons.png> <out_dir>
# Cuts the three camera-view buttons out of their magenta sheet and shrinks them with clean soft edges.
import bpy, sys, os
import numpy as np

src, out = map(os.path.abspath, sys.argv[sys.argv.index('--') + 1:][:2])
SIZE = 128
im = bpy.data.images.load(src)
w, h = im.size
a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
# How much of a pixel is magenta: 1 far from it, 0 on it, in between along the antialiased rim.
keep = np.clip(1 - (np.minimum(r, b) - g - .25) / .45, 0, 1)
keep[(np.abs(r - b) > .3)] = 1
rgb = a.copy()
rgb[..., 0] = np.minimum(r, g + (r - g) * keep + .0)          # take the pink spill out of the rim
rgb[..., 2] = np.minimum(b, g + (b - g) * keep + .0)
rgba = np.dstack((rgb * keep[..., None], keep))              # premultiplied, so shrinking cannot bring the pink back
solid = keep > .5
columns = np.nonzero(solid.sum(0) > 20)[0]
spans = np.split(columns, np.nonzero(np.diff(columns) > 8)[0] + 1)
assert len(spans) == 3, len(spans)
for name, span in zip(('2d', '2-5d', '3d'), spans):
    rows = np.nonzero(solid[:, span[0]:span[-1] + 1].sum(1) > 20)[0]
    x0, x1, y0, y1 = span[0], span[-1] + 1, rows[0], rows[-1] + 1
    side = max(x1 - x0, y1 - y0)
    x0 -= (side - (x1 - x0)) // 2
    y0 -= (side - (y1 - y0)) // 2
    cut = rgba[max(y0, 0):y0 + side, max(x0, 0):x0 + side]
    edges_y = (np.arange(SIZE + 1) * cut.shape[0] / SIZE).astype(int)
    edges_x = (np.arange(SIZE + 1) * cut.shape[1] / SIZE).astype(int)
    small = np.zeros((SIZE, SIZE, 4), np.float32)
    for y in range(SIZE):
        for x in range(SIZE):
            small[y, x] = cut[edges_y[y]:edges_y[y + 1], edges_x[x]:edges_x[x + 1]].mean((0, 1))
    alpha = small[..., 3:]
    small[..., :3] = np.where(alpha > 0, small[..., :3] / np.maximum(alpha, 1e-4), 0)
    page = bpy.data.images.new('view', SIZE, SIZE, alpha=True)
    page.alpha_mode = 'STRAIGHT'
    page.pixels = small[::-1].ravel().tolist()
    page.filepath_raw = os.path.join(out, 'view-' + name + '.png')
    page.file_format = 'PNG'
    page.save()
    print('built', name, x1 - x0, y1 - y0)
print('DONE')

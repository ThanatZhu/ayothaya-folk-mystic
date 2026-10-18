"""Cut the ui-frames63 hand-off into web pieces with Blender's Python (this laptop has no Python/PIL). Never modifies sources.
blender -b --python scripts/prepare-ui-frames63.py -- <ui-frames63 folder> <out folder>
Each piece: low-alpha haze cleared, cropped to its alpha bounds, scaled down to a 2x display width, saved as PNG.
Panels are used as CSS border-image (nine-slice); profile and minimap frames scale uniformly.
"""
import bpy, sys, json
import numpy as np
src, out = sys.argv[sys.argv.index('--') + 1:][:2]

def load(name):
    img = bpy.data.images.load(src + '/' + name); w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px)
    return px.reshape(h, w, 4)[::-1].copy()           # row 0 = top

def save(arr, name, width):
    a = arr[..., 3]; ys, xs = np.nonzero(a > 0)
    arr = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = arr.shape[:2]; nw = min(width, w); nh = max(1, round(h * nw / w))
    pre = arr.copy(); pre[..., :3] *= pre[..., 3:4]
    t = bpy.data.images.new(name, w, h, alpha=True, float_buffer=True); t.pixels.foreach_set(pre[::-1].ravel()); t.scale(nw, nh)
    sc = np.empty(nw * nh * 4, np.float32); t.pixels.foreach_get(sc); bpy.data.images.remove(t)
    sc = sc.reshape(nh, nw, 4); al = sc[..., 3:4]; sc[..., :3] = np.where(al > 1e-4, sc[..., :3] / np.maximum(al, 1e-4), 0)
    o = bpy.data.images.new(name, nw, nh, alpha=True); o.pixels.foreach_set(np.clip(sc, 0, 1).ravel())
    o.filepath_raw = out + '/' + name + '.png'; o.file_format = 'PNG'; o.save()
    return [nw, nh]

def clean(arr, cut):
    arr = arr.copy(); arr[arr[..., 3] < cut] = 0; return arr

sizes = {}
sizes['profile'] = save(clean(load('ui-profile-frame63.png'), .06), 'profile', 560)
sizes['minimap'] = save(clean(load('ui-minimap-frame63.png'), .06), 'minimap', 420)
comp = clean(load('ui-components63.png'), .5)            # the components sheet carries a soft brown haze
for name, (x0, y0, x1, y1), width in [('panel', (30, 75, 712, 935), 360), ('banner', (740, 88, 1512, 222), 480),
        ('tooltip', (745, 250, 1506, 476), 480), ('ring', (750, 510, 1000, 745), 120), ('square', (1010, 525, 1210, 725), 110),
        ('button', (1218, 575, 1515, 685), 200), ('trough-hp', (755, 760, 1505, 840), 420), ('trough-mp', (755, 860, 1505, 940), 420)]:
    sizes[name] = save(comp[y0:y1, x0:x1], name, width)
print('FRAMES', json.dumps(sizes))

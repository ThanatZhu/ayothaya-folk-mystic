# blender -b -P scripts/cut-dungeon-art.py -- <unzipped owner art> assets/dungeon-<set>
# blender -b -P cut-art.py -- <zip_dir> <out_dir>: gear sheet 3x2 cells of 512 -> gear-0..5.webp (256 px), cover and menu icon.
import bpy, sys, os
import numpy as np
src, out = sys.argv[sys.argv.index('--')+1:][:2]
def load(name):
    img = bpy.data.images.load(os.path.join(src, name)); w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # top row first
    return a
def save(a, name, size=None):
    h, w = a.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels = a[::-1].ravel().tolist()
    if size: img.scale(*size)
    img.filepath_raw = os.path.join(out, name); img.file_format = 'WEBP'
    bpy.context.scene.render.image_settings.quality = 90
    img.save()
gear = load('dungeon-krasue-gear.png')
gear[..., 3] = np.where(gear[..., 3] >= 224/255, 1.0, np.where(gear[..., 3] < 24/255, 0.0, gear[..., 3]))
for i in range(6):
    r, c = divmod(i, 3)
    save(np.ascontiguousarray(gear[r*512:(r+1)*512, c*512:(c+1)*512]), 'gear-%d.webp' % i, (256, 256))
menu = load('dungeon-menu-icon.png')
# drop stray specks: open the alpha mask (erode 4 px, then grow 7 px) so only the solid icon body survives
def shift_all(m, n, op):
    r = m.copy()
    for dy in range(-n, n+1):
        for dx in range(-n, n+1):
            r = op(r, np.roll(np.roll(m, dy, 0), dx, 1))
    return r
solid = menu[..., 3] > .35
body = shift_all(shift_all(solid, 4, np.logical_and), 7, np.logical_or)
menu[..., 3] *= body
save(menu, 'menu.webp', (128, 128))
cover = load('dungeon-krasue-cover.png')
save(cover, 'cover.webp', (960, 400))
print('CUT DONE')

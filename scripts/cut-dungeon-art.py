# blender -b -P scripts/cut-dungeon-art.py -- <unzipped owner art> assets/dungeon-<set> <set>
# Gear sheet cells of 512 (krasue 3x2, later sets 2x2: head, armor, garment, shoes) -> gear-N.webp (256 px),
# cover (960x400), shard icon (256 px) and the krasue menu icon when the zip has them. Alpha is kept.
import bpy, sys, os
import numpy as np
src, out, name = (sys.argv[sys.argv.index('--')+1:] + ['krasue'])[:3]
def load(file):
    img = bpy.data.images.load(os.path.join(src, file)); w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # top row first
    return a
def save(a, file, size=None):
    h, w = a.shape[:2]
    img = bpy.data.images.new(file, w, h, alpha=True)
    img.pixels = a[::-1].ravel().tolist()
    if size: img.scale(*size)
    img.filepath_raw = os.path.join(out, file); img.file_format = 'WEBP'
    bpy.context.scene.render.image_settings.quality = 90
    img.save()
def clean_alpha(a):
    a[..., 3] = np.where(a[..., 3] >= 224/255, 1.0, np.where(a[..., 3] < 24/255, 0.0, a[..., 3]))
    return a
gear = clean_alpha(load('dungeon-%s-gear.png' % name))
rows, cols = gear.shape[0] // 512, gear.shape[1] // 512
# an item that crosses a cell edge would be cut in half: refuse instead of shipping it
for c in range(1, cols):
    if (gear[:, c*512-2:c*512+2, 3] > 0).any(): sys.exit('item crosses the vertical cell edge %d' % c)
for r in range(1, rows):
    if (gear[r*512-2:r*512+2, :, 3] > 0).any(): sys.exit('item crosses the horizontal cell edge %d' % r)
for i in range(rows * cols):
    r, c = divmod(i, cols)
    save(np.ascontiguousarray(gear[r*512:(r+1)*512, c*512:(c+1)*512]), 'gear-%d.webp' % i, (256, 256))
if os.path.exists(os.path.join(src, 'dungeon-menu-icon.png')):
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
save(load('dungeon-%s-cover.png' % name), 'cover.webp', (960, 400))
if os.path.exists(os.path.join(src, 'shard-%s.png' % name)):
    save(clean_alpha(load('shard-%s.png' % name)), 'shard.webp', (256, 256))
print('CUT DONE', name, rows * cols)

# blender -b -P scripts/build-pixel-characters.py -- <sheets_dir> <out_dir>
# Turns the 24-frame sheets (1536x1024, 6x4 cells, magenta background) into clean game atlases:
# drops the background, snaps every 4 px block to one colour, shares a small palette, sizes all bodies the same.
import bpy, sys, glob, os, json
import numpy as np

src, out = map(os.path.abspath, sys.argv[sys.argv.index('--') + 1:][:2])
os.makedirs(out, exist_ok=True)
COLUMNS, ROWS, BLOCK, GRID = 6, 4, 4, 64        # sheet cell is 256 px = 64 logical pixels
BODY_HEIGHT, FRAME_SIZE, FRAME_FOOT = 210, 320, 276   # same frame the painted characters use (character-size.js)
PALETTE = 32
ATLAS_W, ATLAS_H = 1774, 887                    # lobby and HUD portrait layout: 4 columns, male row then female row


def load(path):
    im = bpy.data.images.load(path)
    w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3] * 255
    bpy.data.images.remove(im)
    return a


def save(path, rgba):
    h, w = rgba.shape[:2]
    im = bpy.data.images.new('out', w, h, alpha=True)
    im.alpha_mode = 'STRAIGHT'
    im.pixels = (rgba[::-1] / 255).astype(np.float32).ravel().tolist()
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    bpy.data.images.remove(im)


def is_background(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r - g > 110) & (b - g > 110) & (np.abs(r - b) < 70)


def to_grid(sheet):
    """One RGBA value per 4x4 block: a block is solid when most of it is ink, coloured by its median ink."""
    h, w = sheet.shape[:2]
    H, W = h // BLOCK, w // BLOCK
    blocks = sheet[:H * BLOCK, :W * BLOCK].reshape(H, BLOCK, W, BLOCK, 3).transpose(0, 2, 1, 3, 4).reshape(H, W, BLOCK * BLOCK, 3)
    ink = ~is_background(blocks)
    solid = ink.sum(2) >= BLOCK * BLOCK / 2
    colour = np.zeros((H, W, 3), np.float32)
    for y, x in zip(*np.nonzero(solid)):
        colour[y, x] = np.median(blocks[y, x][ink[y, x]], axis=0)
    return colour, solid


def quantize(colour, solid):
    """k-means over the solid pixels, seeded the same way every run so rebuilds do not reshuffle shades."""
    pts = colour[solid]
    rng = np.random.default_rng(7)
    centres = pts[rng.choice(len(pts), PALETTE, replace=False)]
    for _ in range(14):
        near = ((pts[:, None] - centres[None]) ** 2).sum(2).argmin(1)
        for k in range(PALETTE):
            if (near == k).any():
                centres[k] = pts[near == k].mean(0)
    out = colour.copy()
    out[solid] = centres[near]
    return np.round(out)


def body_box(mask):
    """Crown and sole of a standing cell. Rows thinner than 8 pixels are a spear shaft or tip, not the body."""
    rows = np.nonzero(mask.sum(1) >= 8)[0]
    return rows[0], rows[-1]


def head_centre(mask, top, height):
    xs = np.nonzero(mask[top:top + int(height * .4)])[1]
    return xs.mean() if len(xs) else GRID / 2


def build(name):
    colour, solid = to_grid(load(os.path.join(src, name + '.png')))
    colour = quantize(colour, solid)
    top, bottom = body_box(solid[:GRID, :GRID])
    height = bottom - top + 1
    size = int(round(FRAME_SIZE * height / BODY_HEIGHT))
    foot = int(round(FRAME_FOOT * size / FRAME_SIZE))
    atlas = np.zeros((size * ROWS, size * COLUMNS, 4), np.uint8)
    home = head_centre(solid[:GRID, :GRID], top, height)
    for row in range(ROWS):
        for col in range(COLUMNS):
            y0, x0 = row * GRID, col * GRID
            mask, rgb = solid[y0:y0 + GRID, x0:x0 + GRID], colour[y0:y0 + GRID, x0:x0 + GRID]
            ys = np.nonzero(mask.sum(1))[0]
            # Idle, walk and run loop: pin the head sideways and (for idle and walk) the soles, or they jitter.
            # Attack and skill keep their lunges and jumps.
            shift_x = int(round(size / 2 - (head_centre(mask, ys[0], height) if row < 2 else home)))
            shift_y = foot - 1 - (ys[-1] if row == 0 else bottom)
            for y, x in zip(*np.nonzero(mask)):
                ty, tx = y + shift_y, x + shift_x
                if 0 <= ty < size and 0 <= tx < size:
                    atlas[row * size + ty, col * size + tx] = (*rgb[y, x], 255)
    save(os.path.join(out, name + '.png'), atlas.astype(np.float32))
    return {'cell': size, 'height': int(height)}, atlas


def cell(atlas, size, row, col):
    return atlas[row * size:(row + 1) * size, col * size:(col + 1) * size]


def portrait_atlas(class_id, male, female):
    """Lobby and HUD art: the standing frames, enlarged by a whole number so pixels stay square."""
    w, h = ATLAS_W // 4, ATLAS_H // 2
    page = np.zeros((ATLAS_H, ATLAS_W, 4), np.uint8)
    for row, (meta, atlas) in enumerate((male, female)):
        size = meta['cell']
        scale = h * 3 // (size * 2)         # the standing body fills about the same share of the cell as the old art
        scale = max(1, min(scale, h // size))
        for col, (r, c) in enumerate(((0, 0), (0, 1), (0, 2), (0, 4))):
            big = cell(atlas, size, r, c).repeat(scale, 0).repeat(scale, 1)
            top, left = row * h + (h - big.shape[0]) // 2, col * w + (w - big.shape[1]) // 2
            page[top:top + big.shape[0], left:left + big.shape[1]] = big
    save(os.path.join(out, class_id + '-atlas.png'), page.astype(np.float32))


manifest = {}
for class_id in ('novice', 'swordsman', 'lancer', 'hunter', 'boxer', 'rogue', 'shaman', 'acolyte'):
    made = {}
    for key, tag in (('male', 'm'), ('female', 'f')):
        meta, atlas = build('pc-%s-%s' % (class_id, tag))
        manifest[class_id + '-' + key] = meta
        made[key] = (meta, atlas)
        print('built', class_id, key, meta)
    portrait_atlas(class_id, made['male'], made['female'])
with open(os.path.join(out, 'manifest.json'), 'w') as f:
    json.dump({'columns': COLUMNS, 'rows': ROWS, 'actors': manifest}, f, indent=1)
print('DONE')

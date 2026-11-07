# blender -b -P scripts/build-pixel-monsters.py -- <sheets_dir> <out_dir> [npc]
# Turns the 8-pose monster sheets (1536x1024, 4x2 cells of 384x512, magenta background) into one strip per monster:
# drops the background, snaps every 4 px block to one colour, shares a small palette, stands every pose on the same line.
import bpy, sys, os, json
import numpy as np

args = sys.argv[sys.argv.index('--') + 1:]
src, out = map(os.path.abspath, args[:2])
# NPC sheets (np-*.png) are people: each strip cell is the player frame (character-size.js), so a body is drawn
# exactly as tall as a hero's and the game scales it like one. Monsters keep a tight cell and their own size.
NPC = 'npc' in args[2:]
BODY_HEIGHT, FRAME_SIZE, FRAME_FOOT = 210, 320, 276
os.makedirs(out, exist_ok=True)
COLUMNS, ROWS, BLOCK, CELL_W, CELL_H = 4, 2, 4, 96, 128    # a sheet cell is 96 x 128 logical pixels
PALETTE, SPECK = 32, 6
# Monster type id -> sheet. A type's world size stays in MONSTER_TYPES; the strip only says how tall its body is.
# Variants share their base monster's sheet; the list lives next to this script.
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pixel-monster-types.json')) as f:
    TYPES = json.load(f)


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


def to_grid(sheet):
    """One RGBA value per 4x4 block: a block is solid when most of it is ink, coloured by its median ink."""
    h, w = sheet.shape[:2]
    H, W = h // BLOCK, w // BLOCK
    blocks = sheet[:H * BLOCK, :W * BLOCK].reshape(H, BLOCK, W, BLOCK, 3).transpose(0, 2, 1, 3, 4).reshape(H, W, BLOCK * BLOCK, 3)
    r, g, b = blocks[..., 0], blocks[..., 1], blocks[..., 2]
    ink = ~((r - g > 110) & (b - g > 110) & (np.abs(r - b) < 70))
    solid = ink.sum(2) >= BLOCK * BLOCK / 2
    colour = np.zeros((H, W, 3), np.float32)
    for y, x in zip(*np.nonzero(solid)):
        colour[y, x] = np.median(blocks[y, x][ink[y, x]], axis=0)
    # The background bleeds into outlines as purple; no monster uses purple.
    r, g, b = colour[..., 0], colour[..., 1], colour[..., 2]
    return colour, solid & ~((r - g > 50) & (b - g > 50))


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
    done = colour.copy()
    done[solid] = centres[near]
    return np.round(done)


def parts(mask):
    """Connected groups, diagonals included (an antenna is one pixel wide); lone flecks of noise go."""
    h, w = mask.shape
    seen, found = np.zeros_like(mask), []
    for start in zip(*np.nonzero(mask)):
        if seen[start]:
            continue
        seen[start] = True
        stack, part = [start], []
        while stack:
            y, x = stack.pop()
            part.append((y, x))
            for ny in range(max(0, y - 1), min(h, y + 2)):
                for nx in range(max(0, x - 1), min(w, x + 2)):
                    if mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
        if len(part) >= SPECK:
            found.append(np.array(part))
    return found


def build(name):
    colour, solid = to_grid(load(os.path.join(src, name + '.png')))
    colour = quantize(colour, solid)
    # A sickle may reach past its cell, so a pose is every group centred in that cell, not a cut along the grid.
    poses = [[] for _ in range(COLUMNS * ROWS)]
    for part in parts(solid):
        y, x = part.mean(0)
        poses[int(y // CELL_H) * COLUMNS + int(x // CELL_W)].append(part)
    poses = [np.concatenate(p) for p in poses]
    # Pinned by its centre of mass and its soles, so the walk does not jitter and the lunge still reaches.
    middles = [int(round(p[:, 1].mean())) for p in poses]
    feet = [p[:, 0].max() for p in poses]
    if NPC:
        return place(name, poses, middles, feet, colour)
    reach = max(max(p[:, 1].max() - m, m - p[:, 1].min()) for p, m in zip(poses, middles))
    tall = max(f - p[:, 0].min() for p, f in zip(poses, feet)) + 1
    cell = int(max(2 * reach + 2, tall))
    cell += cell % 2
    strip = np.zeros((cell, cell * COLUMNS * ROWS, 4), np.uint8)
    for i, (p, middle, foot) in enumerate(zip(poses, middles, feet)):
        for y, x in p:
            strip[y - foot + cell - 1, i * cell + x - middle + cell // 2] = (*colour[y, x], 255)
    save(os.path.join(out, name + '.png'), strip.astype(np.float32))
    return {'cell': cell, 'body': int(feet[0] - poses[0][:, 0].min() + 1)}


def place(name, poses, middles, feet, colour):
    body = int(feet[0] - poses[0][:, 0].min() + 1)
    cell = int(round(FRAME_SIZE * body / BODY_HEIGHT))
    foot = int(round(FRAME_FOOT * cell / FRAME_SIZE))
    strip = np.zeros((cell, cell * COLUMNS * ROWS, 4), np.uint8)
    lost = 0
    for i, (p, middle, f) in enumerate(zip(poses, middles, feet)):
        for y, x in p:
            ty, tx = y - f + foot - 1, x - middle + cell // 2
            if 0 <= ty < cell and 0 <= tx < cell:
                strip[ty, i * cell + tx] = (*colour[y, x], 255)
            else:
                lost += 1
    if lost:
        print('WARN', name, lost, 'pixels outside the frame')
    save(os.path.join(out, name + '.png'), strip.astype(np.float32))
    return {'cell': cell, 'body': body}


if NPC:
    names = sorted(f[:-4] for f in os.listdir(src) if f.startswith('np-') and f.endswith('.png'))
    with open(os.path.join(out, 'npcs.json'), 'w') as f:
        json.dump({name: build(name) for name in names}, f, indent=1)
    print('DONE', len(names))
    sys.exit(0)

sheets = {name: build(name) for name in sorted(set(TYPES.values()))}
with open(os.path.join(out, 'monsters.json'), 'w') as f:
    json.dump({type_id: {'art': name, **sheets[name]} for type_id, name in TYPES.items()}, f, indent=1)
print('DONE', sheets)

"""World map of Thailand for the in-game atlas, rendered straight down in Blender.

Run:  blender -b -P build_thailand.py -- <thailand-geo.json> <out.png>
The geo file holds Natural Earth land rings (Thailand and neighbours) and river lines in lon/lat (see README.md).
Projection (shared with world-atlas-ui.js): x = (lon - LON0) / (LON1 - LON0), y = (LAT1 - lat) / (LAT1 - LAT0) of the
image, an equirectangular frame with longitude squeezed by cos(13 deg) so Thailand keeps its real shape.
"""
import bpy, json, math, sys
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
GEO, OUT = argv[0], argv[1]
LON0, LON1, LAT0, LAT1 = 96.6, 106.4, 5.2, 21.0
K, CX = 10.0, math.cos(math.radians(13))
W, H = (LON1 - LON0) * CX * K, (LAT1 - LAT0) * K
RES_X = 1240
RES_Y = round(RES_X * H / W)

geo = json.load(open(GEO, encoding='utf-8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return np.array([x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c])

# ---------- land masks on a lon/lat grid ----------
NX = 360
NY = round(NX * H / W)
lon = np.linspace(LON0, LON1, NX)
lat = np.linspace(LAT0, LAT1, NY)
LON, LAT = np.meshgrid(lon, lat)
px, py = LON.ravel(), LAT.ravel()

def inside(rings):
    hit = np.zeros(px.shape, bool)
    for ring in rings:
        r = np.array(ring)
        if len(r) > 700:
            r = r[::2]
        x1, y1 = r[:, 0], r[:, 1]
        x2, y2 = np.roll(x1, -1), np.roll(y1, -1)
        box = (px >= r[:, 0].min()) & (px <= r[:, 0].max()) & (py >= r[:, 1].min()) & (py <= r[:, 1].max())
        idx = np.nonzero(box)[0]
        if not len(idx):
            continue
        qx, qy, flip = px[idx], py[idx], np.zeros(len(idx), bool)
        for a, b, c, d in zip(x1, y1, x2, y2):
            if b == d:
                continue
            cross = ((b > qy) != (d > qy)) & (qx < (c - a) * (qy - b) / (d - b) + a)
            flip ^= cross
        hit[idx] |= flip
    return hit

thai = inside([l['ring'] for l in geo['lands'] if l['name'] == 'Thailand'])
other = inside([l['ring'] for l in geo['lands'] if l['name'] != 'Thailand']) & ~thai
land = thai | other

# ---------- relief: fractal noise weighted by the real ranges ----------
rng = np.random.default_rng(13)
def octave(n):
    g = rng.random((n + 1, n + 1))
    u, v = (px - LON0) / (LON1 - LON0) * n, (py - LAT0) / (LAT1 - LAT0) * n
    i, j = np.clip(u.astype(int), 0, n - 1), np.clip(v.astype(int), 0, n - 1)
    fu, fv = u - i, v - j
    fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
    return (g[j, i] * (1 - fu) * (1 - fv) + g[j, i + 1] * fu * (1 - fv) + g[j + 1, i] * (1 - fu) * fv + g[j + 1, i + 1] * fu * fv)
noise = sum(octave(n) * w for n, w in [(8, .45), (18, .3), (40, .17), (90, .08)])
ridge = 1 - np.abs(noise * 2 - 1)  # sharp crests

def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

mount = np.maximum.reduce([
    ss(17.2, 18.8, py),                                                             # northern ranges (Lanna)
    ss(99.5, 98.7, px) * ss(10.0, 11.5, py) * ss(18.5, 17.0, py) * .9,             # Tenasserim / Thanon Thong Chai
    ss(.55, .15, np.abs(px - 101.2)) * ss(15.0, 15.8, py) * ss(18.0, 17.2, py) * .75,  # Phetchabun
    ss(.35, .05, np.abs(py - 14.45)) * ss(102.4, 102.8, px) * ss(105.0, 104.6, px) * .5,  # Dangrek
    ss(.6, .1, np.abs(px - (99.0 + (10.5 - py) * .55))) * ss(10.6, 9.8, py) * .55,  # southern spine
    other * .55,                                                                     # neighbours: hills
])
def blur(a, n):
    g = a.reshape(NY, NX)
    for _ in range(n):
        g = (g + np.roll(g, 1, 0) + np.roll(g, -1, 0) + np.roll(g, 1, 1) + np.roll(g, -1, 1)) / 5
    return g.ravel()
mount = blur(mount, 10) * (.55 + noise * .9)          # soft, ragged range edges instead of boxes
inland = blur(land.astype(float), 6)                   # 0 at sea, rising gently over the coast
height = np.where(land, .04 + inland * .1 + mount * (ridge * 2.4 + noise * .5), -.08)
height = blur(height, 2)

# ---------- colours ----------
sea_deep, sea_shelf = lin('2b5f66'), lin('3f7f84')
plain, upland, peak = lin('a9b56a'), lin('5f8549'), lin('4f6b40')
foreign, foreign_hi = lin('c4b896'), lin('aca282')
t = np.clip(mount * (ridge * 1.2 + .3), 0, 1)[:, None]
thai_col = plain * (1 - t) + upland * t
thai_col = np.where((mount * ridge > .62)[:, None], peak * .6 + thai_col * .4, thai_col)
other_col = foreign * (1 - t) + foreign_hi * t
near = np.zeros(px.shape)
for dy in (-2, -1, 0, 1, 2):  # a lighter shelf along the coast
    for dx in (-2, -1, 0, 1, 2):
        near = np.maximum(near, np.roll(np.roll(land.reshape(NY, NX), dy, 0), dx, 1).ravel())
sea_col = np.where(near[:, None] > 0, sea_shelf, sea_deep)
col = np.where(thai[:, None], thai_col, np.where(other[:, None], other_col, sea_col))

# ---------- terrain mesh ----------
xs = (px - LON0) * CX * K
ys = (py - LAT0) * K
verts = np.column_stack([xs, ys, height]).tolist()
faces = []
for j in range(NY - 1):
    for i in range(NX - 1):
        a = j * NX + i
        faces.append((a, a + 1, a + NX + 1, a + NX))
me = bpy.data.meshes.new('terrain')
me.from_pydata(verts, [], faces)
me.update()
attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
rgba = np.column_stack([col, np.ones(len(col))]).ravel()
attr.data.foreach_set('color', rgba)
ob = bpy.data.objects.new('terrain', me)
scene.collection.objects.link(ob)
for p in me.polygons:
    p.use_smooth = True
mat = bpy.data.materials.new('terrain')
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes['Principled BSDF']
bsdf.inputs['Roughness'].default_value = 1
attr_node = nt.nodes.new('ShaderNodeVertexColor')
attr_node.layer_name = 'Col'
nt.links.new(attr_node.outputs['Color'], bsdf.inputs['Base Color'])
me.materials.append(mat)

# ---------- rivers ----------
def height_at(lo, la):
    i = min(NX - 1, max(0, round((lo - LON0) / (LON1 - LON0) * (NX - 1))))
    j = min(NY - 1, max(0, round((la - LAT0) / (LAT1 - LAT0) * (NY - 1))))
    return max(height[j * NX + i], 0)

water = bpy.data.materials.new('river')
water.use_nodes = True
w = water.node_tree.nodes['Principled BSDF']
w.inputs['Base Color'].default_value = (*lin('3d7d86'), 1)
w.inputs['Roughness'].default_value = .4
for r in geo['rivers']:
    pts = [p for p in r['line'] if LON0 - .5 < p[0] < LON1 + .5 and LAT0 - .5 < p[1] < LAT1 + .5]
    if len(pts) < 3:
        continue
    cu = bpy.data.curves.new('river', 'CURVE')
    cu.dimensions = '3D'
    big = r.get('scale', 9) <= 5 or r['name'] in ('Mekong', 'Chao Phraya', 'Salween', 'Ayeyarwady')
    cu.bevel_depth = .16 if big else .09
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for k, (lo, la) in enumerate(pts):
        sp.points[k].co = ((lo - LON0) * CX * K, (la - LAT0) * K, height_at(lo, la) + .12, 1)
    o = bpy.data.objects.new('river', cu)
    o.data.materials.append(water)
    scene.collection.objects.link(o)

# ---------- light, camera, render ----------
world = bpy.data.worlds.new('w')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (*lin('e8dcc0'), 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .55
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(52), 0, math.radians(-40)))
bpy.context.object.data.energy = 3.0
bpy.context.object.data.angle = math.radians(3)
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = max(W, H)
cam = bpy.data.objects.new('cam', cam_data)
cam.location = (W / 2, H / 2, 100)
scene.collection.objects.link(cam)
scene.camera = cam
scene.render.engine = 'BLENDER_EEVEE'
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_x, scene.render.resolution_y = RES_X, RES_Y
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('THAILAND', OUT, RES_X, RES_Y)

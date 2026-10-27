"""Web build of the Blender v2 environments. Reads a source .blend, never saves it.
blender -b <src>.blend --python scripts/optimize-scenes-v2.py -- <out.glb>
- removes cameras, lights, hidden concept references and bevel modifiers
- thins dense scatter meshes (grass, rice, lotus, leaves) by dropping whole loose parts
- caps textures at 512 px, exports WebP textures + Draco geometry
"""
import bpy, bmesh, sys, random, json
out = sys.argv[sys.argv.index('--') + 1]
# Mesh budget per scatter object: dense parts are thinned until about this many vertices remain.
SCATTER_BUDGET = 26000
rng = random.Random(2026)

for o in list(bpy.data.objects):
    if o.type != 'MESH' or o.hide_render:
        bpy.data.objects.remove(o, do_unlink=True)

def islands(bm):
    seen, parts = set(), []
    for f in bm.faces:
        if f.index in seen: continue
        stack, part = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop(); part.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); stack.append(h)
        parts.append(part)
    return parts

report = {}
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    for m in list(o.modifiers):
        if m.type == 'BEVEL': o.modifiers.remove(m)
    me = o.data; before = len(me.vertices)
    if before > SCATTER_BUDGET:
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        parts = islands(bm)
        # Only scatter (many small loose parts) is thinned; big continuous surfaces stay intact.
        if len(parts) > 200 and before / len(parts) < 120:
            keep = SCATTER_BUDGET / before
            drop = [f for p in parts if rng.random() > keep for f in p]
            bmesh.ops.delete(bm, geom=drop, context='FACES')
            bm.to_mesh(me); me.update()
        bm.free()
    report[o.name] = [before, len(me.vertices)]

# Stones rest in the ground. A loose stone sinks as one piece until its whole underside is below the ground under it,
# plus a fifth of its height so a round boulder meets the ground on a wide footprint instead of a point. Stone feet of
# props (post shoes, sockets, legs, parapets) stretch their bottom down to it instead. Moss and snow on a sunk stone
# go down with it.
import re
from mathutils import Vector
ROCK = re.compile(r'rock|stone|boulder|pebble|cobble|rubble|scree|cairn|crag|fallen', re.I)
FOOT = re.compile(r'post shoe|socket|elephant legs|grindstone posts|boundary stone|parapet|masonry blocks|stone bases', re.I)
BUILT = re.compile(r'lantern|platform|cliff|chasm|terrain|ground|wall|plinth|stair|step|paving|bridge|pedestal|pier|floor|'
                   r'path|road|lane|court|peak|summit|kerb|edge|shrine|stupa|chedi|statue|carved|naga|bench|well|stele|relief|'
                   r'pillar|ruin|foundation|soil|strata|wheel|crank', re.I)
PLANT = re.compile(r'grass|leaf|leaves|foliage|shrub|flower|reed|twig|moss|lotus|fern|vine|weed|bush|canopy|petal|rice|cloud', re.I)
CARRY = re.compile(r'moss|snow|lichen', re.I)
base_name = lambda o: o.name.split(' | ')[0]
# moss and snow layers (by material, or by name when the name is not a stone's) ride on the stone below them
is_cap = lambda o: bool(CARRY.search(o.name.split(' | ')[-1]) or (CARRY.search(base_name(o)) and not ROCK.search(base_name(o))))
def loose_parts(me):
    """vertex -> part id; flat-shaded corners that share a position count as joined"""
    p = list(range(len(me.vertices)))
    def f(i):
        while p[i] != i: p[i] = p[p[i]]; i = p[i]
        return i
    def u(a, c):
        a, c = f(a), f(c)
        if a != c: p[a] = c
    for e in me.edges: u(*e.vertices)
    seen = {}
    for i, v in enumerate(me.vertices):
        k = (round(v.co.x, 3), round(v.co.y, 3), round(v.co.z, 3))
        if k in seen: u(i, seen[k])
        else: seen[k] = i
    return [f(i) for i in range(len(me.vertices))]
dg = bpy.context.evaluated_depsgraph_get(); scene = bpy.context.scene
def gaps_under(o, part_of_poly, part, pts):
    """height of each low point over the first solid surface below it (negative: already in the ground)"""
    z0 = min(p.z for p in pts); H = max(p.z for p in pts)-z0
    low = sorted([p for p in pts if p.z < z0+.25*H+.02], key=lambda p: p.z); out = []
    for p in low[::max(1, len(low)//14)][:14]:
        org = Vector((p.x, p.y, p.z+.6))
        for _ in range(40):
            hit, loc, n, fi, ob, _m = scene.ray_cast(dg, org, Vector((0, 0, -1)), distance=8)
            if not hit: break
            own = ob.original == o and (part_of_poly is None or (fi < len(part_of_poly) and part_of_poly[fi] == part))
            if own or PLANT.search(base_name(ob)): org = loc+Vector((0, 0, -.0003)); continue
            out.append(p.z-loc.z); break
    return out
moves = []   # (object, vertex ids, shift per vertex)
sunk = []    # (x0, x1, y0, y1, z0, z1, shift) of every stone moved as one piece
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.data.vertices]:
    name = base_name(o); foot = bool(FOOT.search(name))
    if not foot and (not ROCK.search(name) or BUILT.search(name) or is_cap(o)): continue
    me = o.data; mw = o.matrix_world; wv = [mw@v.co for v in me.vertices]
    xs = [p.x for p in wv]; ys = [p.y for p in wv]
    root = loose_parts(me)
    # a cairn or one boulder made of a few pieces moves as one; scattered stones and rubble piles settle piece by piece
    whole = 'cairn' in name.lower() or (not foot and max(max(xs)-min(xs), max(ys)-min(ys)) <= 5 and len(set(root)) <= 6)
    if whole: root = [0]*len(wv)
    parts = {}
    for i, r in enumerate(root): parts.setdefault(r, []).append(i)
    ppoly = None if whole or o.modifiers else [root[p.vertices[0]] for p in me.polygons]
    for r, ids in parts.items():
        pts = [wv[i] for i in ids]; z0 = min(p.z for p in pts); z1 = max(p.z for p in pts); H = z1-z0
        if H < .03 or max(max(p.x for p in pts)-min(p.x for p in pts), max(p.y for p in pts)-min(p.y for p in pts)) > 10: continue
        g = gaps_under(o, ppoly, r, pts)
        if len(g) < 3: continue
        top = max(g)
        if foot:
            if not .02 < top < .6: continue
            band = max(.05, .35*H)
            moves.append((o, ids, [-(top+.02)*max(0, 1-(wv[i].z-z0)/band) for i in ids]))
        else:
            if top < .02 and H < .5: continue   # small pebbles already on the ground stay as they are
            if top > .5: continue   # resting on something uneven on purpose (an overhang, a ledge)
            s = max(0, top)+min(.35, (.2 if H >= .3 else .25)*H)
            if s < .01: continue
            moves.append((o, ids, [-s]*len(ids)))
            sunk.append((min(p.x for p in pts), max(p.x for p in pts), min(p.y for p in pts), max(p.y for p in pts), z0, z1, s))
carried = 0
if sunk:
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.data.vertices and is_cap(o)]:
        me = o.data; mw = o.matrix_world; wv = [mw@v.co for v in me.vertices]; root = loose_parts(me); parts = {}
        for i, r in enumerate(root): parts.setdefault(r, []).append(i)
        for ids in parts.values():
            pts = [wv[i] for i in ids]; cx = sum(p.x for p in pts)/len(pts); cy = sum(p.y for p in pts)/len(pts); z0 = min(p.z for p in pts)
            for x0, x1, y0, y1, r0, r1, s in sunk:
                if x0 <= cx <= x1 and y0 <= cy <= y1 and r0+.15*(r1-r0) <= z0 <= r1+.3:
                    moves.append((o, ids, [-s]*len(ids))); carried += 1; break
for o, ids, dz in moves:
    if o.data.users > 1: o.data = o.data.copy()   # scattered copies share one mesh; each sinks by its own ground
    inv = o.matrix_world.inverted().to_3x3(); me = o.data
    for i, d in zip(ids, dz): me.vertices[i].co += inv@Vector((0, 0, d))
    me.update()
print('STONES_SETTLED', json.dumps({'sunk': len(sunk), 'feet': len(moves)-len(sunk)-carried, 'carried': carried}))

for img in bpy.data.images:
    if img.size[0] > 512 or img.size[1] > 512:
        s = 512 / max(img.size[0], img.size[1])
        img.scale(max(1, round(img.size[0] * s)), max(1, round(img.size[1] * s)))

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_cameras=False, export_lights=False,
    export_apply=True, export_image_format='WEBP', export_image_quality=80,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
    export_draco_position_quantization=14, export_draco_normal_quantization=8, export_draco_texcoord_quantization=11, export_draco_color_quantization=8)
total = [sum(v[0] for v in report.values()), sum(v[1] for v in report.values())]
print('OPTIMIZE', json.dumps({'out': out, 'vertices_before': total[0], 'vertices_after': total[1]}))

"""Bake a walk grid from a Blender v2 scene by ray casting the real geometry. Never saves the .blend.
blender -b <src>.blend --python scripts/bake-nav-v2.py -- <out.json>
Grid cell (i,j) is centred on game (x0+i*cell, z0+j*cell); game z = -Blender y.
Each row is a string: '.' blocked, otherwise chr(97+k) = walkable with floor height k*0.05 m.
"""
import bpy, sys, json
from mathutils import Vector
out = sys.argv[sys.argv.index('--') + 1]
# Soft scatter the hero walks through: grass, crops, foliage, lotus and reeds never block.
SOFT = ('Fine meadow grass blades','Fine outer tree leaves','Fine leafy canopy twigs','Organic tree foliage','Organic banyan foliage',
 'Shrub outer leaves','Organic understory shrubs','Stone moss patches','Dense rice blades','Rice seed heads','Reed seed heads',
 'Wetland reed leaves','Wetland reed stems','Cupped floating lotus pads','Layered lotus flower petals','Lotus flower stems',
 'Lotus golden centers','Lotus leaf veins','Palm feather leaflets','Palm curved frond ribs','Palm fruit bunches',
 'Banyan hanging aerial roots','Feathered road shoulders','Weathered curb stones','Rounded weathered stones','Island meadow',
 'Building / doorway shadow','Building / window darkness','Lantern / glowing paper','Arena inlays')
for o in list(bpy.data.objects):
    if o.type != 'MESH' or o.hide_render or o.name.split(' | ')[0] in SOFT:
        bpy.data.objects.remove(o, do_unlink=True)
scene = bpy.context.scene; dg = bpy.context.evaluated_depsgraph_get()
def cast(origin, direction, distance):
    hit, loc, normal, index, obj, mat = scene.ray_cast(dg, Vector(origin), Vector(direction), distance=distance)
    return (loc, obj.name) if hit else (None, None)
X0, Z0, CELL, N = -70, -70, 1, 141
STEP_MAX = .62   # anything higher than a bridge deck or raised floor is a wall/building
rows = []
for j in range(N):
    row = []
    for i in range(N):
        x, y = X0 + i * CELL, -(Z0 + j * CELL)
        # Five samples per cell: deck boards have gaps, so the highest solid hit wins over the water below.
        hits = [cast((x + dx, y + dy, 2.2), (0, 0, -1), 6) for dx, dy in ((0,0),(.3,.3),(-.3,.3),(.3,-.3),(-.3,-.3))]
        solid = [l for l, n in hits if l is not None and not n.startswith('Water surface')]
        loc = max(solid, key=lambda l: l.z) if solid else None
        ok = loc is not None and loc.z <= STEP_MAX and len(solid) >= 3
        if ok:
            h = max(0.0, loc.z) if loc.z > .15 else 0.0
            probe = h + .7
            for d in ((1,0,0),(-1,0,0),(0,1,0),(0,-1,0)):
                if cast((x, y, probe), d, .45)[0] is not None: ok = False; break
        row.append(chr(97 + min(25, round(h / .05))) if ok else '.')
    rows.append(''.join(row))
json.dump({'x0': X0, 'z0': Z0, 'cell': CELL, 'w': N, 'h': N, 'rows': rows}, open(out, 'w'))
print('NAV', out, sum(r.count('.') for r in rows), 'blocked of', N * N)

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

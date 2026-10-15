"""Bake soft ambient occlusion into a per-vertex colour on every building/prop, then export the runtime GLB.
Run after build_capital19.py:  blender -b maps/ayutthaya.blend --python bake_building_ao.py -- [samples]
The city is built from many small planks, posts and tiles, so per-vertex shading is detailed enough and needs no
lightmap atlas. Exports maps/ayutthaya.glb with COLOR_0 and Draco compression. The .blend file is not saved."""
import bpy, sys
from pathlib import Path
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SAMPLES = int(args[0]) if args else 64
ROOT = Path(bpy.data.filepath).parent.parent
SKIP_MATERIALS = {'ground19', 'water', 'earth'}
SKIP_PREFIXES = ('Living_canopy', 'Living canopy', 'Market_pottery', 'Market pottery')

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.world.light_settings.distance = 1.6  # crevices, eaves, under floors; not whole-building darkening
scene.render.bake.target = 'VERTEX_COLORS'
for o in bpy.data.objects:
    if o.name.startswith(SKIP_PREFIXES):
        o.hide_render = True

targets = [o for o in scene.objects if o.type == 'MESH' and not o.name.startswith(SKIP_PREFIXES)
           and o.active_material and o.active_material.name not in SKIP_MATERIALS]
bpy.ops.object.select_all(action='DESELECT')
for o in targets:
    attr = o.data.color_attributes.new(name='AO', type='BYTE_COLOR', domain='POINT')
    o.data.color_attributes.active_color = attr
    o.data.color_attributes.render_color_index = o.data.color_attributes.active_color_index
    o.select_set(True)
bpy.context.view_layer.objects.active = targets[0]
bpy.ops.object.bake(type='AO')
print('BAKED VERTEX AO', len(targets), 'objects', SAMPLES, 'samples')

bpy.ops.export_scene.gltf(filepath=str(ROOT / 'maps' / 'ayutthaya.glb'), export_format='GLB', export_cameras=False,
                          export_lights=False, export_yup=True, export_vertex_color='ACTIVE',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                          export_draco_position_quantization=16, export_draco_color_quantization=8)
print('EXPORTED', ROOT / 'maps' / 'ayutthaya.glb')

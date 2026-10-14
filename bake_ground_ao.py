"""Bake a top-down ambient-occlusion map of the capital ground (soft contact shadows around houses, under
raised floors, along walls and the quay). Does not modify the .blend.
Run: blender -b maps/ayutthaya.blend --python bake_ground_ao.py -- [size] [samples]
Output: assets/ground-ao.png covering three.js x in [-66,66], z in [-111,5] (Blender y in [-5,111])."""
import bpy, sys
from pathlib import Path
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SIZE = int(args[0]) if args else 1024
SAMPLES = int(args[1]) if len(args) > 1 else 64
OUT = Path(bpy.data.filepath).parent.parent / 'assets' / 'ground-ao.png'
# Ground19 box: centre (0,53), 132 x 116, top at z=0.055.
CX, CY, W, D, Z = 0.0, 53.0, 132.0, 116.0, 0.056

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.world.light_settings.distance = 3.5  # occlusion reach in metres: local contact shading, not whole-city darkening

# Objects hidden at runtime must not cast phantom occlusion.
for o in bpy.data.objects:
    if any(o.name.startswith(p) for p in ('Living_canopy', 'Living canopy', 'Market_pottery', 'Market pottery')):
        o.hide_render = True

bpy.ops.mesh.primitive_plane_add(size=1, location=(CX, CY, Z))
plane = bpy.context.active_object
plane.name = 'AO bake plane'
plane.scale = (W, D, 1)
bpy.ops.object.transform_apply(scale=True)

image = bpy.data.images.new('ground-ao', SIZE, SIZE, alpha=False, float_buffer=False)
image.colorspace_settings.name = 'Non-Color'
mat = bpy.data.materials.new('AO bake')
mat.use_nodes = True
node = mat.node_tree.nodes.new('ShaderNodeTexImage')
node.image = image
mat.node_tree.nodes.active = node
plane.data.materials.append(mat)

bpy.ops.object.select_all(action='DESELECT')
plane.select_set(True)
bpy.context.view_layer.objects.active = plane
bpy.ops.object.bake(type='AO', margin=4)

image.filepath_raw = str(OUT)
image.file_format = 'PNG'
image.save()
print('BAKED', OUT, SIZE, SAMPLES)

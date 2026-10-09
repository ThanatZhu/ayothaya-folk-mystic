"""Original Ayothaya graybox/art blockout. Run with Blender --background --python."""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
random.seed(42)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
palette = {
 'grass':'70864a','grass_light':'8d9b59','earth':'80634b','sand':'c6b381',
 'water':'478b8c','water_light':'83b9aa','stone':'9b997f','stone_dark':'757865',
 'wood':'765139','wood_dark':'473b2d','wood_light':'ab8050','wood_gold':'c29a5a',
 'roof':'b9603e','roof_light':'d78651','roof_dark':'944b35','gold':'d6af63',
 'leaf':'456647','leaf_light':'6e8649','leaf_dark':'344e3d','cloth':'8e3e3d',
 'jar':'9b7550','amber':'ffcd7c','cream':'dfce99','indigo':'48536c'
}
mats={}
for name,h in palette.items():
 linear=lambda c:c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))+(1,)
 m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Roughness'].default_value=.92
 if name=='amber':p.inputs['Emission Color'].default_value=m.diffuse_color;p.inputs['Emission Strength'].default_value=.35
 mats[name]=m
data={}
def mesh(group,material,verts,faces):
 v,f=data.setdefault((group,material),([],[]));offset=len(v);v.extend(verts);f.extend([tuple(offset+i for i in face) for face in faces])
def box(g,m,center,size):
 x,y,z=center;a,b,c=[s/2 for s in size]
 vs=[(x+i*a,y+j*b,z+k*c) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 mesh(g,m,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
def beam(g,m,a,b,r=.07,n=6,r2=None):
 a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
 if u.length<.01:u=axis.cross(Vector((0,1,0)))
 u.normalize();v=axis.cross(u);r2=r if r2 is None else r2
 vs=[tuple(p+(math.cos(t*math.tau/n)*u+math.sin(t*math.tau/n)*v)*radius) for p,radius in [(a,r),(b,r2)] for t in range(n)]
 mesh(g,m,vs,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
def crown(g,m,x,y,z,rx,ry,rz):
 n=9;vs=[(x,y,z-rz)];rings=[]
 for h,rr in [(-.6,.72),(0,1),(.6,.75)]:
  ring=[]
  for i in range(n):
   a=i*math.tau/n;ring.append(len(vs));vs.append((x+math.cos(a)*rx*rr,y+math.sin(a)*ry*rr,z+h*rz))
  rings.append(ring)
 top=len(vs);vs.append((x,y,z+rz));faces=[]
 for i in range(n):faces.append((0,rings[0][(i+1)%n],rings[0][i]));faces.append((top,rings[-1][i],rings[-1][(i+1)%n]))
 for a,b in zip(rings,rings[1:]):
  for i in range(n):j=(i+1)%n;faces.append((a[i],a[j],b[j],b[i]))
 mesh(g,m,vs,faces)
def roof(g,cx,cy,eave,width,depth,rise):
 # Steep Thai gable; low ends flare slightly, ridge runs north-south.
 profile=[(0,1),(.3,.68),(.68,.23),(1,0)]
 for side in [-1,1]:
  for (t1,z1),(t2,z2) in zip(profile,profile[1:]):
   for row in range(14):
    y1=cy-depth/2+row*depth/14;y2=y1+depth/14-.024
    x1=cx+side*t1*width/2;x2=cx+side*t2*width/2
    material=['roof','roof_light','roof','roof_dark'][row%4]
    mesh(g,material,[(x1,y1,eave+z1*rise),(x2,y1,eave+z2*rise),(x2,y2,eave+z2*rise),(x1,y2,eave+z1*rise)],[(0,1,2,3),(3,2,1,0)])
  beam(g,'wood_gold',(cx+side*width/2,cy-depth/2,eave),(cx+side*width/2,cy+depth/2,eave),.08)
 for y in [cy-depth/2,cy+depth/2]:
  for side in [-1,1]:
   for (t1,z1),(t2,z2) in zip(profile,profile[1:]):beam(g,'wood_gold',(cx+side*t1*width/2,y,eave+z1*rise+.04),(cx+side*t2*width/2,y,eave+z2*rise+.04),.075)
  beam(g,'gold',(cx,y,eave+rise-.1),(cx,y,eave+rise+.55),.065,r2=.012)
 beam(g,'roof_dark',(cx,cy-depth/2,eave+rise),(cx,cy+depth/2,eave+rise),.09)
def jar(g,x,y,z,s=1):
 beam(g,'jar',(x,y,z),(x,y,z+.13*s),.24*s,n=10,r2=.33*s)
 beam(g,'jar',(x,y,z+.13*s),(x,y,z+.49*s),.33*s,n=10,r2=.24*s)
 beam(g,'wood_dark',(x,y,z+.5*s),(x,y,z+.54*s),.23*s,n=10)
 beam(g,'jar',(x,y,z+.5*s),(x,y,z+.57*s),.25*s,n=10,r2=.23*s)
def house(cx,cy,g):
 w,d,floor=5.6,4.0,1.3;front=cy-d/2
 for x in [cx-w/2+.2,cx,cx+w/2-.2]:
  for y in [front-.9,cy,cy+d/2-.2]:
   post_height=3.1 if y==front-.9 else 3.5
   box(g,'wood_dark',(x,y,post_height/2),(.19,.19,post_height));box(g,'stone',(x,y,.1),(.4,.4,.2))
 for i in range(24):box(g,'wood_light' if i%3 else 'wood',(cx-w/2+(i+.5)*w/24,cy-.45,floor),(w/24-.015,d+.9,.15))
 # Walls and broad door opening onto shaded front veranda.
 for x in [cx-w/2,cx+w/2]:
  for i in range(17):box(g,'wood' if i%3 else 'wood_light',(x,front+(i+.5)*d/17,2.5),(.1,d/17-.014,2.25))
 for i in range(24):
  x=cx-w/2+(i+.5)*w/24
  box(g,'wood' if i%4 else 'wood_light',(x,cy+d/2,2.5),(w/24-.016,.1,2.25))
  if abs(x-cx)>.58:box(g,'wood' if i%4 else 'wood_light',(x,front,2.5),(w/24-.016,.1,2.25))
 box(g,'wood_dark',(cx,front+.15,2.1),(1.13,.12,1.55));box(g,'wood_gold',(cx,front-.05,3.15),(1.32,.15,.13))
 # Gables.
 for y in [front,cy+d/2]:
  mesh(g,'wood',[(cx-w/2,y,3.6),(cx+w/2,y,3.6),(cx,y,5.65)],[(0,1,2),(2,1,0)])
  beam(g,'wood_gold',(cx,y,3.6),(cx,y,5.65),.055)
  for t in [-1,1]:beam(g,'wood_light',(cx+t*2.45,y-.01,3.65),(cx,y-.01,5.5),.06)
 # Shutters, trim and horizontal ties.
 for x in [cx-1.65,cx+1.65]:
  box(g,'wood_dark',(x,front-.065,2.7),(.95,.1,1.0))
  for off in [-.43,.43]:box(g,'wood_gold',(x+off,front-.16,2.7),(.09,.16,1.08))
  for z in [2.2,3.2]:box(g,'wood_gold',(x,front-.16,z),(1.02,.16,.08))
  for off in [-.25,0,.25]:box(g,'wood_light',(x+off,front-.17,2.7),(.08,.08,.9))
 for z in [1.42,3.55]:box(g,'wood_dark',(cx,front-.04,z),(w+.1,.16,.13))
 roof(g,cx,cy,3.65,6.5,4.85,2.05)
 # Lower veranda roof, steps, and railing.
 mesh(g,'roof_dark',[(cx-3,front-.1,3.55),(cx+3,front-.1,3.55),(cx+3,front-1.5,3.0),(cx-3,front-1.5,3.0)],[(0,1,2,3),(3,2,1,0)])
 beam(g,'wood_gold',(cx-3,front-1.5,3),(cx+3,front-1.5,3),.08)
 for i in range(7):
  height=(7-i)*floor/7;box(g,'wood_light',(cx,front-1.15-i*.28,height/2),(1.3,.3,height))
 for side in [-1,1]:
  beam(g,'wood_dark',(cx+side*.75,front-1.1,2.1),(cx+side*.75,front-3.05,.65),.065)
  beam(g,'wood_dark',(cx+side*.75,front-3.05,0),(cx+side*.75,front-3.05,.75),.075)
  beam(g,'wood_dark',(cx+side*.8,front-1.0,2.05),(cx+side*2.7,front-1.0,2.05),.065)
  for t in range(8):box(g,'wood_light',(cx+side*(.85+t*.26),front-1,1.7),(.055,.07,.62))
 jar(g,cx-2.2,front-.5,1.39,.9);jar(g,cx+2.25,front-.5,1.39,.65)

# An isolated test district, not a reconstruction of a historical location.
box('Terrain','earth',(0,0,-.65),(22,18,.8))
box('Terrain','grass',(0,2.0,-.035),(22,14,.18))
box('Terrain','grass',(0,-8.0,-.035),(22,2,.18))
box('Canal','water',(0,-6,-.1),(22,2.0,.10))
for y in [-4.95,-7.05]:
 for x in range(-11,11):box('Canal','stone' if x%3 else 'stone_dark',(x+.5,y,-.02),(.96,.3,.43))
box('Paths','sand',(1,-.8,.075),(3.0,7.9,.035))
box('Paths','sand',(-.5,.5,.08),(13,2.1,.045))
box('Paths','sand',(1,-8.1,.075),(3.0,1.7,.035))
for i in range(170):
 x=random.uniform(-10.7,10.7);y=random.choice([random.uniform(-4.7,8.5),random.uniform(-8.8,-7.3)])
 if abs(x-1)<1.55 or (abs(y-.5)<1.1 and -7<x<6):continue
 box('Ground details','grass_light',(x,y,.08),(random.uniform(.08,.25),random.uniform(.06,.16),.015))
for i in range(42):box('Water ripples','water_light',(random.uniform(-10.6,10.6),random.uniform(-6.8,-5.2),-.035),(random.uniform(.15,.55),.035,.012))
house(-4,3.3,'Teak house')
# Bridge across canal, planks and posts.
for i in range(17):box('Bridge','wood_light' if i%3 else 'wood',(1,-7.4+(i+.5)*2.9/17,.32),(2.3,.15,.14))
for x in [-.2,2.2]:
 for y in [-7.4,-6,-4.5]:
  box('Bridge','wood_dark',(x,y,.48),(.17,.17,1.35));box('Bridge','wood_gold',(x,y,1.18),(.23,.23,.13))
 beam('Bridge','wood',(x,-7.4,.96),(x,-4.5,.96),.065)
# Spirit pavilion/shrine: sculptural blockout.
for z,w in [(.1,2.5),(.28,2.15),(.46,1.8)]:box('Spirit shrine','stone',(4.8,3.3,z),(w,w,.2))
box('Spirit shrine','wood_gold',(4.8,3.3,.88),(.42,.42,.75));box('Spirit shrine','wood_gold',(4.8,3.3,1.32),(1.8,1.55,.18))
for x in [4.1,5.5]:
 for y in [2.75,3.85]:box('Spirit shrine','wood_dark',(x,y,1.84),(.12,.12,1.05))
roof('Spirit shrine',4.8,3.3,2.35,2.25,1.9,.9)
box('Spirit shrine','gold',(4.8,3.45,1.69),(.34,.27,.55));box('Spirit shrine','cloth',(4.8,2.58,1.36),(1.0,.05,.2))
for x in [4.3,5.3]:beam('Spirit shrine','cream',(x,2.66,1.42),(x,2.66,1.8),.028);crown('Spirit shrine','amber',x,2.66,1.86,.055,.055,.1)
# Broad banyan and small trees. Built as low-poly masses ready for painted textures.
for idx,(x,y,s) in enumerate([(7.4,5.9,1.25),(-8.6,6.8,.82),(-9.2,-1.4,.7),(8.5,-1,.72),(-7.9,-8,.5)]):
 g=f'Tree {idx+1}';beam(g,'wood_dark',(x,y,0),(x+.1,y,3.2*s),.28*s,r2=.18*s)
 for k in range(5):
  a=k*math.tau/5;dx=math.cos(a)*1.25*s;dy=math.sin(a)*1.25*s
  beam(g,'wood',(x,y,1.8*s),(x+dx,y+dy,3.6*s),.13*s,r2=.07*s)
  crown(g,['leaf','leaf_light','leaf_dark'][k%3],x+dx,y+dy,3.85*s,1.5*s,1.4*s,1.05*s)
 crown(g,'leaf_light',x,y,4.65*s,1.55*s,1.45*s,1.05*s)
 if idx==0:
  for off in [-.3,0,.3]:box(g,'cloth',(x+off,y-.27,1.5),(.10,.05,.6))
  for k in range(6):
   a=k*math.tau/6;beam(g,'wood',(x+math.cos(a)*.2,y+math.sin(a)*.2,.65),(x+math.cos(a)*.85,y+math.sin(a)*.85,.04),.10,r2=.05)
# Lanterns and low stone route to shrine.
for x,y in [(2.8,-3.3),(3,1),(6.8,.3),(-7.5,-1.1)]:
 box('Lanterns','wood_dark',(x,y,.85),(.12,.12,1.7));box('Lanterns','amber',(x,y,1.76),(.24,.24,.36))
 box('Lanterns','wood_dark',(x,y,1.99),(.38,.38,.12));box('Lanterns','wood_dark',(x,y,1.55),(.30,.30,.08))
for i in range(5):box('Stepping stones','stone',(3.2+i*.35,1.35+i*.26,.14),(.54,.45,.1))
for x,y,s in [(6.4,2,.8),(-7.3,.2,1),(3.7,3.2,.5)]:jar('Clay jars',x,y,.08,s)
# Material-batched meshes in semantic collections, easy to find in Blender.
collections={}
for (group,material),(vs,fs) in data.items():
 if group not in collections:
  collection=bpy.data.collections.new(group);bpy.context.scene.collection.children.link(collection);collections[group]=collection
 me=bpy.data.meshes.new(group+' '+material);me.from_pydata(vs,[],fs);me.materials.append(mats[material]);me.update()
 ob=bpy.data.objects.new(group+' · '+material,me);collections[group].objects.link(ob)
 # Recalculate normals, including original roof double sides.
 bpy.context.view_layer.objects.active=ob;ob.select_set(True)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');ob.select_set(False)
scene=bpy.context.scene
scene.world.color=(.22,.26,.19)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.59,.48,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN',location=(0,0,12));sun=bpy.context.object;sun.name='Warm afternoon sun';sun.rotation_euler=(math.radians(28),math.radians(-25),math.radians(-30));sun.data.energy=2;sun.data.angle=.12
bpy.ops.object.camera_add(location=(23,-28,24));camera=bpy.context.object;camera.name='Game view — orthographic';camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=30;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'scene-preview.png')
scene['art_direction']='Concept 04 Folk Mystic; original 3D layout blockout, not final pixel textures.'
scene['coordinates']='Blender Z up. Dimensions in meters. Front is negative Y.'
scene['gameplay_note']='Walkable ground, water, stairs and navigation are authored separately from visuals.'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ayothaya-district-01.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'ayothaya-district-01.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_yup=True)
stats={'objects':sum(o.type=='MESH' for o in scene.objects),'vertices':sum(len(o.data.vertices) for o in scene.objects if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in scene.objects if o.type=='MESH')}
(OUT/'scene-stats.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
print('SCENE_STATS',stats,flush=True)
bpy.ops.render.render(write_still=True)
print('SCENE_COMPLETE',str(OUT),flush=True)

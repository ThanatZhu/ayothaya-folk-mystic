"""Version 03: wider courtyard; semantic groups support runtime ambient motion."""
from pathlib import Path
base=Path(__file__).with_name('build_scene.py').read_text(encoding='utf-8')
exec(compile(base.split('# An isolated test district')[0],str(Path(__file__)), 'exec'))
random.seed(404)
plain_roof=roof
def roof(g,cx,cy,eave,width,depth,rise):
 if g.startswith('House'):
  # A narrow steep upper gable rises above the broad flared lower eaves.
  plain_roof(g,cx,cy,eave-.14,width+.3,depth+.35,.9)
  plain_roof(g,cx,cy,eave+.70,width*.69,depth*.86,2.45)
  for y in [cy-depth*.43,cy+depth*.43]:
   mesh(g,'wood',[(cx-width*.345,y,eave+.69),(cx+width*.345,y,eave+.69),(cx,y,eave+3.15)],[(0,1,2)])
   for i in range(-8,9):
    h=max(.05,2.38-abs(i*.24)*1.05)
    box(g,'wood_gold',(cx+i*.24,y-.03,eave+.72+h/2),(.034,.07,h))
 else:plain_roof(g,cx,cy,eave,width,depth,rise)
palette_extra={'pink':'d98094','lily':'648348','reed':'647844','darkwater':'254c47','flame':'ffe4a2'}
for name,h in palette_extra.items():
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))+(1,);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Roughness'].default_value=.95;mats[name]=m

# Broad worn courtyard, river along its southern edge, soft broken vegetation borders.
box('Terrain','earth',(0,1.5,-.65),(29,23,.8))
box('Terrain','sand',(0,3.8,-.025),(29,18.4,.13))
box('River','water',(0,-7.4,-.18),(29,4,.12))
box('Far bank','earth',(0,-9.75,-.16),(29,.5,.5))
for y in [-5.35,-9.4]:
 for row in range(2):
  for i in range(42):
   x=-14.5+(i+.5)*29/42+(.12 if row else 0)
   box('River masonry','stone' if i%4 else 'stone_dark',(x,y,-.11+row*.24),(.66,.32,.22))
for i in range(240):
 x=random.uniform(-14.2,14.2);y=random.uniform(-5.1,12.6)
 if y>11 or abs(x)>12.7 or (x<-10.7 and y<3):
  rr=random.uniform(.4,.8)
  mesh('Garden soil','grass',[(x+math.cos(k*math.tau/9)*rr*random.uniform(.7,1.3),y+math.sin(k*math.tau/9)*rr*random.uniform(.7,1.3),.052) for k in range(9)],[tuple(range(9))])
for i in range(120):
 x=random.uniform(-13.8,13.8);y=random.uniform(-5,12)
 box('Courtyard fragments',random.choice(['stone','earth','sand']),(x,y,.065),(random.uniform(.04,.17),random.uniform(.05,.16),.02))

def decorated_house(x,y,g,s=1):
 house(x,y,g)
 # Secondary eaves, carved gable battens, ventilation slots, warm interior lamps.
 for yy in [y-2.01,y+2.01]:
  for i in range(-11,12):
   xx=i*.22;height=max(.1,1.75-abs(xx)*.70)
   box(g,'wood_gold',(x+xx,yy,3.65+height/2),(.035,.065,height))
 for yy in [y-2.18]:
  for xx in [-1.65,1.65]:
   box(g,'amber',(x+xx,yy+.1,2.64),(.75,.04,.84))
   for dx in [-.27,0,.27]:box(g,'wood_dark',(x+xx+dx,yy,2.64),(.06,.08,.95))
 for side in [-1,1]:
  # Shuttered side windows and lintels keep every rotating view authored.
  xx=x+side*2.87
  for yy in [y-.6,y+1]:
   box(g,'wood_dark',(xx,yy,2.65),(.08,.95,1.05))
   box(g,'amber',(xx+side*.045,yy,2.65),(.04,.68,.8))
   for off in [-.46,.46]:box(g,'wood_gold',(xx+side*.06,yy+off,2.65),(.1,.09,1.16))
   for zz in [2.1,3.2]:box(g,'wood_gold',(xx+side*.06,yy,zz),(.1,1.05,.09))
   for off in [-.25,0,.25]:box(g,'wood',(xx+side*.09,yy+off,2.65),(.08,.07,1))
  for i in range(8):
   box(g,'wood_gold',(x+side*2.8,y-2.7+i*.55,1.85),(.08,.055,.75))
  box(g,'wood_dark',(x+side*2.8,y-.8,2.25),(.11,4.1,.12))
 if s!=1:
  for (group,mat),(vs,fs) in data.items():
   if group==g:
    vs[:]=[(x+(a-x)*s,y+(b-y)*s,c*s) for a,b,c in vs]

decorated_house(-4,9,'House north',.91)
decorated_house(10,5.5,'House east',.88)

# Shrine sits under the sacred tree on the west of the central square.
sx,sy=-9.1,2.5
for z,w,d in [(.10,3.4,3),(.3,3.1,2.7),(.5,2.8,2.4)]:
 box('Shrine','stone',(sx,sy,z),(w,d,.2))
for x in [sx-.7,sx+.7]:
 for y in [sy-.55,sy+.55]:box('Shrine','wood_gold',(x,y,1.65),(.12,.12,1.5))
box('Shrine','wood_gold',(sx,sy,1.05),(1.9,1.6,.18))
box('Shrine','wood_dark',(sx,sy+.6,1.55),(1.45,.08,1.0))
roof('Shrine',sx,sy,2.4,2.65,2.35,1.05)
roof('Shrine',sx,sy,2.65,1.8,1.6,1.28)
box('Shrine','gold',(sx,sy,1.38),(.27,.22,.48))
for x in [sx-1,sx-.6,sx+.6,sx+1]:
 beam('Shrine offerings','cream',(x,sy-.9,.65),(x,sy-.9,1.03),.03)
 crown('Shrine offerings','flame',x,sy-.9,1.09,.035,.035,.08)
 jar('Shrine offerings',x,sy+.7,.62,.38)
for x in [sx-.9,sx+.9]:
 box('Shrine ribbons','cloth',(x,sy-.72,1.1),(.12,.04,.7))
 box('Shrine ribbons','cream',(x+.12,sy-.72,1.2),(.08,.04,.6))

def fence(x1,y1,x2,y2):
 length=math.hypot(x2-x1,y2-y1);steps=max(1,int(length/.4))
 for i in range(steps+1):
  t=i/steps;x=x1+(x2-x1)*t;y=y1+(y2-y1)*t
  beam('Village fences','wood_dark',(x,y,.08),(x,y,.85+(i%4==0)*.22),.05)
 for z in [.3,.74]:beam('Village fences','wood_light',(x1,y1,z),(x2,y2,z),.05)
for v in [(-13.8,-4.8,-2.5,-4.8),(1.6,-4.8,13.8,-4.8),(-13.8,-4.8,-13.8,12),(13.8,-4.8,13.8,12),(-13.8,12.2,13.8,12.2)]:fence(*v)

# Hand-built timber pier and narrow boat, fully three-dimensional.
for i in range(18):box('Pier','wood_light' if i%4 else 'wood',(-.5,-5.05-i*.135,.38),(2.5,.12,.13))
for x in [-1.65,.65]:
 for y in [-5.05,-7.35]:
  beam('Pier','wood_dark',(x,y,-.5),(x,y,.85),.095)
  beam('Pier','wood_gold',(x,y,.52),(x,y,.69),.11)
bx,by=3.15,-7.1
outline=[(-2,0),(-1.55,-.48),(-.7,-.65),(.8,-.65),(1.7,-.32),(2,0),(1.7,.32),(.8,.65),(-.7,.65),(-1.55,.48)]
vs=[(bx+x,by+y,.02) for x,y in outline]+[(bx+x*.92,by+y*.68,-.26) for x,y in outline]
mesh('River boat','wood_dark',vs,[(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)]+[tuple(range(10,20))])
for i in range(10):
 a=outline[i];b=outline[(i+1)%10];beam('River boat','wood_gold',(bx+a[0],by+a[1],.04),(bx+b[0],by+b[1],.04),.035)
for x in [-1.2,-.45,.4,1.15]:box('River boat','wood_light',(bx+x,by,-.02),(.25,.87,.1))
jar('River boat',bx+.7,by,-.01,.65);box('River boat','grass',(bx-.8,by,.12),(.55,.55,.27))
beam('River boat','wood_gold',(bx-1.5,by+.4,.15),(bx+1.5,by-.3,.20),.035)

# Market awning, pots and woven baskets beside the second house.
for x in [10.2,12.7]:
 for y in [-3.6,-2.0]:beam('Herbal stall','wood_dark',(x,y,.05),(x,y,2.2 if y==-2 else 1.95),.065)
mesh('Herbal stall','cream',[(10.05,-1.9,2.28),(12.85,-1.9,2.28),(12.85,-3.7,1.97),(10.05,-3.7,1.97)],[(0,1,2,3),(3,2,1,0)])
box('Herbal stall','wood',(11.45,-2.9,.75),(2.6,1,.15))
for x in [10.5,11.4,12.3]:jar('Market jars',x,-2.85,.84,.55)
for x,y in [(-11.1,2.2),(-7.7,2),(7.8,2.7),(13,-1.2),(-7,7.2),(12,8.8)]:jar('Garden jars',x,y,.1,random.uniform(.55,1))

# Reeds, lily pads and lotus petals break up the riverbank.
for i in range(75):
 x=random.uniform(-14,14);y=random.choice([random.uniform(-9.2,-8.5),random.uniform(-5.95,-5.55)])
 if -1.9<x<1:continue
 r=random.uniform(.09,.23)
 beam('Water lilies','lily',(x,y,-.09),(x,y,-.065),r,n=8)
 if i%6==0:
  for k in range(5):
   a=k*math.tau/5;crown('Lotus','pink',x+math.cos(a)*.07,y+math.sin(a)*.07,.01,.065,.065,.1)
for i in range(130):
 x=random.uniform(-14,14);y=random.choice([-5.1,-9.25])+random.uniform(-.1,.1)
 if -1.9<x<1:continue
 h=random.uniform(.15,.65);beam('River reeds','reed',(x,y,-.03),(x+.1,y,.1+h),.02,n=4,r2=.004)
for i in range(90):
 box('Water glints','water_light',(random.uniform(-14,14),random.uniform(-9.25,-5.55),-.105),(random.uniform(.04,.22),.018,.009))

torches=[(-3,-2.5),(2.5,-3.7),(-7.1,3.1),(7,5.6),(13,-4)]
for x,y in torches:
 beam('Torch stands','wood_dark',(x,y,.04),(x,y,1.35),.055)
 beam('Torch stands','gold',(x,y,1.1),(x,y,1.24),.18,n=8,r2=.23)
 crown('Torch flames','flame',x,y,1.39,.07,.07,.19)

# Real UV coordinates for export; continuous timber grain and roof slopes.
collections={}
for (group,material),(vs,fs) in data.items():
 if group not in collections:
  col=bpy.data.collections.new(group);bpy.context.scene.collection.children.link(col);collections[group]=col
 # Keep one winding per face. DoubleSide is a renderer material property.
 unique=[];seen=set()
 for f in fs:
  key=tuple(sorted(f))
  if key not in seen:unique.append(f);seen.add(key)
 me=bpy.data.meshes.new(group+' '+material);me.from_pydata(vs,[],unique);me.materials.append(mats[material]);me.update()
 uv=me.uv_layers.new(name='Texture UV')
 for poly in me.polygons:
  n=poly.normal;axis=max(range(3),key=lambda i:abs(n[i]))
  for li in poly.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co
   if material.startswith('roof'):u,t=v.y/2.2,v.x/2.2
   elif axis==2:u,t=v.x/2,v.y/2
   elif axis==1:u,t=v.x/1.8,v.z/2
   else:u,t=v.y/1.8,v.z/2
   if material=='sand':u,t=v.x/4,v.y/4
   if material=='grass':u,t=v.x/3,v.y/3
   uv.data[li].uv=(u,t)
 ob=bpy.data.objects.new(group+' · '+material,me);collections[group].objects.link(ob)
scene=bpy.context.scene;scene.world.color=(.15,.17,.11)
bpy.ops.object.camera_add(location=(23,-28,24));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=28;scene.camera=camera
scene['art_direction']='Folk Mystic v03: broad courtyard, river and wind animation assembled in viewer-folk.js and ambient-motion.js.'
scene['render_assets']='assets/materials.png, assets/flora.png, assets/people.png are source atlases; browser samples their 2x2 cells.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ayothaya-folk-mystic-03.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'ayothaya-folk-mystic-03.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_yup=True)
stats={'objects':sum(o.type=='MESH' for o in scene.objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in scene.objects if o.type=='MESH')}
(OUT/'folk-mystic-stats.json').write_text(json.dumps(stats,indent=2),encoding='utf-8');print('FOLK_MYSTIC_COMPLETE',stats,flush=True)

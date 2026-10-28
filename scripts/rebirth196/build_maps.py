"""Editable rough maps for the rebirth campaign. Blender 5.x, no add-ons.
blender -b --python scripts/rebirth196/build_maps.py -- --root <repository>
All layout coordinates are Blender X,Y; game coordinates are X,-Y.
"""
import bpy, bmesh, math, random, json, sys, argparse
from pathlib import Path
from collections import deque
from mathutils import Vector

args=argparse.ArgumentParser();args.add_argument('--root',required=True);args.add_argument('--only');a=args.parse_args(sys.argv[sys.argv.index('--')+1:]);ROOT=Path(a.root)
OUT=ROOT/'maps'/'rebirth196';LAY=ROOT/'scripts'/'rebirth196'/'layouts';OUT.mkdir(parents=True,exist_ok=True);LAY.mkdir(parents=True,exist_ok=True)
IDS=['rebirth-ferry','rebirth-kalpa','rebirth-gandharva','rebirth-rahu','rebirth-sithandon']
NAMES=['ท่าน้ำข้ามภพ','ป่ากัลปพฤกษ์','นครคนธรรพ์ลอยฟ้า','แดนอสูรราหู','ฝั่งทะเลสีทันดร']
LEVELS=[[1,20],[20,40],[40,60],[60,80],[80,99]]
COLORS=[['304b46','51776b','866948','244e59'],['526645','82945a','b29a5b','528f88'],['8c9994','bfccba','c6a676','8eafbf'],['28292e','454145','77604c','b34023'],['b5a66a','dad0a0','cba453','398e9d']]
SOFT=('Fine meadow grass blades','Organic understory shrubs','Fine leafy canopy twigs','Stone moss patches','Wetland reed leaves','Cupped floating lotus','Lotus golden','Backdrop cloud')
def layout(i):
 p=IDS[i-1] if i else 'ayutthaya';portals={p:[0,66]}
 if i<4:portals[IDS[i+1]]=[0,-66]
 l=dict(id=IDS[i],name=NAMES[i],draft=True,units='metres',coordinateSystem='Blender XY, Z up; game x=X,z=-Y',spawn=[0,60],portals=portals,level=LEVELS[i],water=[],bridges=[],roads=[],plazas=[],districts={},npcs={},monsterAreas=[],bossArena=[0,-49,20],notes=['Rough layout for Claude to refine. Preserve connected gameplay routes and portal coordinates.'])
 if i in [0,1,3]:
  l['roads']=[[[0,68],[-28,48],[-30,15],[-30,-27],[0,-51],[0,-68],9],[[0,55],[30,44],[32,7],[30,-29],[0,-51],8],[[-44,27],[-30,27],[30,27],[45,27],8],[[-44,-25],[-30,-25],[30,-25],[44,-25],8]]
  l['plazas']=[[-31,28,18,18],[31,28,18,18],[-31,-24,18,18],[31,-24,18,18],[0,58,18,16],[0,-49,36,32]]
  l['bridges']=[[[-15,27],[15,27],9],[[-15,-25],[15,-25],9]]
  l['water']=[[0,0,22 if i==0 else 10 if i==1 else 14,88]]
 if i==0:
  l['districts']={'ท่ายายจันทร์':[0,57],'เรือนแพร้าง':[-31,4],'ดงกกริมตลิ่ง':[33,-5],'ท่าน้ำโบราณ':[0,-49]};l['npcs']={'ยายจันทร์':[6,58]}
 if i==1:
  l['water'].append([46,7,19,23]);l['districts']={'สระบัวกินรี':[30,10],'ต้นกัลปพฤกษ์':[0,0],'ทุ่งดอกไม้':[-31,27],'หน้าผารังหัสดีลิงค์':[0,-49]};l['npcs']={'ยายจันทร์':[6,58],'มาลัย':[29,9]}
 if i==2:
  l['islands']=[[0,57,30,25],[-32,23,29,26],[32,23,29,26],[-32,-20,29,26],[32,-20,29,26],[0,0,26,24],[0,-49,43,38]]
  edges=[([0,57],[-32,23]),([0,57],[32,23]),([-32,23],[-32,-20]),([32,23],[32,-20]),([-32,-20],[0,-49]),([32,-20],[0,-49]),([-32,23],[0,0]),([0,0],[32,-20]),([32,23],[0,0]),([0,0],[-32,-20])]
  l['bridges']=[[p,q,8] for p,q in edges];l['roads']=[[[0,68],[0,57],9],[[0,-49],[0,-68],9]];l['plazas']=[[-32,23,18,18],[32,23,18,18],[-32,-20,18,18],[32,-20,18,18],[0,0,18,18]]
  l['districts']={'เกาะกระดิ่งลม':[0,57],'หอดนตรี':[0,0],'สวนเมฆ':[-32,-20],'หอระฆังใหญ่':[0,-49]};l['npcs']={'ยายจันทร์':[6,58],'ทิพย์สุวรรณ':[5,5]}
 if i==3:
  l['districts']={'ศาลานางจันทรา':[0,57],'ซากวิหารอสูร':[-31,-6],'ทุ่งเสาหินแตก':[32,27],'หลุมราหู':[0,-49]};l['npcs']={'ยายจันทร์':[6,58],'นางจันทรา':[-6,57]};l['bossArena']=[0,-49,22];l['waterType']='cooled-lava'
 if i==4:
  l['water']=[[0,0,132,132]];l['rings']=[[12+6*k,15+6*k] for k in range(7)];l['roads']=[[[0,68],[0,-68],9],[[-38,25],[38,25],8],[[-38,-18],[38,-18],8],[[-32,27],[-32,-20],[0,-49],8],[[32,27],[32,-20],[0,-49],8]]
  l['bridges']=[[[0,58],[0,28],9],[[0,21],[0,-21],9],[[0,-29],[0,-59],9]];l['plazas']=[[-31,24,18,18],[31,24,18,18],[-31,-18,18,18],[31,-18,18,18],[0,0,22,20],[0,-49,44,34],[0,59,18,16]]
  l['districts']={'ท่าเรือทอง':[0,59],'ศาลารวมขวัญ':[0,0],'สะพานแก้ว':[0,26],'ศาลาไฟต้นแสง':[0,-49]};l['npcs']={'ยายจันทร์':[6,58],'พระปัญญา':[5,5],'มาลัย':[-6,5],'ทิพย์สุวรรณ':[6,-6],'นางจันทรา':[-6,-6]};l['bossArena']=[0,-49,24]
 centres=[[-31,27],[31,27],[-31,-23],[31,-23]] if i!=2 else [[-32,23],[32,23],[-32,-20],[32,-20]]
 for n,c in enumerate(centres):l['monsterAreas'].append({'name':'camp-'+str(n+1),'center':c,'radius':7,'level':str(LEVELS[i][0]+n*4)+'-'+str(min(LEVELS[i][1],LEVELS[i][0]+n*4+4))})
 return l

MATS={};MESHES={};CURRENT=None
def mat(key,color,glow=0):
 if key not in MATS:
  m=bpy.data.materials.new(key);rgb=[int(color[j:j+2],16)/255 for j in [0,2,4]];m.diffuse_color=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=m.diffuse_color;n.inputs['Roughness'].default_value=.88
  if glow:n.inputs['Emission Color'].default_value=m.diffuse_color;n.inputs['Emission Strength'].default_value=glow
  MATS[key]=m
 return MATS[key]
def group(name):
 global CURRENT
 c=bpy.data.collections.get(name)
 if not c:c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c)
 CURRENT=c
def move(o,name,material):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 CURRENT.objects.link(o)
 if material:o.data.materials.clear();o.data.materials.append(material)
 return o
def box(name,loc,size,m):
 key=('box',m.name)
 if key not in MESHES:
  me=bpy.data.meshes.new('Shared box');me.from_pydata([(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)],[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);me.materials.append(m);MESHES[key]=me
 o=bpy.data.objects.new(name,MESHES[key]);CURRENT.objects.link(o);o.location=loc;o.scale=size;return o
def cone(name,loc,r1,r2,h,m,verts=10):
 vs=[(math.cos(k/verts*math.tau)*r,math.sin(k/verts*math.tau)*r,z) for r,z in [(r1,-h/2),(r2,h/2)] for k in range(verts)];faces=[tuple(reversed(range(verts))),tuple(range(verts,verts*2))]+[(k,(k+1)%verts,verts+(k+1)%verts,verts+k) for k in range(verts)];o=mesh(name,vs,faces,m);o.location=loc;return o
def ball(name,loc,scale,m,sub=1):
 key=('ball',sub,m.name)
 if key not in MESHES:
  me=bpy.data.meshes.new('Shared foliage');bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=sub,radius=1);bm.to_mesh(me);bm.free();me.materials.append(m);MESHES[key]=me
 o=bpy.data.objects.new(name,MESHES[key]);CURRENT.objects.link(o);o.location=loc;o.scale=scale;return o
def mesh(name,verts,faces,m):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);CURRENT.objects.link(o);me.materials.append(m);return o
def strip(name,p,q,width,top,m,depth=.12):
 length=math.dist(p,q);o=box(name,((p[0]+q[0])/2,(p[1]+q[1])/2,top-depth/2),(width,length,depth),m);o.rotation_euler.z=math.atan2(q[1]-p[1],q[0]-p[0])-math.pi/2;return o
def ramp(name,p,q,w,high,m):
 d=Vector((q[0]-p[0],q[1]-p[1]));d.normalize();n=Vector((-d.y,d.x))*w/2;vs=[(p[0]+n.x,p[1]+n.y,.05),(p[0]-n.x,p[1]-n.y,.05),(q[0]-n.x,q[1]-n.y,high),(q[0]+n.x,q[1]+n.y,high)];return mesh(name,vs,[(0,1,2,3)],m)
def bridge(p,q,w,m,rope):
 strip('Bridge deck',p,q,w,.48,m,.28);d=Vector((q[0]-p[0],q[1]-p[1]));d.normalize();n=Vector((-d.y,d.x))
 for sign in [-1,1]:
  aa=Vector(p)+n*(w/2-.2)*sign;bb=Vector(q)+n*(w/2-.2)*sign;strip('Bridge rail',aa,bb,.12,1.35,rope,.14)
  for t in [0,.25,.5,.75,1]:
   v=aa.lerp(bb,t);box('Bridge post',(v.x,v.y,.8),(.2,.2,1.6),rope)
 ramp('Bridge access ramp',Vector(p)-d*4,p,w,.48,m);ramp('Bridge access ramp',Vector(q)+d*4,q,w,.48,m)
def pavilion(x,y,m,gold,scale=1):
 box('Pavilion floor',(x,y,.21),(8*scale,8*scale,.4),m)
 for dx,dy in [(-3,-3),(-3,3),(3,-3),(3,3)]:box('Pavilion pillar',(x+dx*scale,y+dy*scale,2.5*scale),(.4*scale,.4*scale,5*scale),gold)
 vs=[(x-5*scale,y-5*scale,4.8*scale),(x+5*scale,y-5*scale,4.8*scale),(x,y-5*scale,8.1*scale),(x-5*scale,y+5*scale,4.8*scale),(x+5*scale,y+5*scale,4.8*scale),(x,y+5*scale,8.1*scale)]
 mesh('Thai layered pavilion roof',vs,[(0,2,5,3),(2,1,4,5)],m)
 for dy in [-5,5]:cone('Roof chofa',(x,y+dy*scale,8.6*scale),.28,.03,1.6*scale,gold,6)
def tree(x,y,rng,bark,leaf,scale=1):
 cone('Tree trunk',(x,y,3*scale),.65*scale,.38*scale,6*scale,bark)
 for dx,dy,dz in [(0,0,7),(-2,1,6),(2,0,6),(0,-2,6)]:ball('Fine leafy canopy twigs | crown',(x+dx*scale,y+dy*scale,dz*scale),(3.4*scale,3.6*scale,2.5*scale),leaf,1)
def segment_distance(p,a,b):
 v=Vector(b)-Vector(a);w=Vector(p)-Vector(a);t=max(0,min(1,w.dot(v)/max(.001,v.dot(v))));return (w-v*t).length
def reserved(l,x,y):
 if any(abs(x-cx)<w/2+3 and abs(y-cy)<d/2+3 for cx,cy,w,d in l['plazas']):return True
 if any(math.dist((x,y),v)<6 for v in [l['spawn'],*l['portals'].values(),*l['npcs'].values()]):return True
 if math.dist((x,y),l['bossArena'][:2])<l['bossArena'][2]+2:return True
 return any(segment_distance((x,y),p,q)<road[-1]/2+3 for road in l['roads'] for p,q in zip(road[:-2],road[1:-1])) or any(segment_distance((x,y),p,q)<w/2+3 for p,q,w in l['bridges'])
def annulus(name,r1,r2,z,m):
 n=64;vs=[(math.cos(k/n*math.tau)*r,math.sin(k/n*math.tau)*r,z) for r in [r1,r2] for k in range(n)];return mesh(name,vs,[(k,n+k,n+(k+1)%n,(k+1)%n) for k in range(n)],m)
def build(i,l):
 global MATS,MESHES
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for c in list(bpy.data.collections):
  if c.name!='Collection' and not c.objects:bpy.data.collections.remove(c)
 MATS={};MESHES={};rng=random.Random(19600+i);c=COLORS[i];ground=mat('Earth',c[0]);leaf=mat('Foliage',c[1]);roadmat=mat('Road',c[2]);water=mat('Cooled lava' if i==3 else 'Ayothaya_water',c[3],.25 if i==3 else 0);gold=mat('Warm aged gold','bc9655');wood=mat('Dark teak','4c3b2c');rock=mat('Rock','555d5a' if i!=3 else '383139');glow=mat('Lantern glow','ffd480',.8)
 group('01 Terrain')
 if i!=2:box('Ground',(0,0,-.61),(180,180,1.2),ground)
 else:
  for x,y,w,d in l['islands']:
   box('Island meadow',(x,y,.12),(w,d,.24),ground);cone('Floating island cliff',(x,y,-5),min(w,d)*.25,min(w,d)*.55,10,rock,10)
 group('02 Roads and plazas')
 for road in l['roads']:
  for p,q in zip(road[:-2],road[1:-1]):strip('Streets | quest route',p,q,road[-1],.09 if i!=4 else .32,roadmat)
 for x,y,w,d in l['plazas']:box('Courtyard | combat clearing',(x,y,.13),(w,d,.24),ground)
 bx,by,r=l['bossArena'];cone('Spirit arena paved',(bx,by,.15),r,r,.28,ground,48);annulus('Arena inlays | boss boundary',r-1,r,.305,gold).location=(bx,by,0)
 group('03 Water')
 if i==4:
  for inner,outer in l['rings']:annulus('Water surface | Sithandorn ring',inner,outer,0,water)
 elif i!=2:
  for x,y,w,d in l['water']:box('Water surface | '+('cooled lava' if i==3 else 'river'),(x,y,-.04),(w,d,.08),water)
 group('04 Bridges')
 for p,q,w in l['bridges']:bridge(p,q,w,roadmat,wood if i<3 else gold)
 group('05 Landmarks')
 if i==0:
  pavilion(-9,58,wood,gold,.7)
  for x,y in [(-47,6),(44,-4),(-47,-9)]:pavilion(x,y,wood,gold,.8)
  for x,y in [(-7,-48),(7,-48)]:cone('Broken jetty post',(x,y,1),.4,.3,2,wood)
 if i==1:
  tree(0,0,rng,wood,leaf,2.3);pavilion(33,9,wood,gold,.8)
  for k in range(18):
   angle=rng.random()*math.tau;rr=rng.uniform(2,6);ball('Kalpa jewel fruit',(math.cos(angle)*rr,math.sin(angle)*rr,rng.uniform(10,17)),(.4,.4,.65),gold)
  cone('Hastilinga nest',(0,-55,.5),6,7,1,wood,12)
 if i==2:
  pavilion(0,0,roadmat,gold,.85);pavilion(0,-56,roadmat,gold,.9)
  for x,y in [(-4,59),(4,59),(-7,-52),(7,-52)]:cone('Golden wind bell',(x,y,3.2),.55,.25,1.2,gold)
 if i==3:
  pavilion(-9,58,rock,gold,.7)
  for k in range(9):
   x=-45+(k%3)*5;y=-10+(k//3)*5;cone('Ruined temple column',(x,y,2),.7,.6,4+rng.random()*3,rock,7)
  cone('Rahu eclipse disc',(0,-86,27),8,8,.4,mat('Eclipse ember','e27740',.7),48).rotation_euler.x=math.pi/2
 if i==4:
  pavilion(0,0,gold,wood,.8);pavilion(0,-51,gold,wood,1.1);cone('Flame basin',(0,-49,.8),2.5,2,1.2,gold,12);ball('Source flame',(0,-49,3),(1.1,1.1,2),glow,2)
  for z,r in [(0,17),(13,13),(25,9),(36,5),(45,2)]:cone('Mount Sumeru terrace',(0,-88,z+2),r,r*.75,5,gold,8)
 group('06 Landscape')
 for k in range(95 if i!=2 else 0):
  x,y=rng.uniform(-67,67),rng.uniform(-67,67)
  if reserved(l,x,y):continue
  if i in [0,1,3] and any(abs(x-cx)<w/2+2 and abs(y-cy)<d/2+2 for cx,cy,w,d in l['water']):continue
  if i<2:tree(x,y,rng,wood,leaf,rng.uniform(.65,1.05))
  elif i==3:cone('Basalt spire',(x,y,2),rng.uniform(1,2),.3,rng.uniform(3,8),rock,6)
  else:ball('Golden shore rock',(x,y,1),(2,2,1.5),ground)
 for k in range(45):
  angle=k/45*math.tau;x,y=math.cos(angle)*81,math.sin(angle)*81
  if i==2:ball('Backdrop cloud',(x,y,-13),(12,9,4),mat('Clouds','c5d5d0'),2)
  elif i<2:tree(x,y,rng,wood,leaf,1.3)
  else:ball('Backdrop ridge',(x,y,5),(7,6,7),rock,1)
 group('07 Soft details')
 for k in range(160 if i<2 else 0):
  x,y=rng.uniform(-62,62),rng.uniform(-62,62)
  if not reserved(l,x,y):cone('Fine meadow grass blades | tuft',(x,y,.2),.35,0,.7,leaf,4)
 if i==0:
  for k in range(45):
   x,y=rng.uniform(-9,9),rng.uniform(-41,41);cone('Cupped floating lotus | lantern',(x,y,-.03),.45,.24,.16,gold,8);ball('Lotus golden | lantern light',(x,y,.18),(.17,.17,.3),glow)
 scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.world.color=(.3,.3,.3)

def bake_nav(l):
 for o in list(bpy.data.objects):
  if o.type!='MESH' or o.name.startswith(SOFT):bpy.data.objects.remove(o,do_unlink=True)
 bpy.context.view_layer.update();scene=bpy.context.scene;dg=bpy.context.evaluated_depsgraph_get();rows=[]
 for j in range(141):
  row=[]
  for k in range(141):
   x,y=-70+k,70-j;solid=[]
   for dx,dy in [(0,0),(.3,.3),(-.3,.3),(.3,-.3),(-.3,-.3)]:
    hit,loc,normal,face,obj,matrix=scene.ray_cast(dg,Vector((x+dx,y+dy,3)),Vector((0,0,-1)),distance=4)
    if hit and not obj.name.startswith('Water surface') and -.05<=loc.z<=.62:solid.append(loc.z)
   row.append(chr(97+round(max(solid)*20)) if len(solid)>=3 else '.')
  rows.append(row)
 start=(round(l['spawn'][0])+70,70-round(l['spawn'][1]));todo=deque([start]);seen={start}
 while todo:
  x,y=todo.popleft()
  for xx,yy in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
   if 0<=xx<141 and 0<=yy<141 and rows[yy][xx]!='.' and (xx,yy) not in seen:seen.add((xx,yy));todo.append((xx,yy))
 removed=0
 for j in range(141):
  for k in range(141):
   if rows[j][k]!='.' and (k,j) not in seen:rows[j][k]='.';removed+=1
 grid=dict(x0=-70,z0=-70,cell=1,w=141,h=141,rows=[''.join(row) for row in rows]);(OUT/(l['id']+'.nav.json')).write_text(json.dumps(grid),encoding='utf-8');return len(seen),removed

report=[]
for i in range(5):
 if a.only and IDS[i]!=a.only:continue
 l=layout(i);build(i,l);bpy.context.view_layer.update();triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH')
 blend=OUT/(l['id']+'.blend');glb=OUT/(l['id']+'.glb');bpy.ops.wm.save_as_mainfile(filepath=str(blend));bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
 cells,removed=bake_nav(l);l['nav']='maps/rebirth196/'+l['id']+'.nav.json';(LAY/(l['id']+'.json')).write_text(json.dumps(l,ensure_ascii=False,indent=2),encoding='utf-8')
 assert triangles<250000 and glb.stat().st_size<5_000_000
 report.append(dict(id=l['id'],name=l['name'],scene='maps/rebirth196/'+l['id']+'.glb',source='maps/rebirth196/'+l['id']+'.blend',layout='scripts/rebirth196/layouts/'+l['id']+'.json',triangles=triangles,bytes=glb.stat().st_size,walkableCells=cells,orphanCellsBlocked=removed));print('REBIRTH MAP',json.dumps(report[-1],ensure_ascii=False),flush=True)
(OUT/'manifest.json').write_text(json.dumps(dict(schema=1,draft=True,maps=report),ensure_ascii=False,indent=2),encoding='utf-8')

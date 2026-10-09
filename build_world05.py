"""Six original fantasy town districts. Blender --background --python build_world05.py.
Geometry and matching collision/navigation metadata are authored together.
Names evoke Thai places; layouts are fictional game environments.
"""
from pathlib import Path
import copy
source=Path(__file__).with_name('build_folk_motion.py').read_text(encoding='utf-8')
exec(compile(source.split('# Real UV coordinates')[0],__file__,'exec'))
template=copy.deepcopy(data)
WORLD=OUT/'maps'; WORLD.mkdir(exist_ok=True)
for name,h in {'brick':'ba7350','plaster':'ddd6bb','paving':'aaa08c','meadow':'8b9560','sail':'d8c9a5'}.items():
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))+(1,);mats[name]=m
catalog=[]

def obstacle(x,y,w,d):
 cfg['nav']['obstacles'].append({'x':x-w/2,'z':-y-d/2,'w':w,'d':d})

def plant(kind,x,y,w,h,flip=False):
 cfg['plants'].append([kind,x,-y,w,h,flip])
 if kind in ['tree','forest','palm','bamboo']:cfg['nav']['props'].append([x,-y,.6])

def npc(name,x,y,texture=1,text='ยินดีต้อนรับนักเดินทาง'):
 cfg['npcs'].append({'name':name,'x':x,'z':-y,'texture':texture,'text':text})
 cfg['nav']['props'].append([x,-y,.36])

def home(x,y,s=1):
 decorated_house(x,y,'House '+str(len(cfg['nav']['obstacles'])),s)
 obstacle(x,y-1.45*s,6.7*s,7.3*s)
 for xx in [-2.5,2.5]:plant('pots',x+xx*s,y-3*s,1.1,1.2)

def shrine(x,y):
 for (g,m),(vs,fs) in template.items():
  if g.startswith('Shrine'):mesh(g,m,[(a+x+9.1,b+y-2.5,c) for a,b,c in vs],fs)
 obstacle(x,y,3.5,3.1)

def stupa(x,y,s=1,white=True):
 g='Sacred chedi';mat='plaster' if white else 'brick'
 for i in range(4):box(g,mat,(x,y,(.18+i*.27)*s),((5-i*.6)*s,(5-i*.6)*s,.28*s))
 beam(g,mat,(x,y,1.2*s),(x,y,2.8*s),1.7*s,24,r2=1.15*s)
 beam(g,mat,(x,y,2.8*s),(x,y,3.4*s),1.15*s,24,r2=.65*s)
 for i in range(9):beam(g,'gold',(x,y,(3.4+i*.22)*s),(x,y,(3.56+i*.22)*s),(.7-i*.065)*s,16,r2=(.64-i*.065)*s)
 beam(g,'gold',(x,y,5.35*s),(x,y,6.5*s),.14*s,8,r2=.01)
 obstacle(x,y,5.1*s,5.1*s)

def prang(x,y,s=1):
 g='Lavo brick prang'
 for i in range(5):box(g,'brick',(x,y,(.15+i*.25)*s),((5.5-i*.5)*s,(5.5-i*.5)*s,.3*s))
 box(g,'brick',(x,y,2.8*s),(2.9*s,2.9*s,3.1*s))
 for side in [-1,1]:
  box(g,'wood_dark',(x,y+side*1.46*s,2.5*s),(1.1*s,.04,1.9*s))
  for dx in [-.7,.7]:box(g,'paving',(x+dx*s,y+side*1.52*s,2.5*s),(.15*s,.17*s,2.2*s))
  box(g,'brick',(x+side*1.47*s,y,2.5*s),(.18*s,1.7*s,2.4*s))
 for i in range(9):
  w=(3.4-i*.3)*s;z=(4.3+i*.4)*s
  box(g,'brick',(x,y,z),(w,w,.34*s))
  for a in range(4):
   angle=a*math.pi/2;crown(g,'brick',x+math.cos(angle)*w*.44,y+math.sin(angle)*w*.44,z+.19*s,.18*s,.18*s,.30*s)
 beam(g,'brick',(x,y,7.8*s),(x,y,8.5*s),.26*s,8,r2=.03)
 obstacle(x,y,5.6*s,5.6*s)

def stall(x,y,color='cloth'):
 g='Market canopy '+str(len(cfg['nav']['obstacles']))
 for dx in [-1.3,1.3]:
  for dy in [-.8,.8]:beam(g,'wood_dark',(x+dx,y+dy,.1),(x+dx,y+dy,2.1+dy*.15),.065)
 mesh(g,color,[(x-1.5,y-1,1.95),(x+1.5,y-1,1.95),(x+1.5,y+1,2.28),(x-1.5,y+1,2.28)],[(0,1,2,3)])
 box(g,'wood',(x,y,.8),(2.8,1.25,.15))
 for i in range(4):jar(g,x-1+i*.65,y,.88,.5)
 obstacle(x,y,3,2)

def flag(x,y,color='cloth'):
 beam('Banner poles','wood_dark',(x,y,.1),(x,y,3),.065)
 mesh('City banners',color,[(x,y,2.85),(x+.65,y,2.85),(x+.65,y,1.2),(x,y,1.3)],[(0,1,2,3)])

def wall(x1,x2,y,white=True):
 mat='plaster' if white else 'brick';box('City rampart',mat,((x1+x2)/2,y,1.25),(x2-x1,.65,2.5))
 for i in range(int(x2-x1)):
  x=x1+.5+i;box('City rampart',mat,(x,y,2.7),(.6,.7,.5))
 obstacle((x1+x2)/2,y,x2-x1,.7)

def field(x,y,w,d):
 box('Rice terrace','earth',(x,y,.11),(w,d,.16))
 box('Rice irrigation','water',(x,y,.205),(w-.3,d-.3,.025))
 for i in range(int(w*3)):
  for j in range(int(d*2)):
   xx=x-w/2+.2+i/3;yy=y-d/2+.25+j/2
   for k in [-1,1]:beam('Rice shoots','reed',(xx,yy,.22),(xx+k*.10,yy,.66+random.random()*.2),.02,4,r2=.005)
 obstacle(x,y,w,d)
 for i in range(7):
  for j in range(4):plant('rice',x-3+i,y-1.5+j,1.2,1.2)

def begin(id,name,subtitle,color,safe=False):
 global data,cfg
 data={};random.seed(sum(map(ord,id)))
 cfg={'id':id,'name':name,'subtitle':subtitle,'color':color,'safe':safe,'model':'maps/'+id+'.glb','spawn':{'x':0,'z':0},'nav':{'zones':[{'x':-17.4,'z':-21.7,'w':34.8,'d':26},{'x':-1.7,'z':3.7,'w':2.4,'d':3.65}],'obstacles':[],'props':[]},'plants':[],'npcs':[],'mobs':[],'portals':[],'landmarks':[],'leafSources':[]}
 # Reuse authored riverside details and the moving moored boat, with a wider bank.
 for (g,m),(vs,fs) in template.items():
  if g in ['River','Far bank','River masonry','River boat','Pier','Water lilies','Lotus','River reeds']:
   scale=1 if g in ['River boat','Pier'] else 36/29
   mesh(g,m,[(a*scale,b,c) for a,b,c in vs],fs)
 box('Terrain','earth',(0,6,-.66),(36,31,.8))
 box('Terrain','sand',(0,8.3,-.025),(36,27.4,.13))
 regional='palm' if id=='nakhon' else 'bamboo' if id=='suphan' else 'forest'
 for x in [-17,17]:
  for y in range(-3,22,3):plant('banana' if y%2 else regional,x,y,3 if y%2 else 4.6,4.2 if y%2 else 5.6,x<0)
 for x in range(-15,18,3):plant(regional,x,22,5,6,x<0)
 for x in range(-17,18,2):
  if abs(x+.5)>2:plant('hedge',x,-4.8,2.1,1)
 for x in [-17,17]:
  for y in range(-3,21,2):plant('hedge',x,y,2.1,1.1)
 for i in range(130):
  x=random.uniform(-17.4,17.4);y=random.uniform(-5,21.6)
  box('Courtyard fragments',random.choice(['stone','earth','sand']),(x,y,.06),(.06+random.random()*.1,.07,.015))
 for x,y in [(-4,-3.3),(4,-3.3),(-7,7),(7,7)]:
  beam('Torch stands','wood_dark',(x,y,.1),(x,y,1.35),.055)
  crown('Torch flames','flame',x,y,1.39,.07,.07,.19)
  cfg['nav']['props'].append([x,-y,.18])
 cfg['leafSources']=[[p[1],p[4]*.8,p[2]] for p in cfg['plants'] if p[0] in ['tree','forest','palm','bamboo']]

def finish():
 if cfg['id']!='ayutthaya':
  cfg['portals']=[{'to':'ayutthaya','x':0,'z':2.7,'label':'กลับอยุธยา'}]
  flag(-1.2,-2.7);flag(1.2,-2.7)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for (g,m),(vs,fs) in data.items():
  unique=[];seen=set()
  for f in fs:
   key=tuple(sorted(f))
   if key not in seen:unique.append(f);seen.add(key)
  me=bpy.data.meshes.new(g+' '+m);me.from_pydata(vs,[],unique);me.materials.append(mats[m]);me.update()
  uv=me.uv_layers.new(name='Pixel texture UV')
  for poly in me.polygons:
   axis=max(range(3),key=lambda i:abs(poly.normal[i]))
   for li in poly.loop_indices:
    v=me.vertices[me.loops[li].vertex_index].co
    u,t=(v.y/2.2,v.x/2.2) if m.startswith('roof') else (v.x/2,v.y/2) if axis==2 else (v.x/1.8,v.z/2) if axis==1 else (v.y/1.8,v.z/2)
    if m in ['sand','grass','meadow']:u,t=v.x/4,v.y/4
    uv.data[li].uv=(u,t)
  ob=bpy.data.objects.new(g+' · '+m,me);bpy.context.collection.objects.link(ob)
 bpy.context.scene['district']=cfg['name'];bpy.context.scene['note']='Fictional map. Runtime adds pixel sprite flora/NPCs and water/wind; see maps/world.json.'
 bpy.ops.wm.save_as_mainfile(filepath=str(WORLD/(cfg['id']+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(WORLD/(cfg['id']+'.glb')),export_format='GLB',export_cameras=False,export_lights=False,export_yup=True)
 cfg['triangles']=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
 catalog.append(copy.deepcopy(cfg));print('MAP_EXPORTED',cfg['id'],cfg['triangles'],flush=True)

begin('ayutthaya','อยุธยา','เมืองหลวง · วัง ตลาด และท่าเดินทาง','#ceb37e',True)
home(0,16,1.45);home(-12,5,.8);home(12,15,.85)
stupa(-11.5,15,.9);shrine(12,7)
wall(-17,-6,21);wall(6,17,21)
for x in [-4.5,4.5]:flag(x,8,'indigo')
box('Royal processional way','paving',(0,5,.065),(8,13,.03))
box('Market square','paving',(0,-.7,.068),(26,5.5,.035))
for x,y in [(-8,5),(8,1),(13,0)]:stall(x,y,'indigo' if x<0 else 'cloth')
npc('เจ้าท่าหลวง',1.8,-.8,3,'จากอยุธยา เดินทางได้ทั้งห้าเมือง เปิดแผนที่โลกหรือเข้าวงเดินทางสีทองได้เลย')
npc('ผู้ดูแลลานหลวง',-3.7,5,1,'ลานกลางเมืองเป็นเขตสงบ พักฟื้นแล้วค่อยออกเดินทาง')
npc('แม่ค้าตลาดหลวง',8,-.6,2,'ตลาดนี้รอรับนักเดินทางจากทุกหัวเมือง')
for id,x in [('bangsai',-12),('lavo',-6),('suphan',0),('phitsanulok',6),('nakhon',12)]:
 cfg['portals'].append({'to':id,'x':x,'z':2.7,'label':id});flag(x,-3.7)
cfg['landmarks']=[['พระตำหนักหลวง',0,-15],['เจดีย์ริมกำแพง',-11.5,-15],['ตลาดหลวง',10,0]]
finish()

begin('bangsai','บางไทร','หมู่บ้านริมน้ำ · ต้นไทรและศาลเก่า','#abb47a')
home(-5,15,.95);home(11,10,.9);home(-12,6,.65)
shrine(-7,6);plant('tree',-10,9,8,8.5);stall(11,0,'cream')
npc('ผู้เฒ่าบางไทร',-4,3,1,'ข้างศาลเป็นทางเดินเข้าหมู่บ้าน ระวังหมูป่าแถวลาน')
npc('คนเก็บสมุนไพร',6,5,2,'ใบไม้ลอยมาตามลม ส่วนเรือรออยู่ที่ท่าน้ำ')
npc('พ่อค้าริมคลอง',9,-1.5,3,'วงเดินทางริมท่าพากลับเมืองหลวงได้')
cfg['mobs']=[[3,-3,0],[-2,-5,1],[6,-1,2],[-11,-12,0],[9,-17,1],[0,-10,3]]
cfg['landmarks']=[['ศาลใต้ต้นไทร',-7,-6],['เรือนริมน้ำ',11,-10]]
finish()

begin('lavo','ละโว้','เมืองอิฐโบราณ · ปรางค์และลานศิลา','#b88967')
prang(0,14,1.15);prang(-9,12,.8);prang(9,13,.8)
wall(-15,-5,20,False);wall(5,15,20,False)
home(-12,3,.7);stall(12,1,'cloth');shrine(12,7)
box('Ancient court','paving',(0,6,.069),(13,11,.03))
for x in [-6,6]:
 for y in [5,8]:
  box('Broken columns','brick',(x,y,.6),(1.1,1.1,1.2));obstacle(x,y,1.1,1.1)
npc('ผู้เฝ้าปรางค์',-3.3,7,1,'เดินอ้อมฐานปรางค์ได้ทั้งสองข้าง ไหผีชอบซ่อนตามลานเก่า')
npc('พ่อค้าโบราณวัตถุ',12,-.5,3,'เส้นทางนี้เชื่อมกับลานเดินทางอยุธยา')
cfg['mobs']=[[2,-5,3],[-3,-10,3],[7,-5,1],[-11,-17,3],[11,-18,1],[3,-19,3]]
cfg['landmarks']=[['กลุ่มปรางค์อิฐ',0,-14],['ลานศิลา',0,-6]]
finish()

begin('suphan','สุพรรณ','ทุ่งนา · ค่ายฝึกและลานมวย','#c4b776')
home(1,17,1);home(12,14,.8);home(-12,16,.7)
for y in [3,9]:field(-11,y,8,4.5)
box('Training ring','sand',(9,4,.085),(8,6,.09))
for x in [5,13]:
 for y in [1,7]:
  beam('Training ring','wood_dark',(x,y,.08),(x,y,1.1),.09)
  flag(x,y)
for x in [6,8,10,12]:
 beam('Training dummies','wood_dark',(x,9,.08),(x,9,1.7),.11)
 beam('Training dummies','wood_light',(x-.45,9,1.2),(x+.45,9,1.2),.07)
 cfg['nav']['props'].append([x,-9,.45])
stall(-4,13,'cream')
npc('ครูมวยสุพรรณ',7,4,1,'ลานทรายนี้เตรียมไว้สำหรับฝึกนักมวย มีที่ว่างให้ลองเดินและหลบ')
npc('ชาวนาริมค่าย',-5,4,2,'คันนาอยู่ทางตะวันตก เดินตามทางกว้างข้างแปลงได้เลย')
cfg['mobs']=[[0,-6,0],[3,-10,0],[-5,-8,1],[-12,-12,2],[13,-19,0],[0,-2,2]]
cfg['landmarks']=[['ค่ายฝึกสุพรรณ',1,-17],['ลานมวย',9,-4],['ทุ่งนา',-11,-6]]
finish()

begin('phitsanulok','พิษณุโลก','ป่าริมแคว · น้ำตกและเรือนพัก','#82a18a')
home(-9,12,.85);home(9,6,.85);home(0,19,.75);shrine(-9,4)
for x,y,s in [(-14,19,2),(9,19,2.2),(14,18,1.7),(14,14,1.4),(-15,15,1.2)]:
 crown('Forest rocks','paving',x,y,s*.6,s*1.4,s,s*1.3);obstacle(x,y,s*2.8,s*2)
for x,y in [(-15,17),(13,20),(11,15),(-11,20),(5,20)]:plant('forest',x,y,6,7)
box('Waterfall','water',(12,12,1.7),(1.35,.15,3.4))
crown('Waterfall rock','paving',12,13.2,1.65,1.5,1.1,1.8);obstacle(12,13.2,3,2.2)
box('Forest pool','water',(12,10.5,.07),(4,3,.04));obstacle(12,10.5,4,3)
stall(-12,0,'indigo')
npc('พรานป่าริมแคว',1,8,1,'ทางกว้างลอดระหว่างเรือนพักไปถึงป่าด้านเหนือได้')
npc('แม่ค้าป่า',-10,-1,2,'น้ำตกอยู่ข้างโขดหินทางตะวันออกของหมู่บ้าน')
cfg['mobs']=[[3,-4,1],[-4,-5,0],[3,-12,1],[-3,-15,2],[13,-7,0],[-14,-7,1]]
cfg['landmarks']=[['น้ำตกริมป่า',12,-12],['เรือนพักพราน',-9,-12]]
finish()

begin('nakhon','นครศรีธรรมราช','เมืองท่าใต้ · พระธาตุและตลาดเครื่องเทศ','#84afb0')
stupa(0,15,1.4);home(-12,13,.85);home(12,14,.85)
box('Temple forecourt','paving',(0,7,.067),(10,10,.035))
for x,y in [(-10,4),(-14,0),(10,4),(14,0)]:stall(x,y,'indigo' if x<0 else 'sail')
for x in [-7,7]:
 for y in [9,12,15]:
  box('Temple boundary','plaster',(x,y,.4),(.6,.6,.8));cfg['nav']['props'].append([x,-y,.4])
# A separate larger trading vessel moored beside the existing small animated boat.
for i in range(12):
 w=1.5*math.sin((i+.5)/12*math.pi)
 box('Harbor trader','wood',(10-2.6+i*.45,-7.2,.02),(.43,w,.4))
beam('Harbor trader','wood_dark',(10,-7.2,.1),(10,-7.2,4.4),.09)
mesh('Harbor sail','sail',[(10,-7.2,4.2),(12.1,-7.2,3.8),(12.1,-7.2,1.7),(10,-7.2,1.3)],[(0,1,2,3)])
npc('ผู้ดูแลลานพระธาตุ',-3,6,1,'ทางเดินรอบพระธาตุเปิดกว้าง เดินชมได้รอบฐาน')
npc('พ่อค้าเครื่องเทศ',8,2,3,'เรือสินค้าจอดข้างท่า กลิ่นเครื่องเทศลอยมากับลมทะเล')
npc('คนสวนเมืองใต้',-8,1,2,'จากท่านี้เดินทางกลับอยุธยาได้')
cfg['mobs']=[[4,-3,2],[-5,-8,3],[10,-8,2],[-10,-18,3],[8,-19,1],[3,-5,2]]
cfg['landmarks']=[['ลานพระธาตุ',0,-15],['ท่าเครื่องเทศ',10,5]]
finish()
(WORLD/'world.json').write_text(json.dumps({'version':5,'capital':'ayutthaya','maps':catalog},ensure_ascii=False,indent=2),encoding='utf-8')
print('WORLD05_COMPLETE',len(catalog),flush=True)

"""Ayutthaya rebuilt: a single walkable, sunlit capital. Blender --background --python build_capital19.py."""
from pathlib import Path
src=Path(__file__).with_name('build_world05.py').read_text(encoding='utf8')
exec(compile(src.split("begin('ayutthaya'",1)[0],__file__,'exec'))
data={};catalog=[];random.seed(1901)
cfg={'id':'ayutthaya','name':'อยุธยา','subtitle':'เมืองหลวง · ท่าเรือ ตลาด และสวนประทีป','color':'#d5c48d','safe':True,'kind':'town','region':'ayutthaya','model':'maps/ayutthaya.glb','spawn':{'x':0,'z':0},'bounds':{'x':-66,'z':-114,'w':132,'d':128},'nav':{'zones':[{'x':-63,'z':-110,'w':126,'d':114.4},{'x':-1.7,'z':3.7,'w':2.4,'d':3.65}],'obstacles':[],'props':[]},'plants':[],'npcs':[],'mobs':[],'portals':[],'landmarks':[],'leafSources':[], 'roads':[], 'plazas':[], 'waterAreas':[]}
for name,h in {'canopy':'80ad4d','canopy_light':'a8c86a','canopy_dark':'60873e','ground19':'ffffff','bark19':'786147','petal19':'f5e8ad','stone19':'b5b69c'}.items():
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))+(1,);mats[name]=m

def road(a,b,width):cfg['roads'].append({'a':a,'b':b,'width':width})
def plaza(x,z,rx,rz):cfg['plazas'].append([x,z,rx,rz])
road([-59,0],[59,0],10);road([0,0],[0,-98],13)
road([-55,-32],[55,-32],11);road([-54,-70],[54,-70],11)
road([-44,0],[-44,-96],8);road([38,0],[38,-98],9)
road([-44,-96],[38,-96],8);road([0,-49],[38,-49],8)
plaza(0,0,9,6);plaza(0,-32,11,10);plaza(38,-32,9,8);plaza(-44,-70,9,9);plaza(0,-89,10,8)
box('Capital terrain','earth',(0,53,-.67),(132,116,1.2))
box('Meadow ground19','ground19',(0,53,.005),(132,116,.10))
box('River','water',(0,-80,-.18),(340,150,.12));cfg['waterAreas'].append({'x':-77,'z':5.3,'w':154,'d':11})
box('Distant green bank','canopy_dark',(0,-160,-.35),(340,10,.5))
for (g,m),(vs,fs) in template.items():
 if g in ['River boat','Pier','Water lilies','Lotus','River reeds']:mesh(g,m,vs,fs)
# Low river quay with broken grassy edges; preserve the physically connected pier.
for x1,x2 in [(-66,-1.8),(.8,66)]:
 box('Quay masonry','stone19',((x1+x2)/2,-4.9,-.05),(x2-x1,.6,.6))
 for x in range(math.ceil(x1),math.floor(x2),3):box('Quay cap','plaster',(x+.7,-4.9,.3),(2.8,.72,.15))

# Western canal and three broad bridges. Water collision and rendering share these coordinates.
box('Garden canal','water',(-28,53,.073),(5,103,.035));cfg['waterAreas'].append({'x':-30.5,'z':-104.5,'w':5,'d':103})
for a,b in [(6,26),(38,64),(76,104.5)]:
 obstacle(-28,(a+b)/2,5,b-a)
 for x in [-30.65,-25.35]:box('Canal banks','stone19',(x,(a+b)/2,.13),(.28,b-a,.25))
for y in [0,32,70]:
 box('Canal bridge','wood_light',(-28,y,.14),(8,11,.18))
 for side in [-1,1]:
  for x in [-32,-28,-24]:beam('Bridge posts','wood_dark',(x,y+side*5,.14),(x,y+side*5,1.1),.08)
  beam('Bridge rail','wood_light',(-32,y+side*5,1),(-24,y+side*5,1),.085)

# Unique districts, with substantial clear walking space between building footprints.
for x,y,s in [(-14,14,.95),(15,15,1.0),(-48,16,.85),(48,15,.9),(20,49,.9),(51,49,.8),(-49,49,.95),(-14,51,.85),(-47,88,.8),(49,87,.9),(18,104,1.05),(-17,104,1.05)]:home(x,y,s)
home(0,107,1.7)
stupa(-45,103,1.0);stupa(50,105,.65)
shrine(16,76);shrine(0,44)
for x,y,col in [(28,21,'cream'),(46,23,'indigo'),(49,37,'cloth'),(26,41,'cream'),(-53,31,'cream'),(-38,44,'indigo')]:stall(x,y,col)
for x,y in [(-7,21),(7,21),(-8,82),(8,82)]:flag(x,y,'indigo')
wall(-62,-9,111);wall(9,62,111)
for x,y in [(-11,3),(10,4),(31,18),(53,41),(-38,37),(-20,73),(20,84)]:
 for dx in [0,.65]:jar('Market pottery',x+dx,y,.06,.85)
 obstacle(x+.3,y,1.2,.75)
for x,y in [(-9,31),(9,31),(-49,64),(32,68)]:
 box('Garden benches','wood_light',(x,y,.65),(2.6,.65,.13))
 for dx in [-1,1]:box('Bench legs','wood_dark',(x+dx,y,.34),(.12,.5,.65))
 obstacle(x,y,2.6,.65)

def tree(x,y,s=1):
 idx=len(cfg['leafSources']);g='Living canopy '+str(idx)
 beam('Tree trunks','bark19',(x,y,.08),(x+.2*s,y,4.7*s),.28*s,9,r2=.12*s)
 for i in range(5):
  a=i*math.tau/5+.4;dx=math.cos(a);dy=math.sin(a)
  beam('Tree branches','bark19',(x,y,2.8*s),(x+dx*1.8*s,y+dy*1.8*s,5.1*s),.12*s,7,r2=.045*s)
 # Crown foliage is instanced from the transparent painted bough at runtime.
 cfg['nav']['props'].append([x,-y,.46*s]);cfg['leafSources'].append([x,5.4*s,-y]);cfg['plants'].append(['canopy19',x,-y,6*s,7*s,False])

# Authored groups frame landmarks and leave streets open, unlike a repeating tree grid.
for x,y,s in [(-10,5,1.1),(11,6,.92),(-21,18,1.1),(25,9,1.1),(-39,7,1.0),(55,6,1.1),(-13,26,1.2),(13,27,1.0),(-14,40,.95),(14,39,1.0),(7,58,1.2),(-10,63,1.0),(24,69,.95),(9,75,1.3),(-36,62,.95),(-53,77,1.1),(-38,82,.9),(45,61,1.0),(56,72,1.2),(29,88,.9),(-20,91,.95)]:tree(x,y,s)
for y in range(8,108,11):
 for x in [-60,60]:tree(x+random.uniform(-1,1),y+random.uniform(-2,2),random.uniform(.85,1.1))
for x in range(-55,60,11):tree(x,108,random.uniform(.85,1.05))
for x,y in [(-18,8),(21,16),(54,20),(-53,20),(21,77),(-38,92),(46,94)]:plant('banana',x,y,3.2,4.3)

for x,y in [(-18,10),(-11,17),(18,18),(24,19),(-52,17),(-41,15),(51,19),(31,23),(52,38),(23,43),(24,51),(-15,47),(-51,54),(51,54),(-40,89),(45,91),(-13,100),(22,103),(20,79),(-48,100)]:
 cfg['plants'].append(['shrub19',x,-y,1.8,1.6,False]);cfg['nav']['props'].append([x,-y,.48])

cfg['districts']=[{'name':name,'x':x,'z':z} for name,x,z in [('ท่าเรือเจ้าพระยา',0,0),('ลานกลางเมือง',0,-32),('ตลาดแม่บัว',38,-32),('ย่านเรือนช่าง',-44,-32),('สวนประทีป',0,-70),('วัดริมคลอง',-44,-70),('ลานสำนัก',38,-70),('หน้าพระตำหนัก',0,-92)]]
cfg['landmarks']=[[d['name'],d['x'],d['z']] for d in cfg['districts']]
npc('ลุงเรือง',4,1.2,3,'ยินดีต้อนรับสู่อยุธยา เมืองนี้ปลอดภัย เดินตามทางขึ้นไปจะถึงลานกลางเมืองกับตลาดแม่บัว คืนก่อนประทีปตามท่าน้ำดับลงพร้อมกัน… ข้าอยากรู้ว่าเกิดอะไรขึ้น')
npc('ขุนอินทร์',4,31,0,'พักให้หายเหนื่อยก่อน ผู้ฝึกตน เมืองกำลังเตรียมงานประทีป หากเจ้าจะช่วย เริ่มจากทำความรู้จักผู้คนที่ท่าเรือและตลาดก่อน')
npc('แม่บัว',42,27,2,'ตลาดยินดีต้อนรับจ้ะ ช่วงนี้เรือส่งของมาช้ากว่าปกติ แม่ได้ยินเสียงระฆังจากสวน ทั้งที่ไม่มีใครอยู่ที่ศาล')
npc('ครูแสนดาบ',42,68,0,'ฝึกพื้นฐานให้มั่นคง เมื่อถึงเลเวล 25 จึงค่อยเลือกเส้นทางอาชีพที่เหมาะกับเจ้า ลานนี้ยังเป็นเขตสงบ')
npc('เจ้าจุก',-4,69,2,'เมื่อวานข้าเห็นแสงเล็ก ๆ ลอยอยู่ข้างศาลในสวน! ลองเดินชมดูสิ แต่ยังอย่าเพิ่งออกนอกเมืองนะ')
npc('พระปัญญา',-41,74,1,'ประทีปมิได้ส่องเพียงทางเดิน แต่เตือนให้ผู้คนระลึกถึงกัน หากสายใยขวัญอ่อนลง เราต้องเริ่มดูแลจากบ้านของเราเอง')
finish()
# Round leaf lobes rather than faceted rock-like crowns.
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.name.startswith('Living canopy'):
  for p in o.data.polygons:p.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(WORLD/'ayutthaya.blend'))
bpy.ops.export_scene.gltf(filepath=str(WORLD/'ayutthaya.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_yup=True)
retired=[x+s for x in ['ayutthaya','bangsai','lavo','suphan','phitsanulok','nakhon'] for s in ['', '-wilds'] if x+s!='ayutthaya']
(WORLD/'world.json').write_text(json.dumps({'version':19,'capital':'ayutthaya','retiredMaps':retired,'maps':catalog},ensure_ascii=False,indent=2),encoding='utf8')
print('CAPITAL19_COMPLETE',cfg['triangles'],flush=True)

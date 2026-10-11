"""Expanded towns + separate wilderness. Blender --background --python build_regions12.py.
Keeps the original harbor and coordinates for existing saves; new districts are authored
at original building scale, with matching navigation, roads and local travel stops.
"""
from pathlib import Path
src=Path(__file__).with_name('build_world05.py').read_text(encoding='utf8')
prefix,builders=src.split("begin('ayutthaya'",1)
start=prefix.index(" if cfg['id']!='ayutthaya':",prefix.index('def finish():'))
end=prefix.index(" bpy.ops.object.select_all",start)
prefix=prefix[:start]+prefix[end:]
exec(compile(prefix,__file__,'exec'))
export_map=finish
rosters={
 'ayutthaya':['ลุงเรือง','ขุนอินทร์','แม่บัว','ครูแสนดาบ','เจ้าจุก'],
 'bangsai':['ตาผูก','แม่ชบา','ยายแย้ม','น้อยเรือจ้าง','ภูตจ้อย'],
 'lavo':['ลุงปั้น','แม่แก้วลาย','มิ่ง','ครูเงา','ยามศิลา'],
 'suphan':['ครูทองหมัด','แม่สาย','ช่างเพชร','ครูทวนเหล็ก','กล้า'],
 'phitsanulok':['พรานคำ','แม่เฟื่อง','ตาเมฆ','น้องข้าว','เจ้าคีรี'],
 'nakhon':['พระปัญญา','บังมูซา','ช่างมุก','แม่ชีจันทร์','นาวิน']}
wild_names={'ayutthaya':'ทุ่งนอกกำแพง','bangsai':'ป่าไทรและบึงหมอก','lavo':'ซากเมืองศิลา','suphan':'ป่าไผ่นอกค่าย','phitsanulok':'ป่าริมแคว','nakhon':'ชายฝั่งเครื่องเทศ'}

def landscape(wild=False):
 cfg['bounds']={'x':-118,'z':-194,'w':236,'d':205}
 cfg['nav']['zones']=[{'x':-117,'z':-191,'w':234,'d':195.3},{'x':-1.7,'z':3.7,'w':2.4,'d':3.65}]
 box('Expanded ground','earth',(0,94,-.62),(236,200,.8))
 box('Expanded ground','meadow',(0,94,-.06),(236,200,.12))
 box('River extension','water',(0,-7.4,-.19),(236,4,.10))
 box('Far bank extension','earth',(0,-10,-.25),(236,1,.45))
 for x in [-72,0,72]:box('Regional avenues','sand' if wild else 'paving',(x,94,.045),(9,190,.025))
 for y in [0,48,112,176]:box('Regional avenues','sand',(0,y,.048),(232,9,.025))
 kind='palm' if cfg['region']=='nakhon' else 'bamboo' if cfg['region']=='suphan' else 'forest'
 for x in range(-112,117,8):plant(kind,x,190,5,6)
 for y in range(8,190,9):
  for x in [-113,113]:plant(kind,x,y,5,6,x<0)
 # Tree islands frame wide roads; no collision props are placed on the road centerlines.
 for x in [-94,-48,46,96]:
  for y in [28,80,145]:
   if wild:
    for dx,dy in [(-3,0),(3,4),(0,8)]:plant(kind,x+dx,y+dy,5,6)
   else:
    home(x,y,.7);stall(x+7,y-9,'cream');plant(kind,x-7,y+5,5,6)

def finish():
 cfg['safe']=True;cfg['region']=cfg['id'];cfg['kind']='town';cfg['mobs']=[]
 landscape()
 # A connected canal crossed by four bridges breaks up the street grid.
 box('City canal','water',(-36,96,.077),(6,192,.035))
 for a,b in [(6,42),(54,106),(118,170),(182,191)]:
  obstacle(-36,(a+b)/2,6,b-a)
  for side in [-1,1]:box('Canal stone banks','stone',(-36+side*3.15,(a+b)/2,.12),(.3,b-a,.22))
 for y in [0,48,112,176]:
  box('Canal bridge','wood',(-36,y,.14),(9,8,.17))
  for side in [-1,1]:
   beam('Bridge rail','wood_dark',(-40,y+side*3.5,.9),(-32,y+side*3.5,.9),.06)
   for x in [-40,-36,-32]:beam('Bridge posts','wood_dark',(x,y+side*3.5,.1),(x,y+side*3.5,1),.07)
 names=['ย่านช่าง','ย่านเรือนพัก','ตลาดเหนือ','ลานสำนัก','สวนเมือง','ท่าเกวียน','ย่านวัด','ประตูเมือง']
 centers=[(-72,48),(72,48),(-72,112),(72,112),(0,112),(-72,176),(72,176),(0,176)]
 cfg['districts']=[{'name':'ท่าเรือกลาง','x':0,'z':0}]
 for i,((x,y),name) in enumerate(zip(centers,names)):
  cfg['districts'].append({'name':name,'x':x,'z':-y})
  box('District square '+str(i),'sand',(x,y,.067),(28,25,.035))
  if i==4:
   shrine(x-12,y+14);plant('tree',x+13,y+13,9,10)
  elif i==6:stupa(x-13,y+13,.9)
  else:
   home(x-12,y+8,.85);home(x+12,y+8,.8)
   home(x-18,y-13,.65);home(x+18,y-13,.7)
  if i in [0,2,5]:
   for dx in [-9,9]:stall(x+dx,y-5,'indigo' if i==0 else 'cloth')
  if i==3:
   for dx in [-14,14]:
    for dy in [9,13]:
     beam('Practice posts','wood_dark',(x+dx,y+dy,.1),(x+dx,y+dy,1.7),.1)
     cfg['nav']['props'].append([x+dx,-y-dy,.25])
  for dx in [-21,21]:plant('banana',x+dx,y-3,3,4)
  for dx in [-6,6]:
   for dy in [-10,10]:plant('pots',x+dx,y+dy,1.5,1.8)
  for dx in [-24,24]:plant('tree',x+dx,y+7,7,8)
  flag(x-5,y-6)
 # Keep exactly five story NPCs in each town, expanding existing roles to the new districts.
 roster=rosters[cfg['id']]
 while len(cfg['npcs'])<3:npc('ชาวเมือง',6+len(cfg['npcs'])*2,0,2)
 cfg['npcs']=cfg['npcs'][:3]
 for i,n in enumerate(cfg['npcs']):
  n['name']=roster[i];n['text']='ที่นี่เป็นเขตปลอดภัย ไม่มีมอนสเตอร์ ใช้แผนที่โลกเพื่อเดินทางระหว่างย่าน หรือออกประตูเหนือไป'+wild_names[cfg['id']]+' คืนก่อนประทีปดับพร้อมกัน ข้าคิดว่าสายใยขวัญกำลังเปลี่ยนไป…'
 npc(roster[3],74,110,1,'สำนักอยู่ใกล้ลานนี้ เดินชมเมืองได้อย่างปลอดภัย หากพร้อมฝึกจริงให้ใช้เส้นทางประตูเหนือออกนอกเมือง')
 npc(roster[4],-70,46,2,'ลองไปตลาดเหนือกับสวนเมืองดูสิ เมืองกว้างขึ้นมากแล้ว จุดเดินทางในแผนที่ช่วยพากลับท่าเรือได้')
 if cfg['id']!='ayutthaya':cfg['portals']=[{'to':'ayutthaya','x':0,'z':2.7}]
 cfg['portals'].append({'to':cfg['id']+'-wilds','x':0,'z':-185})
 cfg['landmarks'] += [[d['name'],d['x'],d['z']] for d in cfg['districts'][1:]]
 cfg['leafSources']=[[p[1],p[4]*.8,p[2]] for p in cfg['plants'] if p[0] in ['tree','forest','palm','bamboo']]
 export_map()

exec(compile("begin('ayutthaya'"+builders,__file__,'exec'))
towns=copy.deepcopy(catalog)
for town in towns:
 region=town['id'];begin(region+'-wilds',wild_names[region],'นอกเมือง · เขตผจญภัยและมอนสเตอร์',town['color'])
 cfg['region']=region;cfg['kind']='wilderness';cfg['safe']=False
 landscape(True)
 cfg['portals']=[{'to':region,'x':0,'z':2.7}]
 cfg['districts']=[{'name':'ทางกลับเมือง','x':0,'z':0},{'name':'ทางแยกกลางป่า','x':0,'z':-48},{'name':'ค่ายพักเหนือ','x':0,'z':-176}]
 cfg['landmarks']=[['ทางกลับ'+town['name'],0,0]]
 for i,(x,y) in enumerate([(-72,48),(72,48),(-72,112),(72,112),(-72,176),(72,176)]):
  if region=='lavo':prang(x+14,y+14,.8)
  elif region=='suphan':
   for dx in [-14,14]:plant('bamboo',x+dx,y+12,7,8)
   home(x+16,y+17,.65)
  elif region=='ayutthaya':field(x+17,y+15,10,7)
  elif region=='phitsanulok':
   crown('Wild rocks','paving',x+14,y+14,1,3,2,3);obstacle(x+14,y+14,6,4)
   box('Waterfall','water',(x+14,y+11.5,1.5),(2,.15,3))
  elif region=='bangsai':shrine(x+15,y+15);plant('tree',x+22,y+19,10,11)
  else:stall(x+16,y+16,'sail');plant('palm',x+22,y+22,6,8)
  cfg['landmarks'].append(['พื้นที่สำรวจ '+str(i+1),x,-y])
  for dx,dz in [(-5,-5),(5,-5),(-5,5),(5,5)]:cfg['mobs'].append([x+dx,-y+dz,(i+len(cfg['mobs']))%4])
 cfg['mobs'] += [[5,-5,0],[-5,-6,1],[7,-16,2],[-8,-19,3]]
 cfg['leafSources']=[[p[1],p[4]*.8,p[2]] for p in cfg['plants'] if p[0] in ['tree','forest','palm','bamboo']]
 export_map()
(WORLD/'world.json').write_text(json.dumps({'version':12,'capital':'ayutthaya','maps':catalog},ensure_ascii=False,indent=2),encoding='utf8')
print('REGIONS12_COMPLETE',len(catalog),flush=True)

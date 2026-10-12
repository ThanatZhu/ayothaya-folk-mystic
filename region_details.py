"""Small, original-scale scenery. Executed in the region builder's helper scope."""
def bench(x,y):
 g='District benches';box(g,'wood',(x,y,.58),(2.3,.65,.14))
 for dx in [-.85,.85]:
  box(g,'wood_dark',(x+dx,y,.3),(.15,.5,.6))
  box(g,'wood_dark',(x+dx,y+.25,.9),(.12,.12,.7))
 box(g,'wood',(x,y+.28,1.1),(2.3,.1,.25));obstacle(x,y,2.4,.8)

def lantern(x,y):
 g='Village lanterns';beam(g,'wood_dark',(x,y,.1),(x,y,2.8),.065)
 beam(g,'wood_dark',(x,y,2.8),(x+.55,y,2.8),.045)
 box(g,'amber',(x+.45,y,2.35),(.32,.32,.5))
 box(g,'wood_dark',(x+.45,y,2.64),(.46,.46,.08))
 box(g,'wood_dark',(x+.45,y,2.07),(.38,.38,.08))
 cfg['nav']['props'].append([x,-y,.15])

def handcart(x,y):
 g='Market handcarts';box(g,'wood',(x,y,.66),(1.7,2.2,.15))
 for side in [-1,1]:
  box(g,'wood',(x+side*.8,y,.92),(.1,2.2,.5))
  beam(g,'wood_dark',(x+side*.5,y-1,.55),(x+side*.5,y-2.5,.7),.07)
  beam(g,'wood_dark',(x+side*.94,y,.46),(x+side*1.09,y,.46),.43,12)
 for dx in [-.45,.45]:jar(g,x+dx,y,.76,.55)
 obstacle(x,y-.6,2.3,3.7)

def flowerbed(x,y,w=4,d=2):
 box('Raised herb beds','earth',(x,y,.18),(w,d,.28))
 for side in [-1,1]:box('Herb bed edging','wood',(x,y+side*d/2,.24),(w+.2,.12,.3))
 for i in range(10):
  xx=x+random.uniform(-w*.42,w*.42);yy=y+random.uniform(-d*.4,d*.4)
  beam('Herb stems','reed',(xx,yy,.3),(xx,yy,.7),.025,4)
  crown('Garden blossoms','pink' if i%3 else 'cream',xx,yy,.7,.12,.12,.1)
 obstacle(x,y,w+.2,d+.2)

def district_details(x,y,index):
 # Pavement fragments and merchandise distinguish the playable neighborhoods.
 for dx in [-7,7]:
  lantern(x+dx,y-8);bench(x+dx*1.75,y-10)
 for dx in [-22,22]:flowerbed(x+dx,y-10)
 if index in [0,2,5]:
  handcart(x+17,y-5)
  for i in range(3):
   xx=x-16+i*1.1
   box('Merchant crates','wood',(xx,y-5,.4),(.85,.8,.75))
   for j in range(3):crown('Market fruit','gold' if index==2 else 'reed',xx-.22+j*.2,y-5,.84,.12,.12,.14)
  obstacle(x-14.9,y-5,3.3,1)
 elif index==1:
  for dx in [-8,8]:
   beam('Laundry poles','wood_dark',(x+dx,y+18,.1),(x+dx,y+18,2.5),.06)
  beam('Laundry line','cream',(x-8,y+18,2.4),(x+8,y+18,2.4),.018)
  for i in range(7):box('Drying cloth','indigo' if i%2 else 'cream',(x-6+i*2,y+18,1.9),(1.1,.035,.9))
 elif index==3:
  for dx in [-10,10]:
   box('Training mats','cloth',(x+dx,y-5,.09),(3,3,.04))
 elif index==4:
  box('Garden pool','stone',(x,y+18,.22),(8,5,.4));box('Garden pool water','water',(x,y+18,.44),(7.5,4.5,.035));obstacle(x,y+18,8,5)
  for i in range(5):crown('Pool lotus','pink',x-2+i,y+18,.5,.17,.17,.1)
 elif index==6:
  for i in range(5):jar('Temple offerings',x-8+i*.6,y-5,.1,.45)
  obstacle(x-6.8,y-5,3.2,1)
 else:
  for dx in [-10,10]:flag(x+dx,y-5,'indigo')

def add_region_details(wild=False):
 # Ground flecks are flat, collision-free and merged into material meshes.
 for i in range(1500):
  x=random.uniform(-108,108);y=random.uniform(12,186)
  if abs(x+36)<4:continue
  box('Scattered path fragments',random.choice(['stone','sand','earth']),(x,y,.085),(random.uniform(.07,.25),random.uniform(.08,.22),.013))
 # Unoccupied block interiors become gardens, groves and craft clearings.
 for x in [-92,-48,25,94]:
  for y in [62,96,158]:
   if wild:
    for dx,dy in [(-3,0),(0,3),(4,-2)]:
     crown('Forest boulders','stone',x+dx,y+dy,.35,.8,.65,.7)
     cfg['nav']['props'].append([x+dx,-y-dy,.8])
    plant('hedge',x+3,y+4,4,1.3)
   else:
    flowerbed(x,y,6,3);bench(x,y-3)
    for dx in [-4,4]:plant('hedge',x+dx,y,2.3,1.1)
    if cfg['region'] in ['bangsai','phitsanulok']:plant('tree',x+5,y+4,6,7)
    elif cfg['region']=='nakhon':plant('palm',x+5,y+4,5,7)
    elif cfg['region']=='suphan':plant('bamboo',x+5,y+4,5,6)
    elif cfg['region']=='lavo':jar('Pottery workshops',x+5,y+2,.1,1.1)
    else:flag(x+5,y+2,'indigo')
 if not wild:
  for y in range(16,185,16):
   for x in [-6,6]:lantern(x,y)
  for y in [24,72,136]:
   bench(-42,y);lantern(-42,y+3);plant('pots',-42,y-3,1.5,1.6)
 else:
  for x,y in [(-18,35),(18,85),(-18,145)]:
   bench(x,y);lantern(x+2,y);handcart(x+5,y)
 cfg['detailVersion']=13

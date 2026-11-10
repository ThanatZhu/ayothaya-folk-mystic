# Copy of outputs/blender-maps-v2/build_dungeon.py (runs from that folder, next to the v2 kit). Kept here so the layout is in Git.
"""Party dungeon maps (owner 9 Nov 2026): one map per dungeon, a single path with spirit gates between sections.
Run: blender --background --python build_dungeon.py -- dg-krasue [--draft]
Reuses the v2 kit (geometry_base, architecture, vegetation, materials) and build_world's export flow.
Blender x = game x, Blender y = -game z. Everything walkable sits on raised paving or bridges over dark water;
the walk grid is baked later with scripts/bake-nav-v2.py (rays from 2.2 m, so roofs over the path never block).
"""
import bpy, math, random, json, sys, time
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
import build_world as W
b=W.b
b.NAMES['dg-krasue']='เรือนกระสือริมคลอง'
b.NAMES.update({'dg-takhian':'ป่าตะเคียนร้อยปี','dg-samut':'อู่เรือผีเสื้อสมุทร','dg-saiyadam':'ตำหนักไสยดำ','dg-pret':'เมืองเปรตใต้บาดาล'})
# Theme materials for the later dungeons: new keys only, so krasue's colours never change.
b.PALETTE.update({'water_swamp':'2c3a2f','water_sea':'2f5f6a','water_ink':'2a2732','water_abyss':'1b241f',
 'glow_green':'6dff7a','glow_fire':'ff8a2e','glow_violet':'b67cff',
 'cloth_rose':'c85a7c','cloth_yellow':'d6b03c','cloth_green':'4f9a55','cloth_black':'2a2428','cloth_violet':'4b2f57','cloth_blood':'5e2220',
 'bark_takhian':'4f3d2e','leaf_dark':'2f4733','earth_forest':'5a4934','sand':'c2ad84','sand_wet':'8f7f62','wood_drift':'8e877a',
 'rope':'a08c62','ceramic_black':'262224','stone_dark':'4d4b47','stone_ash':'6d655c','earth_ash':'4a4440','mud_dark':'3e3a31',
 'gold_dull':'8c7445','roof_dark':'4e3b37','roof_ash':'5b4c47','wood_charred':'3a312b','moss_dark':'3f4f30'})

def gate(x,y,width=7,label='Spirit gate'):
    """A lantern arch across the path. Soft parts only, the server holds players back until the section is cleared."""
    for dx in (-width/2-.4,width/2+.4):
        b.beam(label+' posts','darkwood',(x+dx,y,.45),(x+dx,y,4.2),.22,n=10)
        b.lantern(x+dx,y,.45,True)
    b.beam(label+' beam','wood',(x-width/2-.6,y,4.2),(x+width/2+.6,y,4.2),.18,n=6)
    for i in range(5):b.beam('Lantern / glowing paper','gold',(x-width/2+i*width/4,y,3.2),(x-width/2+i*width/4,y,3.9),.25,n=8)

def stilt_house(x,y,w,d,floor=3.2,label='Krasue stilt house'):
    for xx in (x-w/2+.4,x+w/2-.4):
        for yy in range(int(y-d/2)+1,int(y+d/2),3):b.beam(label+' stilts','darkwood',(xx,yy,-.2),(xx,yy,floor),.22,n=8)
    b.box(label+' floor','plank',x,y,floor+.15,w,d,.3)
    for sx in (-1,1):b.box(label+' walls','wood_weathered',x+sx*(w/2-.15),y,floor+1.6,.3,d,2.6)
    b.box(label+' back wall','wood_weathered',x,y+d/2-.15,floor+1.6,w,.3,2.6)
    b.roof(x,y,floor+2.9,w+1.6,d+1.6,3.4)

def krasue():
    random.seed(9112026)
    b.box('Dungeon foundation','stone',-10,0,-1.2,96,146,1.8);W.water(-10,0,92,142,False)
    # 0 pier and courtyard
    b.box('Canal pier deck','plank',0,-61,.25,10,8,.4)
    for xx in (-4.6,4.6):
        for yy in (-64,-58):b.beam('Pier posts','darkwood',(xx,yy,-1),(xx,yy,1.4),.18)
    b.boat(-8,-62,0,1.1);b.boat(9,-59,0,.9)
    b.bridge((0,-57),(0,-48),7,.48)
    b.box('Courtyard flagstones','paving',0,-38,.22,26,20,.5);W.CLEAR.append((0,-38,13,10))
    for x,y in [(-15,-44),(15,-44),(-15,-32),(15,-32)]:b.jar(x*.85,y,.5,1.1)
    for x in (-11,11):b.lantern(x,-47,.47,True);b.lantern(x,-29,.47,True)
    for x,y,s in [(-24,-40,1.3),(22,-34,1.2),(-26,-24,1)]:b.box('Dark islets','mud',x,y,-.05,9*s,7*s,.3);b.tree(x,y,s,palm=random.random()<.5)
    b.house(24,-48,1.15);b.house(-25,-52,1.05)
    gate(0,-27.6)
    # 1 under the great stilt house: a long corridor between stilts, house floor above 2.2 m
    b.bridge((0,-28),(0,-22),7,.48)
    b.box('Under-house packed earth','soil',0,-6,.22,14,32,.5)
    # the great house stands beside the corridor, never over it: the game camera looks down
    stilt_house(-13,-6,10,30);stilt_house(13,-6,10,30)
    for y in range(-20,10,6):b.beam('Overhead house beams','darkwood',(-8,y,6.8),(8,y,6.8),.2,n=6)
    for y in range(-20,10,4):b.beam('Hanging nets','linen',(-6.6,y,2.8),(-6.6,y,1.6),.05,n=4);b.beam('Hanging nets','linen',(6.6,y+2,2.8),(6.6,y+2,1.4),.05,n=4)
    for x,y in [(-4,-16),(4,-10),(-4,-2),(4,5)]:
        b.box('Lantern plinths','stone',x,y,.75,1.2,1.2,.6);b.lantern(x,y,1.05,False)
    for i in range(8):b.crown(random.choice((-5.6,5.6)),random.uniform(-20,8),.95,.5,.7,.6,'linen','Stacked rice sacks')
    gate(0,10.6)
    # 2 the fire kitchen, west of the house
    b.bridge((0,10),(0,20),7,.48)
    b.box('Path turn flagstones','paving',0,20,.22,9,9,.5)
    b.bridge((-4,20),(-9,20),7,.48)
    b.box('Kitchen floor','paving',-18,24,.22,18,16,.5);W.CLEAR.append((-18,24,9,8))
    for x,y in [(-24,19),(-24,29),(-12,29)]:
        b.box('Clay stoves','plaster',x,y,1.0,2.6,2.2,1.0);b.box('Stove fire mouths','ceramic',x,y-1.12,.9,1.2,.05,.6)
        b.jar(x+1.8,y,.5,.8)
    for x,y in [(-26.5,17),(-26.5,31),(-9.5,17),(-9.5,31)]:b.beam('Kitchen posts','darkwood',(x,y,.45),(x,y,6.4),.25,n=10)
    gate(-18,32.6)
    # 3 the bedroom upstairs: a round red-lacquer floor
    b.bridge((-18,32),(-18,39.5),7,.48)
    b.beam('Bedroom plinth','stone',(-18,52,-.1),(-18,52,.48),13.2,n=72)
    b.beam('Bedroom red lacquer floor','cloth_red',(-18,52,.48),(-18,52,.5),12.8,n=72)
    W.CLEAR.append((-18,52,13,13))
    for r in (8.5,11.5):
        for i in range(72):
            a=i*math.tau/72;c=(i+1)*math.tau/72
            b.beam('Arena inlays','gold',(-18+r*math.cos(a),52+r*math.sin(a),.52),(-18+r*math.cos(c),52+r*math.sin(c),.52),.035,n=4)
    b.box('Noble bed frame','darkwood',-18,62,.9,6,3.2,.8);b.box('Bed silk','cloth_red',-18,62,1.4,5.6,2.8,.25)
    for i in range(10):
        a=i*math.tau/10;b.lantern(-18+math.cos(a)*12,52+math.sin(a)*12,.5,True)
    for i in range(12):
        a=i*math.tau/12;b.beam('Bedroom pillars','darkwood',(-18+math.cos(a)*13.6,52+math.sin(a)*13.6,-.2),(-18+math.cos(a)*13.6,52+math.sin(a)*13.6,7),.3,n=10)

# ---- Later dungeons (owner 10 Nov 2026). The server reuses krasue's room coordinates for every dungeon, so each map is
# shell() (krasue's floors, gates and blocking props, same place and size) plus its own dressing, then recolour().
# Dressing rules: below 2.2 m keep 1.5 m off every floor edge (the nav probes reach .45 m); on plinths stay inside .45 m
# of the centre; tall things go west/north of the path, since the game camera looks from the south-east.
PLINTHS=[(-4,-16),(4,-10),(-4,-2),(4,5)]
# krasue's rice sacks fall where its seeded random puts them; these are those eight spots, so the corridor blocks the same cells
SACKS=[(5.6,-11.481507),(-5.6,1.262636),(5.6,-16.151114),(5.6,-4.028487),(-5.6,-3.863644),(-5.6,-7.692707),(-5.6,-4.442604),(-5.6,.098577)]
STOVES=[(-24,19),(-24,29),(-12,29)]

def shell(names={}):
    """krasue() without its dressing (houses, boats, islets, nets, lanterns on the plinths, bed silk). names renames labels."""
    n=lambda k:names.get(k,k)
    b.box('Dungeon foundation','stone',-10,0,-1.2,96,146,1.8);W.water(-10,0,92,142,False)
    b.box('Canal pier deck','plank',0,-61,.25,10,8,.4)
    for xx in (-4.6,4.6):
        for yy in (-64,-58):b.beam(n('Pier posts'),'darkwood',(xx,yy,-1),(xx,yy,1.4),.18)
    b.bridge((0,-57),(0,-48),7,.48)
    b.box('Courtyard flagstones','paving',0,-38,.22,26,20,.5);W.CLEAR.append((0,-38,13,10))
    for x,y in [(-15,-44),(15,-44),(-15,-32),(15,-32)]:b.jar(x*.85,y,.5,1.1)
    for x in (-11,11):b.lantern(x,-47,.47,True);b.lantern(x,-29,.47,True)
    gate(0,-27.6)
    b.bridge((0,-28),(0,-22),7,.48)
    b.box('Under-house packed earth','soil',0,-6,.22,14,32,.5)
    for x,y in PLINTHS:b.box(n('Lantern plinths'),'stone',x,y,.75,1.2,1.2,.6)
    for x,y in SACKS:b.crown(x,y,.95,.5,.7,.6,'linen',n('Stacked rice sacks'))
    gate(0,10.6)
    b.bridge((0,10),(0,20),7,.48)
    b.box('Path turn flagstones','paving',0,20,.22,9,9,.5)
    b.bridge((-4,20),(-9,20),7,.48)
    b.box('Kitchen floor','paving',-18,24,.22,18,16,.5);W.CLEAR.append((-18,24,9,8))
    for x,y in STOVES:
        b.box(n('Clay stoves'),'plaster',x,y,1.0,2.6,2.2,1.0);b.box(n('Stove fire mouths'),'ceramic',x,y-1.12,.9,1.2,.05,.6)
        b.jar(x+1.8,y,.5,.8)
    for x,y in [(-26.5,17),(-26.5,31),(-9.5,17),(-9.5,31)]:b.beam(n('Kitchen posts'),'darkwood',(x,y,.45),(x,y,6.4),.25,n=10)
    gate(-18,32.6)
    b.bridge((-18,32),(-18,39.5),7,.48)
    b.beam('Bedroom plinth','stone',(-18,52,-.1),(-18,52,.48),13.2,n=72)
    b.beam(n('Bedroom red lacquer floor'),'cloth_red',(-18,52,.48),(-18,52,.5),12.8,n=72)
    W.CLEAR.append((-18,52,13,13))
    for r in (8.5,11.5):
        for i in range(72):
            a=i*math.tau/72;c=(i+1)*math.tau/72
            b.beam('Arena inlays','gold',(-18+r*math.cos(a),52+r*math.sin(a),.52),(-18+r*math.cos(c),52+r*math.sin(c),.52),.035,n=4)
    b.box(n('Noble bed frame'),'darkwood',-18,62,.9,6,3.2,.8)
    for i in range(10):
        a=i*math.tau/10;b.lantern(-18+math.cos(a)*12,52+math.sin(a)*12,.5,True)
    for i in range(12):
        a=i*math.tau/12;b.beam(n('Bedroom pillars'),'darkwood',(-18+math.cos(a)*13.6,52+math.sin(a)*13.6,-.2),(-18+math.cos(a)*13.6,52+math.sin(a)*13.6,7),.3,n=10)

def recolour(T):
    """Swap material keys, by (label, material) first, then by material. Geometry is untouched, so the walk grid cannot change."""
    old,b.G=b.G,{}
    for (label,mat),(v,f) in old.items():b.mesh(label,T.get((label,mat),T.get(mat,mat)),v,f)

def ring(label,mat,x,y,z,r,h=.12):b.beam(label,mat,(x,y,z),(x,y,z+h),r,n=16)
def islet(x,y,w,d,mat='mud_dark'):b.crown(x,y,-.25,w/2,d/2,.55,mat,'Dark islets')
def flame(x,y,z,s=1,mat='glow_fire',label='Underworld flames',light=True):
    b.crown(x,y,z,.34*s,.34*s,.5*s,mat,label);b.crown(x,y,z+.5*s,.17*s,.17*s,.32*s,mat,label)
    if light:b.LAMP_POSITIONS.append((x,y,z+.3*s,mat=='glow_green'))
def rockpile(x,y,s=1,mat='rock',label='Cave rock walls'):
    b.crown(x,y,1.2*s,3.2*s,2.6*s,2.6*s,mat,label);b.crown(x+.8*s,y-.5*s,3.4*s,2*s,1.7*s,2*s,mat,label)
def specks(count,label,mat,z0,z1,size=.14):
    """Fireflies, wisps: tiny glowing boxes, always above 2.2 m."""
    for i in range(count):b.box(label,mat,random.uniform(-54,34),random.uniform(-68,70),random.uniform(z0,z1),size,size,size)
def dead_tree(x,y,s=1):
    b.beam('Dead tree trunks','trunk',(x,y,-.2),(x+.3*s,y,5.5*s),.32*s,.1*s,n=7)
    for i in range(5):
        a=i*math.tau/5+x;z=(2.6+i*.55)*s
        b.beam('Dead tree branches','trunk',(x+.1*s,y,z),(x+math.cos(a)*2.2*s,y+math.sin(a)*2.2*s,z+1.4*s),.12*s,.03*s,n=5)
def strakes(pts,levels,label='Junk hull planks',mat='wood_red'):
    for z in levels:
        for a,c in zip(pts,pts[1:]):b.beam(label,mat,(*a,z),(*c,z),.3,n=6)
def ship_ribs(x,y0,y1,w=7,h=4,label='Shipyard hull ribs'):
    """An unfinished hull on the slipway: keel, U-shaped ribs and gunwales."""
    b.beam(label,'wood_drift',(x,y0,.2),(x,y1,.2),.3,n=6);tops=[]
    for k in range(int((y1-y0)/1.6)+1):
        y=y0+k*1.6;ww=w/2*(.35+.65*math.sin(math.pi*(y-y0)/(y1-y0))**.5)
        pts=[(x+ww*u/4,y,.2+h*(u/4)**2) for u in range(-4,5)]
        for a,c in zip(pts,pts[1:]):b.beam(label,'wood_drift',a,c,.12,n=5)
        tops.append((pts[0],pts[-1]))
    for (a,c),(a2,c2) in zip(tops,tops[1:]):b.beam(label,'wood_weathered',a,a2,.1,n=5);b.beam(label,'wood_weathered',c,c2,.1,n=5)

def takhian_tree(x,y,s=1):
    """A hundred-year takhian: tall straight trunk, buttress roots, three-colour offering cloths, a dark crown high up."""
    b.beam('Takhian trunks','bark_takhian',(x,y,-.3),(x+.4*s,y+.2*s,13*s),1.0*s,.5*s,n=14)
    for i in range(7):
        a=i*math.tau/7+.4;dx,dy=math.cos(a),math.sin(a)
        b.beam('Takhian buttress roots','bark_takhian',(x+dx*3.1*s,y+dy*3.1*s,-.2),(x+dx*.6*s,y+dy*.6*s,2.6*s),.16*s,.5*s,n=6)
    for k,m in enumerate(('cloth_rose','cloth_yellow','cloth_green')):ring('Offering cloth bands',m,x,y,(1.7+.3*k)*s,1.0*s,.24*s)
    for i in range(8):
        a=i*math.tau/8;b.beam('Offering garlands','flower',(x+math.cos(a)*1.03*s,y+math.sin(a)*1.03*s,2.5*s),(x+math.cos(a)*1.05*s,y+math.sin(a)*1.05*s,1.5*s),.06*s,n=5)
    for i in range(6):
        a=i*math.tau/6+.5;cx,cy=x+math.cos(a)*4.2*s,y+math.sin(a)*4.2*s
        b.beam('Takhian branches','bark_takhian',(x+.3*s,y,9*s),(cx,cy,12*s),.35*s,.12*s,n=6)
        b.crown(cx,cy,12.5*s,3.2*s,2.8*s,1.8*s,'leaf_dark' if i%2 else 'leaf','Takhian canopy')
    b.crown(x+.4*s,y,14*s,4*s,3.6*s,2.2*s,'leaf','Takhian canopy')

def takhian():
    random.seed(10112045)
    shell({'Lantern plinths':'Stump plinths','Stacked rice sacks':'Offering cloth bundles','Clay stoves':'Hunter work tables',
           'Stove fire mouths':'Table skirts','Bedroom red lacquer floor':'Mossy clearing','Noble bed frame':'Fallen takhian log base',
           'Bedroom pillars':'Young takhian trunks'})
    # 0 forest edge: giant takhians on mud islets, west and far east of the clearing
    for x,y,s in [(-31,-50,1.0),(30,-42,.85),(-17,-14,.9),(-17,4,.85),(30,-6,.85),(29,16,.85),(-44,6,1.1),(-42,44,1.0),(22,46,1.1)]:
        islet(x,y,8.5*s,8.5*s);takhian_tree(x,y,s)
    takhian_tree(-18,73,1.5)   # the mother takhian behind the boss clearing
    for x,y,s in [(-36,-30,.9),(-48,-62,.8),(24,-62,.8),(-50,-20,.9),(26,64,.9),(-50,62,.8),(30,32,.7)]:islet(x,y,5*s,5*s);b.tree(x,y,s)
    for x,y in [(xx,yy) for yy in range(-60,70,10) for xx in (-53,33)]+[(-40,-67),(-28,-67),(16,-67),(28,-67)]:   # the forest wall at the map edge
        s=random.uniform(.75,1.05);islet(x,y,5*s,5*s);b.tree(x+random.uniform(-1,1),y,s)
    for x,y in [(-26,-46),(-35,-53),(26,-38),(-21,-17),(-21,8),(-48,2),(26,42),(-38,48),(-40,-28),(-46,-58)]:b.reed_clump(x,y,0,1.1)
    for a,c in [((20,-60,.2),(28,-55,.45)),((-40,-8,.2),(-33,-2,.35)),((14,30,.2),(20,25,.4)),((-52,26,.25),(-48,34,.3))]:
        b.beam('Fallen takhian logs','bark_takhian',a,c,.55,.45,n=10)
    # 1 root yard: four cursed stumps on krasue's plinths, wrapped in offering cloth
    for x,y in PLINTHS:
        b.beam('Cursed takhian stumps','bark_takhian',(x,y,1.05),(x,y,1.95),.42,.36,n=12)
        b.beam('Cursed takhian stumps','wood_light',(x,y,1.95),(x,y,1.99),.36,n=12)
        for k,m in enumerate(('cloth_rose','cloth_yellow','cloth_green')):ring('Stump offering cloths',m,x,y,1.2+k*.2,.44,.12)
    # 2 the hunter's hut west of the yard; firewood on his tables
    b.house(-40,24,.9)
    for x,y in STOVES:
        for dy in (-.5,0,.5):b.beam('Hunter firewood','bark_takhian',(x-1.1,y+dy,1.68),(x+1.1,y+dy,1.68),.18,n=7)
    for x,y in [(-26.5,17),(-26.5,31),(-9.5,17),(-9.5,31)]:ring('Post offering cloths','cloth_rose',x,y,2.4,.28,.3)
    # 3 boss clearing: a fallen takhian lies where krasue's bed stood, cloth tied round the young trunks
    b.beam('Fallen takhian log','bark_takhian',(-20.8,62,1.75),(-15.2,62,1.75),.55,n=12)
    for k,(xx,m) in enumerate([(-19.4,'cloth_rose'),(-18,'cloth_yellow'),(-16.6,'cloth_green')]):b.beam('Log offering cloths',m,(xx-.2,62,1.75),(xx+.2,62,1.75),.58,n=12)
    for i in range(12):
        a=i*math.tau/12;ring('Trunk offering cloths',('cloth_rose','cloth_yellow','cloth_green')[i%3],-18+math.cos(a)*13.6,52+math.sin(a)*13.6,2.3,.33,.3)
    specks(160,'Fireflies','glow_green',2.6,7)
    recolour({'water':'water_swamp','stone':'stone_dark','paving':'earth_forest','soil':'earth_forest','plank':'wood_weathered',
              'cloth_red':'moss_dark','linen':'cloth_yellow','roof':'roof_dark','roof2':'roof_dark','plaster':'wood_weathered','leaf':'leaf_dark','leaf2':'leaf','trunk':'bark_takhian',
              ('Lantern / glowing paper','gold'):'cloth_rose',('Arena inlays','gold'):'cloth_yellow',('Young takhian trunks','darkwood'):'bark_takhian',
              ('Fallen takhian log base','darkwood'):'bark_takhian',('Table skirts','ceramic'):'cloth_rose'})

def samut():
    random.seed(10112055)
    shell({'Pier posts':'Mooring piles','Lantern plinths':'Mooring post plinths','Stacked rice sacks':'Coiled net bundles','Clay stoves':'Cargo crates',
           'Stove fire mouths':'Crate iron straps','Kitchen posts':'Junk deck posts','Bedroom red lacquer floor':'Cave wet sand floor',
           'Noble bed frame':'Sea ogress treasure chest','Bedroom pillars':'Cave rock columns'})
    # 0 beach of wrecks: sandbars, palms, broken boats, a hull skeleton on the east slipway
    for x,y,w,d in [(-24,-44,10,8),(25,-58,9,7),(-46,-60,10,9),(-40,-10,9,12),(28,0,8,10),(-46,30,8,12),(24,30,9,9)]:islet(x,y,w,d,'sand')
    for x,y,s in [(-27,-46,1.0),(-22,-42,.8),(27,-60,.9),(-48,-62,1.0),(-43,-12,.9),(30,2,.8),(-48,33,1.0),(26,32,.9)]:b.tree(x,y,s,palm=True)
    for x,y,s in [(-9,-62,1.1),(9,-59,.9),(-21,-34,1.2),(20,-54,1.0),(-46,-38,1.3),(31,-18,1.1),(28,52,1.2)]:b.boat(x,y,0,s)
    ship_ribs(26,-46,-28,8,4.5)
    # 1 shipyard at high tide: half-built hulls on both sides of the yard
    ship_ribs(-14,-20,6,7,4);ship_ribs(16,-18,6,7,4)
    for x,y in PLINTHS:   # mooring posts with coiled ropes and a net bundle, all inside the plinth
        b.beam('Mooring posts','wood_drift',(x,y,1.05),(x,y,2.6),.2,.17,n=10)
        for k in range(3):ring('Mooring rope coils','rope',x,y,1.08+k*.1,.42,.09)
        b.crown(x,y,1.6,.3,.3,.35,'linen','Fishing nets')
    for y in range(-20,10,4):b.beam('Drying nets','linen',(-9.5,y,3.4),(-9.5,y+2,3.4),.05,n=4);b.beam('Drying nets','linen',(-9.5,y,3.4),(-9.5,y,1.4),.04,n=4)
    # 2 junk ship deck: the kitchen floor is the deck; hull sides stand 1.5 m out, open where the bridges come in
    strakes([(-23,33.5),(-28.5,33.5),(-32,30),(-33.5,24),(-32,18),(-28.5,14.5)],(.5,1.15,1.8,2.45))
    strakes([(-28.5,14.5),(-8.5,14.5)],(.5,1.15));strakes([(-13,33.5),(-7.5,33.5),(-7.5,25.5)],(.5,1.15,1.8))
    for x,y,h,y0,y1 in [(-30.5,27,15,22.5,31.5),(-30.5,18.5,11,15,22)]:
        b.beam('Junk masts','darkwood',(x,y,-.5),(x,y,h),.42,.25,n=10)
        b.mesh('Junk battened sails','cloth_faded',[(x-.4,y0,4),(x-.4,y1,4),(x-.4,y1,h-1),(x-.4,y0,h-1.5)],[(0,1,2,3),(3,2,1,0)])
        for z in range(5,int(h-1),2):b.beam('Junk sail battens','darkwood',(x-.48,y0,z),(x-.48,y1,z),.06,n=5)
    for x,y in STOVES:b.box('Cargo crate lids','wood_light',x,y,1.55,2.4,2.0,.12)
    # 3 sea cave: rock walls to the north and west of the round floor, glowing sea water inside
    for i in range(9):
        a=math.radians(35+i*22.5);s=random.uniform(1,1.4);r=15.2+3.2*s
        rockpile(-18+math.cos(a)*r,52+math.sin(a)*r,s)
    for x,y,s in [(-2,46,.55),(-30,37,.6)]:rockpile(x,y,s)
    for x,y in [(-40,40),(-38,62),(-12,74),(-2,66)]:b.box('Glowing sea anemones','teal',x,y,.6,.4,.4,.2)
    b.box('Treasure chest lid','wood_red',-18,62,1.55,5.6,2.9,.5)
    for xx in (-20,-16):b.box('Treasure chest bands','gold',xx,62,1.55,.3,3.0,.55)
    b.crown(-18,62,1.95,1.6,.9,.45,'gold','Treasure coin heap');b.crown(-20.3,61.4,2.0,.4,.4,.55,'cloth_rose','Coral branches')
    for i in range(12):
        a=i*math.tau/12;x,y=-18+math.cos(a)*13.6,52+math.sin(a)*13.6
        b.beam('Cave rock columns','rock',(x,y,2.4),(x,y,9),.5,.08,n=9)
    recolour({'water':'water_sea','stone':'rock','paving':'sand',('Kitchen floor','paving'):'plank','soil':'sand_wet','plank':'wood_drift',
              'wood_light':'wood_drift','cloth_red':'sand_wet','linen':'rope','plaster':'wood_weathered',('Fishing nets','linen'):'linen',
              ('Drying nets','linen'):'linen',('Arena inlays','gold'):'teal',('Lantern / glowing paper','gold'):'teal',
              ('Cave rock columns','darkwood'):'rock',('Sea ogress treasure chest','darkwood'):'wood_red',('Mooring piles','darkwood'):'wood_drift'})

def saiyadam():
    random.seed(10112065)
    shell({'Lantern plinths':'Magic pot plinths','Stacked rice sacks':'Black cloth bundles','Clay stoves':'Buffalo feed troughs',
           'Stove fire mouths':'Trough boards','Kitchen posts':'Pen posts','Bedroom red lacquer floor':'Ritual floor',
           'Noble bed frame':'Sorcerer altar','Bedroom pillars':'Ritual hall posts'})
    # 0 the abandoned village: empty houses and dead trees round the yard
    for x,y,s in [(26,-48,1.15),(-25,-52,1.05),(-27,-30,.9),(26,-26,.9),(20,28,1.0),(-44,40,1.0)]:b.house(x,y,s)
    for x,y,s in [(-20,-40,.9),(-34,-62,1.0),(22,-62,.9),(-24,-8,1.1),(-46,10,1.0),(30,10,.9),(-36,58,1.1),(28,46,.9),(-46,-30,1.0)]:dead_tree(x,y,s)
    for x,y,s in [(-20,-40,.9),(-24,-8,1.1),(30,10,.9)]:b.crown(x+1.4*s,y,3.6*s,.18,.14,.32,'reeds','Hanging straw dolls')
    # 1 the pot room under the empty houses: big black clay pots on krasue's plinths
    stilt_house(-13,-6,10,30,label='Abandoned stilt house')
    for yy in range(-20,9,3):b.beam('Collapsed house stilts','darkwood',(10.4,yy,-.2),(10.4,yy,2.6+(yy%2)),.22,n=8);b.beam('Collapsed house stilts','darkwood',(19.6,yy,-.2),(19.6,yy,3.2),.22,n=8)
    b.box('Collapsed house floor','plank',15,-12,3.35,10,14,.3)
    for y in range(-20,10,6):b.beam('Overhead house beams','darkwood',(-8,y,6.8),(8,y,6.8),.2,n=6)
    for y in range(-20,10,4):b.beam('Hanging black cloths','cloth_black',(-6.6,y,6.8),(-6.6,y,3.4),.06,n=4);b.beam('Hanging black cloths','cloth_black',(6.6,y+2,6.8),(6.6,y+2,3.6),.06,n=4)
    for x,y in PLINTHS:
        b.jar(x,y,1.05,.72)
        b.beam('Magic pot lids','ceramic_black',(x,y,2.15),(x,y,2.22),.3,n=20)
        ring('Magic pot cloth ties','cloth_blood',x,y,1.98,.3,.08)
        b.crown(x,y,2.75,.22,.22,.35,'glow_violet','Magic pot smoke')
    # 2 the buffalo pen behind the hall: a bamboo fence 1.5 m outside the floor, open at both bridges
    for a,c in [((-28.5,14.5),(-28.5,33.5)),((-28.5,14.5),(-8.5,14.5)),((-28.5,33.5),(-23,33.5)),((-13,33.5),(-7.5,33.5)),((-7.5,33.5),(-7.5,25.5))]:b.fence(a,c)
    for x,y in [(-31.5,20),(-31.5,28),(-30.5,36)]:b.crown(x,y,.6,1.3,1.1,.9,'reeds','Hay piles')
    for x,y in STOVES:b.box('Trough fodder','reeds',x,y,1.52,2.3,1.9,.06)
    # 3 the ritual room: a black altar where the bed stood, the sorcerer's hall to the east
    b.house(12,58,1.6)
    b.box('Altar black drape','cloth_black',-18,62,1.33,6.0,3.2,.06);b.jar(-18,62,1.36,.9)
    for x,y in [(-20.6,60.8),(-15.4,60.8),(-20.6,63.2),(-15.4,63.2)]:
        b.beam('Altar candles','plaster',(x,y,1.36),(x,y,1.75),.06,n=6);b.box('Altar candle flames','amber',x,y,1.82,.06,.06,.12)
    for i in range(12):
        a=i*math.tau/12;ring('Post black cloths','cloth_black',-18+math.cos(a)*13.6,52+math.sin(a)*13.6,2.6,.32,.7)
    specks(70,'Spirit wisps','glow_violet',2.8,6,.22)
    recolour({'water':'water_ink','stone':'stone_dark','paving':'stone_ash','soil':'mud_dark','plank':'wood_weathered','wood_light':'wood_weathered',
              'cloth_red':'cloth_violet','linen':'cloth_black',('Buffalo feed troughs','plaster'):'wood_weathered',('Trough boards','ceramic'):'darkwood',
              'ceramic':'ceramic_black','ceramic_dark':'ceramic_black','teal':'glow_violet',('Arena inlays','gold'):'glow_violet',
              ('Lantern / glowing paper','gold'):'glow_violet','gold':'gold_dull','roof':'roof_dark','roof2':'roof_dark','plaster':'stone_ash',
              ('Altar candles','plaster'):'plaster','leaf':'leaf_dark','leaf2':'leaf_dark','leaf3':'leaf_dark'})

def pret():
    random.seed(10112080)
    shell({'Pier posts':'Landing posts','Lantern plinths':'Brazier plinths','Stacked rice sacks':'Rubble heaps','Clay stoves':'Ash furnaces',
           'Stove fire mouths':'Furnace fire mouths','Kitchen posts':'Underworld gate columns','Bedroom red lacquer floor':'Throne hall floor',
           'Noble bed frame':'Ruined throne dais','Bedroom pillars':'Throne hall columns'})
    # 0 the ruined street: broken city walls, burnt halls, palace roofs sunk in the dark water
    for a,c in [((-16,-47),(-16,-29)),((16,-47),(16,-29))]:b.stone_wall(a,c,2.2)
    for x,y,s in [(28,-48,1.1),(-27,-50,1.0),(-44,28,1.1)]:b.house(x,y,s)
    for x,y,z,w,d,h in [(28,-12,-1,14,18,6),(-36,-40,-.5,12,16,5),(-40,-6,-1.2,14,18,6.5),(16,60,-1,16,14,6),(26,36,-1,12,14,5),(-46,58,-.8,12,14,5.5)]:b.roof(x,y,z,w,d,h)
    for x,y,s,h in [(-50,-62,1.6,13),(30,-66,1.3,10),(-52,-24,1.5,12),(32,-34,1.2,9),(-54,12,1.7,14),(33,18,1.2,9),(-52,46,1.5,12),(30,68,1.3,10),(-34,72,1.2,9)]:
        b.beam('Underworld rock spires','stone_dark',(x,y,-.5),(x,y,h),s,.05,n=9)
    # 1 the fire bridge: rivers of hellfire both sides (named as water, so the walk grid treats them as water), iron braziers on the plinths
    for x in (-10.5,10.5):
        b.box('Water surface / hellfire river','glow_fire',x,-6,.02,3,30,.02)
        for k,y in enumerate(range(-19,9,4)):flame(x,y+(k%2),.7,1.3,'glow_fire',light=k%2==0)
    for y in range(-20,10,6):
        for x in (-20,20):b.beam('Broken palace columns','stone_dark',(x,y,-.3),(x,y,random.uniform(2.5,7)),.45,.4,n=10)
    for i,(x,y) in enumerate(PLINTHS):
        b.beam('Iron fire braziers','iron',(x,y,1.05),(x,y,1.3),.14,n=10)
        b.beam('Iron fire braziers','iron',(x,y,1.3),(x,y,1.75),.2,.44,n=14)
        ring('Iron fire braziers','iron',x,y,1.72,.45,.06)
        flame(x,y,2.05,1,'glow_green' if i%2 else 'glow_fire','Brazier flames')
    # 2 the underworld gate: a gate hall west of the furnace floor, green fire on its towers
    for y in (17,31):b.box('Underworld gate towers','stone_dark',-33,y,3.2,3,3,6.4);flame(-33,y,7.1,1.6,'glow_green')
    b.box('Underworld gate lintel','stone_dark',-33,24,7,3.4,17,1.2);b.roof(-33,24,7.6,6,18,4)
    for x,y in STOVES:flame(x,y,1.9,.8,'glow_fire',light=False)
    # 3 the throne hall: a dais where the bed stood, palace roofs behind it, green fire pools in the abyss
    b.box('Throne seat','gold_dull',-18,62.4,1.65,2.6,1.8,.7);b.box('Throne back','gold_dull',-18,63.2,2.6,2.6,.3,2.6)
    for x in (-20.4,-15.6):flame(x,61,1.75,.9,'glow_green')
    for x,y,z,w,d,h in [(-18,72,1.5,10,8,6),(-31,70,1,8,8,5),(-5,70,1,8,8,5)]:b.roof(x,y,z,w,d,h)
    for i in range(12):
        a=i*math.tau/12;b.box('Column gold capitals','gold_dull',-18+math.cos(a)*13.6,52+math.sin(a)*13.6,6.9,.9,.9,.3)
    for x,y,w,d in [(-40,-58,6,5),(26,-58,5,6),(-46,-14,5,7),(26,6,5,5),(-48,44,6,6),(24,48,5,6),(-30,16,3,4)]:
        b.beam('Water surface / ghost fire pool','glow_green',(x,y,.01),(x,y,.03),min(w,d)/2,n=20);flame(x,y,.8,1.6,'glow_green')
    recolour({'water':'water_abyss','stone':'stone_dark','paving':'stone_ash','soil':'earth_ash','plank':'wood_charred','wood_light':'wood_charred',
              'wood_weathered':'wood_charred','wood':'wood_charred','cloth_red':'cloth_blood','linen':'stone_ash','plaster':'stone_dark','wall':'stone_ash',
              ('Furnace fire mouths','ceramic'):'glow_fire','teal':'glow_green','amber':'glow_fire',('Arena inlays','gold'):'glow_green',
              ('Lantern / glowing paper','gold'):'glow_fire','gold':'gold_dull','roof':'roof_ash','roof2':'roof_dark','leaf':'leaf_dark',
              ('Throne hall columns','darkwood'):'wood_red',('Ruined throne dais','darkwood'):'stone_dark'})

BUILD={'dg-krasue':krasue,'dg-takhian':takhian,'dg-samut':samut,'dg-saiyadam':saiyadam,'dg-pret':pret}
LIGHT={'dg-takhian':'moonlit-mill','dg-samut':'lotus-marsh','dg-saiyadam':'moonlit-mill'}
def render(mid,draft=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    b.G={};b.M={};b.ROUTES=[];b.BUILDING_FOOTPRINTS=[];b.LAMP_POSITIONS=[]
    W.WATER=[];W.ISLANDS=[];W.CLEAR=[];W.PLANT_CENTERS=[];W.EDGE_UVS={}
    print('START_MAP',mid,flush=True)
    BUILD[mid]()
    tex=W.materials.setup_materials(b,ROOT);W.materials.add_edge_materials(b,ROOT)
    stats=W.make_geometry();W.setup_light(LIGHT.get(mid,'mill-cellar'))
    scene=bpy.context.scene;scene['map_id']=mid
    detail=W.camera('Camera - dungeon path',Vector((-10,0,0))+Vector((60,-80,90)),Vector((-8,0,0)),120)
    scene.camera=detail
    folder=ROOT/mid;folder.mkdir(exist_ok=True)
    scene.render.resolution_percentage=60 if draft else 100;scene.cycles.samples=12 if draft else 24
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/(mid+'.blend')),compress=True)
    scene.render.filepath=str(folder/('draft.png' if draft else 'preview.png'));bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(filepath=str(folder/(mid+'.glb')),export_format='GLB',export_cameras=False,export_lights=False,export_apply=True,export_image_format='AUTO')
    (folder/'scene-report.json').write_text(json.dumps({'map':mid,'faces':sum(s['faces'] for s in stats.values())}),encoding='utf8')
    print('MAP_DONE',mid,flush=True)

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    for mid in [a for a in args if a in BUILD] or list(BUILD):render(mid,'--draft' in args)

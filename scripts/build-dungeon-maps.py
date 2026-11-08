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

BUILD={'dg-krasue':krasue}
def render(mid,draft=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    b.G={};b.M={};b.ROUTES=[];b.BUILDING_FOOTPRINTS=[];b.LAMP_POSITIONS=[]
    W.WATER=[];W.ISLANDS=[];W.CLEAR=[];W.PLANT_CENTERS=[];W.EDGE_UVS={}
    print('START_MAP',mid,flush=True)
    BUILD[mid]()
    tex=W.materials.setup_materials(b,ROOT);W.materials.add_edge_materials(b,ROOT)
    stats=W.make_geometry();W.setup_light('mill-cellar')
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

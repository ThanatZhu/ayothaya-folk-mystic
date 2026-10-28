"""ภาคจุติ maps (rebirth-*) in the v7 look, on top of the rebirth196 draft layouts (map ids, spawn, portals, quest
routes, camps, NPCs and boss arenas stay where the layout puts them).
blender -b --python rebirth.py -- <map-id> <layout.json>   -> maps-v7/<map-id>/<map-id>-v7.blend
Ground patches are rounded and feathered (no square edges); rivers use water.py (sunken banks, shore-cut surface).
The walk grid is baked afterwards (bake-nav-v2.py) and rebirth-nav.mjs blocks the layout's water cells.
Blender (x, y) = game (x, -z).
"""
import bpy, sys, json, math, random, time
from pathlib import Path
HERE=Path(__file__).resolve().parent;OUT=HERE.parent
sys.path.insert(0,str(OUT/'maps-v5'));sys.path.insert(0,str(HERE))
import common, flora, houses, water
w,b=common.w,common.b
args=sys.argv[sys.argv.index('--')+1:]
mid,layout_path=args[0],args[1]
L=json.loads(Path(layout_path).read_text(encoding='utf-8'))
START=time.time();rng=random.Random(19600+len(mid))

THEME={
 'rebirth-ferry':dict(ground='7f9470',path='bfae8a',court='earth',grass=20000,shrub=.03,reeds=True,lotus=46,
   water=dict(shallow=(.82,.88,.92),deep=(.26,.36,.46),inset=(.5,1.3)),trees=[('rain',3),('tamarind',2),('yang',2)],mystic=.25),
}[mid]

# ---- materials and generator state from a v2 scene; its meshes are discarded ------------------------------------
original,digest=common.open_original('old-orchard')
def ensure(key):
    """common.ensure_material, skipping the open .blend (as ch2.py)"""
    if key in b.M:return b.M[key]
    for other in ['ayutthaya','lotus-marsh','moonlit-mill','guild-hall','rice-fields','mill-cellar']:
        blend=common.SOURCE/other/(other+'.blend')
        with bpy.data.libraries.load(str(blend),link=False) as (src,dst):
            if 'Ayothaya_'+key in src.materials:dst.materials=['Ayothaya_'+key]
            else:continue
        mat=next((m for m in bpy.data.materials if m.name.startswith('Ayothaya_'+key) and m not in b.M.values()),None)
        if mat:
            mat.name='Ayothaya_'+key;b.M[key]=mat
            for img in bpy.data.images:
                if not img.packed_file and img.filepath:
                    try:img.pack()
                    except Exception:pass
            return mat
    raise KeyError(key)
for key in ['grass','earth','path','path_edge','mud','grassblade','grassblade2','grassdry','leaf','leaf2','leaf3','leaf4','rock','moss','reeds',
            'paving','water','wood_light','darkwood','plank','wood_red','roof','roof2','tile_dark','gold','wood','wood_weathered','cloth_red','tile_moss',
            'stone','iron','linen','amber','teal']:
    try:ensure(key)
    except KeyError as e:print('NO_MATERIAL',key,flush=True)
def plain(key,hex_rgb,rough=.8):
    mat=bpy.data.materials.new('Ayothaya_'+key);mat.use_nodes=True
    p=mat.node_tree.nodes['Principled BSDF'];lin=lambda c:c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
    p.inputs['Base Color'].default_value=(*[lin(int(hex_rgb[i:i+2],16)/255) for i in (0,2,4)],1);p.inputs['Roughness'].default_value=rough
    b.M[key]=mat;return mat
plain('flower','f1e6c8');plain('flower_pink','e4a6b4');plain('flower_gold','e6c25a');plain('window_dark','1a1510',.95)
for key,hexc in [('lotus','5f8a46'),('lotusvein','8da36c'),('petalpale','efd8d1'),('pink','e59ab2'),('rice','e6c25a')]:
    if key not in b.M:plain(key,hexc,.6)
common.tinted('thatch','grassdry','8c8068');common.tinted('thatch_dark','grassdry','625a4c');common.tinted('thatch_moss','grassdry','6c7056')
common.tinted('meadow_rb','grass',THEME['ground']);common.tinted('path_rb','path',THEME['path'])
common.tinted('laterite','stone','b98a6a');common.tinted('mossy_stone','stone','8d9884')
common.tinted('ribbon_white','linen','f2efe6');common.tinted('lantern_gold','amber','ffcf6a')
water.vertex_colour_water(b.M['water'])

# ---- layout ---------------------------------------------------------------------------------------------------------
WATER=[tuple(r) for r in L.get('water',[])]
w.WATER.extend(WATER)
FIELD=water.Field(WATER,inset=THEME['water']['inset'],seed=len(mid))
PLAZAS=L['plazas'];BX,BY,BR=L['bossArena']
GROUND_Z=lambda x,y:-.08+.025*math.sin(x*.35)*math.sin(y*.27)
def in_water(x,y,pad=0):return any(abs(x-a)<wd/2+pad and abs(y-c)<d/2+pad for a,c,wd,d in WATER)
def game_ground(x,y):return GROUND_Z(x,y)+FIELD.bank(x,y)-water.GAME_DROP
def at_z(fn,z,*a):
    old={k:len(v) for k,(v,f) in b.G.items()};fn(*a)
    for k,(v,f) in b.G.items():
        for i in range(old.get(k,0),len(v)):x,y,zz=v[i];v[i]=(x,y,zz+z)
OCC=[]   # (x,y,r) props already placed
def mark(x,y,r):OCC.append((x,y,r))
def occupied(x,y,r=.5):return any(math.hypot(x-a,y-c)<r+rr for a,c,rr in OCC)

# ---- water: banks, surface, reeds, stones, floating lotus lanterns ------------------------------------------------
water.surface(b,FIELD,THEME['water']['shallow'],THEME['water']['deep'])
for x,y,d in water.shore_points(FIELD,spacing=1.4,seed=31):
    q=random.Random(int(x*91+y*37))
    if THEME['reeds'] and q.random()<.6:b.reed_clump(x,y,max(game_ground(x,y),water.LEVEL)-.02,q.uniform(.6,1.0))
    elif q.random()<.45:b.rock(x,y,max(game_ground(x,y),water.LEVEL)-.12,q.uniform(.12,.3))
LANTERNS=[]
for x,y in water.open_water_points(FIELD,THEME['lotus'],band=(.8,4.5),seed=41):
    if any(w.segdist((x,y),p,q)<wd/2+1 for p,q,wd in L['bridges']):continue
    at_z(b.lotus,water.LEVEL+.012,x,y)
    if rng.random()<.55:   # a paper lantern riding the lotus: the memories that have not found their owner
        z=water.LEVEL+.16;b.box('Lantern / glowing paper','lantern_gold',x+.1,y,z,.22,.22,.26);LANTERNS.append((x,y))
print('WATER lanterns',len(LANTERNS),round(time.time()-START,1),'s',flush=True)

# ---- roads (cut where they cross water: the bridges carry the walk) and bridges ----------------------------------
def in_plaza_core(x,y):return any((abs(x-a)/(wd/2+.2))**3.2+(abs(y-c)/(d/2+.2))**3.2<1 for a,c,wd,d in PLAZAS)
def cut(x,y):return in_water(x,y,.6) or in_plaza_core(x,y)
def pieces(points):
    out=[];cur=[tuple(points[0])] if not cut(*points[0]) else []
    for a,c in zip(points,points[1:]):
        steps=max(2,int(math.dist(a,c)/.25));inside_prev=cut(*a)
        for s in range(1,steps+1):
            t=s/steps;p=(a[0]+(c[0]-a[0])*t,a[1]+(c[1]-a[1])*t);inside=cut(*p)
            if inside and not inside_prev:
                if cur:cur.append(p)
                if len(cur)>=2:out.append(cur)
                cur=[]
            elif not inside and inside_prev:cur=[p]
            inside_prev=inside
        if not inside_prev and cur and tuple(cur[-1])!=tuple(c):cur.append(tuple(c))
    if len(cur)>=2:out.append(cur)
    clean=[]
    for p in out:
        q=[p[0]]
        for v in p[1:]:
            if math.dist(q[-1],v)>.5:q.append(v)
        if len(q)>=2:clean.append(q)
    return clean
for r in L['roads']:
    for piece in pieces(r[:-1]):w.road(piece,r[-1]-1.5)
for p,q,wd in L['bridges']:b.bridge(tuple(p),tuple(q),wd-1.4,.45)

# ---- plazas: rounded, uneven, feathered (the boss ground is old stone, the camps are worn earth) -----------------
def rounded_outline(cx,cy,rx,ry,power=4.0,n=72,seed=0,wobble=.0):
    q=random.Random(seed);ph=q.random()*6;pts=[]
    for k in range(n):
        a=k*math.tau/n;ca,sa=math.cos(a),math.sin(a);r=(abs(ca)**power+abs(sa)**power)**(-1/power)
        jig=1+wobble*(.55*math.sin(3*a+ph)+.3*math.sin(7*a+ph*1.7)+.15*math.sin(13*a))
        pts.append((cx+rx*ca*r*jig,cy+ry*sa*r*jig))
    return pts
def flat_fan(label,key,pts,z,cx,cy):b.mesh(label,key,[(cx,cy,z)]+[(x,y,z) for x,y in pts],[(0,1+i,1+(i+1)%len(pts)) for i in range(len(pts))])
def feather_ring(label,key,inner,cx,cy,width,z,seed=0):
    q=random.Random(seed);n=len(inner);vs=[];uvs=[];run=0
    for k,(x,y) in enumerate(inner):
        dx,dy=x-cx,y-cy;l=math.hypot(dx,dy) or 1;dx,dy=dx/l,dy/l
        if k:run+=math.dist(inner[k-1],inner[k])
        wd=width*q.uniform(.75,1.25);vs+=[(x-dx*.05,y-dy*.05,z),(x+dx*wd,y+dy*wd,z)];uvs+=[(0,run/4),(1,run/4)]
    b.mesh(label,key,vs,[(2*k,2*((k+1)%n),2*((k+1)%n)+1,2*k+1) for k in range(n)])
    w.EDGE_UVS.setdefault((label,key),[]).extend(uvs)
for k,(x,y,wd,d) in enumerate(PLAZAS):
    boss=abs(x-BX)<1 and abs(y-BY)<1
    out=rounded_outline(x,y,wd/2+.6,d/2+.6,power=2.4 if boss else 3.0,n=110,seed=300+k,wobble=.04)
    out=[(px,py) for px,py in out]
    z=.058+k*.002
    flat_fan('Tracks - worn earth','path_rb',out,z,x,y)
    feather_ring('Feathered road shoulders','path_edge',out,x,y,1.6,z+.001,seed=320+k)
    w.CLEAR.append((x,y,wd/2+.6,d/2+.6))
def on_plaza(x,y,pad=0):return any(((x-a)/(wd/2+.6+pad))**2+((y-c)/(d/2+.6+pad))**2<1.25 for a,c,wd,d in PLAZAS)

# ---- meadow and soil --------------------------------------------------------------------------------------------------
water.ground(b,'Ground - varied meadow','meadow_rb',FIELD,GROUND_Z)
b.box('Soil foundation','earth',0,0,-2.2,180,180,2.3)

# ---- shared props -------------------------------------------------------------------------------------------------------
def block(label,key,x,y,a,l,wd,h,z=0,tilt=0):
    c,s=math.cos(a),math.sin(a);verts=[]
    for sa in (-l/2,l/2):
        for sr in (-wd/2,wd/2):
            for zz in (0,h):verts.append((x+c*sa-s*sr+tilt*zz,y+s*sa+c*sr,z+zz))
    b.mesh(label,key,verts,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)])
def pillar(x,y,h,r=.55,key='laterite',label='Ruined laterite pillars'):
    z=0;k=0
    while z<h:
        dh=min(rng.uniform(.55,.8),h-z)
        if dh<.15:break
        b.beam(label,key,(x+rng.uniform(-.03,.03),y+rng.uniform(-.03,.03),z),(x,y,z+dh),r*(1-.04*k),r*(1-.04*k)*.97,10);z+=dh;k+=1
    common.ground_patch('Stone moss patches','moss',x,y,r*1.2,r,z=.06,seed=int(x*7+y));mark(x,y,r+.3)
def mooring_post(x,y,z0,h,lean=0):
    b.beam('Old mooring posts','darkwood',(x,y,z0-.4),(x+lean,y+lean*.5,z0+h),.17,.13,8)
    b.beam('Mooring post rope','linen',(x+lean*.8,y+lean*.4,z0+h*.78),(x+lean*.8,y+lean*.4,z0+h*.86),.2,.2,8)

def ferry():
    # ---- ท่ายายจันทร์ (spawn, north): a timber landing on the river head, Yai Chan's boat, spirit lanterns ---------
    sx,sy=L['spawn'];top=max(c+d/2 for a,c,wd,d in WATER if abs(a)<20)   # river head
    deck_y0,deck_y1=top-2.2,PLAZAS[4][1]-PLAZAS[4][3]/2+1.5
    for k in range(int((deck_y1-deck_y0)/.42)):
        y=deck_y0+k*.42+.21;block('Bridge / separate deck boards',rng.choice(['plank','wood_light','wood_weathered']),0,y,0,5.2,.38,.12,.36)
    for x in (-2.7,2.7):
        for y in [deck_y0+.3,deck_y0+2.4,deck_y0+4.6,deck_y1-.4]:mooring_post(x,y,.0,1.6,rng.uniform(-.06,.06))
    houses.sampan(b,-1.4,top-4.5,.04,water.LEVEL,roofed=True,seed=1)
    for x in (-5.5,5.5):b.lantern(x,sy-3.5,ghost=True);mark(x,sy-3.5,.6)
    # a small sala by the landing where the ferrywoman rests
    b.house(-10,sy-1,.62,sala=True);mark(-10,sy-1,4.2)
    # ---- เรือนแพร้าง (west): abandoned raft houses half sunk in a backwater ------------------------------------------
    for k,(x,y,a) in enumerate([(-46,9,.3),(-41,-3,-.2),(-49,-6,.1)]):
        houses.sampan(b,x+3.5,y-1.5,a,water.LEVEL,roofed=False,seed=10+k)
    for k,(x,y,s,a) in enumerate([(-44,12,.6,.25),(-47,-1,.55,-.15),(-40,-9,.5,.35)]):
        at_z(b.house,-.55,x,y,s);mark(x,y,4)
        for d in range(5):mooring_post(x+rng.uniform(-3,3),y+rng.uniform(-3,3),water.LEVEL,rng.uniform(.6,1.6),rng.uniform(-.25,.25))
    # ---- ดงกกริมตลิ่ง (east): reed beds round a still marsh ------------------------------------------------------------
    for k in range(60):
        x,y=rng.uniform(38,56),rng.uniform(-16,6)
        if in_water(x,y,-.5) and not occupied(x,y,.4):b.reed_clump(x,y,water.LEVEL-.02,rng.uniform(.8,1.25));mark(x,y,.3)
    # ---- ท่าน้ำโบราณ (south): the ancient water gate where the river ends, broken posts, a stone landing ---------------
    gy=min(c-d/2 for a,c,wd,d in WATER if abs(a)<20)   # river foot
    for dx in (-8.5,8.5):
        block('Water gate towers','laterite',dx,gy+.4,0,2.6,2.6,5.8,-.6,tilt=rng.uniform(-.02,.02))
        block('Water gate tower caps','mossy_stone',dx,gy+.4,0,3.1,3.1,.5,5.2)
        mark(dx,gy+.4,1.9)
    block('Water gate lintel','laterite',-1.2,gy+.4,0,11.5,1.6,1.2,5.6,tilt=.03)   # cracked: one end sags
    block('Water gate fallen lintel','laterite',5.2,gy+3.2,.5,6.0,1.4,1.0,water.LEVEL-.4)
    for k in range(14):
        x=rng.uniform(-9,9);y=gy+rng.uniform(2,14)
        if in_water(x,y,-1.2):mooring_post(x,y,water.LEVEL,rng.uniform(.4,1.8),rng.uniform(-.35,.35))
    for k in range(8):   # broken stone landing steps on the arena side
        block('Weathered curb stones','mossy_stone',-6+k*1.7+rng.uniform(-.2,.2),gy-1.1,rng.uniform(-.06,.06),1.5,.9,.18,0,tilt=rng.uniform(-.03,.03))
    for k in range(10):   # pillars ringing the boss ground, most broken
        a=k*math.tau/10+.3;rr=BR+1.8;x,y=BX+rr*math.cos(a),BY+rr*math.sin(a)
        if in_water(x,y,2) or any(w.segdist((x,y),(0,-51),(0,-68))<6 for _ in [0]):continue
        pillar(x,y,rng.uniform(1.2,3.6))
    for k in range(6):b.lantern(BX+(BR-3)*math.cos(k*math.tau/6+.5),BY+(BR-3)*math.sin(k*math.tau/6+.5),ghost=True)
    # spirit lanterns along the roads
    for r in L['roads']:
        pts=r[:-1]
        for a,c in zip(pts,pts[1:]):
            n=int(math.dist(a,c)/16)
            for i in range(n):
                t=(i+.5)/max(1,n);x=a[0]+(c[0]-a[0])*t;y=a[1]+(c[1]-a[1])*t;dx,dy=c[0]-a[0],c[1]-a[1];l=math.hypot(dx,dy);nx,ny=-dy/l,dx/l
                x+=nx*(r[-1]/2+.6);y+=ny*(r[-1]/2+.6)
                if not in_water(x,y,1.5) and not on_plaza(x,y,1) and not occupied(x,y,1):b.lantern(x,y,ghost=True);mark(x,y,.6)
{'rebirth-ferry':ferry}[mid]()

# ---- trees: v7 species in the open, a dense belt at the edge (the play area is the 140 m square) ------------------
PROTOS={}
def proto(kind,variant,mystic=False):
    key=(kind,variant,mystic)
    if key not in PROTOS:PROTOS[key]=flora.species(kind,101+variant*17+len(PROTOS)*3,mystic)
    return PROTOS[key]
def pick(mix):
    t=rng.uniform(0,sum(wt for k,wt in mix))
    for k,wt in mix:
        t-=wt
        if t<=0:return k
    return mix[-1][0]
def clear_of_routes(x,y,pad):
    if any(w.segdist((x,y),r['a'],r['b'])<r['width']/2+pad for r in b.ROUTES):return False
    return not on_plaza(x,y,pad*.6) and not in_water(x,y,pad) and not occupied(x,y,pad*.5)
TREES=0
def tree(x,y,s):
    global TREES
    mystic=rng.random()<THEME['mystic'] and in_water(x,y,9)
    flora.place(proto(pick(THEME['trees']),rng.randrange(2),mystic),x,y,0,rng.uniform(0,math.tau),max(.95,s));mark(x,y,2.4*s);TREES+=1
for _ in range(900):   # edge belt
    x,y=rng.uniform(-69,69),rng.uniform(-69,69)
    if max(abs(x),abs(y))<58 or abs(x)<9 and abs(y)>55:continue
    if clear_of_routes(x,y,3.2):tree(x,y,rng.uniform(1.0,1.35))
for _ in range(500):   # loose groves inside
    x,y=rng.uniform(-56,56),rng.uniform(-56,56)
    if clear_of_routes(x,y,5.5) and rng.random()<.35:tree(x,y,rng.uniform(.95,1.2))
print('TREES',TREES,round(time.time()-START,1),'s',flush=True)

# ---- scatter: grass, shrubs, stones (walk-through labels); never on roads, plazas, water or props -----------------
def open_ground(x,y,margin=.1):return w.path_clear(x,y,margin) and not in_water(x,y,.4) and not on_plaza(x,y) and not occupied(x,y,.4)
for _ in range(THEME['grass']):
    x,y=rng.uniform(-69,69),rng.uniform(-69,69)
    if not open_ground(x,y):continue
    b.grass_tuft(x,y,GROUND_Z(x,y)+FIELD.bank(x,y),rng.uniform(.55,1.05))
    u=rng.random()
    if u<THEME['shrub']:b.shrub(x,y,rng.uniform(.3,.7))
    elif u<THEME['shrub']+.012:b.rock(x,y,GROUND_Z(x,y)-.02,rng.uniform(.15,.4))

for key in {key for label,key in b.G if key not in b.M}:ensure(key)
stats=w.make_geometry()
for (label,mat),uvs in common.TREE_UVS.items():
    me=bpy.data.objects[label+' | '+mat].data
    for face in me.polygons:
        values=[uvs[me.loops[li].vertex_index] for li in face.loop_indices]
        seam=max(u for u,v in values)-min(u for u,v in values)>.5
        for li,(u,v) in zip(face.loop_indices,values):me.uv_layers.active.data[li].uv=(u+1 if seam and u<.5 else u,v)
folder=HERE/mid;folder.mkdir(exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(folder/(mid+'-v7.blend')),compress=True)
print('REBIRTH_BUILT',mid,sum(x['vertices'] for x in stats.values()),round(time.time()-START,1),'s',flush=True)

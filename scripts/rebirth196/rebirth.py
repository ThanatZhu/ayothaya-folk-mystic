"""ภาคจุติ maps (rebirth-*) in the v7 look, on top of the rebirth196 layouts (map ids, spawn, portals, quest routes,
camps, NPCs and boss arenas stay where the layout puts them).
blender -b --python rebirth.py -- <map-id> <layout.json>   -> maps-v7/<map-id>/<map-id>-v7.blend
Three kinds of ground:
- 'meadow' (ferry, kalpa, rahu): one meadow with a winding river sunk into banks (water.py); rahu's river is lava.
- 'sky' (gandharva): floating islands over a cloud sea; the walk is the islands plus the rope bridges between them.
- 'sea' (sithandon): golden islands in a ring sea, joined by glass bridges.
Ground patches are rounded and feathered (no square edges). The walk grid is baked afterwards (bake-nav-v2.py) and
rebirth-nav.mjs blocks water, lava and sky cells. Blender (x, y) = game (x, -z).
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

W_FERRY=dict(shallow=(.82,.88,.92),deep=(.26,.36,.46),inset=(.5,1.3))
THEME={
 'rebirth-ferry':dict(kind='meadow',ground='7f9470',path='bfae8a',grass=20000,shrub=.03,flower=0,reeds=True,lotus=46,water=W_FERRY,
   trees=[('rain',3),('tamarind',2),('yang',2)],mystic=.25,belt=True),
 'rebirth-kalpa':dict(kind='meadow',ground='86b36a',path='dcc391',grass=26000,shrub=.05,flower=.05,reeds=True,lotus=40,
   water=dict(shallow=(.92,1.,.96),deep=(.34,.7,.72),inset=(.5,1.2)),trees=[('rain',2),('bodhi',2),('frangipani',3),('mango',2)],mystic=.4,belt=True),
 'rebirth-rahu':dict(kind='meadow',ground='6f645c',path='9a8170',grass=5000,shrub=.006,flower=0,reeds=False,lotus=0,lava=True,
   water=dict(shallow=(1,.55,.2),deep=(.85,.18,.05),inset=(.6,1.4)),trees=[],mystic=0,belt=False),
 'rebirth-gandharva':dict(kind='sky',ground='9fbf8a',path='ecdcb6',grass=9000,shrub=.04,flower=.06,reeds=False,lotus=0,water=W_FERRY,
   trees=[('frangipani',4),('bodhi',1)],mystic=.6,belt=False),
 'rebirth-sithandon':dict(kind='sea',ground='c9b984',path='efd9a6',grass=7000,shrub=.025,flower=.03,reeds=False,lotus=0,
   water=dict(shallow=(.78,1.,.96),deep=(.16,.55,.62),inset=(.4,1.)),trees=[('frangipani',2)],mystic=.3,belt=False),
}[mid]
KIND=THEME['kind']

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
def lin(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def plain(key,hex_rgb,rough=.8,glow=0.):
    mat=bpy.data.materials.new('Ayothaya_'+key);mat.use_nodes=True
    p=mat.node_tree.nodes['Principled BSDF'];rgb=(*[lin(int(hex_rgb[i:i+2],16)/255) for i in (0,2,4)],1)
    p.inputs['Base Color'].default_value=rgb;p.inputs['Roughness'].default_value=rough
    if glow:p.inputs['Emission Color'].default_value=rgb;p.inputs['Emission Strength'].default_value=glow
    b.M[key]=mat;return mat
plain('flower','f1e6c8');plain('flower_pink','e4a6b4');plain('flower_gold','e6c25a');plain('window_dark','1a1510',.95)
for key,hexc in [('lotus','5f8a46'),('lotusvein','8da36c'),('petalpale','efd8d1'),('pink','e59ab2'),('rice','e6c25a')]:
    if key not in b.M:plain(key,hexc,.6)
common.tinted('thatch','grassdry','8c8068');common.tinted('thatch_dark','grassdry','625a4c');common.tinted('thatch_moss','grassdry','6c7056')
common.tinted('meadow_rb','grass',THEME['ground']);common.tinted('path_rb','path',THEME['path'])
common.tinted('laterite','stone','b98a6a');common.tinted('mossy_stone','stone','8d9884');common.tinted('basalt','stone','4a4447')
common.tinted('ribbon_white','linen','f2efe6');common.tinted('lantern_gold','amber','ffcf6a');common.tinted('goldrock','rock','d7b56a')
common.tinted('sand','path','e9d6ad');common.tinted('marble','stone','eee8da')
plain('lava','b8360c',.6,.9);plain('ember','b5400f',.6,.7);plain('moonglass','dfe9ff',.25,1.6);plain('flame','ffd36b',.4,4.0)
plain('gem_gold','f2c14e',.3,.6);plain('gem_ruby','d8405a',.3,.6);plain('gem_jade','4fd0a6',.3,.6);plain('cloud','eef3f2',1.)
plain('glass_deck','bfe7e6',.15);plain('obsidian','1d1a20',.2)
if 'water' in b.M:water.vertex_colour_water(b.M['water'])

# ---- layout ---------------------------------------------------------------------------------------------------------
PLAZAS=L['plazas'];BX,BY,BR=L['bossArena']
ISL=[tuple(r) for r in L.get('islands',[])]
POW=2.6   # island outline: a rounded square (superellipse); rebirth-nav.mjs uses the same shape, shrunk a little
def on_island(x,y,pad=0.):
    return any((abs(x-a)/max(.1,wd/2+pad))**POW+(abs(y-c)/max(.1,d/2+pad))**POW<1 for a,c,wd,d in ISL)
WATER=[tuple(r) for r in L.get('water',[])] if KIND!='sky' else []
w.WATER.extend(WATER)
# the sea is drawn past the play square (the layout's 140 m rectangle is what the walk grid blocks)
FIELD=water.Field([(0,0,176,176)] if KIND=='sea' else WATER,inset=THEME['water']['inset'],seed=len(mid)) if WATER else None
GROUND_Z=lambda x,y:-.08+.025*math.sin(x*.35)*math.sin(y*.27)
def in_rect(x,y,pad=0):return any(abs(x-a)<wd/2+pad and abs(y-c)<d/2+pad for a,c,wd,d in WATER)
def in_water(x,y,pad=0):
    """water/lava/sky under foot: rivers for meadow maps, everything off the islands for the sea and the sky"""
    if KIND=='meadow':return in_rect(x,y,pad)
    return not on_island(x,y,-pad)
def bank(x,y):return FIELD.bank(x,y) if (FIELD and KIND=='meadow') else 0.
def game_ground(x,y):return GROUND_Z(x,y)+bank(x,y)-water.GAME_DROP
def at_z(fn,z,*a,**k):
    old={kk:len(v) for kk,(v,f) in b.G.items()};fn(*a,**k)
    for kk,(v,f) in b.G.items():
        for i in range(old.get(kk,0),len(v)):x,y,zz=v[i];v[i]=(x,y,zz+z)
OCC=[]
def mark(x,y,r):OCC.append((x,y,r))
def occupied(x,y,r=.5):return any(math.hypot(x-a,y-c)<r+rr for a,c,rr in OCC)

# ---- water / lava: banks, surface, shore props -------------------------------------------------------------------
WATER_SURF=None
if KIND=='meadow':
    lava=THEME.get('lava')
    WATER_SURF=water.surface(b,FIELD,THEME['water']['shallow'],THEME['water']['deep'],label='Lava flow' if lava else 'Water surface',mat='lava' if lava else 'water')
    for x,y,d in water.shore_points(FIELD,spacing=1.4,seed=31):
        q=random.Random(int(x*91+y*37))
        if THEME['reeds'] and q.random()<.6:b.reed_clump(x,y,max(game_ground(x,y),water.LEVEL)-.02,q.uniform(.6,1.0))
        elif q.random()<(.7 if lava else .45):b.rock(x,y,max(game_ground(x,y),water.LEVEL)-.12,q.uniform(.15,.45) if lava else q.uniform(.12,.3))
    if lava:   # cooled crust plates drifting on the flow
        for x,y in water.open_water_points(FIELD,60,band=(.6,4),seed=43):common.blob('Lava crust','basalt',x,y,water.LEVEL+.03,rng.uniform(.4,1.1),rng.uniform(.3,.9),.08,seed=int(x*13+y))
    else:
        ponds=[r for r in WATER if max(r[2],r[3])<30]
        for x,y in water.open_water_points(FIELD,THEME['lotus'],band=(.8,4.5),seed=41):
            if any(w.segdist((x,y),p,q)<wd/2+1 for p,q,wd in L['bridges']):continue
            at_z(b.lotus,water.LEVEL+.012,x,y)
            if mid=='rebirth-ferry' and rng.random()<.55:b.box('Lantern / glowing paper','lantern_gold',x+.1,y,water.LEVEL+.16,.22,.22,.26)
elif KIND=='sea':
    # the game pushes the ground layer back in depth (polygon offset), so the sea sits well below the island tops
    # instead of being cut under them (the game's shore foam traces one solid water outline)
    water.LEVEL=-1.3
    # one coarse sheet (2 m quads): the game builds its shore-foam mask from every water triangle, so a 0.5 m
    # river-style mesh over the whole sea is far too heavy; the depth colour below does the shading
    n=88;vs_=[];fs_=[]
    for j in range(n+1):
        for i in range(n+1):vs_.append((-88+2*i,-88+2*j,water.LEVEL))
    fs_=[(j*(n+1)+i,j*(n+1)+i+1,(j+1)*(n+1)+i+1,(j+1)*(n+1)+i) for j in range(n) for i in range(n)]
    # no water under an island top: the game pushes the ground layer back in depth and the sea would cover it;
    # the hole edge hides under the beach skirt
    fs_=[f for f in fs_ if not all(on_island(vs_[i][0],vs_[i][1],1.2) for i in f)]
    b.mesh('Water surface','water',vs_,fs_);WATER_SURF=(vs_,[THEME['water']['deep']]*len(vs_))
    b.box('Sea bed','sand',0,0,-3.2,176,176,.6)
print('WATER',round(time.time()-START,1),'s',flush=True)

# ---- islands (sky and sea): rounded tops with a feathered rim, a skirt down to the sea / a rock root into the clouds --
def rounded_outline(cx,cy,rx,ry,power=4.0,n=72,seed=0,wobble=.0):
    q=random.Random(seed);ph=q.random()*6;pts=[]
    for k in range(n):
        a=k*math.tau/n;ca,sa=math.cos(a),math.sin(a);r=(abs(ca)**power+abs(sa)**power)**(-1/power)
        jig=1+wobble*(.55*math.sin(3*a+ph)+.3*math.sin(7*a+ph*1.7)+.15*math.sin(13*a))
        pts.append((cx+rx*ca*r*jig,cy+ry*sa*r*jig))
    return pts
def flat_fan(label,key,pts,z,cx,cy):b.mesh(label,key,[(cx,cy,z)]+[(x,y,z) for x,y in pts],[(0,1+i,1+(i+1)%len(pts)) for i in range(len(pts))])
def skirt(label,key,pts,cx,cy,out,drop,z0):
    vs=[];n=len(pts)
    for x,y in pts:
        dx,dy=x-cx,y-cy;l=math.hypot(dx,dy) or 1;dx,dy=dx/l,dy/l
        vs+=[(x,y,z0),(x+dx*out*.45,y+dy*out*.45,z0-drop*.55),(x+dx*out,y+dy*out,z0-drop)]
    fs=[]
    for k in range(n):
        j=(k+1)%n
        fs+=[(3*k,3*j,3*j+1,3*k+1),(3*k+1,3*j+1,3*j+2,3*k+2)]
    b.mesh(label,key,vs,fs)
for k,(x,y,wd,d) in enumerate(ISL):
    out=rounded_outline(x,y,wd/2,d/2,power=POW,n=140,seed=500+k,wobble=.03)
    flat_fan('Ground - varied meadow','meadow_rb',out,-.08,x,y)
    if KIND=='sea':
        skirt('Island beaches','sand',out,x,y,3.6,2.4,-.08)
        for px,py in out[::3]:   # golden rocks round the shore
            if rng.random()<.45:
                dx,dy=px-x,py-y;l=math.hypot(dx,dy);px+=dx/l*1.4;py+=dy/l*1.4
                if not any(w.segdist((px,py),p,q)<wd2/2+1.2 for p,q,wd2 in L['bridges']):common.blob('Golden shore rocks','goldrock',px,py,water.LEVEL-.1,rng.uniform(.5,1.2),rng.uniform(.4,1.),rng.uniform(.4,.9),seed=k*97+int(px))
    else:
        skirt('Floating island cliffs','rock',out,x,y,1.4,2.6,-.08)
        common.blob('Floating island roots','rock',x,y,-6.2,wd*.42,d*.42,5.8,seed=700+k,segments=14,rings=7,wobble=.22)
        for m in range(5):   # hanging root stones under the rim
            a=rng.uniform(0,math.tau);common.blob('Floating island roots','mossy_stone',x+wd*.35*math.cos(a),y+d*.35*math.sin(a),-10.5-rng.uniform(0,3),rng.uniform(1.2,2.6),rng.uniform(1.2,2.4),rng.uniform(2,3.5),seed=720+k*9+m)

# ---- roads (cut where they cross water or leave the islands: the bridges carry the walk) and bridges --------------
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
def gap_span(p,q,reach=1.6):
    """the part of p->q that is off land (sky/sea maps), stretched 'reach' metres onto the islands at both ends"""
    n=200;off=[k for k in range(n+1) if in_water(p[0]+(q[0]-p[0])*k/n,p[1]+(q[1]-p[1])*k/n)]
    if not off:return None
    L0=math.dist(p,q);t0=max(0,off[0]/n-reach/L0);t1=min(1,off[-1]/n+reach/L0)
    return (p[0]+(q[0]-p[0])*t0,p[1]+(q[1]-p[1])*t0),(p[0]+(q[0]-p[0])*t1,p[1]+(q[1]-p[1])*t1)
def glass_bridge(a,c,width):
    """สะพานแก้ว: pale glass deck boards on golden piles, golden rails"""
    L0=math.dist(a,c);dx,dy=(c[0]-a[0])/L0,(c[1]-a[1])/L0;nx,ny=-dy,dx;b.ROUTES.append({'a':a,'b':c,'width':width,'height':.45})
    count=max(2,math.ceil(L0/.5))
    for i in range(count):
        t=(i+.5)*L0/count;ramp=min(1.45,L0*.16);z=.13+.32*max(0,min(1,t/ramp,(L0-t)/ramp))
        x,y=a[0]+dx*t,a[1]+dy*t;ang=math.atan2(dy,dx)
        block('Bridge / separate deck boards','glass_deck',x,y,ang,L0/count-.03,width,.14,z-.14)
    for side in (-1,1):
        inset=min(1.8,L0*.19);npost=max(1,math.ceil((L0-2*inset)/3.2))
        for j in range(npost+1):
            t=inset+(L0-2*inset)*j/npost;x,y=a[0]+dx*t+nx*width/2*side,a[1]+dy*t+ny*width/2*side
            b.beam('Bridge / weathered piles','gold',(x,y,-1.6),(x,y,1.7),.11,.09,8)
        aa=(a[0]+dx*inset+nx*(width/2)*side,a[1]+dy*inset+ny*(width/2)*side);cc=(c[0]-dx*inset+nx*(width/2)*side,c[1]-dy*inset+ny*(width/2)*side)
        for h in (.95,1.55):b.beam('Bridge / side handrails','gold',(*aa,h),(*cc,h),.05,.05,6)
def block(label,key,x,y,a,l,wd,h,z=0,tilt=0):
    c,s=math.cos(a),math.sin(a);verts=[]
    for sa in (-l/2,l/2):
        for sr in (-wd/2,wd/2):
            for zz in (0,h):verts.append((x+c*sa-s*sr+tilt*zz,y+s*sa+c*sr,z+zz))
    b.mesh(label,key,verts,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)])
for p,q,wd in L['bridges']:
    p,q=tuple(p),tuple(q)
    if KIND!='meadow':
        span=gap_span(p,q)
        if not span:continue
        p,q=span
    if KIND=='sea':glass_bridge(p,q,wd-1.4)
    else:b.bridge(p,q,wd-1.4,.45)

# ---- plazas: rounded, uneven, feathered -------------------------------------------------------------------------------
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
    if KIND!='meadow':   # never past an island's edge
        out=[(px,py) if on_island(px,py,-1.2) else (x+(px-x)*.82,y+(py-y)*.82) for px,py in out]
    z=.058+k*.002
    flat_fan('Tracks - worn earth','path_rb',out,z,x,y)
    feather_ring('Feathered road shoulders','path_edge',out,x,y,1.6,z+.001,seed=320+k)
    w.CLEAR.append((x,y,wd/2+.6,d/2+.6))
def on_plaza(x,y,pad=0):return any(((x-a)/(wd/2+.6+pad))**2+((y-c)/(d/2+.6+pad))**2<1.25 for a,c,wd,d in PLAZAS)

# ---- meadow and soil (meadow maps) / clouds (sky) -------------------------------------------------------------------
if KIND=='meadow':
    water.ground(b,'Ground - varied meadow','meadow_rb',FIELD,GROUND_Z)
    b.box('Soil foundation','earth',0,0,-2.2,180,180,2.3)
elif KIND=='sky':
    for k in range(150):   # the cloud sea far below the walk (the bake never reaches it)
        x,y=rng.uniform(-95,95),rng.uniform(-95,95)
        if on_island(x,y,4):continue
        common.blob('Backdrop cloud','cloud',x,y,-14-rng.uniform(0,4),rng.uniform(5,11),rng.uniform(4,9),rng.uniform(1.6,3),seed=900+k,segments=12,rings=6,wobble=.2)

# ---- shared props -------------------------------------------------------------------------------------------------------
def pillar(x,y,h,r=.55,key='laterite',label='Ruined laterite pillars'):
    z=0;k=0
    while z<h:
        dh=min(rng.uniform(.55,.8),h-z)
        if dh<.15:break
        b.beam(label,key,(x+rng.uniform(-.03,.03),y+rng.uniform(-.03,.03),z),(x,y,z+dh),r*(1-.04*k),r*(1-.04*k)*.97,10);z+=dh;k+=1
    if key!='basalt':common.ground_patch('Stone moss patches','moss',x,y,r*1.2,r,z=.06,seed=int(x*7+y))
    mark(x,y,r+.3)
def mooring_post(x,y,z0,h,lean=0):
    b.beam('Old mooring posts','darkwood',(x,y,z0-.4),(x+lean,y+lean*.5,z0+h),.17,.13,8)
    b.beam('Mooring post rope','linen',(x+lean*.8,y+lean*.4,z0+h*.78),(x+lean*.8,y+lean*.4,z0+h*.86),.2,.2,8)
def road_lanterns(ghost=True,every=16):
    for r in L['roads']:
        pts=r[:-1]
        for a,c in zip(pts,pts[1:]):
            n=int(math.dist(a,c)/every)
            for i in range(n):
                t=(i+.5)/max(1,n);x=a[0]+(c[0]-a[0])*t;y=a[1]+(c[1]-a[1])*t;dx,dy=c[0]-a[0],c[1]-a[1];l=math.hypot(dx,dy);nx,ny=-dy/l,dx/l
                x+=nx*(r[-1]/2+.6);y+=ny*(r[-1]/2+.6)
                if not in_water(x,y,1.5) and not on_plaza(x,y,1) and not occupied(x,y,1):b.lantern(x,y,ghost=ghost);mark(x,y,.6)
def bell(x,y,z,s=1.):
    """a golden temple bell / wind chime on a short cord"""
    b.beam('Wind chime cords','linen',(x,y,z+.45*s),(x,y,z+.2*s),.012,.012,4)
    b.beam('Golden wind bells','gold',(x,y,z+.22*s),(x,y,z-.12*s),.06*s,.2*s,10)
    b.beam('Wind bell clappers','gold',(x,y,z-.12*s),(x,y,z-.24*s),.02*s,.03*s,6)
def chime_post(x,y,h=2.6):
    b.beam('Wind chime posts','darkwood',(x,y,0),(x,y,h),.07,.06,8);b.beam('Wind chime posts','gold',(x-.6,y,h),(x+.6,y,h),.04,.04,6)
    for dx in (-.45,0,.45):bell(x+dx,y,h-.5,.9)
    mark(x,y,.4)
def spire(x,y,h,r,key='basalt',label='Basalt spires'):
    b.beam(label,key,(x,y,-.3),(x+rng.uniform(-.2,.2),y+rng.uniform(-.2,.2),h),r,r*.18,6);mark(x,y,r+.2)

# ---- the five maps ------------------------------------------------------------------------------------------------------
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
        if in_rect(x,y,-.5) and not occupied(x,y,.4):b.reed_clump(x,y,water.LEVEL-.02,rng.uniform(.8,1.25));mark(x,y,.3)
    # ---- ท่าน้ำโบราณ (south): the ancient water gate where the river ends, broken posts, a stone landing ---------------
    gy=min(c-d/2 for a,c,wd,d in WATER if abs(a)<20)   # river foot
    for dx in (-8.5,8.5):
        block('Water gate towers','laterite',dx,gy+.4,0,2.6,2.6,5.8,-.6,tilt=rng.uniform(-.02,.02))
        block('Water gate tower caps','mossy_stone',dx,gy+.4,0,3.1,3.1,.5,5.2)
        mark(dx,gy+.4,1.9)
    block('Water gate lintel','laterite',-1.2,gy+.4,0,11.5,1.6,1.2,5.6,tilt=.03)
    block('Water gate fallen lintel','laterite',5.2,gy+3.2,.5,6.0,1.4,1.0,water.LEVEL-.4)
    for k in range(14):
        x=rng.uniform(-9,9);y=gy+rng.uniform(2,14)
        if in_rect(x,y,-1.2):mooring_post(x,y,water.LEVEL,rng.uniform(.4,1.8),rng.uniform(-.35,.35))
    for k in range(8):
        block('Weathered curb stones','mossy_stone',-6+k*1.7+rng.uniform(-.2,.2),gy-1.1,rng.uniform(-.06,.06),1.5,.9,.18,0,tilt=rng.uniform(-.03,.03))
    for k in range(10):
        a=k*math.tau/10+.3;rr=BR+1.8;x,y=BX+rr*math.cos(a),BY+rr*math.sin(a)
        if in_rect(x,y,2) or w.segdist((x,y),(0,-51),(0,-68))<6:continue
        pillar(x,y,rng.uniform(1.2,3.6))
    for k in range(6):b.lantern(BX+(BR-3)*math.cos(k*math.tau/6+.5),BY+(BR-3)*math.sin(k*math.tau/6+.5),ghost=True)
    road_lanterns()

def kalpa():
    # ---- ต้นกัลปพฤกษ์: the wish tree on the west bank, hung with jewel fruit on silk threads, some threads cut ---------
    tx,ty=-14,2
    common.natural_banyan(tx,ty,1.55,seed=1960);mark(tx,ty,4.5)
    for k in range(46):
        a=rng.uniform(0,math.tau);r=rng.uniform(3,9.5);x,y=tx+r*math.cos(a),ty+r*math.sin(a);top=rng.uniform(7.2,10.5);hang=rng.uniform(1.2,3)
        b.beam('Wish tree silk threads','ribbon_white',(x,y,top),(x,y,top-hang),.012,.012,4)
        if rng.random()<.8:common.vegetation._ellipsoid('Kalpa jewel fruit',rng.choice(['gem_gold','gem_ruby','gem_jade']),(x,y,top-hang-.18),(.18,.18,.26),rng,segments=8,rings=4,wobble=.05)
    for k in range(8):b.lantern(tx+7.5*math.cos(k*math.tau/8+.2),ty+7.5*math.sin(k*math.tau/8+.2),ghost=True)
    for k in range(30):   # fallen golden feathers on the roots: the first clue
        a=rng.uniform(0,math.tau);r=rng.uniform(4.5,9);x,y=tx+r*math.cos(a),ty+r*math.sin(a);ang=rng.uniform(0,math.tau)
        b.mesh('Shrub outer leaves','gem_gold',[(x,y,.07),(x+.55*math.cos(ang)-.08*math.sin(ang),y+.55*math.sin(ang)+.08*math.cos(ang),.07),(x+.9*math.cos(ang),y+.9*math.sin(ang),.07),(x+.55*math.cos(ang)+.08*math.sin(ang),y+.55*math.sin(ang)-.08*math.cos(ang),.07)],[(0,1,2,3)])
    # ---- สระบัวกินรี (east): Malai's pond with a pavilion on stilts -----------------------------------------------------
    at_z(b.house,-.35,47,13,.62,sala=True);mark(47,13,4.2)
    for k in range(5):chime_post(37+k*1.6,19.5+rng.uniform(-.3,.3),2.2)
    # ---- ทุ่งดอกไม้ (west camp): a flower meadow; THEME flower density is tripled near it below -------------------------
    # ---- หน้าผารังหัสดีลิงค์ (south): cliffs closing the boss ground, a great nest of branches and golden feathers ----
    for side in (-1,1):
        for k in range(26):
            x=side*rng.uniform(13,60);y=rng.uniform(-70,-63)+(abs(x)-13)*.05
            common.blob('Nest cliff boulders','rock',x,y,rng.uniform(0,2.5),rng.uniform(3,5.5),rng.uniform(2.5,4.5),rng.uniform(3.5,7),seed=40+k*3+side)
            mark(x,y,4)
    nx_,ny_=24,-63
    common.blob('Nest cliff boulders','rock',nx_,ny_,2.5,6,5,6.5,seed=77)
    for k in range(70):   # the nest: a ring of laid branches
        a=k*math.tau/70;r=rng.uniform(3.2,4.4);x,y=nx_+r*math.cos(a),ny_+r*math.sin(a);a2=a+math.pi/2+rng.uniform(-.6,.6);ln=rng.uniform(1.8,3.2)
        b.beam('Nest branches','darkwood',(x-math.cos(a2)*ln/2,y-math.sin(a2)*ln/2,8.4+rng.uniform(0,.9)),(x+math.cos(a2)*ln/2,y+math.sin(a2)*ln/2,8.4+rng.uniform(0,.9)),.09,.06,5)
    for k in range(24):
        a=rng.uniform(0,math.tau);r=rng.uniform(.5,3.5);x,y=nx_+r*math.cos(a),ny_+r*math.sin(a)
        common.vegetation._ellipsoid('Nest golden feathers','gem_gold',(x,y,9.1),(.6,.12,.05),rng,segments=6,rings=3,wobble=.05)
    for k in range(8):
        a=k*math.tau/8+.4;rr=BR+1.5;x,y=BX+rr*math.cos(a),BY+rr*math.sin(a)
        if y<BY-8 or w.segdist((x,y),(0,-51),(0,-68))<6:continue
        common.blob('Nest cliff boulders','mossy_stone',x,y,0,rng.uniform(1,1.8),rng.uniform(1,1.6),rng.uniform(1,2),seed=60+k);mark(x,y,1.8)
    # golden feathers along the road from the landing: the trail the player follows
    for t in range(40):
        x,y=rng.uniform(-30,-2),rng.uniform(40,60)
        if not on_plaza(x,y) and not occupied(x,y,.5):common.vegetation._ellipsoid('Shrub outer leaves','gem_gold',(x,y,.08),(.35,.07,.03),rng,segments=6,rings=3,wobble=.05)
    road_lanterns(ghost=False,every=20)

def rahu():
    # ---- ศาลานางจันทรา (spawn): a stone shrine holding the last moon mirror ---------------------------------------------
    sx,sy=-8,61
    block('Moon shrine plinth','marble',sx,sy,0,3.4,3.4,.5);block('Moon shrine plinth','marble',sx,sy,0,2.4,2.4,.9,.5)
    for dx,dy in ((-1.1,-1.1),(1.1,-1.1),(-1.1,1.1),(1.1,1.1)):b.beam('Moon shrine pillars','marble',(sx+dx,sy+dy,1.4),(sx+dx,sy+dy,3.6),.16,.14,8)
    b.roof(sx,sy,3.6,3.2,3.2,1.2)
    b.beam('Moon mirror','moonglass',(sx,sy-.2,2.05),(sx,sy-.25,2.07),.55,.55,24)
    mark(sx,sy,2.4)
    for x in (-3.5,4.5):b.lantern(x,sy-4,ghost=True);mark(x,sy-4,.6)
    # ---- ซากวิหารอสูร (west): the black-stone asura temple, broken walls, a fallen carved face -------------------------
    cx,cy=-44,-6
    for k,(dx,dy,a,l) in enumerate([(-6,6,0,9),(-6,-7,0,8),(-10,-.5,math.pi/2,10),(3,-8,.1,6)]):
        h=rng.uniform(2.4,4.2);block('Asura temple walls','basalt',cx+dx,cy+dy,a,l,1.1,h,tilt=rng.uniform(-.02,.02));mark(cx+dx,cy+dy,l/2)
        for m in range(3):common.blob('Asura temple rubble','basalt',cx+dx+rng.uniform(-l/2,l/2),cy+dy+rng.uniform(-2,2),0,rng.uniform(.5,1),rng.uniform(.4,.8),rng.uniform(.3,.6),seed=k*5+m)
    for k in range(4):   # stepped prang stump
        s=4.6-k*1.0;block('Asura prang stump','basalt',cx-4,cy,0,s,s,1.1,k*1.1)
    common.blob('Fallen asura face','basalt',cx+2,cy+1.5,.6,1.7,1.4,1.3,seed=11,wobble=.06)
    for dx in (-.6,.6):common.blob('Fallen asura face','ember',cx+2.9,cy+1.5+dx,1.0,.18,.16,.12,seed=12)
    for k in range(6):pillar(cx+rng.uniform(-9,6),cy+rng.uniform(-9,9),rng.uniform(1.5,4.5),.5,'basalt','Broken asura pillars')
    # ---- ทุ่งเสาหินแตก (east camp): a field of cracked basalt columns ---------------------------------------------------
    px,py=PLAZAS[1][0],PLAZAS[1][1]
    for k in range(26):
        a=rng.uniform(0,math.tau);r=rng.uniform(11.5,18);x,y=px+r*math.cos(a),py+r*math.sin(a)
        if in_rect(x,y,2) or occupied(x,y,1.2) or any(w.segdist((x,y),rr['a'],rr['b'])<rr['width']/2+1 for rr in b.ROUTES):continue
        spire(x,y,rng.uniform(2.5,7),rng.uniform(.5,.9))
    # ---- หลุมราหู (south): the crater rim of jagged obsidian round the boss ground --------------------------------------
    for k in range(60):
        a=k*math.tau/60+rng.uniform(-.03,.03);rr=BR+rng.uniform(1,4);x,y=BX+rr*math.cos(a),BY+rr*math.sin(a)
        if in_rect(x,y,2.5) or w.segdist((x,y),(0,-51),(0,-68))<5.5:continue
        spire(x,y,rng.uniform(1.2,4.5),rng.uniform(.35,.8),'obsidian','Crater obsidian shards')
    for k in range(5):b.lantern(BX+(BR-3)*math.cos(k*math.tau/5+.9),BY+(BR-3)*math.sin(k*math.tau/5+.9),ghost=False)
    # dead trees and basalt spires over the plain, embers glowing in cracks
    for _ in range(420):
        x,y=rng.uniform(-68,68),rng.uniform(-68,68)
        if in_rect(x,y,3) or on_plaza(x,y,2) or occupied(x,y,2.5) or any(w.segdist((x,y),rr['a'],rr['b'])<rr['width']/2+2.5 for rr in b.ROUTES):continue
        u=rng.random()
        if u<.2:spire(x,y,rng.uniform(1.5,6),rng.uniform(.4,1))
        elif u<.32:dead_tree(x,y)
        elif u<.5:common.ground_patch('Ember cracks','ember',x,y,rng.uniform(.4,1.1),rng.uniform(.15,.35),z=-.05,seed=int(x*3+y*7))
    road_lanterns(ghost=False,every=22)
def dead_tree(x,y):
    h=rng.uniform(3.5,5.5);lean=rng.uniform(-.4,.4)
    b.beam('Charred dead trees','obsidian',(x,y,-.2),(x+lean,y,h),.28,.12,7)
    for k in range(3):
        a=rng.uniform(0,math.tau);z=rng.uniform(h*.5,h*.9);ln=rng.uniform(1,2)
        b.beam('Charred dead trees','obsidian',(x+lean*z/h,y,z),(x+lean*z/h+ln*math.cos(a),y+ln*math.sin(a),z+ln*.5),.09,.03,5)
    mark(x,y,.6)

def gandharva():
    # ---- เกาะกระดิ่งลม (spawn island): wind chimes that do not ring --------------------------------------------------
    for k,(x,y) in enumerate([(-9,62),(9,62),(-10,52),(10,52)]):chime_post(x,y)
    # ---- หอดนตรี (centre island): the music hall where Thipsuwan plays ----------------------------------------------
    b.house(0,-7,.85,sala=True);mark(0,-7,5.2)
    for k in range(6):b.lantern(9*math.cos(k*math.tau/6+.3),9*math.sin(k*math.tau/6+.3),ghost=True)
    # ---- สวนเมฆ (south-west island): cloud garden, stone lanterns, cloud puffs on the grass ----------------------------
    gx,gy=-32,-20
    for k in range(10):
        a=k*math.tau/10;x,y=gx+11*math.cos(a),gy+9.5*math.sin(a)
        if on_island(x,y,-1.5):
            b.beam('Stone garden lanterns','marble',(x,y,0),(x,y,.9),.18,.14,8);b.beam('Stone garden lanterns','lantern_gold',(x,y,.9),(x,y,1.25),.2,.2,8);b.beam('Stone garden lanterns','marble',(x,y,1.25),(x,y,1.5),.32,.05,8);mark(x,y,.4)
    for k in range(9):
        x,y=gx+rng.uniform(-11,11),gy+rng.uniform(-9,9)
        if on_island(x,y,-2) and not on_plaza(x,y):common.blob('Cloud puffs','cloud',x,y,.5,rng.uniform(.8,1.6),rng.uniform(.7,1.4),rng.uniform(.5,.9),seed=300+k)
    # ---- หอระฆังใหญ่ (boss island): the great bell tower ringed by dark cloud --------------------------------------------
    tx,ty=-15,-63
    for k in range(3):
        s=6.2-k*1.4;block('Bell tower','marble',tx,ty,0,s,s,3.2,k*3.2)
        b.roof(tx,ty,k*3.2+3.2,s+1.2,s+1.2,1.0)
    for dx,dy in ((-1.2,-1.2),(1.2,-1.2),(-1.2,1.2),(1.2,1.2)):b.beam('Bell tower pillars','gold',(tx+dx,ty+dy,9.6),(tx+dx,ty+dy,12.4),.14,.12,8)
    b.roof(tx,ty,12.4,3.8,3.8,2.2);bell(tx,ty,11.6,4.2);mark(tx,ty,4)
    for k in range(10):
        a=k*math.tau/10;x,y=BX+(BR-2.5)*math.cos(a),BY+(BR-2.5)*math.sin(a)
        if on_island(x,y,-2) and w.segdist((x,y),(0,-49),(0,-68))>5:chime_post(x,y,2.4)
    for k in range(18):   # the coiling storm cloud round the tower
        a=k*math.tau/18;common.blob('Storm cloud','basalt',tx+9*math.cos(a),ty+9*math.sin(a),15+2*math.sin(a*3),rng.uniform(3,5),rng.uniform(2.5,4),rng.uniform(1.4,2.2),seed=400+k,wobble=.25)

def sithandon():
    # ---- ท่าเรือทอง (spawn island): golden pier into the ring sea ----------------------------------------------------
    sx,sy=L['spawn']
    for x in (-6,6):b.lantern(x,sy-4,ghost=False);mark(x,sy-4,.6)
    # ---- ศาลารวมขวัญ (centre island): an open golden pavilion where everyone gathers -----------------------------------
    b.house(0,10,.8,sala=True);mark(0,10,4.8)
    for k in range(8):b.lantern(12*math.cos(k*math.tau/8),12*math.sin(k*math.tau/8),ghost=False)
    # ---- ศาลาไฟต้นแสง (boss island): the first flame floating over a stone basin ---------------------------------------
    fx,fy=0,-63
    for k in range(3):block('Flame pavilion steps','marble',fx,fy,0,8-k*1.6,7-k*1.6,.3,k*.3)
    b.beam('First flame basin','gold',(fx,fy,.9),(fx,fy,1.5),1.4,1.8,20)
    common.blob('The first flame','flame',fx,fy,2.6,.8,.8,1.6,seed=5,wobble=.1)
    for dx,dy in ((-3,-2.6),(3,-2.6),(-3,2.6),(3,2.6)):b.beam('Flame pavilion pillars','gold',(fx+dx,fy+dy,.9),(fx+dx,fy+dy,5.4),.22,.2,10)
    b.roof(fx,fy,5.4,8,7,2.6);mark(fx,fy,4.5)
    for k in range(12):   # golden spires (the foot of Mount Meru) behind the flame
        x=rng.uniform(-24,24);y=rng.uniform(-69,-66)
        if abs(x)<6:continue
        common.blob('Golden Meru rocks','goldrock',x,y,rng.uniform(0,2),rng.uniform(2,4),rng.uniform(1.5,3),rng.uniform(3,7),seed=600+k)
    # ---- the ring seas: concentric shoals that read as bands under the water --------------------------------------------
    for k,(r0,r1) in enumerate(L.get('rings',[])):
        n=160;vs=[];fs=[]
        for m in range(n):
            a=m*math.tau/n;vs+=[(r0*math.cos(a),r0*math.sin(a),water.LEVEL-.35),(r1*math.cos(a),r1*math.sin(a),water.LEVEL-.35)]
            j=(m+1)%n;fs.append((2*m,2*j,2*j+1,2*m+1))
        b.mesh('Sea shoals','sand',vs,fs)
{'rebirth-ferry':ferry,'rebirth-kalpa':kalpa,'rebirth-rahu':rahu,'rebirth-gandharva':gandharva,'rebirth-sithandon':sithandon}[mid]()

# ---- trees: v7 species in the open, a dense belt at the edge of meadow maps -------------------------------------------
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
    if KIND!='meadow' and not on_island(x,y,-pad):return False
    return not on_plaza(x,y,pad*.6 if KIND=='meadow' else -1.5) and not in_water(x,y,pad) and not occupied(x,y,pad*.5)
TREES=0
def tree(x,y,s):
    global TREES
    mystic=rng.random()<THEME['mystic'] and (KIND!='meadow' or in_rect(x,y,9) or mid=='rebirth-kalpa')
    flora.place(proto(pick(THEME['trees']),rng.randrange(2),mystic),x,y,0,rng.uniform(0,math.tau),max(.95,s));mark(x,y,2.4*s);TREES+=1
if THEME['trees']:
    if THEME['belt']:
        for _ in range(900):
            x,y=rng.uniform(-69,69),rng.uniform(-69,69)
            if max(abs(x),abs(y))<58 or abs(x)<9 and abs(y)>55:continue
            if clear_of_routes(x,y,3.2):tree(x,y,rng.uniform(1.0,1.35))
    for _ in range(600 if KIND=='meadow' else 900):
        x,y=rng.uniform(-60,60),rng.uniform(-66,66)
        if clear_of_routes(x,y,5.5 if KIND=='meadow' else 3.5) and rng.random()<(.35 if KIND=='meadow' else .5):tree(x,y,rng.uniform(.95,1.2))
if mid=='rebirth-sithandon':
    for _ in range(500):
        x,y=rng.uniform(-60,60),rng.uniform(-66,66)
        if clear_of_routes(x,y,3) and rng.random()<.35:
            flora.place(proto('coconut',rng.randrange(2)),x,y,0,rng.uniform(0,math.tau),rng.uniform(.85,1.1));mark(x,y,1.5);TREES+=1
print('TREES',TREES,round(time.time()-START,1),'s',flush=True)

# ---- scatter: grass, shrubs, flowers, stones (walk-through labels); never on roads, plazas, water or props ---------
def open_ground(x,y,margin=.1):
    if KIND!='meadow' and not on_island(x,y,-.8):return False
    return w.path_clear(x,y,margin) and not in_water(x,y,.4) and not on_plaza(x,y) and not occupied(x,y,.4)
def flowers(x,y):
    fcol=rng.choice(['flower','flower_pink','flower_gold','flower_pink'] if mid!='rebirth-sithandon' else ['flower_gold','flower','flower_gold'])
    for f in range(rng.randint(3,7)):
        fx,fy=x+rng.uniform(-.5,.5),y+rng.uniform(-.5,.5);h=rng.uniform(.18,.38)
        b.beam('Shrub outer leaves','grassblade',(fx,fy,-.04),(fx,fy,h),.012,.008,4)
        common.vegetation._ellipsoid('Shrub outer leaves',fcol,(fx,fy,h+.03),(.05,.05,.03),rng,segments=6,rings=3,wobble=.1)
for _ in range(THEME['grass']):
    x,y=rng.uniform(-69,69),rng.uniform(-69,69)
    if not open_ground(x,y):continue
    z=GROUND_Z(x,y)+bank(x,y) if KIND=='meadow' else -.08
    b.grass_tuft(x,y,z,rng.uniform(.55,1.05) if mid!='rebirth-rahu' else rng.uniform(.3,.6))
    u=rng.random();fl=THEME['flower']*(3 if mid=='rebirth-kalpa' and math.hypot(x-PLAZAS[0][0],y-PLAZAS[0][1])<20 else 1)
    if u<THEME['shrub']:b.shrub(x,y,rng.uniform(.3,.7))
    elif u<THEME['shrub']+fl:flowers(x,y)
    elif u<THEME['shrub']+fl+.012:b.rock(x,y,z-.02,rng.uniform(.15,.4))

for key in {key for label,key in b.G if key not in b.M}:ensure(key)
stats=w.make_geometry()
for (label,mat),uvs in common.TREE_UVS.items():
    me=bpy.data.objects[label+' | '+mat].data
    for face in me.polygons:
        values=[uvs[me.loops[li].vertex_index] for li in face.loop_indices]
        seam=max(u for u,v in values)-min(u for u,v in values)>.5
        for li,(u,v) in zip(face.loop_indices,values):me.uv_layers.active.data[li].uv=(u+1 if seam and u<.5 else u,v)
# water depth colours (the sea is shallow round the islands)
wob=next((o for o in bpy.data.objects if o.name.startswith('Water surface | ')),None)
if wob and WATER_SURF:
    wv,wc=WATER_SURF;col=wob.data.color_attributes.new('Col','BYTE_COLOR','POINT');sh,dp=THEME['water']['shallow'],THEME['water']['deep']
    for k,c in enumerate(wc):
        if KIND=='sea':
            x,y=wv[k][0],wv[k][1];near=min([max(0,math.hypot((x-a)/(wd/2),(y-cc)/(d/2))-1)*min(wd,d)/2 for a,cc,wd,d in ISL] or [9])
            t=max(0,min(1,near/7));t=t*t*(3-2*t);c=tuple(sh[i]+(dp[i]-sh[i])*t for i in range(3))
        col.data[k].color_srgb=(*c,1)
# meadow tone: dry / lush patches, lusher toward the water (vertex colour)
gob=next(o for o in bpy.data.objects if o.name.startswith('Ground - varied meadow'))
col=gob.data.color_attributes.new('Col','BYTE_COLOR','POINT')
for k,vv in enumerate(gob.data.vertices):
    x,y=vv.co.x,vv.co.y;e=FIELD.sample(x,y) if (FIELD and KIND=='meadow') else -99
    nz=.5+.25*math.sin(x*.11+1.3)*math.sin(y*.09+.4)+.15*math.sin(x*.27-y*.19+2.1)+.1*math.sin(x*.53+y*.47)
    lush=max(0,1-max(0,-e)/7) if e>-99 else 0
    dry=max(0,min(1,(nz-.55)*2.4))*(1-lush)
    r,g,bb=(.93,.95,.9)
    r,g,bb=r+(1-r)*dry,g+(.97-g)*dry,bb+(.78-bb)*dry
    r,g,bb=r-(.22*lush),g-(.08*lush),bb-(.2*lush)
    if e>-.4:
        m=max(0,min(1,(e+.4)/.8));wet=max(0,min(1,(e-FIELD.ins(x,y)*.6)/.6))
        r,g,bb=r+(.66-r)*m,g+(.54-g)*m,bb+(.4-bb)*m
        r,g,bb=r*(1-.35*wet),g*(1-.35*wet),bb*(1-.3*wet)
    col.data[k].color=(r,g,bb,1)
mat=gob.data.materials[0];nt=mat.node_tree;bsdf=next(nn for nn in nt.nodes if nn.type=='BSDF_PRINCIPLED')
link=next((l for l in nt.links if l.to_node==bsdf and l.to_socket.name=='Base Color'),None)
ca=nt.nodes.new('ShaderNodeVertexColor');ca.layer_name='Col'
mix=nt.nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
if link:nt.links.new(link.from_socket,mix.inputs[6]);nt.links.remove(link)
else:mix.inputs[6].default_value=bsdf.inputs['Base Color'].default_value
nt.links.new(ca.outputs[0],mix.inputs[7]);nt.links.new(mix.outputs[2],bsdf.inputs['Base Color'])
for o in bpy.data.objects:
    if o.type=='MESH' and any(s in o.name.lower() for s in ('stone','boulder','rock','cloud','crust','shard')):
        for poly in o.data.polygons:poly.use_smooth=True
folder=HERE/mid;folder.mkdir(exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(folder/(mid+'-v7.blend')),compress=True)
print('REBIRTH_BUILT',mid,sum(x['vertices'] for x in stats.values()),round(time.time()-START,1),'s',flush=True)

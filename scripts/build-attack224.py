"""Build immutable r224 attack art. Requires Pillow and NumPy."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageOps
from statistics import median
import numpy as np,json,hashlib
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'docs/attack-motion224-sources';OUT=ROOT/'assets/attack224'
OUT.mkdir(parents=True,exist_ok=True)
CLASSES=['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']
DIRS=['S','SE','E','NE','N','NW','W','SW'];VIEWS=DIRS[:5]
CELL=320;SOLE=288;BODY=144;report={}
def extract(im,row):
 cw,ch=im.width/12,im.height/5;part=im.crop((0,round(row*ch),im.width,round((row+1)*ch))).convert('RGBA')
 arr=np.array(part);a=arr[:,:,3];region=Image.fromarray((a>=115).astype('uint8')*255).filter(ImageFilter.MaxFilter(3))
 ys,xs=np.nonzero(np.array(region));result=[]
 for col in range(12):
  k=np.argmin((xs-(col+.5)*cw)**2+(ys-part.height*.57)**2);seed=(int(xs[k]),int(ys[k]))
  assert region.getpixel(seed)==255,('merged source figures',row,col)
  ImageDraw.floodfill(region,seed,col+1,thresh=0);mask=(np.array(region)==col+1)&(a>=115)
  yy,xx=np.nonzero(mask);assert len(xx)>200
  x0,y0,x1,y1=int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1
  p=arr[y0:y1,x0:x1].copy();p[:,:,3]=np.where(mask[y0:y1,x0:x1],p[:,:,3],0)
  result.append({'image':Image.fromarray(p),'cx':(col+.5)*cw-x0,'cw':cw,'edge':x1>=im.width-1})
 # A guard pose is a safe cycle endpoint if a generated last recovery touched the source edge.
 if result[-1]['edge']:result[-1]={**result[8],'recoveryGuard':True}
 return result
def metrics(entry,cls):
 im=entry['image'];p=np.array(im);a=p[:,:,3]>=115;h,w=a.shape;cx=entry['cx'];cw=entry['cw'];x=np.arange(w)
 central=(x>cx-cw*.29)&(x<cx+cw*.29);head=a&central[None,:]
 if cls!='acolyte':head&=(p[:,:,0]<145)&(p[:,:,1]<130)&(p[:,:,2]<120)
 rows=np.flatnonzero(head.sum(axis=1)>=max(7,round(cw*.045)));assert len(rows),'head not found'
 crown=int(rows[0]);feet=a&(p[:,:,0]<165)&(p[:,:,1]<150)&(p[:,:,2]<140)&((x>cx-cw*.36)&(x<cx+cw*.36))[None,:]
 floor_rows=np.flatnonzero(feet.sum(axis=1)>=4);floor_rows=floor_rows[floor_rows>crown+(h-crown)*.55]
 floor=int(floor_rows[-1]) if len(floor_rows) else h-1
 yy,xx=np.nonzero(feet[max(crown,floor-9):floor+1])
 anchor=float((np.quantile(xx,.1)+np.quantile(xx,.9))/2) if len(xx) else cx
 return {'crown':crown,'floor':floor,'anchor':anchor,'height':max(1,floor-crown)}
catalog=[]
for cls in CLASSES:
 for g in ['male','female']:
  key=f'{cls}-{g}';sheet=Image.open(SRC/f'{key}.png').convert('RGBA');rows=[extract(sheet,r) for r in range(5)]
  measurements=[[metrics(f,cls) for f in row] for row in rows];variants=[]
  for variant in range(3):
   views={};view_meta={}
   for r,d in enumerate(VIEWS):
    group=rows[r][variant*4:variant*4+4];ms=measurements[r][variant*4:variant*4+4]
    ref=median(measurements[r][i]['height'] for i in [0,3])
    half=max(max(m['anchor'],f['image'].width-m['anchor']) for f,m in zip(group,ms))
    scale=min(BODY/ref,(CELL/2-5)/half)
    frames=[];details=[]
    for i,(entry,m) in enumerate(zip(group,ms)):
     f=entry['image'].resize((round(entry['image'].width*scale),round(entry['image'].height*scale)),Image.Resampling.LANCZOS)
     dx=round(CELL/2-m['anchor']*scale);dy=round(SOLE-m['floor']*scale)
     b=f.getchannel('A').point(lambda v:255 if v>=115 else 0).getbbox();bounds=[b[0]+dx,b[1]+dy,b[2]+dx,b[3]+dy]
     assert min(bounds[:2])>=2 and max(bounds[2:])<=CELL-2,(key,variant,d,i,bounds)
     cell=Image.new('RGBA',(CELL,CELL));cell.alpha_composite(f,(dx,dy));frames.append(cell)
     details.append({'bounds':bounds,'crown':m['crown']*scale+dy,'sole':m['floor']*scale+dy})
    views[d]=frames;view_meta[d]={'bodyHeight':ref*scale};report[f'{key}/{variant}/{d}']={'scale':scale,'referenceHeight':ref,'frames':details}
   for left,right in [('SW','SE'),('W','E'),('NW','NE')]:
    views[left]=[ImageOps.mirror(f) for f in views[right]];view_meta[left]=view_meta[right]
   atlas=Image.new('RGBA',(CELL*4,CELL*8))
   for row,d in enumerate(DIRS):
    for i,f in enumerate(views[d]):atlas.alpha_composite(f,(i*CELL,row*CELL))
   name=f'{key}-{variant}.webp';sd=f'{key}-{variant}-sd.webp'
   atlas.save(OUT/name,lossless=True,method=4)
   atlas.resize((640,1280),Image.Resampling.LANCZOS).save(OUT/sd,lossless=True,method=4)
   variants.append({'image':name,'sdImage':sd,'views':view_meta})
  meta={'version':224,'classId':cls,'gender':g,'cell':CELL,'anchor':[CELL/2,SOLE],'directions':DIRS,'frames':4,'variants':variants}
  (OUT/f'{key}.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8');catalog.append(key)
fx_meta={'version':224,'classes':CLASSES,'frames':6,'cell':192,'sdCell':96,'sheets':{}}
for kind in ['trails','impacts']:
 im=Image.open(SRC/f'fx-{kind}.png').convert('RGBA');cw,ch=im.width/6,im.height/8;atlas=Image.new('RGBA',(192*6,192*8))
 # The same transparent edge window on every frame avoids any rectangular cropped glow.
 yy,xx=np.mgrid[0:192,0:192];edge=np.minimum.reduce([xx,yy,191-xx,191-yy])/18;edge=np.clip(edge,0,1);edge=edge*edge*(3-2*edge)
 for row in range(8):
  for col in range(6):
   f=im.crop((round(col*cw),round(row*ch),round((col+1)*cw),round((row+1)*ch))).resize((192,192),Image.Resampling.LANCZOS)
   p=np.array(f);p[:,:,3]=np.round(p[:,:,3]*edge).astype('uint8');atlas.alpha_composite(Image.fromarray(p),(col*192,row*192))
 name=f'fx-{kind}.webp';small=f'fx-{kind}-sd.webp';atlas.save(OUT/name,lossless=True,method=4)
 atlas.resize((576,768),Image.Resampling.LANCZOS).save(OUT/small,lossless=True,method=4);fx_meta['sheets'][kind]={'image':name,'sdImage':small}
(OUT/'fx.json').write_text(json.dumps(fx_meta,indent=2)+'\n',encoding='utf8')
(OUT/'catalog.json').write_text(json.dumps({'version':224,'variants':catalog},indent=2)+'\n',encoding='utf8')
(SRC/'calibration.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
(SRC/'hashes.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in SRC.glob('*.png')},indent=2)+'\n',encoding='utf8')
print(json.dumps({'variants':len(catalog),'attackClips':len(catalog)*3,'frames':len(catalog)*3*32,'bytes':sum(p.stat().st_size for p in OUT.glob('*.webp'))}))


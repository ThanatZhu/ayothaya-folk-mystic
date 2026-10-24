"""Mechanical atlas packing of the six AI-authored poses; no painted substitutions.
Source sheets are kept in outputs/pets128/originals. Runtime assets retain source alpha.
"""
import json,sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageChops
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
manifest=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'outputs/pets128-generation.json'
if not manifest.exists():raise SystemExit('Provide the generation manifest: python scripts/prepare-pet-motion128.py path/to/manifest.json (each row: id, prompt, source). Original sheets stay outside Git.')
rows=json.loads(manifest.read_text(encoding='utf-8'))
out=ROOT/'assets/pets128/motion';out.mkdir(parents=True,exist_ok=True)
contact=Image.new('RGBA',(1280,1600),'#1e302c');pen=ImageDraw.Draw(contact)
def components(mask):
 parent={};spans=[];previous=[];n=0
 def find(a):
  while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
  return a
 for y,line in enumerate(mask):
  diff=np.diff(np.pad(line.astype(np.int8),(1,1)));starts=np.where(diff==1)[0];ends=np.where(diff==-1)[0];current=[]
  j=0
  for x,e in zip(starts,ends):
   n+=1;parent[n]=n
   while j<len(previous) and previous[j][1]<x:j+=1
   k=j
   while k<len(previous) and previous[k][0]<=e:
    parent[find(n)]=find(previous[k][2]);k+=1
   current.append((int(x),int(e),n));spans.append((y,int(x),int(e),n))
  previous=current
 groups={}
 for y,x,e,label in spans:
  key=find(label)
  if key not in groups:groups[key]=[x,y,e,y+1,0]
  g=groups[key];g[0]=min(g[0],x);g[1]=min(g[1],y);g[2]=max(g[2],e);g[3]=max(g[3],y+1);g[4]+=e-x
 labels=np.zeros(mask.shape,dtype=np.int32)
 for y,x,e,label in spans:labels[y,x:e]=find(label)
 return sorted([v+[k] for k,v in groups.items()],key=lambda v:v[4],reverse=True),labels
for i,r in enumerate(rows):
 im=Image.open(ROOT/'outputs/pets128/originals'/ (r['id']+'.png')).convert('RGBA')
 groups,labels=components(np.asarray(im)[:,:,3]>90);groups=groups[:6]
 if len(groups)!=6 or any(v[4]<10000 for v in groups):raise ValueError((r['id'],groups))
 groups=sorted(groups,key=lambda b:(round((b[1]+b[3])/2/im.height),b[0]))
 # Stable row assignment by center, then x; sheets are authored in 3x2.
 groups=sorted(groups,key=lambda b:(b[1]+b[3]))
 groups=sorted(groups[:3],key=lambda b:b[0])+sorted(groups[3:],key=lambda b:b[0])
 bounds=[(max(0,x-3),max(0,y-3),min(im.width,e+3),min(im.height,d+3)) for x,y,e,d,a,label in groups]
 scale=min(294/max(b[2]-b[0] for b in bounds),294/max(b[3]-b[1] for b in bounds))
 atlas=Image.new('RGBA',(960,640));meta={'v':1,'id':r['id'],'columns':3,'rows':2,'cell':320,'frames':6,'clips':{'idle':{'frames':[1],'durations':[1000],'loop':True},'move':{'frames':[0,1,2,1],'durations':[140,140,140,140],'loop':True},'attack':{'frames':[3,4,5],'durations':[170,220,260],'loop':False}},'sourceBounds':bounds,'sourceFile':Path(r['source']).name}
 if r['id'] in ['garuda-dawn','lotus-naga','yantra-owl','water-kingfisher','lantern-bat']:meta['clips']['idle']=meta['clips']['move']
 for j,b in enumerate(bounds):
  crop=im.crop(b)
  mask=Image.fromarray(np.uint8(labels==groups[j][5])*255).filter(ImageFilter.MaxFilter(7)).crop(b)
  crop.putalpha(ImageChops.multiply(crop.getchannel('A'),mask))
  if r['id']=='lotus-naga' and j==2:crop=ImageOps.mirror(crop)
  crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
  atlas.alpha_composite(crop,(j%3*320+(320-crop.width)//2,j//3*320+308-crop.height))
 atlas.save(out/(r['id']+'.webp'),quality=86,method=6);(out/(r['id']+'.json')).write_text(json.dumps(meta,separators=(',',':')),encoding='utf-8')
 thumb=atlas.copy();thumb.thumbnail((620,280));contact.alpha_composite(thumb,(i%2*640,i//2*320+30));pen.text((i%2*640+8,i//2*320+8),r['id'],fill='white')
 print(r['id'],[(b[2]-b[0],b[3]-b[1]) for b in bounds])
contact.convert('RGB').save(ROOT/'outputs/pets128/packed-contact.jpg')
(ROOT/'assets/pets128/prompts.json').write_text(json.dumps({'tool':'built-in image_gen','poses':[{**r,'source':Path(r['source']).name} for r in rows],'processing':'Alpha connected-component crops, same per-sheet scale, common baseline; naga pose 3 mirrored to face right. No invented intermediate poses.'},ensure_ascii=False,indent=2),encoding='utf-8')

"""Pack transparent eight-column/five-view painted walk/run sheets."""
from pathlib import Path
from statistics import median
from attack_sheet228 import extract_sheet
from PIL import Image,ImageOps
import numpy as np
import json
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'docs/character-gait220-sources';OUT=ROOT/'assets/character-gait235'
OUT.mkdir(parents=True,exist_ok=True)
CLASSES=['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']
DIRS=['S','SE','E','NE','N','NW','W','SW'];VIEWS=['S','SE','E','NE','N']
CELL=256;BODY=160;SOLE=240;report={}
def metrics(im,cls):
 p=np.array(im);a=p[:,:,3]>128;h,w=a.shape;body=a.copy();body[:,:round(w*.31)]=False;body[:,round(w*.73):]=False
 if cls!='acolyte':body&=(p[:,:,0]<140)&(p[:,:,1]<125)&(p[:,:,2]<115)
 rows=np.flatnonzero(body.sum(axis=1)>=max(8,round(w*.045)));assert len(rows),'head mass missing'
 crown=int(rows[0]);floor=im.getbbox()[3]-1;hip_y=round(crown+(floor-crown)*.69);centres=[]
 for y in range(max(0,hip_y-3),min(h,hip_y+4)):
  line=np.r_[False,a[y],False].astype('int8');starts=np.flatnonzero(np.diff(line)==1);ends=np.flatnonzero(np.diff(line)==-1)
  if len(starts):
   k=int(np.argmax(ends-starts));centres.append((starts[k]+ends[k])/2)
 return {'crown':crown,'floor':floor,'hip':median(centres) if centres else w/2,'height':floor-crown}
def pack(entries,cls,key,mode,view):
 frames=[entry["image"] for entry in entries]
 frames=[f.copy() for f in frames];ms=[metrics(f,cls) for f in frames];scale=BODY/median(ms[i]['height'] for i in (0,2))
 # One scale for the complete clip, not a separate fit for each frame.
 scaled=[f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.LANCZOS) for f in frames]
 floor=median(scaled[i].getbbox()[3]-1 for i in (0,2));result=[];details=[]
 for i,(f,m) in enumerate(zip(scaled,ms)):
  dx=round(CELL/2-m['hip']*scale);dy=SOLE-(f.getbbox()[3]-1) if mode=='walk' or i%2==0 else round(SOLE-floor-5)
  if mode=='run' and i%2:dy=min(dy,SOLE-8-(f.getbbox()[3]-1))
  b=f.getchannel('A').point(lambda x:255 if x>=115 else 0).getbbox();raw=[b[0]+dx,b[1]+dy,b[2]+dx,b[3]+dy]
  assert min(raw[:2])>=2 and max(raw[2:])<=CELL-2,(key,mode,view,i,raw)
  cell=Image.new('RGBA',(CELL,CELL));cell.alpha_composite(f,(dx,dy));result.append(cell)
  details.append({'sourceBounds':entries[i]['sourceBounds'],'bounds':raw,'crown':round(m['crown']*scale+dy),'floor':raw[3]-1})
 report[f'{key}/{mode}/{view}']={'scale':scale,'frames':details};return result
def boxer_original(mode):
 im=Image.open(ROOT/f'assets/character-gait217/boxer-male-{mode}.png').convert('RGBA');scale=BODY/168;result={}
 for row,d in enumerate(DIRS):
  result[d]=[]
  for i in range(4):
   f=im.crop((i*208,row*208,(i+1)*208,(row+1)*208)).resize((round(208*scale),round(208*scale)),Image.Resampling.LANCZOS)
   cell=Image.new('RGBA',(CELL,CELL));cell.alpha_composite(f,(round(CELL/2-104*scale),round(SOLE-196*scale)));result[d].append(cell)
 return result
variants=[]
for cls in CLASSES:
 for gender in ['male','female']:
  key=f'{cls}-{gender}';clips={};sd={};sheet=None if key=='boxer-male' else Image.open(SRC/f'{key}.png').convert('RGBA')
  extracted=None if sheet is None else extract_sheet(sheet,columns=8,grid_rows=5,recover_edge=False)
  for mode,start in [('walk',0),('run',4)]:
   if sheet is None:views=boxer_original(mode)
   else:
    views={}
    for row,d in enumerate(VIEWS):
     frames=extracted[row][start:start+4]
     views[d]=pack(frames,cls,key,mode,d)
    for left,right in [('SW','SE'),('W','E'),('NW','NE')]:views[left]=[ImageOps.mirror(f) for f in views[right]]
   atlas=Image.new('RGBA',(CELL*4,CELL*8))
   for row,d in enumerate(DIRS):
    for i,f in enumerate(views[d]):atlas.alpha_composite(f,(i*CELL,row*CELL))
   name=f'{key}-{mode}.png';atlas.save(OUT/name,optimize=True);small=f'{key}-{mode}-sd.png'
   atlas.resize((512,1024),Image.Resampling.LANCZOS).save(OUT/small,optimize=True)
   clips[mode]={'image':name,'frames':4,'cycle_ms':640 if mode=='walk' else 480};sd[mode]={**clips[mode],'image':small}
  meta={'version':235,'classId':cls,'gender':gender,'cell':CELL,'bodyHeight':BODY,'anchor':[CELL//2,SOLE],'directions':DIRS,'clips':clips,'tiers':{'sd':{'cell':128,'bodyHeight':BODY/2,'anchor':[64,SOLE/2],'clips':sd}}}
  (OUT/f'{key}.json').write_text(json.dumps(meta,indent=2)+'\n');variants.append(key)
(OUT/'calibration.json').write_text(json.dumps(report,indent=2)+'\n')
(OUT/'catalog.json').write_text(json.dumps({'version':235,'variants':variants},indent=2)+'\n')
print(json.dumps({'variants':len(variants),'clips':len(variants)*2,'frames':len(variants)*64,'bytes':sum(p.stat().st_size for p in OUT.glob('*.png'))}))

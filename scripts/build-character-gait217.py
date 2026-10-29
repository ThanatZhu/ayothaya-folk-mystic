"""Pack reviewed painted boxer walk/run art into four-frame, eight-view runtime atlases."""
from pathlib import Path
from PIL import Image,ImageOps
from statistics import median
from collections import deque
import json
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'docs/character-gait217-sources';OUT=ROOT/'assets/character-gait217'
OUT.mkdir(parents=True,exist_ok=True)
CELL=208;SOLE=196;BODY=168
DIRS=['S','SE','E','NE','N','NW','W','SW']
report={}
def alpha_box(im):return im.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
def anchor(im):
 bb=alpha_box(im);h=bb[3]-bb[1];red=[]
 for y in range(round(bb[1]+h*.60),round(bb[1]+h*.75)):
  for x in range(bb[0],bb[2]):
   r,g,b,a=im.getpixel((x,y))
   if a>180 and r>90 and r>g*1.8 and r>b*1.5:red.append(x)
 return median(red) if red else (bb[0]+bb[2])/2
def components(im):
 w,h=im.size;m=bytearray(im.getchannel('A').point(lambda a:255 if a>32 else 0).tobytes());result=[]
 for n in range(w*h):
  if not m[n]:continue
  q=deque([n]);m[n]=0;x0=w;y0=h;x1=y1=count=0
  while q:
   k=q.popleft();x=k%w;y=k//w;count+=1;x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
   for j in (k-1 if x else -1,k+1 if x<w-1 else -1,k-w if y else -1,k+w if y<h-1 else -1):
    if j>=0 and m[j]:m[j]=0;q.append(j)
  if count>1000:result.append([x0,y0,x1+1,y1+1])
 return sorted(result)
def row_frames(im,row):
 cw,ch=im.width/4,im.height/4
 return [im.crop((round(i*cw),round(row*ch),round((i+1)*cw),round((row+1)*ch))) for i in range(4)]
def normalize(frames,mode,direction):
 bb=[alpha_box(f) for f in frames];scale=BODY/median(bb[i][3]-bb[i][1] for i in [0,2])
 # One scale per whole clip, never fit an individual pose to its own height.
 width=max((b[2]-b[0])*scale for b in bb)
 if width>178:scale*=178/width
 resized=[f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.BICUBIC) for f in frames]
 source_floor=median(resized[i].getbbox()[3]-1 for i in [0,2])
 result=[];info=[]
 for i,f in enumerate(resized):
  dx=round(CELL/2-anchor(frames[i])*scale)
  dy=SOLE-(f.getbbox()[3]-1) if mode=='walk' or i%2==0 else round(SOLE-source_floor-5)
  if mode=='run' and i%2:dy=min(dy,SOLE-8-(f.getbbox()[3]-1))
  source_bounds=alpha_box(f)
  raw_bounds=[source_bounds[0]+dx,source_bounds[1]+dy,source_bounds[2]+dx,source_bounds[3]+dy]
  assert raw_bounds[0]>=2 and raw_bounds[1]>=2 and raw_bounds[2]<=CELL-2 and raw_bounds[3]<=CELL-2,(mode,direction,i,raw_bounds)
  frame=Image.new('RGBA',(CELL,CELL));frame.alpha_composite(f,(dx,dy))
  bounds=alpha_box(frame);assert bounds and bounds[0]>=0 and bounds[1]>=0 and bounds[2]<=CELL and bounds[3]<=CELL
  if mode=='run' and i%2:assert bounds[3]-1<=SOLE-7,(mode,direction,i,bounds)
  result.append(frame);info.append({'translation':[dx,dy],'bounds':list(bounds),'flight':mode=='run' and i%2==1})
 report[mode+'/'+direction]={'scale':scale,'frames':info}
 return result
sources={}
for mode in ['walk','run']:
 name='boxer-male-'+mode+'-views.png';im=Image.open(SRC/name).convert('RGBA');views={}
 for row,direction in enumerate(['S','E','NE','N']):views[direction]=normalize(row_frames(im,row),mode,direction)
 se=Image.open(SRC/('boxer-male-'+mode+'-se.png')).convert('RGBA')
 if mode=='walk':frames=[se.crop((i*512,0,(i+1)*512,640)) for i in range(4)]
 else:
  boxes=components(se);assert len(boxes)==4
  frames=[se.crop((max(0,b[0]-3),0,min(se.width,b[2]+3),se.height)) for b in boxes]
 views['SE']=normalize(frames,mode,'SE')
 for left,right in [('SW','SE'),('W','E'),('NW','NE')]:views[left]=[ImageOps.mirror(f) for f in views[right]]
 atlas=Image.new('RGBA',(CELL*4,CELL*8))
 for row,d in enumerate(DIRS):
  for i,f in enumerate(views[d]):atlas.alpha_composite(f,(i*CELL,row*CELL))
 atlas.save(OUT/('boxer-male-'+mode+'.png'),optimize=True)
 sources[mode]={'image':'boxer-male-'+mode+'.png','frames':4,'cycle_ms':640 if mode=='walk' else 480}
meta={'version':217,'classId':'boxer','gender':'male','cell':CELL,'bodyHeight':BODY,'anchor':[CELL//2,SOLE],'directions':DIRS,'clips':sources,'provenance':'Painted four-pose locomotion. SE uses the reviewed walk and new run; S/E/NE/N are authored views; SW/W/NW mirror the corresponding right-facing views. One body scale per clip, sole alignment only for support poses, preserved run flight.'}
(OUT/'boxer-male.json').write_text(json.dumps(meta,indent=2)+'\n')
(ROOT/'docs/character-gait217-sources/calibration.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'atlases':2,'frames':64,'cell':CELL,'directions':DIRS,'bytes':sum(p.stat().st_size for p in OUT.glob('*.png'))}))


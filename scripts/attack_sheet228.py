"""Extract complete sprites from imperfect generated grids without row cropping."""
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,heapq

def _split(mask,seeds):
 # Widest-path watershed cuts a thin accidental bridge between figures,
 # rather than cutting through a limb at a nominal grid boundary.
 mask=np.pad(mask,1);h,w=mask.shape
 dist=np.where(mask,30000,0).astype(np.int32);x=np.arange(w)
 for y in range(1,h):
  dist[y]=np.minimum(dist[y],dist[y-1]+1)
  dist[y]=np.minimum.accumulate(dist[y]-x)+x
 for y in range(h-2,-1,-1):
  dist[y]=np.minimum(dist[y],dist[y+1]+1)
  dist[y]=np.minimum.accumulate((dist[y]+x)[::-1])[::-1]-x
 owner=np.zeros((h,w),np.int16);cap=np.full((h,w),-1,np.int16);steps=np.full((h,w),2**30,np.int32);queue=[]
 for label,(sx,sy) in seeds:
  sx+=1;sy+=1;c=int(dist[sy,sx]);owner[sy,sx]=label;cap[sy,sx]=c;steps[sy,sx]=0;heapq.heappush(queue,(-c,0,label,sy,sx))
 while queue:
  neg,n,label,y,x=heapq.heappop(queue);c=-neg
  if c!=cap[y,x] or n!=steps[y,x] or label!=owner[y,x]:continue
  for yy,xx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
   if not mask[yy,xx]:continue
   nc=min(c,int(dist[yy,xx]));nn=n+1
   if nc>cap[yy,xx] or nc==cap[yy,xx] and nn<steps[yy,xx]:
    cap[yy,xx]=nc;steps[yy,xx]=nn;owner[yy,xx]=label;heapq.heappush(queue,(-nc,nn,label,yy,xx))
 return owner[1:-1,1:-1]

def extract_sheet(im):
 im=im.convert('RGBA');arr=np.array(im);a=arr[:,:,3];cw,ch=im.width/12,im.height/5
 region=Image.fromarray((a>=115).astype('uint8')*255).filter(ImageFilter.MaxFilter(3))
 core=np.array(region.filter(ImageFilter.MinFilter(9)));ys,xs=np.nonzero(core)
 assert len(xs),'No solid character cores'
 groups={};grid=[];serial=0
 for row in range(5):
  for col in range(12):
   k=np.argmin((xs-(col+.5)*cw)**2+(ys-(row+.57)*ch)**2);seed=(int(xs[k]),int(ys[k]));label=region.getpixel(seed)
   if label==255:
    serial+=1;label=serial;ImageDraw.floodfill(region,seed,label,thresh=0)
   index=row*12+col+1;groups.setdefault(label,[]).append((index,seed));grid.append((row,col,index,label))
 labels=np.array(region);masks={}
 for group,members in groups.items():
  mask=labels==group
  if len(members)==1:masks[members[0][0]]=mask
  else:
   yy,xx=np.nonzero(mask);x0,x1=xx.min(),xx.max()+1;y0,y1=yy.min(),yy.max()+1
   split=_split(mask[y0:y1,x0:x1],[(i,(sx-x0,sy-y0))for i,(sx,sy)in members])
   for i,_ in members:
    part=np.zeros_like(mask);part[y0:y1,x0:x1]=split==i;masks[i]=part
 rows=[[] for _ in range(5)]
 for row,col,index,label in grid:
  mask=masks[index]&(a>=115);yy,xx=np.nonzero(mask);assert len(xx)>200,('small figure',row,col,len(xx))
  x0,y0,x1,y1=int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1
  assert y1-y0<ch*1.45,('unseparated figures',row,col,(x0,y0,x1,y1))
  p=arr[y0:y1,x0:x1].copy();p[:,:,3]=np.where(mask[y0:y1,x0:x1],p[:,:,3],0)
  rows[row].append({'image':Image.fromarray(p),'cx':(col+.5)*cw-x0,'cw':cw,'edge':x1>=im.width-1,'sourceBounds':[x0,y0,x1,y1]})
 for row in rows:
  if row[-1]['edge']:row[-1]={**row[8],'recoveryGuard':True}
 return rows


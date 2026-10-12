import {deformPoint} from './character-motion.js?v=15';
// Canvas preview uses the same mesh weights as the in-world billboard.
export function createMotionPreview(host){
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;canvas.style.cssText='display:block;width:100%;height:100%;image-rendering:pixelated';host.append(canvas);host.classList.add('rig-preview');
 const ctx=canvas.getContext('2d'),cell=document.createElement('canvas');let atlas=null,row=0,lastFrame=-1,lastRow=-1;
 const tex=cell.getContext('2d');
 function setSource(image,gender){atlas=image;row=gender==='female'?1:0;lastFrame=-1;}
 function draw(p){
  if(!atlas)return;
  if(p.frame!==lastFrame||row!==lastRow){cell.width=atlas.width/4;cell.height=atlas.height/2;tex.drawImage(atlas,p.frame*cell.width,row*cell.height,cell.width,cell.height,0,0,cell.width,cell.height);lastFrame=p.frame;lastRow=row;}
  ctx.clearRect(0,0,320,320);ctx.imageSmoothingEnabled=false;
  const cols=10,rows=16,points=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const u=i/cols,v=j/rows,q=deformPoint(u,v,p);points.push({sx:u*cell.width,sy:v*cell.height,x:20+q.x*280,y:8+q.y*280-p.y*130});}
  function tri(a,b,c){
   const det=(b.sx-a.sx)*(c.sy-a.sy)-(c.sx-a.sx)*(b.sy-a.sy);if(!det)return;
   const A=((b.x-a.x)*(c.sy-a.sy)-(c.x-a.x)*(b.sy-a.sy))/det,B=((b.y-a.y)*(c.sy-a.sy)-(c.y-a.y)*(b.sy-a.sy))/det;
   const C=((c.x-a.x)*(b.sx-a.sx)-(b.x-a.x)*(c.sx-a.sx))/det,D=((c.y-a.y)*(b.sx-a.sx)-(b.y-a.y)*(c.sx-a.sx))/det;
   ctx.save();ctx.beginPath();const mx=(a.x+b.x+c.x)/3,my=(a.y+b.y+c.y)/3;
   for(const [k,q] of [a,b,c].entries()){const dx=q.x-mx,dy=q.y-my,n=Math.hypot(dx,dy)||1;ctx[k?'lineTo':'moveTo'](q.x+dx/n*.45,q.y+dy/n*.45);}ctx.closePath();ctx.clip();
   ctx.setTransform(A,B,C,D,a.x-A*a.sx-C*a.sy,a.y-B*a.sx-D*a.sy);ctx.drawImage(cell,0,0);ctx.restore();
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const n=j*(cols+1)+i;tri(points[n],points[n+1],points[n+cols+1]);tri(points[n+1],points[n+cols+2],points[n+cols+1]);}
 }
 return {setSource,draw};
}

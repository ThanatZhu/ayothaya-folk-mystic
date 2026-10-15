import {rigDefinition,skinWeights,sampleRig,jointBackings,boneLayer} from './character-rig.js?v=36';
// Same rigid cutouts/IK as the world; one cached clip path per body part.
export function createMotionPreview(host){
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;canvas.style.cssText='display:block;width:100%;height:100%;image-rendering:pixelated';host.append(canvas);host.classList.add('rig-preview');
 const ctx=canvas.getContext('2d'),cell=document.createElement('canvas');let rig,paths,backings;
 function setSource(image,gender,classId='novice'){
  rig=rigDefinition(classId,gender);cell.width=image.width/4;cell.height=image.height/2;
  cell.getContext('2d').drawImage(image,0,(gender==='female'?1:0)*cell.height,cell.width,cell.height,0,0,cell.width,cell.height);
  paths=new Map();backings=jointBackings(rig);const cols=48,rows=56;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)for(const tri of [[[x,y],[x,y+1],[x+1,y]],[[x,y+1],[x+1,y+1],[x+1,y]]]){
   const u=tri.reduce((sum,p)=>sum+p[0]/cols,0)/3,v=tri.reduce((sum,p)=>sum+p[1]/rows,0)/3,name=skinWeights(rig,u,v).sort((a,b)=>b[1]-a[1])[0][0];
   if(!paths.has(name))paths.set(name,new Path2D());const path=paths.get(name);tri.forEach(([a,b],i)=>path[i?'lineTo':'moveTo'](a/cols,b/rows));path.closePath();
  }
 }
 function draw(p){
  if(!rig)return;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,320,320);ctx.imageSmoothingEnabled=false;const matrices=sampleRig(rig,p);
  function transform(m){ctx.setTransform(m[0]*280,m[1]*280,m[2]*280,m[3]*280,20+m[4]*280,8+m[5]*280-p.y*130);}
  for(const s of backings){transform(matrices[s.bone]);ctx.strokeStyle=s.skin?'#bd8356':'#8e714c';ctx.lineWidth=s.r*2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(s.a.x,s.a.y);ctx.lineTo(s.b.x,s.b.y);ctx.stroke();}
  for(const [name,path] of [...paths].sort((a,b)=>boneLayer(a[0])-boneLayer(b[0]))){ctx.save();transform(matrices[name]);ctx.clip(path);ctx.drawImage(cell,0,0,1,1);ctx.restore();}
 }
 return {setSource,draw};
}

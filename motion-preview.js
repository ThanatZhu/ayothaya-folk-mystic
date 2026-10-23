import {drawCharacterFrame,FRAME_FOOT,FRAME_SIZE,LOGICAL_SIZE} from './character-size.js?v=41.2';
import {loadPaintedCharacter} from './painted-character.js?v=41.2';
import {FRAME_COUNT} from './animation-frames.js?v=37';
export function createMotionPreview(host){
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;canvas.style.cssText='display:block;width:100%;height:100%;image-rendering:pixelated';host.append(canvas);host.classList.add('rig-preview');
 const ctx=canvas.getContext('2d'),cell=document.createElement('canvas');let frames=null,version=0;
 function setSource(image,gender,classId='novice',equipment=null){
  const token=++version;frames=null;cell.width=image.width/4;cell.height=image.height/2;
  cell.getContext('2d').drawImage(image,0,(gender==='female'?1:0)*cell.height,cell.width,cell.height,0,0,cell.width,cell.height);
  loadPaintedCharacter(classId,image.appearance??{},equipment).then(art=>{if(token===version)frames=art[gender];}).catch(error=>console.error('Character preview artwork failed',error));
 }
 function draw(p){
  ctx.clearRect(0,0,320,320);ctx.imageSmoothingEnabled=false;
  // The pedestal and soles share one coordinate system at every CSS size.
  const floor=274,size=270,pad=(FRAME_SIZE-LOGICAL_SIZE)/2,y=floor-(FRAME_FOOT-pad)*size/LOGICAL_SIZE;
  const glow=ctx.createRadialGradient(160,floor+3,0,160,floor+3,105);glow.addColorStop(0,'#d5b87555');glow.addColorStop(1,'#9abb7600');
  ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(160,floor+3,106,19,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#d1b26966';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#08181077';ctx.beginPath();ctx.ellipse(160,floor+1,42,6,0,0,Math.PI*2);ctx.fill();
  const source=frames?.[Math.max(0,Math.min(FRAME_COUNT-1,Math.round(p.artFrame??0)))]??frames?.[0]??cell;
  if(frames)drawCharacterFrame(ctx,source,25,y-(p.y??0)*130,size);else ctx.drawImage(source,25,floor-size-(p.y??0)*130,size,size);
 }
 return {setSource,draw};
}

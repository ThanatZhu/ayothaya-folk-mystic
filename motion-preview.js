import {drawCharacterFrame} from './character-size.js?v=41.2';
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
  const source=frames?.[Math.max(0,Math.min(FRAME_COUNT-1,Math.round(p.artFrame??0)))]??cell;
  if(frames)drawCharacterFrame(ctx,source,20,8-(p.y??0)*130,280);else ctx.drawImage(source,20,8-(p.y??0)*130,280,280);
 }
 return {setSource,draw};
}

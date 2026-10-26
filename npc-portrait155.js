import {storyNPCIdentity} from './npc-identity175.js';
// The exact authored NPC silhouettes already used by the game, including citizens and mentors.
import {storyPortrait} from './story-dialogue.js?v=chuk175';
const images=new Map(),portraits=new Map();let metadata;
export function sceneImage(src){
 if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{images.delete(src);reject(Error('image-unavailable'));};img.src=src;}));return images.get(src);
}
export function npcActorId(n){return storyNPCIdentity(n)?.id??(n?.sheet?`${n.sheet}-${n.row??0}`:`people-${Number.isInteger(n?.texture)?n.texture:0}`);}
export function loadNPCPortrait(n){
 const key=npcActorId(n);if(portraits.has(key))return portraits.get(key);
 const pending=(async()=>{
  if(!n?.sheet)return sceneImage(storyPortrait(n).src);
  metadata??=fetch('./assets/citizens40/frames.json?v=42.1').then(r=>{if(!r.ok)throw Error('npc-metadata');return r.json();});
  const meta=(await metadata)[n.sheet];if(!meta)throw Error('npc-metadata');
  const rect=meta.rects[(n.row??0)*meta.columns],img=await sceneImage('./assets/citizens40/'+n.sheet+'.png'),c=document.createElement('canvas');c.width=rect[2];c.height=rect[3];c.getContext('2d').drawImage(img,...rect,0,0,c.width,c.height);return c;
 })();portraits.set(key,pending);pending.catch(()=>portraits.delete(key));return pending;
}
export async function paintNPCPortrait(canvas,n){
 const generation=(canvas._portraitGeneration??0)+1;canvas._portraitGeneration=generation;canvas.dataset.artState='loading';
 try{const image=await loadNPCPortrait(n);if(generation!==canvas._portraitGeneration||!canvas.isConnected)return;
  const ctx=canvas.getContext('2d');canvas.width=320;canvas.height=360;ctx.imageSmoothingEnabled=false;
  const scale=Math.min(320/image.width,440/image.height);ctx.clearRect(0,0,320,360);ctx.drawImage(image,(320-image.width*scale)/2,0,image.width*scale,image.height*scale);canvas.dataset.artState='ready';
 }catch{if(generation===canvas._portraitGeneration){canvas.dataset.artState='error';canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);}}
}

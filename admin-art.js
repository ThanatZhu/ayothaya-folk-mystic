// Reuse the exact in-game portraits and measured atlas cells; no substitute artwork.
import {applySkillArt} from './skill-art.js?v=icons117';
import {MONSTER_TYPES} from './combat-core.js?v=pets126';
const images=new Map(),metadata=new Map(),portraits=new Map();
function loadImage(url){if(!images.has(url)){const image=new Image();image.src=url;images.set(url,image.decode().then(()=>image).catch(e=>{images.delete(url);throw e;}));}return images.get(url);}
async function portrait(index){
 if(!portraits.has(index))portraits.set(index,(async()=>{
  const monster=MONSTER_TYPES[index];if(!monster)throw Error('Unknown monster portrait');let image,rect;
  if(monster.chapter2Art){const thumb=await loadImage('assets/admin127/monsters/'+monster.chapter2Art+'.webp');return thumb.src;}
  if(monster.sheet){const url='assets/frontier38/'+monster.sheet;if(!metadata.has(url))metadata.set(url,fetch(url+'.json').then(r=>{if(!r.ok)throw Error('Monster portrait metadata unavailable');return r.json();}));const meta=await metadata.get(url);image=await loadImage(url+'.png');rect=meta.rects[monster.row*8];}
  else{image=await loadImage('assets/monsters.png');rect=[index%2*image.width/2,Math.floor(index/2)*image.height/2,image.width/2,image.height/2];}
  const [x,y,w,h]=rect,canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d'),scale=148/Math.max(w,h);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,x,y,w,h,(160-w*scale)/2,(160-h*scale)/2,w*scale,h*scale);return canvas.toDataURL();
 })().catch(e=>{portraits.delete(index);throw e;}));return portraits.get(index);
}
export async function paintAdminMonsters(root){return Promise.all([...root.querySelectorAll('[data-monster-art]')].map(async el=>{try{el.src=await portrait(Number(el.dataset.monsterArt));el.dataset.artState='ready';}catch(e){el.dataset.artState='error';console.warn('Monster portrait unavailable',e.message);}}));}
export function paintAdminSkills(root,classId,definitions=null){const nodes=[...root.querySelectorAll('[data-skill-art]')];return applySkillArt(nodes,classId,nodes.map(n=>Number(n.dataset.skillArt)),definitions);}

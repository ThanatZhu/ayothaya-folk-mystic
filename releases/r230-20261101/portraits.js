// Portraits cut from the exact in-game art (monster sheets, class atlases); no substitute artwork.
import {MONSTER_TYPES} from './combat-core.js?v=surfaces222';
import {atlasPath} from './classes.js?v=novice174';
const images=new Map(),metadata=new Map(),portraits=new Map();
function loadImage(url){if(!images.has(url)){const image=new Image();image.src=url;images.set(url,image.decode().then(()=>image).catch(e=>{images.delete(url);throw e;}));}return images.get(url);}
function once(key,make){if(!portraits.has(key))portraits.set(key,make().catch(e=>{portraits.delete(key);throw e;}));return portraits.get(key);}
function cut(image,[x,y,w,h]){const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d'),scale=148/Math.max(w,h);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,x,y,w,h,(160-w*scale)/2,(160-h*scale)/2,w*scale,h*scale);return canvas.toDataURL();}
// first standing frame of a monster type -> image URL
export function monsterPortrait(index){
 return once('m'+index,async()=>{
  const monster=MONSTER_TYPES[index];if(!monster)throw Error('Unknown monster portrait');
  if(monster.chapter2Art)return (await loadImage('assets/admin127/monsters/'+monster.chapter2Art+'.webp')).src;
  if(monster.sheet){const url='assets/frontier38/'+monster.sheet;if(!metadata.has(url))metadata.set(url,fetch(url+'.json').then(r=>{if(!r.ok)throw Error('Monster portrait metadata unavailable');return r.json();}));const meta=await metadata.get(url);return cut(await loadImage(url+'.png'),meta.rects[monster.row*8]);}
  const image=await loadImage('assets/monsters.png');return cut(image,[index%2*image.width/2,Math.floor(index/2)*image.height/2,image.width/2,image.height/2]);
 });
}
// a class's front-facing cell (top row male, bottom row female), as the HUD portrait cuts it
export function classPortrait(classId,gender){
 return once('c'+classId+gender,async()=>{const image=await loadImage(atlasPath(classId)),w=image.width/4,h=image.height/2;return cut(image,[0,gender==='female'?h:0,w,h]);});
}

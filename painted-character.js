import {customizeAtlas} from './character-appearance.js?v=37';
const cache=new Map();
export function loadPaintedCharacter(classId,appearance={}){
 const key=classId+JSON.stringify(appearance);
 if(cache.has(key))return cache.get(key);
 const pending=(async()=>{
  const response=await fetch('./assets/animation37/'+classId+'.json');if(!response.ok)throw new Error('Animation metadata: '+classId);
  const meta=await response.json(),images={};
  await Promise.all([...new Set(Object.values(meta.frames).flat().map(f=>f.source))].map(async source=>{const image=new Image();image.src='./assets/animation37/'+source;await image.decode();images[source]=image;}));
  const result={};
  for(const gender of ['male','female'])result[gender]=meta.frames[gender].map(({rect,anchor,scale,source})=>{
   const cell=document.createElement('canvas');cell.width=cell.height=256;const ctx=cell.getContext('2d');ctx.imageSmoothingEnabled=false;
   const [x,y,w,h]=rect;ctx.drawImage(images[source],x,y,w,h,128-anchor*scale,244-h*scale,w*scale,h*scale);
   // Reuse saved cosmetics without changing the account schema. These face anchors
   // follow each new pose instead of the old four-column atlas's face locations.
   return customizeAtlas(cell,appearance,classId,{columns:1,rows:1,anchors:[[50,38]]});
  });
  return result;
 })();cache.set(key,pending);if(cache.size>8)cache.delete(cache.keys().next().value);pending.catch(()=>{if(cache.get(key)===pending)cache.delete(key);});return pending;
}

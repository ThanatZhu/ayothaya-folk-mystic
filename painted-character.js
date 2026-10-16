import {bodyScale,FRAME_SIZE,FRAME_FOOT} from './character-size.js?v=41.2';
import {customizeAtlas} from './character-appearance.js?v=41';
import {normalizeEquipment,equipmentItem,equipmentAppearance} from './equipment.js?v=41';
const cache=new Map();
export function loadPaintedCharacter(classId,appearance={},equipment=null){
 const gear=normalizeEquipment(equipment,classId),crafted=equipmentItem(gear.weapon).art==='crafted';
 appearance=equipmentAppearance(appearance,gear,classId);
 const directory=crafted?'equipment41':'animation37';
 const key=classId+directory+JSON.stringify(appearance);
 if(cache.has(key))return cache.get(key);
 const pending=(async()=>{
  const response=await fetch('./assets/'+directory+'/'+classId+'.json');if(!response.ok)throw new Error('Animation metadata: '+classId);
  const meta=await response.json(),images={};
  await Promise.all([...new Set(Object.values(meta.frames).flat().map(f=>f.source))].map(async source=>{const image=new Image();image.src='./assets/'+directory+'/'+source;await image.decode();images[source]=image;}));
  const result={};
  for(const gender of ['male','female']){const factor=bodyScale(directory,classId,gender,meta.frames[gender][0].scale);result[gender]=meta.frames[gender].map(({rect,anchor,scale,source})=>{
   const cell=document.createElement('canvas');cell.width=cell.height=256;const ctx=cell.getContext('2d');ctx.imageSmoothingEnabled=false;
   const [x,y,w,h]=rect;ctx.drawImage(images[source],x,y,w,h,128-anchor*scale,244-h*scale,w*scale,h*scale);
   // Reuse saved cosmetics without changing the account schema. These face anchors
   // follow each new pose instead of the old four-column atlas's face locations.
   const styled=customizeAtlas(cell,appearance,classId,{columns:1,rows:1,anchors:[[50,38]]});
   const padded=document.createElement('canvas');padded.width=padded.height=FRAME_SIZE;const out=padded.getContext('2d');out.imageSmoothingEnabled=false;
   out.drawImage(styled,FRAME_SIZE/2-128*factor,FRAME_FOOT-244*factor,256*factor,256*factor);
   return padded;
  });}
  return result;
 })();cache.set(key,pending);if(cache.size>8)cache.delete(cache.keys().next().value);pending.catch(()=>{if(cache.get(key)===pending)cache.delete(key);});return pending;
}

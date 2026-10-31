import {paintedFrameCalibration,FRAME_SIZE,FRAME_FOOT} from './character-size.js?v=size1';
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
  // 0.122 a gender's forty frames are drawn when first read: a hero shows one, and the other doubled its canvases
  const result={},build=gender=>meta.frames[gender].map((frame,index)=>{
   const {rect,anchor,scale,source}=frame,{factor,foot}=paintedFrameCalibration(directory,classId,gender,index,frame,meta.frames[gender][0].scale);
   const cell=document.createElement('canvas');cell.width=cell.height=256;const ctx=cell.getContext('2d');ctx.imageSmoothingEnabled=false;
   const [x,y,w,h]=rect;ctx.drawImage(images[source],x,y,w,h,128-anchor*scale,244-h*scale,w*scale,h*scale);
   // Reuse saved cosmetics without changing the account schema. These face anchors
   // follow each new pose instead of the old four-column atlas's face locations.
   const styled=customizeAtlas(cell,appearance,classId,{columns:1,rows:1,anchors:[[50,38]]});
   const padded=document.createElement('canvas');padded.width=padded.height=FRAME_SIZE;const out=padded.getContext('2d');out.imageSmoothingEnabled=false;
   out.drawImage(styled,FRAME_SIZE/2-128*factor,FRAME_FOOT-foot*factor,256*factor,256*factor);
   return padded;
  });
  for(const gender of ['male','female']){let made;Object.defineProperty(result,gender,{enumerable:true,get:()=>made??=build(gender)});}
  return result;
 })();cache.set(key,pending);if(cache.size>8)cache.delete(cache.keys().next().value);pending.catch(()=>{if(cache.get(key)===pending)cache.delete(key);});return pending;
}
// A leaderboard needs one standing frame, not forty animation canvases per player.
// Keep a separate small cache so browsing the board does not evict live avatar animations.
const standingCache=new Map();
export function loadPaintedStanding(classId,gender='male',appearance={},equipment=null){
 const gear=normalizeEquipment(equipment,classId),directory=equipmentItem(gear.weapon).art==='crafted'?'equipment41':'animation37';
 const styledAppearance=equipmentAppearance(appearance,gear,classId),sex=gender==='female'?'female':'male',key=JSON.stringify([classId,sex,directory,styledAppearance]);
 if(standingCache.has(key))return standingCache.get(key);
 const pending=(async()=>{
  const response=await fetch('./assets/'+directory+'/'+classId+'.json');if(!response.ok)throw new Error('Standing metadata: '+classId);
  const meta=await response.json(),frame=meta.frames[sex][0],image=new Image();image.src='./assets/'+directory+'/'+frame.source;await image.decode();
  const {rect,anchor,scale}=frame,{factor,foot}=paintedFrameCalibration(directory,classId,sex,0,frame,frame.scale);
  const cell=document.createElement('canvas');cell.width=cell.height=256;const ctx=cell.getContext('2d');ctx.imageSmoothingEnabled=false;
  const [x,y,w,h]=rect;ctx.drawImage(image,x,y,w,h,128-anchor*scale,244-h*scale,w*scale,h*scale);
  const styled=customizeAtlas(cell,styledAppearance,classId,{columns:1,rows:1,anchors:[[50,38]]});
  const result=document.createElement('canvas');result.width=result.height=FRAME_SIZE;const out=result.getContext('2d');out.imageSmoothingEnabled=false;
  out.drawImage(styled,FRAME_SIZE/2-128*factor,FRAME_FOOT-foot*factor,256*factor,256*factor);return result;
 })();standingCache.set(key,pending);if(standingCache.size>24)standingCache.delete(standingCache.keys().next().value);
 pending.catch(()=>{if(standingCache.get(key)===pending)standingCache.delete(key);});return pending;
}

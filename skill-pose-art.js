import * as THREE from './vendor/build/three.module.js';
import {POSE_SHEETS} from './assets/skills-next/poses-2026-10/pose-map.js';
import {normalizeEquipment,equipmentItem,equipmentAppearance} from './equipment.js?v=41';
import {validateAppearance} from './appearance-state.js';
// 0.119 per-skill character poses: one 6×2 sheet per active skill (male row 0, female row 1), frame 3 = contact.
// The body is timed by the cast's own release beats, the same ones the VFX sheet uses.
const BASE='./assets/skills-next/poses-2026-10/game/';
export const hasPoseSheet=id=>!!POSE_SHEETS[id];
export const poseScale=(id,gender)=>POSE_SHEETS[id]?.scale[gender==='female'?'female':'male']??1;
// 0 ready → 1 wind-up → 2 release over the wind-up; 3 on every blow (2 → 3 between blows); 3 → 4 → 5 over the recovery.
export function poseFrame(impacts,duration,t){
 const first=impacts[0],last=impacts.at(-1);
 if(t<first){const u=t/first;return u<.3?0:u<.7?1:2;}
 if(t<last){let k=0;while(t>=impacts[k+1])k++;return (t-impacts[k])/(impacts[k+1]-impacts[k])<.45?3:2;}
 const u=(t-last)/Math.max(.001,duration-last);return u<.3?3:u<.65?4:5;
}
// The sheets show the class's own look and starter weapon. Dyed outfits, cosmetics and crafted weapons keep
// the original equipped frames, so a special weapon is never swapped for a basic one mid-swing.
export function posesFit(classId,appearance={},equipment=null){
 try{
  const gear=normalizeEquipment(equipment,classId);if(equipmentItem(gear.weapon).art==='crafted')return false;
  return Object.values(validateAppearance(equipmentAppearance(appearance??{},gear,classId))).every(v=>v==='original'||v==='none');
 }catch{return false;}
}
// One texture per sheet shared by every actor; 12 UV windows over it (the clones share its Source, one GPU upload).
const compact=globalThis.matchMedia?.('(pointer:coarse),(max-width:900px)')??{matches:false};
const tier=()=>compact.matches?'sd':'hd',cap=()=>tier()==='sd'?6:12,cache=new Map();let tick=0;
const loader=typeof document==='undefined'?null:new THREE.TextureLoader();
function trim(now){
 // Sheets drawn in the last quarter second stay: an actor mid-cast draws its sheet every frame, so it never loses it.
 const old=[...cache.values()].filter(c=>now-c.at>250&&(c.frames||c.failed)).sort((a,b)=>a.used-b.used);
 while(cache.size>cap()&&old.length){const c=old.shift();c.frames&&Object.values(c.frames).flat().forEach(t=>t.dispose());c.base?.dispose();cache.delete(c.key);}
}
export function poseTexture(id,classId,gender,frame,now=performance.now()){
 if(!loader||POSE_SHEETS[id]?.classId!==classId)return null; // a sheet only ever dresses its own class
 const key=tier()+'/'+id;let c=cache.get(key);
 if(c?.failed&&now-c.failedAt>10000){cache.delete(key);c=null;} // a network blip retries; meanwhile the class frames play
 if(!c){
  c={key,frames:null,failed:false};cache.set(key,c);
  loader.loadAsync(BASE+key.replace('/','/pose-')+'.webp').then(base=>{
   if(cache.get(key)!==c){base.dispose();return;}
   base.colorSpace=THREE.SRGBColorSpace;base.magFilter=base.minFilter=THREE.NearestFilter;base.generateMipmaps=false;c.base=base;
   c.frames=Object.fromEntries(['male','female'].map((g,row)=>[g,Array.from({length:6},(_,i)=>{const t=base.clone();t.offset.set(i/6,row?0:.5);t.repeat.set(1/6,.5);t.needsUpdate=true;return t;})]));
  }).catch(()=>{c.failed=true;c.failedAt=performance.now();});
 }
 c.used=++tick;c.at=now;trim(now);
 return c.frames?.[gender==='female'?'female':'male'][Math.max(0,Math.min(5,frame|0))]??null;
}
export function prefetchPoses(ids){for(const id of new Set(ids))if(POSE_SHEETS[id])fetch(BASE+tier()+'/pose-'+id+'.webp',{priority:'low'}).catch(()=>{});}
export const poseMetrics=()=>({sheets:cache.size,loaded:[...cache.values()].filter(c=>c.frames).length,tier:tier()});

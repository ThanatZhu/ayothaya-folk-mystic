import * as THREE from './vendor/build/three.module.js';
import {BODY_HEIGHT,LOGICAL_SIZE} from './character-size.js';
import {posesFit} from './skill-pose-art.js?v=pose119';

export const GAIT_DIRECTIONS217=Object.freeze(['S','SE','E','NE','N','NW','W','SW']);
export function gaitFits217(classId,gender,appearance={},equipment=null){
 return classId==='boxer'&&gender==='male'&&posesFit(classId,appearance,equipment);
}
export function gaitFrame217({mode='walk',phase=null,time=0,direction='SE',reduced=false}={}){
 if(mode!=='walk'&&mode!=='run')return null;
 const cycles=Number.isFinite(phase)?phase:(Number.isFinite(time)?Math.max(0,time):0)/(mode==='run'?.48:.64);
 const wrapped=((cycles%1)+1)%1;
 return {mode,direction:GAIT_DIRECTIONS217.includes(direction)?direction:'SE',index:reduced?0:Math.min(3,Math.floor(wrapped*4))};
}
const cache=new Map();
export async function loadPaintedGait217(classId,gender){
 if(classId!=='boxer'||gender!=='male'||typeof document==='undefined')return null;
 const key='boxer-male';
 if(cache.has(key))return cache.get(key);
 const job=(async()=>{
  const url=new URL('./assets/character-gait217/boxer-male.json',import.meta.url);
  const response=await fetch(url);if(!response.ok)throw new Error('gait217-manifest-'+response.status);
  const meta=await response.json();
  if(meta.classId!==classId||meta.gender!==gender||meta.cell!==208||meta.bodyHeight!==168||
    meta.anchor?.[0]!==104||meta.anchor?.[1]!==196||JSON.stringify(meta.directions)!==JSON.stringify(GAIT_DIRECTIONS217))
   throw new Error('gait217-invalid-manifest');
  const names=['walk','run'];
  if(names.some(n=>meta.clips?.[n]?.frames!==4||!/^[a-z0-9-]+\.png$/.test(meta.clips[n].image)))throw new Error('gait217-invalid-clip');
  const loader=new THREE.TextureLoader();
  const loaded=await Promise.allSettled(names.map(n=>loader.loadAsync(new URL(meta.clips[n].image,url).href)));
  if(loaded.some(r=>r.status==='rejected')){
   loaded.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});
   throw new Error('gait217-texture-load');
  }
  const clips={};
  for(let j=0;j<names.length;j++){
   const mode=names[j],base=loaded[j].value;
   base.colorSpace=THREE.SRGBColorSpace;base.magFilter=base.minFilter=THREE.NearestFilter;base.generateMipmaps=false;
   const frames=Object.fromEntries(GAIT_DIRECTIONS217.map((direction,row)=>[direction,Array.from({length:4},(_,index)=>{
    const texture=base.clone();texture.repeat.set(1/4,1/8);texture.offset.set(index/4,1-(row+1)/8);texture.needsUpdate=true;return texture;
   })]));
   clips[mode]={frames,cycle:meta.clips[mode].cycle_ms/1000};
  }
  // Immutable UV windows share the two Sources/GPU uploads across all players.
  return {clips,extent:BODY_HEIGHT/LOGICAL_SIZE*meta.cell/meta.bodyHeight,footV:meta.anchor[1]/meta.cell};
 })();
 cache.set(key,job);
 try{return await job;}catch(error){if(cache.get(key)===job)cache.delete(key);throw error;}
}

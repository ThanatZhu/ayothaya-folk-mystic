import * as THREE from './vendor/build/three.module.js';
import {BODY_HEIGHT,LOGICAL_SIZE} from './character-size.js';
import {posesFit} from './skill-pose-art.js?v=pose119';
export const GAIT_CLASSES220=Object.freeze(['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']);
export const GAIT_DIRECTIONS220=Object.freeze(['S','SE','E','NE','N','NW','W','SW']);
export function gaitFits220(classId,gender,appearance={},equipment=null){
 return GAIT_CLASSES220.includes(classId)&&['male','female'].includes(gender)&&posesFit(classId,appearance,equipment);
}
export function gaitFrame220({mode='walk',phase=null,time=0,direction='SE',reduced=false}={}){
 if(mode!=='walk'&&mode!=='run')return null;
 const cycles=Number.isFinite(phase)?phase:(Number.isFinite(time)?Math.max(0,time):0)/(mode==='run'?.48:.64),wrapped=((cycles%1)+1)%1;
 return {mode,direction:GAIT_DIRECTIONS220.includes(direction)?direction:'SE',index:reduced?0:Math.min(3,Math.floor(wrapped*4))};
}
const cache=new Map(),compact=()=>globalThis.matchMedia?.('(pointer:coarse),(max-width:900px)').matches??false;
export async function loadPaintedGait220(classId,gender){
 if(!GAIT_CLASSES220.includes(classId)||!['male','female'].includes(gender)||typeof document==='undefined')return null;
 const tier=compact()?'sd':'hd',key=classId+'-'+gender+'/'+tier;
 if(cache.has(key))return cache.get(key);
 const job=(async()=>{
  const url=new URL('./assets/character-gait220/'+classId+'-'+gender+'.json',import.meta.url),response=await fetch(url);
  if(!response.ok)throw new Error('gait220-manifest-'+response.status);
  const manifest=await response.json(),meta=tier==='sd'?{...manifest,...manifest.tiers?.sd}:manifest;
  const cell=tier==='sd'?128:256,body=tier==='sd'?80:160,foot=tier==='sd'?120:240;
  if(meta.version!==220||meta.classId!==classId||meta.gender!==gender||meta.cell!==cell||meta.bodyHeight!==body||
   meta.anchor?.[0]!==cell/2||meta.anchor?.[1]!==foot||JSON.stringify(meta.directions)!==JSON.stringify(GAIT_DIRECTIONS220))throw new Error('gait220-invalid-manifest');
  const names=['walk','run'];
  if(names.some(n=>meta.clips?.[n]?.frames!==4||!/^[a-z0-9-]+\.png$/.test(meta.clips[n].image)))throw new Error('gait220-invalid-clip');
  const loader=new THREE.TextureLoader(),loaded=await Promise.allSettled(names.map(n=>loader.loadAsync(new URL(meta.clips[n].image,url).href)));
  if(loaded.some(r=>r.status==='rejected')){loaded.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});throw new Error('gait220-texture-load');}
  const clips={};
  for(let j=0;j<names.length;j++){
   const mode=names[j],base=loaded[j].value;base.colorSpace=THREE.SRGBColorSpace;base.magFilter=base.minFilter=THREE.NearestFilter;base.generateMipmaps=false;
   const frames=Object.fromEntries(GAIT_DIRECTIONS220.map((direction,row)=>[direction,Array.from({length:4},(_,i)=>{
    const t=base.clone();t.repeat.set(1/4,1/8);t.offset.set(i/4,1-(row+1)/8);t.needsUpdate=true;return t;
   })]));clips[mode]={frames,cycle:meta.clips[mode].cycle_ms/1000};
  }
  return {clips,extent:BODY_HEIGHT/LOGICAL_SIZE*meta.cell/meta.bodyHeight,footV:meta.anchor[1]/meta.cell,classId,gender,tier};
 })();cache.set(key,job);
 try{return await job;}catch(error){if(cache.get(key)===job)cache.delete(key);throw error;}
}


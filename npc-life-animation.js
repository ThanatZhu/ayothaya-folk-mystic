import * as THREE from 'three';
import {loadLifeArt,lifeFrameAt} from './character-life-art.js?v=106.0';
import {FRAME_SIZE,FRAME_FOOT,LOGICAL_SIZE,CHARACTER_WORLD_SCALE} from './character-size.js?v=size1';
import {createPosturePlayback} from './character-action-state.js?v=106.0';

const cache=new Map(),flipped=new WeakMap(),owned=new Set(),postures=new WeakMap();
if(typeof addEventListener==='function')addEventListener('pagehide',()=>{owned.forEach(t=>t.dispose());owned.clear();cache.clear();});
export function loadNPCLife(id){
 if(!cache.has(id))cache.set(id,loadLifeArt(id).then(art=>{
  if(!art)return null;
  const textures=new Map(),texture=canvas=>{
   if(!textures.has(canvas)){
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
    t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;textures.set(canvas,t);owned.add(t);
   }
   return textures.get(canvas);
  };
  return {...art,clips:Object.fromEntries(Object.entries(art.clips).map(([action,clip])=>[action,{...clip,frames:clip.frames.map(texture)}]))};
 }).catch(error=>{cache.delete(id);console.warn('NPC pose artwork unavailable',id,error);return null;}));
 return cache.get(id);
}
export function resetNPCLife(sprite){postures.delete(sprite);}
// Authored poses face right; legacy front/back sheets use a different convention.
export function npcLifeFlip(side,previous=false,facing='right'){
 if(Math.abs(side)<=.12)return previous;
 return facing==='left'?side>0:side<0;
}
export function npcLifePreservesGesture(talking,automaticGesture,previousAction){
 return talking||automaticGesture&&!['sit','sitDown','standUp','sleep'].includes(previousAction);
}
export function applyNPCLife(sprite,art,requested,time,{flip=false,reduced=false,phase=null}={}){
 let playback=postures.get(sprite);
 if(!playback||playback.art!==art){playback={art,controller:createPosturePlayback(),transitionFlip:null};postures.set(sprite,playback);}
 const resolved=playback.controller.sample(requested,time,{clips:art?.clips??{},reduced});
 const action=resolved.mode,clip=art?.clips[action];if(!clip?.frames.length)return false;
 if(resolved.transition){playback.transitionFlip??=flip;flip=playback.transitionFlip;}
 else playback.transitionFlip=null;
 const duration=clip.frameDurations?.reduce((a,b)=>a+b,0)??clip.frames.length/(clip.fps??1);
 const clock=['walk','run'].includes(action)&&Number.isFinite(phase)?((phase%1)+1)%1*duration:resolved.time;
 const frame=lifeFrameAt(clip,clock,reduced);
 let texture=clip.frames[frame];
 // Sprite shaders measure absolute matrix scale: a negative scale cannot flip
 // their UVs. Keep mirrored variants separate so actors never flip one another.
 if(flip){
  if(!flipped.has(texture)){const mirrored=texture.clone();mirrored.repeat.x=-1;mirrored.offset.x=1;mirrored.needsUpdate=true;flipped.set(texture,mirrored);owned.add(mirrored);}
  texture=flipped.get(texture);
 }
 sprite.material.map=texture;
 const size=FRAME_SIZE/LOGICAL_SIZE*CHARACTER_WORLD_SCALE;
 const breath=reduced?1:['idle','sit','sleep'].includes(action)?1+Math.sin(time*Math.PI*2/(action==='sleep'?4.8:4.1))*.0025:1;
 sprite.scale.set(size,size*breath,1);
 sprite.center.set(.5,(FRAME_SIZE-FRAME_FOOT)/FRAME_SIZE);
 sprite.userData.lifeAction=action;sprite.userData.lifeFrame=frame;
 return true;
}
// A conversation always wakes a resting NPC. Quest NPCs keep their coordinates,
// so authoritative talk distances and route interactions continue to agree.
export function stationaryNPCAction(time,index,talking=false){
 if(talking)return 'idle';
 const cycle=((time+index*17)%180+180)%180;
 return cycle>158?'sit':'idle';
}

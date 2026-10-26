// Story characters can own artwork without changing the shared people atlas.
import {FRAME_SIZE,FRAME_FOOT,LOGICAL_SIZE,CHARACTER_WORLD_SCALE} from './character-size.js?v=size1';
export const CHAO_CHUK=Object.freeze({id:'chao-chuk175',name:'เจ้าจุก',worldScale:.78,standing:'./assets/npc175/chao-chuk-standing.png',portrait:'./assets/npc175/chao-chuk-portrait.webp',metadata:'./assets/npc175/chao-chuk.json'});
export const storyNPCIdentity=n=>n?.name===CHAO_CHUK.name?CHAO_CHUK:null;
export function storyNPCPlacement(n){
 const art=storyNPCIdentity(n);if(!art)return null;
 const size=FRAME_SIZE/LOGICAL_SIZE*CHARACTER_WORLD_SCALE*art.worldScale;
 return {width:size,height:size,centerX:.5,centerY:(FRAME_SIZE-FRAME_FOOT)/FRAME_SIZE};
}
let pending;
export function loadStoryNPCLife(id){
 if(id!==CHAO_CHUK.id)return null;
 if(!pending)pending=(async()=>{
  const response=await fetch(CHAO_CHUK.metadata);if(!response.ok)throw Error('NPC identity metadata unavailable');
  const meta=await response.json(),image=new Image();image.src=meta.source;await image.decode();
  const frames=meta.frames.map(f=>{const c=document.createElement('canvas');c.width=c.height=FRAME_SIZE;c.getContext('2d').drawImage(image,...f.rect,0,0,FRAME_SIZE,FRAME_SIZE);return c;});
  return {...meta,clips:Object.fromEntries(Object.entries(meta.clips).map(([name,clip])=>[name,{...clip,frames:clip.frames.map(i=>frames[i])}]))};
 })().catch(error=>{pending=null;throw error;});
 return pending;
}

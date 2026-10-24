import * as THREE from 'three';
import {MONSTER_TYPES} from './combat-core.js?v=role116';
import {loadChapter2Monster,drawChapter2Monster} from './chapter2-monster-art.js';
const authored=new Map();
function loadAuthored(type){
 if(!authored.has(type.id))authored.set(type.id,(async()=>{
  const asset=await loadChapter2Monster({...type,animation:'animations/'+type.chapter2Art+'.json'});
  const {meta}=asset,maxW=Math.max(...meta.frames.map(f=>f.rect[2])),maxH=Math.max(...meta.frames.map(f=>f.rect[3]));
  const bodyPixels=Math.min(170,240*meta.idlePixels/maxW,236*meta.idlePixels/maxH),height=type.bodyHeight*256/bodyPixels;
  return meta.frames.map((_,i)=>{
   const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
   drawChapter2Monster(ctx,asset,i,128,256,bodyPixels);
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;
   t.userData={monsterHeight:height,monsterAspect:1,bodyHeight:type.bodyHeight,monsterFrame:i};return t;
  });
 })().catch(e=>{authored.delete(type.id);throw e;}));
 return authored.get(type.id);
}
export async function loadMonsterFrames(map){
 const result={},sheets=[...new Set(map.mobs.map(m=>MONSTER_TYPES[m[2]].sheet).filter(Boolean))];
 await Promise.all(sheets.map(async sheet=>{
  const [texture,meta]=await Promise.all([new THREE.TextureLoader().loadAsync('./assets/frontier38/'+sheet+'.png'),fetch('./assets/frontier38/'+sheet+'.json').then(r=>{if(!r.ok)throw new Error('Monster atlas metadata unavailable');return r.json();})]);
  for(const [id,type]of MONSTER_TYPES.entries())if(type.sheet===sheet){
   result[id]=meta.rects.slice(type.row*8,type.row*8+8).map(([x,y,w,h])=>{const c=document.createElement('canvas');c.width=c.height=256;const s=meta.scales[type.row],ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(texture.image,x,y,w,h,128-w*s/2,244-h*s,w*s,h*s);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;});
  }texture.dispose();
 }));
 const ids=[...new Set(map.mobs.map(m=>m[2]))].filter(id=>MONSTER_TYPES[id]?.chapter2Art);
 await Promise.all(ids.map(async id=>{result[id]=await loadAuthored(MONSTER_TYPES[id]);}));
 return result;
}

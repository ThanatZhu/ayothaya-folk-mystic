import * as THREE from 'three';
import {MONSTER_TYPES} from './combat-core.js?v=surfaces222';
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
// Pixel monsters: one strip of eight square cells, feet on the bottom row. Sized so the body stays as tall as the old art's.
const strips=new Map();
const loadStrip=art=>{if(!strips.has(art))strips.set(art,new THREE.TextureLoader().loadAsync('./assets/pixel/'+art+'.png?v=1').catch(e=>{strips.delete(art);throw e;}));return strips.get(art);};
async function loadPixel(type,{art,cell,body}){
 const {image}=await loadStrip(art),bodyHeight=type.bodyHeight??type.height*.86,height=bodyHeight*cell/body;
 return Array.from({length:8},(_,i)=>{
  const c=document.createElement('canvas');c.width=c.height=cell;c.getContext('2d').drawImage(image,i*cell,0,cell,cell,0,0,cell,cell);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;
  t.userData={monsterHeight:height,monsterAspect:1,bodyHeight,monsterFrame:i};return t;
 });
}
let pixelList=null;
const pixelMonsters=()=>pixelList??=fetch('./assets/pixel/monsters.json?v=1').then(r=>{if(!r.ok)throw Error('pixel monsters');return r.json();}).catch(e=>{pixelList=null;throw e;});
export async function loadMonsterFrames(map){
 const pixel=await pixelMonsters(),isPixel=type=>!!pixel[type?.id];
 const result={},sheets=[...new Set(map.mobs.map(m=>MONSTER_TYPES[m[2]]).filter(type=>!isPixel(type)).map(type=>type.sheet).filter(Boolean))];
 await Promise.all(sheets.map(async sheet=>{
  const [texture,meta]=await Promise.all([new THREE.TextureLoader().loadAsync('./assets/frontier38/'+sheet+'.png'),fetch('./assets/frontier38/'+sheet+'.json').then(r=>{if(!r.ok)throw new Error('Monster atlas metadata unavailable');return r.json();})]);
  for(const [id,type]of MONSTER_TYPES.entries())if(type.sheet===sheet&&!isPixel(type)){
   result[id]=meta.rects.slice(type.row*8,type.row*8+8).map(([x,y,w,h])=>{const c=document.createElement('canvas');c.width=c.height=256;const s=meta.scales[type.row],ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(texture.image,x,y,w,h,128-w*s/2,244-h*s,w*s,h*s);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;});
  }texture.dispose();
 }));
 const ids=[...new Set(map.mobs.map(m=>m[2]))];
 await Promise.all(ids.map(async id=>{const type=MONSTER_TYPES[id];if(isPixel(type))result[id]=await loadPixel(type,pixel[type.id]);else if(type?.chapter2Art)result[id]=await loadAuthored(type);}));
 return result;
}

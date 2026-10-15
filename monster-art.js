import * as THREE from 'three';
import {MONSTER_TYPES} from './combat-core.js?v=38';
export async function loadMonsterFrames(map){
 const result={},sheets=[...new Set(map.mobs.map(m=>MONSTER_TYPES[m[2]].sheet).filter(Boolean))];
 await Promise.all(sheets.map(async sheet=>{
  const [texture,meta]=await Promise.all([new THREE.TextureLoader().loadAsync('./assets/frontier38/'+sheet+'.png'),fetch('./assets/frontier38/'+sheet+'.json').then(r=>{if(!r.ok)throw new Error('Monster atlas metadata unavailable');return r.json();})]);
  for(const [id,type]of MONSTER_TYPES.entries())if(type.sheet===sheet){
   result[id]=meta.rects.slice(type.row*8,type.row*8+8).map(([x,y,w,h])=>{const c=document.createElement('canvas');c.width=c.height=256;const s=meta.scales[type.row],ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(texture.image,x,y,w,h,128-w*s/2,244-h*s,w*s,h*s);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;});
  }texture.dispose();
 }));return result;
}

import * as THREE from 'three';
import {PREMIUM_PET_IDS} from './premium-pets.js';
const assets=new Map();
export function petFrameAt(meta,action,ms){
 const clip=meta.clips[action]??meta.clips.idle,total=clip.durations.reduce((a,b)=>a+b,0);let t=clip.loop?Math.max(0,ms)%total:Math.min(Math.max(0,ms),total-1);
 for(let i=0;i<clip.frames.length;i++){if(t<clip.durations[i])return clip.frames[i];t-=clip.durations[i];}return clip.frames.at(-1);
}
export function loadPetMotion(id){
 if(!Object.hasOwn(PREMIUM_PET_IDS,id))return Promise.reject(Error('unknown-pet'));
 if(!assets.has(id))assets.set(id,(async()=>{const meta=await fetch('assets/pets128/motion/'+id+'.json').then(r=>{if(!r.ok)throw Error('pet-art-load');return r.json();}),img=new Image();img.src='assets/pets128/motion/'+id+'.webp';await img.decode();return {meta,img};})().catch(e=>{assets.delete(id);throw e;}));return assets.get(id);
}
const textures=new Map();
async function motionTextures(id){
 if(!textures.has(id))textures.set(id,loadPetMotion(id).then(asset=>({...asset,textures:Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=320;const ctx=c.getContext('2d');ctx.drawImage(asset.img,(i%3)*320,Math.floor(i/3)*320,320,320,0,0,320,320);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})})).catch(e=>{textures.delete(id);throw e;}));return textures.get(id);
}
export function createAnimatedPet(scene,id){
 const def=PREMIUM_PET_IDS[id];if(!def)return {id,follow(){},attack(){},dispose(){}};
 const mat=new THREE.SpriteMaterial({transparent:true,alphaTest:.2,depthWrite:false}),sprite=new THREE.Sprite(mat);sprite.visible=false;sprite.center.set(.5,0);sprite.scale.set(1.15,1.15,1);scene.add(sprite);
 let art=null,clock=0,attackAt=-Infinity,ready=false,disposed=false,direction=1;
 motionTextures(id).then(a=>{if(disposed)return;art=a;mat.map=a.textures[1];mat.needsUpdate=true;sprite.visible=true;}).catch(()=>{});
 return {id,sprite,attack(to,lag=0){attackAt=clock-Math.max(0,lag);if(to&&Math.abs(to.x-sprite.position.x)>.05)direction=to.x<sprite.position.x?-1:1;},follow(owner,dt,motion=null){
  clock+=Math.min(.1,Math.max(0,dt));if(!ready){sprite.position.set(motion?.x??owner.x-.9,0,motion?.z??owner.z+.7);ready=true;}
  const dx=(motion?.x??owner.x)-sprite.position.x,dz=(motion?.z??owner.z)-sprite.position.z,d=Math.hypot(dx,dz),attacking=clock-attackAt<.65&&!motion?.moving,moving=motion?!!motion.moving:d>1.3;
  if(motion){const f=1-Math.exp(-20*Math.max(0,dt));sprite.position.x+=dx*f;sprite.position.z+=dz*f;}else if(d>12)sprite.position.set(owner.x-.9,sprite.position.y,owner.z+.7);else if(moving&&!attacking){const step=Math.min(d-1.2,(2.6+d)*dt);sprite.position.x+=dx/d*step;sprite.position.z+=dz/d*step;}
  if(moving&&!attacking&&Math.abs(dx)>.15)direction=dx<0?-1:1;
  sprite.scale.x=1.15*direction;sprite.position.y=(motion?.y??owner.y??0)+(def.movement==='fly'?.8+Math.sin(clock*2.5)*.035:0);
  if(art){const action=attacking?'attack':moving?'move':'idle',frame=petFrameAt(art.meta,action,(attacking?clock-attackAt:clock)*1000);if(mat.map!==art.textures[frame]){mat.map=art.textures[frame];mat.needsUpdate=true;}}
 },dispose(){disposed=true;scene.remove(sprite);mat.dispose();}};
}

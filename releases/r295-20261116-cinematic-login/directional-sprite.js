import {CLASSES,isClass} from './classes.js?v=novice174';
import {directionalBodyMetrics} from './directional-size.js';
export const DIRECTIONAL_CLASSES=['novice',...CLASSES.map(c=>c.id)];
export function directionalManifestPath(classId='shaman'){
 if(!DIRECTIONAL_CLASSES.includes(classId))throw new Error('invalid-class');
 return './assets/directional/'+classId+(classId==='novice'?'-63.json':classId==='shaman'?'-16.json':'-17.json');
}
// Directions are relative to the camera, not fixed world compass points.
export const DIRECTIONS=['S','SE','E','NE','N','NW','W','SW'];
export function viewDirection(face,azimuth=0,previous='S'){
 if(!Number.isFinite(face?.x)||!Number.isFinite(face?.z)||!Number.isFinite(azimuth)||Math.hypot(face.x,face.z)<1e-6)return DIRECTIONS.includes(previous)?previous:'S';
 const right=face.x*Math.cos(azimuth)-face.z*Math.sin(azimuth);
 const toward=face.x*Math.sin(azimuth)+face.z*Math.cos(azimuth);
 return DIRECTIONS[(Math.round(Math.atan2(right,toward)/(Math.PI/4))+8)%8];
}
export function placement(frame,cell=192,anchor=[96,180]){
 const [, ,w,h]=frame.rect,[fx,fy]=frame.foot;
 // Reserve eight pixels above the bun; keep the sole on the common baseline.
 const scale=Math.min((anchor[1]-8)/fy,(anchor[0]-8)/Math.max(1,fx),(cell-anchor[0]-8)/Math.max(1,w-fx));
 return {x:anchor[0]-fx*scale,y:anchor[1]-fy*scale,w:w*scale,h:h*scale};
}
const pendingArt=new Map();
export function loadDirectionalArt(classId='shaman'){
 directionalManifestPath(classId);
 if(!pendingArt.has(classId)){
  const pending=loadArt(classId);pendingArt.set(classId,pending);
  pending.catch(()=>{if(pendingArt.get(classId)===pending)pendingArt.delete(classId);});
 }
 return pendingArt.get(classId);
}
async function loadArt(classId){
 const response=await fetch(directionalManifestPath(classId)+'?v=63.1');
 if(!response.ok)throw new Error('โหลดข้อมูลภาพหลายทิศไม่สำเร็จ');
 const manifest=await response.json(),images={};
 await Promise.all(Object.entries(manifest.sources).map(async([key,source])=>{
  const image=new Image();image.src=source.path;await image.decode();images[key]=image;
 }));
 const frames={},sizing={};
 for(const gender of ['male','female']){
  frames[gender]={};sizing[gender]={};
  for(const direction of DIRECTIONS){
   const f=manifest.frames[gender][direction],c=document.createElement('canvas');c.width=c.height=manifest.cell;
   const ctx=c.getContext('2d'),dest=placement(f,manifest.cell,manifest.anchor);ctx.imageSmoothingEnabled=false;
   ctx.drawImage(images[f.source],...f.rect,dest.x,dest.y,dest.w,dest.h);frames[gender][direction]=c;
   sizing[gender][direction]=directionalBodyMetrics(classId,gender,direction,f,dest,manifest.cell);
  }
 }
 return {manifest,frames,sizing,footV:manifest.anchor[1]/manifest.cell};
}

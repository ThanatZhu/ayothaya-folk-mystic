import {FRAME_SIZE,FRAME_FOOT} from './character-size.js?v=size1';
import {validateAppearance} from './appearance-state.js';
import {normalizeEquipment,equipmentAppearance} from './equipment.js?v=41';

const ROOT='./assets/character-life100/';
const images=new Map(),actors=new Map();
let manifest;
async function catalog(){
 if(!manifest)manifest=fetch(ROOT+'manifest.json?v=life101').then(async r=>{
  if(!r.ok)throw new Error('โหลดรายการท่าทางตัวละครไม่ได้');
  return r.json();
 }).catch(error=>{manifest=null;throw error;});
 return manifest;
}
function image(path){
 if(!images.has(path))images.set(path,(async()=>{
  const img=new Image();img.src=/^(?:\.\/)?assets\//.test(path)||path.startsWith('/')?path:ROOT+path;await img.decode();return img;
 })().catch(error=>{images.delete(path);throw error;}));
 return images.get(path);
}
// Do not silently remove an equipped silhouette or paint standing accessories
// over a seated face. Those appearances need their own authored pose layers.
export function lifeAppearanceCompatibility(classId,appearance={},equipment=null){
 if(!classId)return null;
 const gear=normalizeEquipment(equipment,classId),a=validateAppearance(equipmentAppearance(appearance,gear,classId));
 if(gear.weapon.endsWith('-crafted'))return 'weapon';
 if(['garment','hair','hairColor','eyes'].some(key=>a[key]!=='original')||a.beard!=='none'||a.tattoo!=='none')return 'appearance';
 if(classId==='acolyte'&&a.outfit!=='original')return 'appearance';
 return null;
}
function dyeOutfit(canvas,dye){
 if(!dye||dye==='original')return canvas;
 const colors={indigo:[73,108,169],crimson:[165,59,68],ivory:[215,200,159]},tint=colors[dye];
 if(!tint)return canvas;
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,FRAME_SIZE,FRAME_SIZE),p=data.data;
 for(let i=0;i<p.length;i+=4){
  if(p[i+3]<100)continue;
  const [r,g,b]=[p[i],p[i+1],p[i+2]],lum=(r+g+b)/3;
  // Indigo fabric only, irrespective of whether the body is upright or lying.
  if(b>r*.9&&b>g*1.04&&g<r*1.4&&r<150&&g<170&&lum>20)
   for(let k=0;k<3;k++)p[i+k]=Math.min(255,tint[k]*(.4+lum/150));
 }
 ctx.putImageData(data,0,0);return canvas;
}
export function lifeFrameAt(clip,time=0,reduced=false){
 if(!clip?.frames?.length)return -1;
 if(reduced)return 0;
 const durations=clip.frameDurations??clip.frames.map(()=>1/(clip.fps??1));
 const total=durations.reduce((a,b)=>a+b,0);
 if(!(total>0))return 0;
 const safe=Number.isFinite(time)?Math.max(0,time):0;
 const t=clip.loop===false?Math.min(safe,total-1e-8):safe%total;
 let end=0;for(let i=0;i<durations.length;i++){end+=durations[i];if(t<end)return i;}
 return clip.frames.length-1;
}
export async function loadLifeArt(id,{classId=null,appearance={},equipment=null}={}){
 const data=await catalog(),entry=data.actors[id];if(!entry)return null;
 const reason=lifeAppearanceCompatibility(classId,appearance,equipment);
 if(reason)return {id,clips:{},unavailableReason:reason};
 const dye=classId?equipmentAppearance(appearance,equipment,classId).outfit??'original':'original';
 const key=id+':'+dye;
 if(actors.has(key))return actors.get(key);
 const pending=(async()=>{
  // A frame can point at an appended atlas while old rest frames keep using the
  // actor's original source. Image caching shares each atlas across its frames.
  const frames=await Promise.all(entry.frames.map(async frame=>{
   const source=frame.source??entry.source;
   if(typeof source!=='string'||!source)throw new Error(`Missing frame source: ${id}`);
   const img=await image(source);
   const canvas=document.createElement('canvas');canvas.width=canvas.height=FRAME_SIZE;
   const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
   ctx.drawImage(img,...frame.rect,0,0,FRAME_SIZE,FRAME_SIZE);
   return dyeOutfit(canvas,dye);
  }));
  const clips=Object.fromEntries(Object.entries(entry.clips).map(([action,clip])=>[
   action,{...clip,frames:clip.frames.map(index=>frames[index]),source:'authored'}
  ]));
  return {id,clips,facing:entry.facing??'right',frameSize:FRAME_SIZE,foot:FRAME_FOOT,review:entry.review??'draft'};
 })();
 actors.set(key,pending);pending.catch(()=>actors.delete(key));return pending;
}

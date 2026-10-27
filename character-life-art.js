import {FRAME_SIZE,FRAME_FOOT} from './character-size.js?v=size1';
import {validateAppearance} from './appearance-state.js';
import {normalizeEquipment,equipmentAppearance} from './equipment.js?v=41';

const ROOT='./assets/character-life100/';
const images=new Map(),actors=new Map();
const manifests=new Map();
export function lifeAssetVariant(classId,equipment=null){
 return classId&&['shaman','rogue'].includes(classId)&&normalizeEquipment(equipment,classId).weapon.endsWith('-crafted')?'crafted106':'basic';
}
async function catalog(variant='basic'){
 if(!manifests.has(variant))manifests.set(variant,fetch(variant==='crafted106'?'./assets/character-life106/manifest.json?v=106':ROOT+'manifest.json?v=life101').then(async r=>{
  if(!r.ok)throw new Error('โหลดรายการท่าทางตัวละครไม่ได้');
  return r.json();
 }).catch(error=>{manifests.delete(variant);throw error;}));
 return manifests.get(variant);
}
function image(path){
 if(!images.has(path))images.set(path,(async()=>{
  const img=new Image();img.src=/^(?:\.\/)?assets\//.test(path)||path.startsWith('/')?path:ROOT+path;await img.decode();return img;
 })().catch(error=>{images.delete(path);throw error;}));
 return images.get(path);
}
// 0.122 a frame list whose frames are made on first read: a 320 px canvas per frame for every clip of every actor was
// ~150 MB in the capital, and on phones Chrome keeps 2D canvases in GPU memory. length, indexing, map-free iteration
// work as on an array; mapFrames keeps a conversion (canvas -> texture) just as lazy; builtFrames lists what exists.
const BUILT=Symbol('built');
export function lazyFrames(count,build){
 const made=new Map(),index=k=>typeof k==='string'&&/^\d+$/.test(k)&&+k<count?+k:-1;
 return new Proxy(new Array(count),{
  has:(t,k)=>index(k)>=0||Reflect.has(t,k),
  get(t,k){
   if(k===BUILT)return [...made.values()];
   const i=index(k);if(i<0)return Reflect.get(t,k);
   if(!made.has(i))made.set(i,build(i));return made.get(i);
  },
 });
}
export const mapFrames=(frames,fn)=>lazyFrames(frames.length,i=>fn(frames[i]));
export const builtFrames=frames=>frames[BUILT]??frames;
// Do not silently remove an equipped silhouette or paint standing accessories
// over a seated face. Those appearances need their own authored pose layers.
export function lifeAppearanceCompatibility(classId,appearance={},equipment=null){
 if(!classId)return null;
 const gear=normalizeEquipment(equipment,classId),a=validateAppearance(equipmentAppearance(appearance,gear,classId));
 if(gear.weapon.endsWith('-crafted')&&lifeAssetVariant(classId,gear)==='basic')return 'weapon';
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
 const reason=lifeAppearanceCompatibility(classId,appearance,equipment);
 if(reason)return {id,clips:{},unavailableReason:reason};
 const variant=lifeAssetVariant(classId,equipment),data=await catalog(variant),entry=data.actors[id];if(!entry)return null;
 const dye=classId?equipmentAppearance(appearance,equipment,classId).outfit??'original':'original';
 const key=id+':'+variant+':'+dye;
 if(actors.has(key))return actors.get(key);
 const pending=(async()=>{
  // A frame can point at an appended atlas while old rest frames keep using the
  // actor's original source. Image caching shares each atlas across its frames.
  const sources=entry.frames.map(frame=>frame.source??entry.source);
  if(sources.some(source=>typeof source!=='string'||!source))throw new Error(`Missing frame source: ${id}`);
  const atlas=new Map(await Promise.all([...new Set(sources)].map(async source=>[source,await image(source)])));
  const frames=lazyFrames(entry.frames.length,i=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=FRAME_SIZE;
   const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
   ctx.drawImage(atlas.get(sources[i]),...entry.frames[i].rect,0,0,FRAME_SIZE,FRAME_SIZE);
   return dyeOutfit(canvas,dye);
  });
  const clips=Object.fromEntries(Object.entries(entry.clips).map(([action,clip])=>[
   action,{...clip,frames:mapFrames(clip.frames,index=>frames[index]),source:'authored'}
  ]));
  return {id,clips,facing:entry.facing??'right',frameSize:FRAME_SIZE,foot:FRAME_FOOT,review:entry.review??'draft'};
 })();
 actors.set(key,pending);pending.catch(()=>actors.delete(key));return pending;
}

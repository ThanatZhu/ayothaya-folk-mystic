// Pixel characters: one 6x4 atlas per class and gender (scripts/build-pixel-characters.py).
// Row 1 idle 2 + walk 4, row 2 run, row 3 attack, row 4 skill, all facing right. The canvases stay at their small size:
// the game draws them with nearest filtering, so every art pixel lands as a clean square at any zoom.
import {FRAME_SIZE,FRAME_FOOT} from './character-size.js?v=size228';

const ROOT='./assets/pixel/',VERSION='?v=3',COLUMNS=6,ROWS=4;
const WALK=[2,3,4,5],RUN=[6,7,8,9,10,11],ATTACK=[12,13,14,15,16,17],SKILL=[18,19,20,21,22,23];
// The 20 class frames other code asks for by number: 0-4 stand, 5-10 attack, 11 stand, 12-19 side walk. Front and back
// walk frames are absent on purpose: rigged-sprite.js then falls back to the side cycle with its left and right flip.
const CLASS_FRAMES=[0,0,0,0,0,...ATTACK,0,...WALK,...WALK];
export const PIXEL_CLASSES=new Set(['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']);
export const isPixelClass=id=>PIXEL_CLASSES.has(id);

let catalog=null;
const sheets=new Map();
function manifest(){
 catalog??=fetch(ROOT+'manifest.json'+VERSION).then(r=>{if(!r.ok)throw new Error('Pixel character manifest');return r.json();}).catch(error=>{catalog=null;throw error;});
 return catalog;
}
function sheet(classId,gender,kind='pc'){
 const key=classId+'-'+(gender==='female'?'female':'male'),slot=kind+':'+key;
 if(!sheets.has(slot))sheets.set(slot,(async()=>{
  const {actors}=await manifest(),size=kind==='pe'?actors[key]?.emote:actors[key]?.cell;if(!size)throw new Error('Pixel character missing: '+slot);
  const image=new Image();image.src=ROOT+kind+'-'+classId+'-'+(gender==='female'?'f':'m')+'.png'+VERSION;await image.decode();
  return Array.from({length:COLUMNS*ROWS},(_,i)=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
   canvas.getContext('2d').drawImage(image,(i%COLUMNS)*size,Math.floor(i/COLUMNS)*size,size,size,0,0,size,size);return canvas;
  });
 })().catch(error=>{sheets.delete(slot);throw error;}));
 return sheets.get(slot);
}
// Same shape as loadPaintedCharacter: {male:[...],female:[...]}.
export async function pixelCharacter(classId){
 const [male,female]=await Promise.all([sheet(classId,'male'),sheet(classId,'female')]);
 return {male:CLASS_FRAMES.map(i=>male[i]),female:CLASS_FRAMES.map(i=>female[i])};
}
// Leaderboards and portraits draw onto a 2D canvas, so give them the standard 320 px frame.
export async function pixelStanding(classId,gender){
 const [frame]=await sheet(classId,gender),out=document.createElement('canvas');out.width=out.height=FRAME_SIZE;
 const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,0,0,FRAME_SIZE,FRAME_SIZE);return out;
}
// Same shape as loadLifeArt. The second sheet holds rest and emote poses: row 1 sit, row 2 sleep, row 3 wai, row 4 cheer and guard.
export async function pixelLifeArt(id,classId,gender){
 const [frames,poses]=await Promise.all([sheet(classId,gender),sheet(classId,gender,'pe')]);
 const clip=(cells,timing)=>({frames:cells.map(i=>frames[i]),...timing,source:'authored'}),pose=(cells,timing)=>({frames:cells.map(i=>poses[i]),...timing,source:'authored'});
 return {id,pixel:true,facing:'right',frameSize:FRAME_SIZE,foot:FRAME_FOOT,review:'draft',clips:{
  idle:clip([0,1],{frameDurations:[.7,.7],loop:true}),
  walk:clip(WALK,{fps:7.6,loop:true}),
  run:clip(RUN,{fps:11,loop:true}),
  attack:clip(ATTACK,{fps:14,loop:false}),
  cast:clip(SKILL,{fps:12,loop:false}),
  sitDown:pose([0,1,2,3],{frameDurations:[.14,.14,.14,.14],loop:false}),
  sit:pose([4,5],{frameDurations:[1.4,1.4],loop:true}),
  standUp:pose([3,2,1,0],{frameDurations:[.12,.12,.12,.12],loop:false}),
  sleep:pose([6,7,8,9,10,11],{frameDurations:[.2,.2,.2,.2,1.6,1.6],loop:false}),
  bow:pose([12,13,14,15,16,17],{frameDurations:[.2,.25,.3,1.7,.3,.35],loop:false}),
  celebrate:pose([18,19,20],{fps:7,loop:true}),
  guard:pose([21,22,23],{frameDurations:[.5,.5,.5],loop:true})
 }};
}

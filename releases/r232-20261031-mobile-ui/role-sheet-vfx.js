import * as THREE from './vendor/build/three.module.js';
import {VFX_SHEETS} from './assets/skills-next/vfx-2026-10/vfx-map.js';
import {ALL_SKILLS} from './assets/skills-next/catalog.js';
import {groundHeight} from './combat-core.js?v=surfaces222';
import {atlasUv} from './assets/skill-polish/timing.js';
import {effectDirection,sheetFacing,mirroredFrame} from './skill-effect-facing200.js';
// 0.119 painted skill sheets (4×2 frames, frame 3 = peak). One clip per cast, timed by the cast's own release beats
// (event.timing.impacts) and nudged onto the real damage events, so it follows the authority, not a fixed speed.
const BASE='./assets/skills-next/vfx-2026-10/game/';
const AROUND=new Set(['taunt','cleave','push','sanctuary','ward','groupHeal','soulWave','curseWave','smoke']);
const SELF=new Set(['guard','riposte','evade','stealth','crow','anchor','counter','reflect','clones','poison','venom','greatSummon','greatSpirit','rest','heal-self']);
const AREA=new Set(['zone','storm','meteor','rain','trap','mine','thorns','massBind','yantra','holyField','lifeTree','wall','phalanx']);
const SHOT=new Set(['holy','retreatShot','ambush']);
const LINE=new Set(['line','drill','chainLine','cone']);
// Novice basics are not role skills; their save slot is their identity (the hotbar may move them, the slot never does).
const NOVICE_KIND={'novice:0':'jab','novice:4':'rest','novice:5':'guard'};
export const vfxPlacement=kind=>AROUND.has(kind)?'around':SELF.has(kind)?'self':AREA.has(kind)?'area':SHOT.has(kind)?'shot':LINE.has(kind)?'line':'target';
export const hasSheet=id=>!!VFX_SHEETS[id]?.effect;
const skills=new Map(ALL_SKILLS.map(s=>[s.id,s]));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
// Frames 0-2 build up to the first blow, 3 sits on every blow (with 4/2 between blows), 4-7 fade after the last.
export function sheetFrame(impacts,tail,t){
 const first=impacts[0],last=impacts.at(-1);if(!(t>=0)||t>last+tail)return null;
 let frame,alpha=1;
 if(t<first){const u=first>0?t/first:1;frame=Math.min(2,Math.floor(u*3));alpha=.35+.65*smooth(u*2);}
 else if(t<last){let k=0;while(t>=impacts[k+1])k++;const u=(t-impacts[k])/(impacts[k+1]-impacts[k]);frame=u<.3?3:u<.6?4:2;}
 else{const u=(t-last)/tail;frame=u<.15?3:Math.min(7,4+Math.floor((u-.15)/.85*4));alpha=1-smooth((u-.7)/.3);}
 let pulse=0;for(const at of impacts)pulse=Math.max(pulse,1-Math.abs(t-at)/.09);
 return {frame,alpha,pulse};
}
// The fade scales with the cast's own length: quick jabs vanish fast, ultimates linger.
export const sheetTail=(timing,ultimate)=>clamp((timing?.duration??.6)*.9,.4,1.3)+(ultimate?.5:0);
export function createSheetVfx(scene,world,{tier:forced=null,camera=null}={}){
 const compact=matchMedia('(pointer:coarse),(max-width:900px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const tier=()=>forced??(compact.matches?'sd':'hd'),caps=()=>tier()==='sd'?{clips:5,sheets:6}:{clips:10,sheets:10};
 const loader=new THREE.TextureLoader(),cache=new Map(),pool=[],clips=[],plane=new THREE.PlaneGeometry(1,1),fetched=new Set();
 let clock=0,tick=0,disposed=false,locate=null;
 const self=()=>world.networkSelfId??'self';
 function sheet(key){
  let c=cache.get(key);if(c){c.used=++tick;return c;}
  c={key,used:++tick,frames:null,failed:false};cache.set(key,c);
  loader.loadAsync(BASE+tier()+'/'+key+'.webp').then(base=>{
   if(disposed||cache.get(key)!==c){base.dispose();return;}
   base.colorSpace=THREE.SRGBColorSpace;base.minFilter=base.magFilter=THREE.LinearFilter;base.generateMipmaps=false;c.base=base;
   // Eight UV windows over one image: the clones share its Source, so the GPU holds the sheet once.
   c.frames=Array.from({length:8},(_,i)=>{const t=base.clone(),uv=atlasUv(i);t.offset.set(uv.x,uv.y);t.repeat.set(uv.w,uv.h);t.needsUpdate=true;return t;});c.mirrored=c.frames.map(mirroredFrame);trim();
  }).catch(()=>{c.failed=true;});
  trim();return c;
 }
 function trim(){
  const live=new Set(clips.flatMap(c=>[c.entry.effect,c.entry.ground]));
  const old=[...cache.values()].filter(c=>!live.has(c.key)&&(c.frames||c.failed)).sort((a,b)=>a.used-b.used);
  while(cache.size>caps().sheets&&old.length){const c=old.shift();c.frames?.forEach(t=>t.dispose());c.mirrored?.forEach(t=>t.dispose());c.base?.dispose();cache.delete(c.key);}
 }
 function holder(){
  let h=pool.find(h=>!h.busy);
  if(!h){
   const smat=new THREE.SpriteMaterial({transparent:true,depthWrite:false}),gmat=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
   h={sprite:new THREE.Sprite(smat),ground:new THREE.Mesh(plane,gmat),smat,gmat,busy:false};h.ground.renderOrder=-1;h.sprite.visible=h.ground.visible=false;scene.add(h.sprite,h.ground);pool.push(h);
  }
  h.busy=true;return h;
 }
 function release(clip){clip.holder.busy=false;clip.holder.sprite.visible=clip.holder.ground.visible=false;clip.holder.smat.map=clip.holder.gmat.map=null;clips.splice(clips.indexOf(clip),1);trim();}
 function spawn(e){
  const id=e.roleSkillId,entry=VFX_SHEETS[id];if(disposed||!entry?.effect||!e.from||!e.to)return false;
  const actor=e.actor??self(),own=actor===self(),key=e.castId!=null?actor+'|'+e.castId:null;
  if(key&&clips.some(c=>c.key===key))return true; // the same cast delivered twice
  const p=world.player,direction=effectDirection(e.from,e.to,e.direction??(own?p:locate?.(actor))?.face);if(!own&&p&&Math.hypot(e.from.x-p.x,e.from.z-p.z)>32)return true; // too far to read
  const cap=caps().clips;while(clips.length>=cap)release(clips.find(c=>!c.own)??clips[0]);
  const skill=skills.get(id),kind=skill?.kind??NOVICE_KIND[id]??e.kind,place=vfxPlacement(kind),ultimate=!!(skill?.ultimate??entry.ultimate);
  const impacts=e.timing?.impacts?.length?[...e.timing.impacts]:[skill?.windup??.36],radius=skill?.radius??2.8;
  const wide=place==='around'||place==='area';
  const clip={key,actor,own,id,entry,place,ultimate,direction,from:{...e.from},to:{...e.to},start:clock-Math.max(0,e.lag??0),impacts,tail:sheetTail(e.timing,ultimate),hits:new Set(),holder:holder(),
   size:wide?clamp(radius*1.9,2.6,ultimate?8:6.5):ultimate?3.4:place==='shot'?1.9:2.3,ground:clamp(radius*2.5,2.4,ultimate?9:7)};
  sheet(entry.effect);if(entry.ground)sheet(entry.ground);clips.push(clip);return true;
 }
 // A real damage event of this cast puts the blow where and when the authority dealt it (once per hit index).
 function hit(e){
  if(e.castId==null||!Number.isInteger(e.hitIndex))return;
  const clip=clips.find(c=>c.key===(e.actor??self())+'|'+e.castId);if(!clip||clip.hits.has(e.hitIndex))return;clip.hits.add(e.hitIndex);
  const drift=clock-Math.max(0,e.lag??0)-(clip.start+clip.impacts[Math.min(e.hitIndex,clip.impacts.length-1)]);if(Math.abs(drift)<.6)clip.start+=drift;
  if(e.hitIndex===0&&Number.isFinite(e.x)&&Number.isFinite(e.z)&&['target','shot'].includes(clip.place))clip.to={x:e.x,z:e.z};
 }
 function where(clip,t){
  const caster=locate?.(clip.actor)??(clip.own?world.player:null)??clip.from,from=clip.place==='self'||clip.place==='around'?caster:clip.from;
  const dx=clip.to.x-from.x,dz=clip.to.z-from.z,d=Math.hypot(dx,dz),ux=clip.direction.x,uz=clip.direction.z;
  if(clip.place==='self'||clip.place==='around')return {x:from.x,z:from.z,ux,uz};
  if(clip.place==='line'){const len=clamp(d,2.4,7);return {x:from.x+ux*len*.5,z:from.z+uz*len*.5,ux,uz,len};}
  if(clip.place==='shot'){const first=clip.impacts[0],flight=Math.min(first*.7,.45),q=smooth((t-(first-flight))/Math.max(.01,flight));return {x:from.x+dx*q,z:from.z+dz*q,ux,uz};}
  return {x:clip.to.x,z:clip.to.z,ux,uz};
 }
 function update(dt){
  clock+=clamp(dt,0,.25);camera?.updateMatrixWorld();let shake=0;
  for(const clip of [...clips]){
   const t=clock-clip.start,f=sheetFrame(clip.impacts,clip.tail,t),g=clip.entry.ground?sheetFrame(clip.impacts,clip.tail*1.25,t):null;
   if(!f&&!g){release(clip);continue;}
   const {sprite,ground,smat,gmat}=clip.holder,at=where(clip,t),y=groundHeight(world.nav,at.x,at.z),fade=clip.own?1:.85,pulse=reduced.matches?0:(f?.pulse??0);
   const fx=cache.get(clip.entry.effect)?.frames,gx=clip.entry.ground?cache.get(clip.entry.ground)?.frames:null;
   sprite.visible=!!(f&&fx);
   if(sprite.visible){const size=(clip.place==='line'?Math.max(clip.size,at.len*.9):clip.size)*(1+pulse*.1);const facing=sheetFacing(clip.id,camera,at,clip.direction,f.frame);smat.map=facing.mirror?cache.get(clip.entry.effect).mirrored[f.frame]:fx[f.frame];smat.rotation=facing.rotation;smat.opacity=f.alpha*fade;sprite.scale.set(size,size,1);sprite.position.set(at.x,y+(clip.place==='area'||clip.place==='around'?Math.max(1,size*.32):1),at.z);}
   ground.visible=!!(g&&gx);
   if(ground.visible){const size=clip.place==='line'?Math.max(clip.ground*.6,at.len):clip.ground;gmat.map=gx[g.frame];gmat.opacity=g.alpha*fade;ground.scale.set(size,size,1);ground.position.set(at.x,y+.05,at.z);ground.rotation.set(-Math.PI/2,0,Math.atan2(-at.uz,at.ux));}
   if(clip.own&&clip.ultimate)shake=Math.max(shake,pulse*.07);
  }
  return reduced.matches?0:shake;
 }
 return {spawn,hit,update,
  cancel(castId,actor=self()){for(const c of clips.filter(c=>c.key===actor+'|'+castId))release(c);},
  rekey(from,to,actor=self()){for(const c of clips)if(c.key===actor+'|'+from)c.key=actor+'|'+to;},
  // Warm the HTTP cache for the player's own skills; nothing reaches the GPU until a cast needs it.
  prefetch(ids){for(const id of ids){const e=VFX_SHEETS[id];for(const key of [e?.effect,e?.ground])if(key&&!fetched.has(key)){fetched.add(key);fetch(BASE+tier()+'/'+key+'.webp',{priority:'low'}).catch(()=>{});}}},
  set locate(fn){locate=fn;},
  clear(){for(const c of [...clips])release(c);trim();},
  dispose(){disposed=true;for(const c of [...clips])release(c);for(const h of pool){scene.remove(h.sprite,h.ground);h.smat.dispose();h.gmat.dispose();}pool.length=0;plane.dispose();for(const c of cache.values()){c.frames?.forEach(t=>t.dispose());c.mirrored?.forEach(t=>t.dispose());c.base?.dispose();}cache.clear();},
  get time(){return clock;},
  get metrics(){return {clips:clips.length,pool:pool.length,sheets:cache.size,loaded:[...cache.values()].filter(c=>c.frames).length,tier:tier()};}};
}

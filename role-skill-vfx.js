import {createSkillLibraryRenderer} from './assets/skill-polish/library-renderer.js?v=align169';
import {SKILL_PROFILES} from './assets/skill-polish/library-profiles.js';
import {createRoleAnimation,roleEffectTime,sampleRoleEffect} from './combat-animation165.js?v=pose119';
import {groundHeight} from './combat-core.js?v=novice174';
import {createSheetVfx,hasSheet} from './role-sheet-vfx.js?v=facing200';
export function roleEffectSpace(from,to,nav,canonicalFrom=-2,canonicalTo=1.55){
 const dx=to.x-from.x,dz=to.z-from.z,d=Math.hypot(dx,dz),ux=d>.01?dx/d:1,uz=d>.01?dz/d:0;
 return {yaw:Math.atan2(uz,ux),point(p,origin=null){
  // Interpolate the journey between caster and target, but rotate local rings,
  // walls and auras rigidly. Scaling their radius by attack range collapses a
  // self cast to a line and stretches ranged target effects across the map.
  const center=origin??p,along=(center.x-canonicalFrom)/(canonicalTo-canonicalFrom);
  const ox=origin?p.x-origin.x:0,oz=p.z;
  const x=from.x+dx*along+ux*ox-uz*oz,z=from.z+dz*along+uz*ox+ux*oz;
  return {x,y:groundHeight(nav,x,z)+p.y,z};
 }};
}
// Reusable bounded pools; remote combat can never allocate an unbounded number of sprites.
export function createLiveRoleVfx(scene,camera,world){
 const compact=matchMedia('(pointer:coarse),(max-width:900px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)'),slots=[],sheets=createSheetVfx(scene,world,{camera});let clock=0,serial=0,disposed=false;
// Skills with a 0.119 painted sheet play it; pets, passives and anything without one keep the library profile.
 function spawn(e){
  if(world.spiritCompanion&&['spirit','spirit-lord','sm-lord','spirit-force','sm-servant'].includes(e.roleSkillId))return;
  if(sheets.spawn(e))return;
  const profile=SKILL_PROFILES[e.roleSkillId];if(!profile||disposed||!e.from||!e.to)return;
  const quality=compact.matches?'low':'high',limit=compact.matches?2:3;let slot=slots.find(s=>!s.active)||slots.filter(s=>s.active).sort((a,b)=>a.started-b.started)[0];
  if(slots.length<limit&&!slots.some(s=>!s.active)){slot={fx:createSkillLibraryRenderer(scene),active:null,started:0,token:0};slots.push(slot);}
  if(!slot)return;const token=++serial;slot.token=token;slot.started=clock;slot.active={profile,animation:createRoleAnimation(e,clock),castId:e.castId,actor:e.actor??world.networkSelfId??'self',from:{...e.from},to:{...e.to},start:clock-Math.max(0,e.lag??0),ready:false,quality};
  slot.fx.prepare(profile,{quality}).then(ok=>{if(ok&&!disposed&&slot.token===token)slot.active.ready=true;}).catch(error=>{if(slot.token===token){slot.active=null;slot.fx.clear();}console.warn('Role effect unavailable',profile.id,error.message);});
 }
 const advance=dt=>{dt=Math.max(0,Math.min(.25,dt));clock+=dt;sheetShake=sheets.update(dt);};let sheetShake=0;
 return {spawn,advance,hit:sheets.hit,prefetch:sheets.prefetch,has:hasSheet,set locate(fn){sheets.locate=fn;},// A predicted press takes the realm's cast id, so its hits and cancels find the clip already playing.
  rekey(from,to,actor=world.networkSelfId??'self'){sheets.rekey(from,to,actor);for(const slot of slots)if(slot.active?.castId===from&&slot.active.actor===actor)slot.active.castId=to;},
  cancel(castId,actor=world.networkSelfId??'self'){sheets.cancel(castId,actor);for(const slot of slots)if(castId!=null&&slot.active?.castId===castId&&slot.active.actor===actor){slot.token=++serial;slot.active=null;slot.fx.clear();}},update(dt){advance(dt);let shake=sheetShake;
  for(const slot of slots){const clip=slot.active;if(!clip)continue;const t=roleEffectTime(clip.animation,clock-clip.start);if(t>clip.profile.duration){slot.active=null;slot.fx.clear();continue;}if(!clip.ready)continue;
   const sample=sampleRoleEffect(clip.animation,clock-clip.start,{reduced:reduced.matches});slot.fx.sample(sample,camera,{quality:clip.quality,reduced:reduced.matches,space:roleEffectSpace(clip.from,clip.to,world.nav)});shake=Math.max(shake,sample.shake);
  }return reduced.matches?0:shake;},get time(){return clock;},clear(){sheets.clear();for(const slot of slots){slot.token=++serial;slot.active=null;slot.fx.clear();}},dispose(){disposed=true;sheets.dispose();for(const slot of slots)slot.fx.dispose();slots.length=0;},get metrics(){return {sheets:sheets.metrics,active:slots.filter(s=>s.active).length,slots:slots.length,atlases:slots.reduce((n,s)=>n+s.fx.metrics.cachedAtlases,0),sprites:slots.reduce((n,s)=>n+s.fx.metrics.allocatedSlots,0)};}};
}

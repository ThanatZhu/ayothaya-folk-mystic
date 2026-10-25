import {SKILL_PROFILES,sampleSkill} from './assets/skill-polish/library-profiles.js';
import {characterMotion} from './character-motion.js?v=combat129';

export function ageQueuedCombatEvent(event,now){
 if(!Number.isFinite(event.presentationQueuedAt))return event;
 const {presentationQueuedAt,...rest}=event;
 return {...rest,lag:Math.max(0,event.lag??0)+Math.max(0,now-presentationQueuedAt)};
}

// Snapshot facing can still describe the previous walk/target when a buffered
// cast arrives. Aim the body from the same immutable endpoints as its effect.
export function castFacing(event,fallback=null){
 const dx=event.to?.x-event.from?.x,dz=event.to?.z-event.from?.z,d=Math.hypot(dx,dz);
 if(Number.isFinite(d)&&d>.01)return {x:dx/d,z:dz/d};
 const length=Math.hypot(fallback?.x,fallback?.z);
 return Number.isFinite(length)&&length>.001?{x:fallback.x/length,z:fallback.z/length}:null;
}

// Body and particles share the authority's release beats. Body recovery is short;
// lingering particles keep their authored tail without holding the actor in place.
export function createRoleAnimation(event,now){
 const profile=SKILL_PROFILES[event.roleSkillId];if(!profile)return null;
 const authored=profile.impacts.length?profile.impacts:[.8];
 const impacts=event.timing?.impacts?.length?event.timing.impacts:authored;
 return {id:profile.id,castId:event.castId,facing:castFacing(event),start:now-Math.max(0,event.lag??0),duration:event.timing?.duration??impacts.at(-1)+.16,impacts:[...impacts]};
}
export function roleAnimationActive(action,now){return !!action&&now>=action.start&&now<action.start+action.duration;}

export function roleEffectTime(action,elapsed){
 const profile=SKILL_PROFILES[action.id],authored=profile.impacts.length?profile.impacts:[.8],actual=action.impacts;
 let before=0,paintedBefore=0;
 for(let i=0;i<actual.length;i++){
  const next=actual[i],painted=authored[Math.min(i,authored.length-1)];
  if(elapsed<=next)return paintedBefore+(painted-paintedBefore)*Math.max(0,(elapsed-before)/Math.max(.000001,next-before));
  before=next;paintedBefore=painted;
 }
 return paintedBefore+Math.max(0,elapsed-before);
}

export function sampleRolePose(action,now,{reduced=false}={}){
 if(!roleAnimationActive(action,now))return null;
 const profile=SKILL_PROFILES[action.id],elapsed=now-action.start,release=action.impacts.at(-1),sample=sampleSkill(action.id,roleEffectTime(action,elapsed),{reduced});
 let frame=sample.frame;
 // Finish the recovery inside the advertised body duration, not the 3–5 second FX tail.
 if(elapsed>release){const recovery=(elapsed-release)/Math.max(.001,action.duration-release);if(recovery>=.9)frame=0;else if(recovery>=.7)frame=10;}
 return {...characterMotion({classId:profile.classId,mode:'cast',time:elapsed,reduced}),profileFrame:true,artFrame:reduced?0:frame,y:sample.heroY??0,x:0};
}

export function sampleRoleEffect(action,elapsed,options={}){
 const sample=sampleSkill(action.id,roleEffectTime(action,elapsed),options);
 // Preview clips move a demonstration actor. Live combat owns actor movement;
 // beams, dust and self auras must originate at the real caster, not that preview lunge.
 return {...sample,heroX:-2,heroZ:0,targetX:1.55};
}

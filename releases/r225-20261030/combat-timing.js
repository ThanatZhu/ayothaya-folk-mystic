// Seconds, shared by authority and both avatar renderers. FX may fade after the body recovers.
export const attackDuration=id=>({boxer:.40,rogue:.36,lancer:.66,hunter:.64,swordsman:.60,shaman:.70,acolyte:.78}[id]??.6);
export function basicTiming(classId,interval){
 const period=Math.max(.05,Number.isFinite(interval)?interval:.6),duration=Math.min(attackDuration(classId),period*.9);
 return {duration,impacts:[duration*.42],period};
}
const multiple=new Set(['combo','execute','line','cleave','riposte','slow','break','brand','backstab','retreatShot','cone','chainLine','flock','comboBurst','soulWave','curseWave']);
export function roleTiming(skill,profile){
 const authored=profile?.impacts??[],impacts=authored.length?(multiple.has(skill.type)?[...authored]:[authored[0]]):[skill.windup??.36];
 return {impacts,duration:impacts.at(-1)+.16,effectDuration:profile?.duration??skill.duration??1.2};
}
// A small presentation buffer absorbs the 10 Hz snapshot batching. Every combat event,
// including DOTs and cancellations, is delivered on this same clock, without predicting damage.
export function createCombatPresentation({delay=.12,now=()=>performance.now()/1000}={}){
 let queue=[],serial=0;
 return {push(event,snapshotTime){const age=Number.isFinite(event.at)&&Number.isFinite(snapshotTime)?Math.max(0,snapshotTime-event.at):0;queue.push({event,due:now()+delay-age,serial:serial++});if(queue.length>512)queue.shift();},
  flush(deliver){const t=now(),ready=queue.filter(e=>e.due<=t).sort((a,b)=>a.due-b.due||a.serial-b.serial);queue=queue.filter(e=>e.due>t);for(const q of ready)deliver({...q.event,lag:Math.max(0,t-q.due)});},clear(){queue=[];},get size(){return queue.length;}};
}

// Rendering catches up at low frame rates without advancing movement or offline simulation.
export const presentationDelta=(dt,{hidden=false}={})=>hidden?0:Math.min(.25,Math.max(0,Number.isFinite(dt)?dt:0));

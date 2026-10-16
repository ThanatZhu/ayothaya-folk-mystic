export const MAX_XP=100000000;
const safe=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_XP;
export function experienceOf(saved={}){
 const kills=Number.isFinite(saved.kills)?Math.max(0,Math.floor(saved.kills)):0;
 return {baseXp:safe(saved.baseXp)?saved.baseXp:Math.min(MAX_XP,kills*10),jobXp:safe(saved.jobXp)?saved.jobXp:Math.min(MAX_XP,kills*6)};
}
export function validExperience(saved){
 const present='baseXp' in saved||'jobXp' in saved;
 return !present||(safe(saved.baseXp)&&safe(saved.jobXp));
}
export function baseProgress(saved){
 const total=experienceOf(typeof saved==='number'?{kills:saved}:saved).baseXp;
 const level=Math.min(99,1+Math.floor(total/100)),maxed=level===99,current=maxed?100:total%100;
 return {level,xp:total,current,required:100,next:maxed?0:100-current,percent:maxed?100:current,maxed};
}
export function jobProgress(saved,classId='novice',jobId=''){
 const total=experienceOf(saved).jobXp,cap=classId==='novice'?10:jobId?70:50;
 let current=total,level=1;
 while(level<cap&&current>=40+level*20){current-=40+level*20;level++;}
 const required=40+level*20,maxed=level===cap;
 return {level,cap,xp:total,current:maxed?required:current,required,next:maxed?0:required-current,percent:maxed?100:current/required*100,maxed};
}
// 0.48 death penalty: lose up to 5 base EXP of the current level outside town from Lv.5; never loses a level.
export const DEATH_XP=5;
export function deathPenalty(world){
 if(world.safe)return 0;const p=baseProgress(world);if(p.level<5||p.maxed)return 0;
 const lost=Math.min(DEATH_XP,p.current);world.baseXp=experienceOf(world).baseXp-lost;return lost;
}
export function awardExperience(world,base,job){
 const before=baseProgress(world).level,jobBefore=jobProgress(world,world.profession.id,world.jobId).level;
 const old=experienceOf(world);world.baseXp=Math.min(MAX_XP,old.baseXp+base);world.jobXp=Math.min(MAX_XP,old.jobXp+job);
 return {base,job,baseLevel:baseProgress(world).level,jobLevel:jobProgress(world,world.profession.id,world.jobId).level,baseUp:baseProgress(world).level>before,jobUp:jobProgress(world,world.profession.id,world.jobId).level>jobBefore};
}

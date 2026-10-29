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
// 0.57 growing curve: level L→L+1 needs 50 + 6·(L−1) EXP (Lv.1 50, Lv.24 188). Early levels come quicker
// than the old flat 100 and later ones mean more. Lv.25 = 2,856 total stays above the Firestore
// class threshold (2,400); existing class/job rules need no change.
// 0.223 measured farming target: about 31–44 active hours with level-appropriate gear.
// Levels 1–50 retain their existing pace; later bands pace the first Lv.99 over roughly 4–7 days.
export const LEVEL_BANDS=[[50,1],[70,100],[99,400]];
const baseNeed=l=>50+6*(l-1);
export const levelNeed=l=>baseNeed(l)*LEVEL_BANDS.find(([top])=>l+1<=top)[1];
const START=[0,0];for(let l=1;l<99;l++)START[l+1]=START[l]+levelNeed(l);
export const XP_CURVE=3;
export const FARM_TARGET={hoursPerDay:[6,8],capDays:[4,7],activeHours:[24,56],nearEndgameDays:30};
const starts=bands=>{const out=[0,0];for(let l=1;l<99;l++)out[l+1]=out[l]+baseNeed(l)*bands.find(([top])=>l+1<=top)[1];return out;};
const PREVIOUS={1:starts([[99,1]]),2:starts([[50,1],[70,5],[99,15]])};
// Preserve earned level and fractional progress; never re-award level gifts or refill resources.
export function migrateXp(total,fromCurve=1){
 if(!safe(total))return 0;if(fromCurve>=XP_CURVE)return total;
 const source=PREVIOUS[fromCurve]??PREVIOUS[1];
 if(total>=source[99])return Math.min(MAX_XP,START[99]+total-source[99]);
 let l=1;while(l<99&&total>=source[l+1])l++;
 return Math.min(MAX_XP,START[l]+Math.floor((total-source[l])/(source[l+1]-source[l])*levelNeed(l)));
}
export function baseProgress(saved){
 const live=saved?.serverBaseProgress;if(live&&Number.isInteger(live.level)&&live.level>=1&&live.level<=99&&Number.isSafeInteger(live.required)&&live.required>0&&Number.isSafeInteger(live.current)&&live.current>=0&&live.current<=live.required){const maxed=live.level===99;return{level:live.level,xp:experienceOf(saved).baseXp,current:live.current,required:live.required,next:maxed?0:live.required-live.current,percent:maxed?100:live.current/live.required*100,maxed};}
 const total=experienceOf(typeof saved==='number'?{kills:saved}:saved).baseXp;
 let level=1;while(level<99&&total>=START[level+1])level++;
 const maxed=level===99,required=maxed?levelNeed(98):levelNeed(level),current=maxed?required:total-START[level];
 return {level,xp:total,current,required,next:maxed?0:required-current,percent:maxed?100:current/required*100,maxed};
}
export const levelStart=l=>START[Math.max(1,Math.min(99,l))];
// 0.119 Master Job caps at 30 so its points match the Master skills exactly (docs/skills-rework-proposal.md);
// each future Master skill raises it by 5.
export const NOVICE_JOB_CAP=10,JOB_CAP=40,MASTER_JOB_CAP=30;
export function jobProgress(saved,classId='novice',jobId=''){
 // 0.73 owner rule: Base Lv.99; Job Lv.10 as ผู้ฝึกตน, Job Lv.40 for a class and for its master job (RO style).
 const total=experienceOf(saved).jobXp,cap=classId==='novice'?NOVICE_JOB_CAP:jobId?MASTER_JOB_CAP:JOB_CAP;
 let current=total,level=1;
 while(level<cap&&current>=40+level*20){current-=40+level*20;level++;}
 const required=40+level*20,maxed=level===cap;
 return {level,cap,xp:total,current:maxed?required:current,required,next:maxed?0:required-current,percent:maxed?100:current/required*100,maxed};
}
// 0.48 death penalty: lose up to 5 base EXP of the current level outside town from Lv.5; never loses a level.
export const DEATH_XP=5;
// 0.64 level milestones: something new every 2-3 base levels (granted once, base level never drops).
export const LEVEL_GIFTS={
 3:{text:'ปลดล็อกค่าหัวประจำวัน · คุยกับขุนอินทร์ในเมือง',coins:200,items:[{id:'hp-small',count:5}]},
 5:{text:'ได้ธูปกลับเมือง · กลับเมืองได้ทุกที่',coins:250,items:[{id:'return-incense',count:3}]},
 8:{text:'สวนหมากคลองเก่าเหมาะกับเลเวลนี้แล้ว',coins:300,items:[{id:'mp-small',count:5}]},
 10:{text:'ลองล่าหัวหน้าฝูง · ดรอปมากกว่า 3 เท่า',coins:400,items:[{id:'sticky-rice',count:5}]},
 12:{text:'จ้างทหารรับจ้างกับครูแสนดาบได้คุ้มแล้ว',coins:600,items:[{id:'hp-small',count:10}]},
 15:{text:'โรงสีใต้เงาจันทร์รออยู่ · ชวนเพื่อนตั้งปาร์ตี้',coins:800,items:[{id:'mp-large',count:3}]},
 18:{text:'ล่า MVP ราชาหุ่นฟางเพลิงกับเพื่อน',coins:1000,items:[{id:'hp-large',count:5}]},
 20:{text:'ดันเจี้ยนใต้ถุนโรงสีเปิดให้ปาร์ตี้แล้ว',coins:1200,items:[{id:'return-incense',count:5}]},
 23:{text:'Job 10 ตันแล้วไปเปลี่ยนอาชีพที่ลานครูได้',coins:1500,items:[{id:'mp-large',count:5}]},
 25:{text:'บึงบัวต้องมนตร์เปิดรับแล้ว',coins:2500,items:[{id:'hp-large',count:10}]},
};
export const levelGifts=(from,to)=>Object.entries(LEVEL_GIFTS).filter(([l])=>+l>from&&+l<=to).map(([l,g])=>({level:+l,...g}));
export function deathPenalty(world){
 if(world.safe)return 0;const p=baseProgress(world);if(p.level<5||p.maxed)return 0;
 const lost=Math.min(DEATH_XP,p.current);world.baseXp=experienceOf(world).baseXp-lost;return lost;
}
export function awardExperience(world,base,job){
 const before=baseProgress(world).level,jobBefore=jobProgress(world,world.profession.id,world.jobId).level;
 const old=experienceOf(world);world.baseXp=Math.min(MAX_XP,old.baseXp+base);world.jobXp=Math.min(MAX_XP,old.jobXp+job);
 return {base,job,baseFrom:before,baseLevel:baseProgress(world).level,jobLevel:jobProgress(world,world.profession.id,world.jobId).level,baseUp:baseProgress(world).level>before,jobUp:jobProgress(world,world.profession.id,world.jobId).level>jobBefore};
}

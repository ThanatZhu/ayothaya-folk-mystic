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
// 0.57 growing curve: level L→L+1 needs 50 + 6·(L−1) EXP (Lv.1 50, Lv.24 188, Lv.98 632). Early levels come quicker
// than the old flat 100 and later ones mean more. Lv.25 = 2,856 and Lv.60 = 13,216 total stay above the Firestore
// class/job thresholds (2,400 / 5,900), so the rules need no change.
export const levelNeed=l=>50+6*(l-1);
const START=[0,0];for(let l=1;l<99;l++)START[l+1]=START[l]+levelNeed(l); // START[l] = total EXP at the start of level l
export function baseProgress(saved){
 const total=experienceOf(typeof saved==='number'?{kills:saved}:saved).baseXp;
 let level=1;while(level<99&&total>=START[level+1])level++;
 const maxed=level===99,required=maxed?levelNeed(98):levelNeed(level),current=maxed?required:total-START[level];
 return {level,xp:total,current,required,next:maxed?0:required-current,percent:maxed?100:current/required*100,maxed};
}
export const levelStart=l=>START[Math.max(1,Math.min(99,l))];
export function jobProgress(saved,classId='novice',jobId=''){
 const total=experienceOf(saved).jobXp,cap=classId==='novice'?10:jobId?70:50;
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
 23:{text:'อีกนิดเดียวจะเปลี่ยนอาชีพ',coins:1500,items:[{id:'mp-large',count:5}]},
 25:{text:'เปลี่ยนอาชีพที่ลานครู · บึงบัวต้องมนตร์เปิดรับแล้ว',coins:2500,items:[{id:'hp-large',count:10}]},
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

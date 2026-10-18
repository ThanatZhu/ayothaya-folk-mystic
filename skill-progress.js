// Skill levels 1-10 and skill points (docs/LIVE-SERVICE.md section 1). Pure functions shared by the
// browser and the authoritative realm server; the server is the only writer for Google accounts.
import {jobProgress} from './experience.js?v=64';
export const SKILL_MAX=10;
// Levels 5 and 10 need a skill trial / final scroll quest (step L3). Until quests exist, upgrades stop at 4.
export const OPEN_MAX=4;
const SLOTS=10;
const clampLevel=v=>Number.isInteger(v)&&v>=0&&v<=SKILL_MAX?v:1;

// One skill point per Job Level gained, carried across class changes:
// Novice Job 1-10 = 9, class Job 1-50 = 49 more, Master Job 1-70 = 69 more.
export function earnedPoints({classId='novice',jobId='',jobXp=0}={}){
 const level=jobProgress({jobXp},classId,jobId).level-1;
 if(classId==='novice')return level;
 return 9+(jobId?49:0)+level;
}
// Missing data (characters made before 0.31) is grandfathered: every skill of the current class at level 1.
export function normalizeSkills(raw,classId){
 const out={};
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [id,levels] of Object.entries(raw)){
  if(typeof id==='string'&&id.length<=24&&Array.isArray(levels)&&levels.length===SLOTS)out[id]=levels.map(clampLevel);
 }
 if(!out[classId])out[classId]=Array(SLOTS).fill(1);
 return out;
}
// Learning a skill (level 1) comes from its quest; points pay only for levels 2-10.
export function spentPoints(skills){
 return Object.values(skills).reduce((sum,levels)=>sum+levels.reduce((s,l)=>s+Math.max(0,l-1),0),0);
}
export function availablePoints(skills,progress){return earnedPoints(progress)-spentPoints(skills);}
export function upgradeSkill(skills,classId,index,progress,cap=OPEN_MAX){
 if(!Number.isInteger(index)||index<0||index>=SLOTS)throw new Error('invalid-skill');
 const levels=skills[classId];if(!levels)throw new Error('invalid-skill');
 const level=levels[index];
 if(level<1)throw new Error('skill-not-learned');
 if(level>=SKILL_MAX)throw new Error('skill-max');
 if(level>=cap)throw new Error('skill-trial-required');
 if(availablePoints(skills,progress)<1)throw new Error('no-skill-points');
 return {...skills,[classId]:levels.map((l,i)=>i===index?l+1:l)};
}
// Effect of a level on a skill definition. Level 1 returns the original numbers unchanged.
export function scaledSkill(base,level){
 if(!base||!level)return null;
 if(level===1)return base;
 const power=1+.08*(level-1)+(level>=10?.15:0),s={...base};
 if(s.damage)s.damage=Math.round(s.damage*power);
 if(s.heal)s.heal=Math.round(s.heal*power);
 if(s.duration)s.duration=Math.round(s.duration*(1+.04*(level-1))*10)/10;
 if(s.radius&&level>=5)s.radius=s.radius*1.25;
 if(s.cd)s.cd=Math.round(s.cd*(level>=10?.85:level>=7?.95:1)*100)/100;
 return s;
}
export function nextLevelText(level){
 if(level<1)return 'เรียนจากเควสต์เรียนวิชา';
 if(level>=SKILL_MAX)return 'ขั้นสูงสุดแล้ว';
 if(level+1===5)return 'ขั้น 5: ระยะกว้างขึ้น · ต้องผ่านบททดสอบวิชา';
 if(level+1===7)return 'ขั้น 7: พลัง +8% · คูลดาวน์ −5%';
 if(level+1===10)return 'ขั้น 10: พลังพิเศษ +15% · คูลดาวน์ −15% · ต้องใช้คัมภีร์';
 return 'ขั้น '+(level+1)+': พลัง +8%';
}

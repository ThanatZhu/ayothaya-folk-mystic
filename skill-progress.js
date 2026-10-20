// Skill levels 1-10 and skill points (docs/LIVE-SERVICE.md section 1). Pure functions shared by the
// browser and the authoritative realm server; the server is the only writer for Google accounts.
import {jobProgress} from './experience.js?v=105.3';
export const SKILL_MAX=10;
// 0.101 owner: every skill levels to 10 with points (the planned trial quests for 5 and 10 were never built and
// held every skill at 4). Slots 10-14 are the Master skills: each opens when its MASTER_FROM skill reaches 10.
export const BASE_SLOTS=10;
export const MASTER_FROM=[0,1,4,6,9]; // strike, area, recover, heavy strike, ultimate
export const SLOTS=BASE_SLOTS+MASTER_FROM.length;
export const isMaster=slot=>slot>=BASE_SLOTS;
export const HOTBAR_KEYS=['1','2','3','4','5','6','7','8','9','0','A1','A2','A3','A4','A5']; // A = Alt
// 0.84 skill tree (owner): every path shares one shape because slot roles match in all eight classes
// (0 strike, 1 area, 2 bind, 3 push, 4 recover, 5 guard, 6 heavy strike, 7 dash, 8 focus, 9 ultimate).
// A new path knows its strike and recover skills; the rest open when the listed skills reach the listed level.
// Learning an opened skill is free; levels 2-4 cost one point each. Saves from before 0.84 keep every skill.
export const SKILL_TREE=[
 {slot:0,tier:0,req:[]},{slot:4,tier:0,req:[]},
 {slot:1,tier:1,req:[[0,2]]},{slot:2,tier:1,req:[[0,2]]},{slot:5,tier:1,req:[[4,2]]},
 {slot:3,tier:2,req:[[1,2]]},{slot:6,tier:2,req:[[0,3],[2,1]]},{slot:8,tier:2,req:[[4,3],[5,1]]},
 {slot:7,tier:3,req:[[3,1]]},{slot:9,tier:3,req:[[6,3],[8,2]]},
 ...MASTER_FROM.map((from,i)=>({slot:BASE_SLOTS+i,tier:'master',req:[[from,SKILL_MAX]]})),
];
export const START_LEVELS=[1,0,0,0,1,0,0,0,0,0,0,0,0,0,0];
export const requirements=slot=>SKILL_TREE.find(n=>n.slot===slot)?.req??[];
export const skillOpen=(levels,slot)=>requirements(slot).every(([s,l])=>(levels?.[s]??0)>=l);
const clampLevel=v=>Number.isInteger(v)&&v>=0&&v<=SKILL_MAX?v:1;

// One skill point per Job Level gained, carried across class changes:
// Novice Job 1-10 = 9, class Job 1-40 = 39 more, Master Job 1-40 = 39 more (0.73 caps).
export function earnedPoints({classId='novice',jobId='',jobXp=0}={}){
 const level=jobProgress({jobXp},classId,jobId).level-1;
 if(classId==='novice')return level;
 return 9+(jobId?39:0)+level;
}
// 0.87 owner: every character, old or new, climbs the tree from the start. Skill data saved before the tree has no
// TREE_MARK, so on its next load each path goes back to START_LEVELS once (every spent point returns, since spending
// counts levels above 1). The mark is a ten-zero array, so it costs no points and passes the save checks.
export const TREE_MARK='_tree84';
export function normalizeSkills(raw,classId){
 const out={},marked=Array.isArray(raw?.[TREE_MARK]);
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [id,levels] of Object.entries(raw)){
  if(id===TREE_MARK)continue;
  // Saves from before 0.101 hold ten levels: their Master slots start unlearned.
  if(typeof id==='string'&&id.length<=24&&Array.isArray(levels)&&(levels.length===SLOTS||levels.length===BASE_SLOTS))out[id]=marked?[...levels.map(clampLevel),...START_LEVELS.slice(levels.length)]:[...START_LEVELS];
 }
 if(!out[classId])out[classId]=[...START_LEVELS];
 out[TREE_MARK]=Array(SLOTS).fill(0);
 return out;
}
// Learning a skill (level 1) comes from its quest; points pay only for levels 2-10.
export function spentPoints(skills){
 return Object.values(skills).reduce((sum,levels)=>sum+levels.reduce((s,l)=>s+Math.max(0,l-1),0),0);
}
export function availablePoints(skills,progress){return earnedPoints(progress)-spentPoints(skills);}
export function upgradeSkill(skills,classId,index,progress){
 if(!Number.isInteger(index)||index<0||index>=SLOTS)throw new Error('invalid-skill');
 const levels=skills[classId];if(!levels)throw new Error('invalid-skill');
 const level=levels[index];
 if(level<1){if(!skillOpen(levels,index))throw new Error('skill-locked');return {...skills,[classId]:levels.map((l,i)=>i===index?1:l)};}
 if(level>=SKILL_MAX)throw new Error('skill-max');
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
export function nextLevelText(level,slot){
 if(level<1)return 'เรียนจากเควสต์เรียนวิชา';
 if(level>=SKILL_MAX)return 'ขั้นสูงสุดแล้ว';
 if(level+1===5)return 'ขั้น 5: ระยะกว้างขึ้น';
 if(level+1===7)return 'ขั้น 7: พลัง +8% · คูลดาวน์ −5%';
 if(level+1===10)return 'ขั้น 10: พลังพิเศษ +15% · คูลดาวน์ −15%'+(MASTER_FROM.includes(slot)?' · ปลดล็อกสกิล Master':'');
 return 'ขั้น '+(level+1)+': พลัง +8%';
}

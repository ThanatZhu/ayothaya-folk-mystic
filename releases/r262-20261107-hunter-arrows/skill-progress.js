// Skill levels 1-10 and skill points (docs/LIVE-SERVICE.md section 1). Pure functions shared by the
// browser and the authoritative realm server; the server is the only writer for Google accounts.
import {jobProgress} from './experience.js?v=105.3';
// 0.119 class skills level 1-5 (passives 1-3, role-skill-progress.js); the Novice keeps its four ranks.
export const SKILL_MAX=5;
// Three basics at four ranks use exactly the nine points earned before Novice Job 10.
export const NOVICE_SLOTS=Object.freeze([0,4,5]),NOVICE_MAX=4;
export const skillMax=classId=>classId==='novice'?NOVICE_MAX:SKILL_MAX;
export const skillAllowed=(classId,slot)=>classId!=='novice'||NOVICE_SLOTS.includes(slot);
// 0.101 owner: every skill levels to 10 with points (the planned trial quests for 5 and 10 were never built and
// held every skill at 4). Slots 10-14 are the Master skills: each opens when its MASTER_FROM skill reaches 10.
export const BASE_SLOTS=10;
export const MASTER_FROM=[0,1,4,6,9]; // strike, area, recover, heavy strike, ultimate
// 0.119: 17 slots per class (role-skill-progress.js layout); MASTER_FROM only serves the legacy Novice path.
export const SLOTS=17;
export const isMaster=slot=>slot>=BASE_SLOTS;
export const HOTBAR_KEYS=['1','2','3','4','5','6','7','8','9','0','A1','A2','A3','A4','A5','A6','A7']; // A = Alt
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
export const START_LEVELS=[1,0,0,0,1,...Array(SLOTS-5).fill(0)];
// 0.119 class skills start unlearned (each level costs a point); only the Novice starts with its two basics.
export const startLevels=classId=>classId==='novice'?[...START_LEVELS]:Array(SLOTS).fill(0);
export const requirements=(slot,classId)=>classId==='novice'?(slot===5?[[4,2]]:[]):SKILL_TREE.find(n=>n.slot===slot)?.req??[];
export const skillOpen=(levels,slot,classId)=>skillAllowed(classId,slot)&&requirements(slot,classId).every(([s,l])=>(levels?.[s]??0)>=l);
const clampLevel=v=>Number.isInteger(v)&&v>=0&&v<=SKILL_MAX?v:1;

// One skill point per Job Level gained, carried across class changes:
// Novice Job 1-10 = 9, class Job 1-40 = 39 more, Master Job 1-30 = 29 more (0.119 Master cap).
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
  if(typeof id==='string'&&id.length<=24&&Array.isArray(levels)&&(levels.length===SLOTS||levels.length===15||levels.length===BASE_SLOTS))out[id]=marked?[...levels.map(clampLevel),...startLevels(id).slice(levels.length)]:startLevels(id);
 }
 if(!out[classId])out[classId]=startLevels(classId);
 // Retired Novice allocations return to the point pool; other paths keep their ranks.
 if(out.novice)out.novice=out.novice.map((level,i)=>NOVICE_SLOTS.includes(i)?Math.min(NOVICE_MAX,level):0);
 out[TREE_MARK]=Array(SLOTS).fill(0);
 return out;
}
// Novice: learning (level 1) is free and points pay for ranks 2-4. 0.119 class skills: every level costs a point.
export function spentPoints(skills){
 return Object.entries(skills).reduce((sum,[id,levels])=>sum+levels.reduce((s,l)=>s+(id==='novice'?Math.max(0,l-1):Math.max(0,l)),0),0);
}
export function availablePoints(skills,progress){return earnedPoints(progress)-spentPoints(skills);}
export function upgradeSkill(skills,classId,index,progress){
 if(!Number.isInteger(index)||index<0||index>=SLOTS)throw new Error('invalid-skill');
 const levels=skills[classId];if(!levels)throw new Error('invalid-skill');
 if(!skillAllowed(classId,index))throw new Error('skill-locked');
 const level=levels[index];
 if(level<1){if(!skillOpen(levels,index,classId))throw new Error('skill-locked');return {...skills,[classId]:levels.map((l,i)=>i===index?1:l)};}
 if(level>=skillMax(classId))throw new Error('skill-max');
 if(availablePoints(skills,progress)<1)throw new Error('no-skill-points');
 return {...skills,[classId]:levels.map((l,i)=>i===index?l+1:l)};
}
// Effect of a level on a skill definition. Level 1 returns the original numbers unchanged.
export function scaledSkill(base,level){
 if(!base||!level)return null;
 if(level===1)return base;
 // 0.119 five levels: 100/115/130/145/170% power, cooldown -10% from level 3, area +15% at level 5
 const power=[1,1,1.15,1.3,1.45,1.7][Math.min(5,level)],s={...base};
 if(s.roleSkillId&&Number.isFinite(s.power)&&!['sanctuary','yantra','link','reflect','lastStand','revive','greatRevive'].includes(s.type))s.power=Math.round(s.power*power);
 if(s.damage)s.damage=Math.round(s.damage*power);
 if(s.heal)s.heal=Math.round(s.heal*power);
 if(s.duration)s.duration=Math.round(s.duration*(1+.04*(level-1))*10)/10;
 if(s.radius&&level>=5)s.radius=s.radius*1.15;
 if(s.cd)s.cd=Math.round(s.cd*(level>=3?.9:1)*100)/100;
 return s;
}
export function nextLevelText(level,slot,classId){
 if(classId==='novice')return level>=NOVICE_MAX?'ขั้นสูงสุดของผู้ฝึกตนแล้ว':level<1?'เรียนฟรีเมื่อเงื่อนไขครบ':'ขั้น '+(level+1)+': พลังเพิ่มขึ้น';
 if(level>=SKILL_MAX)return 'ขั้นสูงสุดแล้ว';
 return ['ใช้ 1 แต้มเพื่อเรียน','ขั้น 2: พลัง 115%','ขั้น 3: พลัง 130% · คูลดาวน์ −10%','ขั้น 4: พลัง 145%','ขั้น 5: พลัง 170% · วงกว้างขึ้น 15%'][level];
}

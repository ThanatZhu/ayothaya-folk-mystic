import {roleById} from './assets/skills-next/catalog.js';
import {normalizeSkills,availablePoints,SKILL_MAX,SLOTS} from './skill-progress.js?v=skills119';
import {jobProgress} from './experience.js?v=105.3';
// 0.119 save layout (17 numbers per class): 0-5 class actives (5 = ultimate), 6-8 class passives, 9 unused,
// 10-13 Master branch actives (13 = branch ultimate), 14-16 Master branch passives. The chosen branch is jobId.
export const ROLE_SCHEMA=1,ROLE_MARK='_roles119',ROLE_START=Array(SLOTS).fill(0);
export const PASSIVE_SLOTS=[6,7,8],MASTER_SLOTS=[10,11,12,13],MASTER_PASSIVE_SLOTS=[14,15,16],PASSIVE_MAX=3;
export const isPassiveSlot=slot=>PASSIVE_SLOTS.includes(slot)||MASTER_PASSIVE_SLOTS.includes(slot);
// No prerequisite chains any more: a skill opens at its Job level (catalog `job`).
export const ROLE_TREE=[];
export const roleRequirements=()=>[];
export function roleSkillAt(classId,slot,jobId=''){
 const role=roleById(classId);if(!role)return null;const branch=role.branches.find(b=>b.id===jobId);
 if(slot<6)return role.base[slot]??null;
 if(PASSIVE_SLOTS.includes(slot))return role.passives[slot-6]??null;
 if(MASTER_SLOTS.includes(slot))return branch?.active[slot-10]??null;
 if(MASTER_PASSIVE_SLOTS.includes(slot))return branch?.passives[slot-14]??null;
 return null;
}
// jobLevel is the Job level of the current stage: class Job before Master, Master Job after it (class skills are
// all open by then, the class Job having maxed).
export function skillOpenAt(classId,slot,jobId='',jobLevel=Infinity){
 const skill=roleSkillAt(classId,slot,jobId);if(!skill)return false;
 if(slot>=10)return !!jobId&&jobLevel>=skill.job;
 return !!jobId||jobLevel>=skill.job;
}
export const roleSkillMax=slot=>isPassiveSlot(slot)?PASSIVE_MAX:SKILL_MAX;
// Saves without ROLE_MARK go back to zero once: every point returns (each level costs one).
export function normalizeRoleSkills(raw,classId){
 const out=normalizeSkills(raw,classId);
 if(!Array.isArray(raw?.[ROLE_MARK]))for(const id of Object.keys(out))if(roleById(id))out[id]=[...ROLE_START];
 for(const id of Object.keys(out))if(roleById(id))out[id]=out[id].map((n,i)=>Math.min(n,roleSkillMax(i)));
 out[ROLE_MARK]=Array(SLOTS).fill(0);return out;
}
export function upgradeRoleSkill(skills,classId,index,progress){
 if(!roleById(classId))return null;
 const levels=skills[classId];if(!levels||!Number.isInteger(index))throw new Error('invalid-skill');
 const jobLevel=jobProgress({jobXp:progress.jobXp??0},classId,progress.jobId??'').level;
 if(!skillOpenAt(classId,index,progress.jobId??'',jobLevel))throw new Error('skill-locked');
 const value=levels[index]??0;if(value>=roleSkillMax(index))throw new Error('skill-max');
 if(availablePoints(skills,progress)<1)throw new Error('no-skill-points');
 return {...skills,[classId]:levels.map((n,i)=>i===index?n+1:n)};
}
export function liveRoleSkills(classId,jobId=''){
 const role=roleById(classId);if(!role)return null;
 return Array.from({length:SLOTS},(_,index)=>{
  const s=roleSkillAt(classId,index,jobId);
  if(!s)return {name:index>=10?'เลือกสาย Master เพื่อปลดล็อก':'ช่องสำรอง',short:'—',key:'',icon:'',cost:0,cd:0,type:'reserved',reserved:true};
  return {...s,roleSkillId:s.id,icon:s.passive?'◆':'✦',key:index<10?String((index+1)%10):'Alt+'+(index-9),short:s.name,cost:s.mp??0,type:s.kind??'passive',color:role.color,master:index>=10,passive:!!s.passive};
 });
}

import {roleById} from './assets/skills-next/catalog.js';
import {normalizeSkills,availablePoints,SKILL_MAX} from './skill-progress.js?v=role116';
export const ROLE_SCHEMA=1,ROLE_MARK='_roles116',ROLE_START=[1,0,0,0,1,0,0,0,0,0,0,0,0,0,0];
export const ROLE_TREE=[{slot:0,req:[]},{slot:4,req:[]},{slot:1,req:[[0,2]]},{slot:2,req:[[0,2]]},{slot:5,req:[[4,2]]},{slot:3,req:[[1,2]]},{slot:10,req:[[0,10]]},{slot:11,req:[[1,10]]},{slot:12,req:[[4,10]]},{slot:13,req:[[0,10]]},{slot:14,req:[[4,10]]}];
export const roleRequirements=slot=>ROLE_TREE.find(n=>n.slot===slot)?.req??[];
export function roleSkillOpen(levels,slot,jobId=''){return ROLE_TREE.some(n=>n.slot===slot)&&(slot<10||!!jobId)&&roleRequirements(slot).every(([i,n])=>(levels[i]??0)>=n);}
// The existing save shape remains 15 numeric levels. A zero-valued marker costs no points.
// The server retains pre-release allocations in roleSkillBackup while refunding their spent points.
export function normalizeRoleSkills(raw,classId){
 const out=normalizeSkills(raw,classId);
 if(!Array.isArray(raw?.[ROLE_MARK]))for(const id of Object.keys(out))if(roleById(id))out[id]=[...ROLE_START];
 out[ROLE_MARK]=Array(15).fill(0);return out;
}
export function upgradeRoleSkill(skills,classId,index,progress){
 if(!roleById(classId))return null;
 const levels=skills[classId];if(!levels||!roleSkillOpen(levels,index,progress.jobId))throw new Error('skill-locked');
 const value=levels[index]??0,max=index>=13?1:SKILL_MAX;if(value>=max)throw new Error('skill-max');
 if(value>0&&availablePoints(skills,progress)<1)throw new Error('no-skill-points');
 return {...skills,[classId]:levels.map((n,i)=>i===index?n+1:n)};
}
export function liveRoleSkills(classId,jobId=''){
 const role=roleById(classId);if(!role)return null;const branch=role.branches.find(b=>b.id===jobId);
 const at=[...role.base,null,null,null,null,...(branch?.active??[null,null,null]),...(branch?.passives??[null,null])];
 return at.map((s,index)=>s?{...s,roleSkillId:s.id,roleIcon:s.icon,icon:s.passive?'◆':'✦',key:index<10?String((index+1)%10):'Alt+'+(index-9),short:s.name,cost:s.mp??0,type:s.kind??'passive',color:role.color,master:index>=10,passive:!!s.passive}:{name:index>=10?'เลือกสาย Master เพื่อปลดล็อก':'ช่องสำรอง',short:'—',key:String(index+1),icon:'',cost:0,cd:0,type:'reserved',reserved:true});
}

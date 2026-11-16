import {baseProgress,jobProgress} from './experience.js?v=105.3';
export const JOBS={
 novice:[],
 swordsman:[{id:'guardian',name:'ขุนดาบพิทักษ์',style:'ป้องกัน',damage:1.12,shield:1.5},{id:'duelist',name:'ขุนดาบทะลวง',style:'โจมตี',damage:1.3,delay:.9}],
 lancer:[{id:'vanguard',name:'ขุนทวนหลวง',style:'คุมระยะ',damage:1.2,range:.5},{id:'war-lancer',name:'ทวนศึก',style:'โจมตี',damage:1.35}],
 hunter:[{id:'ranger',name:'พรานไพร',style:'ยิงเร็ว',damage:1.1,delay:.8},{id:'spirit-hunter',name:'พรานอาคม',style:'ยิงไกล',damage:1.25,range:1}],
 boxer:[{id:'master-boxer',name:'ครูมวย',style:'หมัดต่อเนื่อง',damage:1.12,delay:.78},{id:'iron-boxer',name:'มวยคงกระพัน',style:'ตั้งรับ',damage:1.2,shield:1.6}],
 rogue:[{id:'shadow',name:'โจรเงา',style:'คล่องตัว',damage:1.15,speed:.5},{id:'assassin',name:'มือมีดอาคม',style:'โจมตี',damage:1.35}],
 shaman:[{id:'spirit-master',name:'จ้าววิญญาณ',style:'มนตรารุนแรง',damage:1.3},{id:'yantra-master',name:'อาจารย์อาคม',style:'ยันต์คุ้มครอง',damage:1.1,shield:1.7}],
 acolyte:[{id:'healer',name:'ผู้บำเพ็ญเมตตา',style:'ฟื้นฟู',damage:1.1,heal:1.6},{id:'warder',name:'ผู้พิทักษ์ธรรม',style:'คุ้มครอง',damage:1.2,shield:1.7}]
};
// 0.73: advancing needs a maxed Job level (ผู้ฝึกตน Job 10 → a class; class Job 40 → master job).
// 0.99.10 owner rule: a maxed Job is enough, no Base-level floor. Online the realm server writes the class change with
// admin rights; the old floors (Base Lv.23 / 39) remain only in firestore.rules for direct client writes.
export const CLASS_LEVEL=23;
export const JOB_LEVEL=39;
export const jobMaxed=(saved,classId,jobId='')=>jobProgress(saved,classId,jobId).maxed;
export function advanceReady(saved,classId,jobId=''){const tier=classId==='novice'?'class':'master',base=baseProgress(saved).level,min=tier==='class'?CLASS_LEVEL:JOB_LEVEL,job=jobProgress(saved,classId,jobId);return {tier,ok:job.maxed,job,base,min};}
export const progression=(saved=0)=>baseProgress(saved);
export function jobFor(classId,jobId){if(!jobId)return null;const j=JOBS[classId]?.find(j=>j.id===jobId);if(!j)throw new Error('invalid-job');return j;}
export function validateJob(classId,jobId,kills){const j=jobFor(classId,jobId);if(j&&!advanceReady(kills,classId,'').ok)throw new Error('job-locked');return j;}
export function advanceStats(base,jobId){const j=jobFor(base.id,jobId);return !j?base:{...base,damage:Math.round(base.damage*j.damage),delay:base.delay*(j.delay??1),range:base.range+(j.range??0),speed:base.speed+(j.speed??0)};}
export function advanceSkills(skills,classId,jobId){const j=jobFor(classId,jobId);if(!j)return skills;return skills.map(s=>({...s,...(s.damage?{damage:Math.round(s.damage*j.damage)}:{}),...(s.type==='heal'?{heal:Math.round((s.heal??48)*(j.heal??1))}:{}),...(s.type==='shield'?{duration:(s.duration??8)*(j.shield??1)}:{})}));}

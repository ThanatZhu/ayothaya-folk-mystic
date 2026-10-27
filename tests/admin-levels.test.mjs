import test from 'node:test';import assert from 'node:assert/strict';
import {raiseCharacterLevels,characterLevels} from '../admin-levels.js';
import {initialSave} from '../realm-state.js';
import {jobProgress,levelStart,XP_CURVE} from '../experience.js';
import {normalizeSkills,availablePoints} from '../skill-progress.js';
import {deriveStats,statPoints,normalizeStats} from '../character-stats.js';
import {inboxSummary} from '../mailbox.js';
const record=(classId='novice',jobId='')=>({character:{name:'Tester',classId,jobId,gender:'male'},state:initialSave(),xpCurve:XP_CURVE,bag:{coins:0,items:{}},mailbox:{messages:[]}});
test('admin raises real EXP to Base/Job targets, keeps gear/quests and grants normal points plus milestone mail once',()=>{
 const r=record();r.story={chapter:3};r.stats=normalizeStats();r.state.traveler.baseXp=20;const original=structuredClone(r);
 const a=raiseCharacterLevels(r,{baseLevel:20,jobLevel:10});assert.deepEqual(r,original);assert.equal(a.record.state.traveler.baseXp,levelStart(20));assert.equal(a.after.level,20);assert.equal(a.after.jobLevel,10);assert.equal(a.after.jobCap,10);assert.deepEqual(a.record.story,r.story);assert.deepEqual(a.record.bag,r.bag);
 assert.equal(availablePoints(normalizeSkills(null,'novice'),{classId:'novice',jobXp:a.record.state.traveler.jobXp}),9);assert.ok(statPoints(r.stats,20)>statPoints(r.stats,1));assert.ok(deriveStats({level:20,classId:'novice'}).maxHp>deriveStats({level:1,classId:'novice'}).maxHp);
 assert.equal(inboxSummary(a.record.mailbox,[],'server-1').total,1);const again=raiseCharacterLevels(a.record,{baseLevel:20,jobLevel:10});assert.equal(again.changed,false);assert.deepEqual(again.record,a.record);
 const stale=raiseCharacterLevels(a.record,{baseLevel:2,jobLevel:2});assert.equal(stale.changed,false);assert.deepEqual(stale.record,a.record);
});
test('job caps follow Novice, normal and Master stages and invalid requests never mutate the save',()=>{
 for(const [classId,jobId,cap]of [['novice','',10],['swordsman','',40],['swordsman','guardian',30]]){
  const r=record(classId,jobId),a=raiseCharacterLevels(r,{jobLevel:cap});assert.equal(characterLevels(a.record).jobLevel,cap);assert.equal(jobProgress(a.record.state.traveler,classId,jobId).maxed,true);
  for(const bad of [{jobLevel:cap+1},{baseLevel:100},{baseLevel:2.1},{jobLevel:'2'},{}, {baseLevel:0}])assert.throws(()=>raiseCharacterLevels(r,bad),/bad-level/);
  assert.equal(characterLevels(r).level,1);assert.equal(characterLevels(r).jobLevel,1);
 }
});

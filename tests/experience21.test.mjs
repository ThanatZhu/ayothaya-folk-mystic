import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CombatWorld,MONSTER_TYPES,earlyXp} from '../combat-core.js';
import {baseProgress,jobProgress,experienceOf,MAX_XP,levelStart} from '../experience.js';
import {serializeTraveler,restoreTraveler} from '../world-state.js';
import {validateSave} from '../save-state.js';
import {initialSave} from '../realm-state.js';
import {createRealmStore} from '../realm-store.js';
import {CLASSES,NOVICE} from '../classes.js';
import {skillAtlas} from '../skill-art.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('defeats award independent base/job rewards exactly once, including multi-level carry and save reload',()=>{
 const w=new CombatWorld({classId:'novice'});w.baseXp=45;w.jobXp=58;const mob=w.mobs[0],reward=MONSTER_TYPES[mob.type];
 w.hurt(mob,999);w.hurt(mob,999);assert.equal(w.kills,1);assert.equal(w.baseXp,45+Math.round(reward.baseXp*earlyXp(reward.level)));assert.equal(w.jobXp,58+Math.round(reward.jobXp*earlyXp(reward.level)));
 assert.equal(baseProgress(w).level,2);assert.equal(jobProgress(w,'novice').level,2);
 assert.equal(w.events.filter(e=>e.type==='experience').length,1);
 const loaded=new CombatWorld({classId:'novice'});restoreTraveler(loaded,JSON.parse(JSON.stringify(serializeTraveler(w))));assert.equal(loaded.baseXp,w.baseXp);assert.equal(loaded.jobXp,w.jobXp);
 assert.equal(baseProgress({baseXp:355,jobXp:0}).current,355-levelStart(6));assert.equal(jobProgress({baseXp:0,jobXp:145},'novice').level,3);
});
test('legacy kills preserve Base Level and migrate job XP; caps and corrupt XP are explicit',()=>{
 assert.deepEqual(experienceOf({kills:260}),{baseXp:2600,jobXp:1560});assert.equal(baseProgress({kills:260}).level,23); // 2,600 EXP on the 0.57 curve
 assert.equal(baseProgress({baseXp:MAX_XP,jobXp:0}).percent,100);
 for(const [id,job,cap] of [['novice','',10],['boxer','',40],['boxer','master-boxer',30]]){const p=jobProgress({baseXp:0,jobXp:MAX_XP},id,job);assert.equal(p.level,cap);assert.equal(p.percent,100);}
 for(const bad of [{baseXp:-1,jobXp:0},{baseXp:0,jobXp:.5},{baseXp:Infinity,jobXp:0},{baseXp:5}]){const save=initialSave();delete save.traveler.baseXp;delete save.traveler.jobXp;Object.assign(save.traveler,bad);assert.throws(()=>validateSave(save,catalog),/save-data/);}
});
test('creation always novice and separate slots retain XP; class and Master reset only Job EXP',async()=>{
 const store=createRealmStore({catalog,storage:memory()});let a=await store.create('server-1',{name:'คนแรก',gender:'male',classId:'boxer',jobId:'master-boxer'});
 const b=await store.create('server-2',{name:'คนสอง',gender:'female',classId:'hunter'});assert.equal(a.character.classId,'novice');assert.equal(a.character.jobId,'');assert.equal(a.state.traveler.baseXp,0);
 const state=structuredClone(a.state);state.traveler.baseXp=2856;state.traveler.jobXp=1260;a=await store.save('server-1',a,state);a=await store.changeClass('server-1',a,'boxer');assert.equal(a.state.traveler.baseXp,2856);assert.equal(a.state.traveler.jobXp,0);
 a=await store.save('server-1',a,{...a.state,traveler:{...a.state.traveler,baseXp:13216,jobXp:17160}});a=await store.customize('server-1',a,{},'master-boxer');assert.equal(a.state.traveler.baseXp,13216);assert.equal(a.state.traveler.jobXp,0);
 assert.equal((await store.load('server-2',b.slotId)).state.traveler.baseXp,0);
 await assert.rejects(store.save('server-1',a,{...a.state,traveler:{...a.state.traveler,baseXp:0}}),/experience-regression/);
});
test('every existing skill in eight professions has an atlas with ten valid cells',()=>{
 for(const c of [NOVICE,...CLASSES]){const bytes=fs.readFileSync(new URL(skillAtlas(c.id)));assert.equal(bytes.toString('ascii',1,4),'PNG');assert.ok(bytes.readUInt32BE(16)>=500);assert.ok(bytes.readUInt32BE(20)>=200);assert.equal(new CombatWorld({classId:c.id}).skills.length,15);} // Master skills (10-14) reuse their parent cell
 assert.throws(()=>skillAtlas('../secret'),/invalid-class/);
});

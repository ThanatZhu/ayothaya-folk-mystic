import test from 'node:test';
import assert from 'node:assert/strict';
import {poseChannels} from './pose-test-helpers.mjs';
import fs from 'node:fs';
import {character} from '../realm-state.js';
import {createRealmStore} from '../realm-store.js';
import {DEFAULT_APPEARANCE,validateAppearance} from '../appearance-state.js';
import {JOBS,progression,validateJob} from '../advancement.js';
import {CombatWorld} from '../combat-core.js';
import {levelStart} from '../experience.js';
import {characterMotion,MOTION_MODES} from '../character-motion.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
const hero={name:'ทดสอบ',gender:'male',classId:'boxer',appearance:{...DEFAULT_APPEARANCE,outfit:'crimson',hair:'braid',eyes:'green',tattoo:'forehead'},jobId:''};
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};}
test('appearance validation rejects unknown fields and retains legacy heroes',()=>{
 assert.deepEqual(character({name:'เดิม',gender:'male',classId:'shaman'}),{name:'เดิม',gender:'male',classId:'shaman'});
 assert.equal(validateAppearance().beard,'none');
 assert.throws(()=>validateAppearance({eyes:'javascript'}));assert.throws(()=>validateAppearance({admin:true}));assert.throws(()=>validateAppearance(null));
});
test('appearance survives reload and stays independent between server characters',async()=>{
 const mem=storage(),a=createRealmStore({catalog,storage:mem});const first=await a.create('server-1',hero);await a.create('server-2',{...hero,name:'คนที่สอง',appearance:DEFAULT_APPEARANCE});
 const saved=await a.customize('server-1',first,{...hero.appearance,beard:'mustache'});
 const b=createRealmStore({catalog,storage:mem});assert.equal((await b.load('server-1')).character.appearance.beard,'mustache');assert.equal((await b.load('server-2')).character.appearance.beard,'none');
 await assert.rejects(a.customize('server-1',first,DEFAULT_APPEARANCE),/save-conflict/);assert.equal(saved.character.name,hero.name);
});
test('cloud saves remain scoped to UID and reject an account switch',async()=>{
 const docs=new Map(),snapshot=r=>({exists:()=>docs.has(r),data:()=>docs.get(r)});
 const connection={auth:{currentUser:{uid:'alice'}},db:{},sdk:{doc:(_, ...path)=>path.join('/'),getDocFromServer:async r=>snapshot(r),serverTimestamp:()=>123,runTransaction:async(_,fn)=>fn({get:async r=>snapshot(r),set:(r,v)=>docs.set(r,v)})}};
 const alice=createRealmStore({catalog,connection,owner:'alice'});await alice.create('server-1',hero);
 connection.auth.currentUser={uid:'bob'};const bob=createRealmStore({catalog,connection,owner:'bob'});assert.equal(await bob.load('server-1'),null);await bob.create('server-1',{...hero,appearance:DEFAULT_APPEARANCE});
 await assert.rejects(alice.load('server-1'),/account-changed/);connection.auth.currentUser={uid:'alice'};assert.equal((await alice.load('server-1')).character.appearance.hair,'braid');
});
test('all fourteen advanced jobs unlock at a maxed Job 40, alter combat, and reject cross-class choices',()=>{
 assert.equal(progression(Math.floor((levelStart(60)-1)/10)).level,59);assert.equal(progression(Math.ceil(levelStart(60)/10)).level,60);assert.equal(progression(Infinity).level,1);
 for(const [id,jobs] of Object.entries(JOBS))for(const job of jobs){assert.throws(()=>validateJob(id,job.id,{baseXp:13216,jobXp:17159}),/job-locked/);assert.equal(validateJob(id,job.id,{baseXp:0,jobXp:17160}).id,job.id);assert.equal(validateJob(id,job.id,{baseXp:6118,jobXp:17160}).id,job.id);const base=new CombatWorld({classId:id}),advanced=new CombatWorld({classId:id,jobId:job.id});assert.ok(advanced.profession.damage>base.profession.damage);assert.equal(advanced.skills.length,15);}
 assert.throws(()=>validateJob('boxer','guardian',100),/invalid-job/);
});
test('job and appearance persist through save; chosen class and Master remain fixed',async()=>{
 const store=createRealmStore({catalog,storage:storage()});let a=await store.create('server-1',hero);a.state.traveler.kills=240;a.state.traveler.baseXp=2856;a.state.traveler.jobXp=1260;a=await store.save('server-1',a,a.state);a=await store.changeClass('server-1',a,'boxer');await assert.rejects(store.customize('server-1',a,hero.appearance,'master-boxer'),/job-locked/);
 a.state.traveler.kills=590;a.state.traveler.baseXp=13216;a.state.traveler.jobXp=17160;a=await store.save('server-1',a,a.state);a=await store.customize('server-1',a,hero.appearance,'master-boxer');assert.equal((await store.load('server-1')).character.jobId,'master-boxer');
 await assert.rejects(store.changeClass('server-1',a,'hunter'),/class-final/);assert.deepEqual(a.character.appearance,hero.appearance);assert.equal(a.state.traveler.kills,590);
});
test('motion states stay finite and bounded and respect reduced motion',()=>{
 for(const mode of MOTION_MODES)for(const classId of Object.keys(JOBS))for(const time of [0,.1,1,3,8]){const s=characterMotion({time,mode,classId});assert.equal(s.mode,mode);assert.equal(s.time,time);assert.equal(s.phase,null);assert.equal(s.reduced,false);assert.ok(s.frame>=0&&s.frame<=3);assert.ok(Object.values(poseChannels(s)).every(Number.isFinite));assert.ok(s.sx>0&&s.sy>0);const r=characterMotion({time,mode,classId,reduced:true});assert.equal(r.reduced,true);assert.equal(r.rotation,0);assert.equal(r.x,0);assert.equal(r.y,0);}
});

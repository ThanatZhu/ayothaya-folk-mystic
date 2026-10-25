import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSkills,upgradeSkill,availablePoints,spentPoints,NOVICE_SLOTS,SKILL_MAX} from '../skill-progress.js';
import {normalizeRoleSkills,ROLE_MARK} from '../role-skill-progress.js';
import {CombatWorld} from '../combat-core.js';
import {basicTiming,attackDuration} from '../combat-timing.js';
import {characterMotion} from '../character-motion.js';
import {skillTrack,skillPose} from '../skill-choreography.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const nav={zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]};
const maxJob=Array.from({length:9},(_,i)=>40+(i+1)*20).reduce((a,b)=>a+b,0);
const progress={classId:'novice',jobXp:maxJob};

test('Novice has three usable basics, with two learned at the start and no Master branches',()=>{
 const w=new CombatWorld({classId:'novice',roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[1,0,0]]});
 assert.deepEqual(w.skills.flatMap((s,i)=>s.reserved?[]:[i]),NOVICE_SLOTS);
 const s=normalizeRoleSkills(null,'novice');assert.deepEqual(s.novice.flatMap((l,i)=>l?[i]:[]),[0,4]);
 for(let i=0;i<15;i++)if(!NOVICE_SLOTS.includes(i)){
  assert.throws(()=>upgradeSkill(s,'novice',i,progress),/skill-locked/);
  w.skillLevels[i]=10;assert.equal(w.skill(i),false,'a forged retired rank cannot cast '+i);
 }
 assert.throws(()=>upgradeSkill(s,'novice',5,progress),/skill-locked/);
});

test('all three basics max at four ranks using exactly the nine Novice points',()=>{
 let s=normalizeSkills(null,'novice');const raw=JSON.stringify(s);
 for(const i of NOVICE_SLOTS){if(!s.novice[i])s=upgradeSkill(s,'novice',i,progress);while(s.novice[i]<4)s=upgradeSkill(s,'novice',i,progress);assert.throws(()=>upgradeSkill(s,'novice',i,progress),/skill-max/);}
 assert.equal(spentPoints(s),9);assert.equal(availablePoints(s,progress),0);assert.equal(JSON.stringify(normalizeSkills(null,'novice')),raw);
 assert.equal(SKILL_MAX,10,'professional paths keep their ten ranks');
});

test('old Novice allocations are refunded without touching profession ranks or source saves',()=>{
 const raw={_tree84:Array(15).fill(0),[ROLE_MARK]:Array(15).fill(0),novice:Array(15).fill(6),hunter:[3,0,0,0,2,0,0,0,0,0,0,0,0,0,0]},before=JSON.stringify(raw);
 const s=normalizeRoleSkills(raw,'hunter');assert.equal(JSON.stringify(raw),before);assert.deepEqual(s.hunter,raw.hunter);
 assert.deepEqual(s.novice,NOVICE_SLOTS.reduce((a,i)=>(a[i]=4,a),Array(15).fill(0)));assert.equal(spentPoints(s),12);assert.deepEqual(normalizeRoleSkills(s,'hunter'),s);
});

test('authority enforces the reduced tree and persists only valid Novice ranks',()=>{
 let now=10000;const map={id:'training',safe:true,nav,spawn:{x:0,z:0},mobs:[]},realm=new RealmServer({roleSkills:true,catalog:{capital:map.id,maps:[map]},now:()=>now});
 const state=initialSave();state.traveler.jobXp=maxJob;
 const p=realm.join({uid:'novice-test',serverId:'server-1',slotId:'slot-1',record:{character:{name:'Novice',gender:'male',classId:'novice'},state},send(){}});
 const send=i=>{now+=100;return realm.receive(p.id,{type:'upgradeSkill',seq:p.seq+1,index:i});};
 for(const i of NOVICE_SLOTS){if(!p.world.skillLevels[i])assert.equal(send(i),true);while(p.world.skillLevels[i]<4)assert.equal(send(i),true);assert.equal(send(i),false);}
 for(const i of [1,2,3,6,7,8,9,10,11,12,13,14])assert.equal(send(i),false);
 assert.equal(realm.snapshot(p).self.skillPoints,0);assert.deepEqual(realm.record(p,{}).skills.novice,p.world.skillLevels);
});

test('basic punches and training strikes display contact on the authoritative damage beat at any attack speed',()=>{
 for(const interval of [.12,.3,.8]){
  const t=basicTiming('novice',interval),at=t.impacts[0];
  const pose=elapsed=>characterMotion({classId:'novice',mode:'attack',time:elapsed*attackDuration('novice')/t.duration});
  assert.equal(pose(at-.001).artFrame,5);assert.equal(pose(at).artFrame,6);assert.equal(pose(t.duration).artFrame,0);
  assert.equal(pose(at).sx,1);assert.equal(pose(at).sy,1);assert.ok(pose(at).paintOffsetX>0);
 }
 const track=skillTrack('novice',0);assert.equal(skillPose('novice',0,track.duration*track.strikes[0]).artFrame,9);
 const w=new CombatWorld({classId:'novice',roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[1,0,0]]});w.select(0);
 const hp=w.mobs[0].hp;assert.equal(w.basicAttack(),true);assert.equal(w.mobs[0].hp,hp);
 const hit=w.events.find(e=>e.type==='cast').timing.impacts[0];for(let t=0;t<hit-.001;t+=.001)w.update(Math.min(.001,hit-.001-t),{}, {monsters:false});assert.equal(w.mobs[0].hp,hp);w.update(.002,{}, {monsters:false});assert.ok(w.mobs[0].hp<hp);
 const reduced=characterMotion({classId:'novice',mode:'attack',time:.2,reduced:true});assert.equal(reduced.artFrame,0);assert.equal(reduced.paintOffsetX,0);
});

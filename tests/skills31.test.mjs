import test from 'node:test';
import assert from 'node:assert/strict';
import {earnedPoints,normalizeSkills,spentPoints,availablePoints,upgradeSkill,scaledSkill,SKILL_MAX,START_LEVELS} from '../skill-progress.js';
import {CombatWorld,SKILLS} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const jobXpFor=(classId,jobId,level)=>{let xp=0;for(let l=1;l<level;l++)xp+=40+l*20;return xp;};
test('skill points: one per Job Level, carried across Novice, class and Master',()=>{
 assert.equal(earnedPoints({classId:'novice',jobXp:0}),0);
 assert.equal(earnedPoints({classId:'novice',jobXp:jobXpFor('novice','',10)}),9);
 assert.equal(earnedPoints({classId:'swordsman',jobXp:0}),9);
 assert.equal(earnedPoints({classId:'swordsman',jobXp:jobXpFor('swordsman','',5)}),13);
 assert.equal(earnedPoints({classId:'swordsman',jobId:'guardian',jobXp:0}),48);
});
test('every path starts on the tree; pre-tree saves reset once (points return), marked saves are kept',()=>{
 const skills=normalizeSkills(undefined,'hunter');
 assert.deepEqual(skills.hunter,START_LEVELS);assert.equal(spentPoints(skills),0);
 assert.equal(availablePoints(skills,{classId:'novice',jobXp:0}),0);
 const old=normalizeSkills({hunter:[4,4,3,2,4,1,3,1,2,3],novice:[2,1,1,1,1,1,1,1,1,1]},'hunter');
 assert.deepEqual(old.hunter,START_LEVELS);assert.deepEqual(old.novice,START_LEVELS);assert.equal(spentPoints(old),0);
 assert.deepEqual(normalizeSkills(old,'hunter'),old,'the reset happens only once');
 const bad=normalizeSkills({_tree84:Array(10).fill(0),hunter:[1,2,'x',99,-1,1,1,1,1,1],junk:[1]},'hunter');
 assert.deepEqual(bad.hunter,[1,2,1,1,1,1,1,1,1,1,0,0,0,0,0]);assert.equal(bad.junk,undefined); // a ten-level save gains unlearned Master slots
});
test('upgrades need points, respect per-class caps, and never mutate the input',()=>{
 const progress={classId:'novice',jobXp:jobXpFor('novice','',4)};let skills=normalizeSkills(null,'novice');
 assert.equal(availablePoints(skills,progress),3);
 const before=JSON.stringify(skills);skills=upgradeSkill(skills,'novice',0,progress);assert.equal(JSON.stringify(normalizeSkills(null,'novice')),before);
 skills=upgradeSkill(skills,'novice',0,progress);skills=upgradeSkill(skills,'novice',0,progress);
 assert.equal(skills.novice[0],4);assert.equal(availablePoints(skills,progress),0);
 // 0.101: no trial gate at 5 — with points a skill climbs to 10 and stops there
 assert.throws(()=>upgradeSkill(skills,'novice',0,progress),/skill-max/);
 let rich=normalizeSkills(null,'hunter');const all={classId:'hunter',jobXp:0};for(let l=1;l<SKILL_MAX;l++)rich=upgradeSkill(rich,'hunter',0,all);
 assert.equal(rich.hunter[0],SKILL_MAX);assert.throws(()=>upgradeSkill(rich,'hunter',0,all),/skill-max/);
 assert.throws(()=>upgradeSkill(skills,'novice',4,progress),/no-skill-points/);
 assert.throws(()=>upgradeSkill(skills,'novice',15,progress),/invalid-skill/);
 assert.throws(()=>upgradeSkill(skills,'novice',1,progress),/skill-locked/); // retired Novice branch
});
test('the skill tree opens each skill only after its requirements and the ultimate last',()=>{
 const progress={classId:'hunter',jobXp:0};let s=normalizeSkills(null,'hunter');
 for(const slot of [1,2,3,5,6,7,8,9])assert.throws(()=>upgradeSkill(s,'hunter',slot,progress),/skill-locked/);
 const up=i=>{s=upgradeSkill(s,'hunter',i,progress);};
 up(0);up(0);up(2);up(6);up(1);up(1);up(3);up(7);up(4);up(4);up(5);up(8);assert.throws(()=>up(9),/skill-locked/);
 up(6);up(6);up(8);up(9);assert.equal(s.hunter[9],1);assert.equal(availablePoints(s,progress),1); // the whole tree costs 8 of the novice's 9 points
});
test('level scaling: level 1 is unchanged; higher levels are stronger and faster',()=>{
 for(const s of SKILLS)assert.equal(scaledSkill(s,1),s);
 const hit=SKILLS.find(s=>s.damage),l4=scaledSkill(hit,4),l10=scaledSkill(hit,10);
 assert.ok(l4.damage>hit.damage&&l10.damage>l4.damage);assert.ok(l10.cd<hit.cd);assert.equal(scaledSkill(hit,0),null);
});
test('an unlearned skill cannot be cast, offline or on the server',()=>{
 const map={id:'f',safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[1,0,0]]};
 const w=new CombatWorld(map);w.skillLevels[4]=0;assert.equal(w.skill(4),false);w.skillLevels[4]=1;assert.equal(w.skill(4),true);
 let time=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>time});
 const record={character:{name:'tester',gender:'male',classId:'novice'},state:initialSave(),skills:{_tree84:Array(10).fill(0),novice:[1,1,1,1,0,1,1,1,1,1]}};
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 time+=100;assert.equal(realm.receive(peer.id,{type:'skill',seq:1,index:4}),false);
 assert.deepEqual(realm.record(peer,record).skills.novice,[1,0,0,0,0,1,0,0,0,0,0,0,0,0,0]);
});
test('the server applies upgrades only with points and saves them with the character',()=>{
 const map={id:'c',safe:true,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
 let time=1e4;const realm=new RealmServer({catalog:{capital:'c',maps:[map]},now:()=>time});
 const state=initialSave();state.traveler.jobXp=jobXpFor('novice','',3);
 const record={character:{name:'tester',gender:'male',classId:'novice'},state},sent=[];
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:m=>sent.push(m)});
 const send=(type,data)=>{time+=100;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 assert.equal(send('upgradeSkill',{index:2}),false); // locked until strike Lv2
 assert.equal(send('upgradeSkill',{index:0}),true);assert.equal(send('upgradeSkill',{index:0}),true);assert.equal(send('upgradeSkill',{index:0}),false);
 assert.equal(send('upgradeSkill',{index:2}),false); // retired Novice skill remains blocked even after strike upgrades
 assert.equal(realm.record(peer,record).skills.novice[0],3);assert.equal(realm.record(peer,record).skills.novice[2],0);
 assert.equal(realm.snapshot(peer).self.skillPoints,0);assert.equal(realm.snapshot(peer).self.skillLevels[0],3);
 assert.equal(send('upgradeSkill',{index:'x'}),false);
});
test('a skill at Lv 10 opens its Master skill; old skills keep working; the server checks the same rule',()=>{
 const map={id:'f',safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[1,0,0]]};
 let time=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>time});
 const state=initialSave();state.traveler.jobXp=jobXpFor('shaman','spirit-master',40);
 const record={character:{name:'tester',gender:'male',classId:'shaman',jobId:'spirit-master'},state};
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 const send=(type,data)=>{time+=100;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 assert.equal(peer.world.skills.length,15);assert.ok(peer.world.skills[10].master&&peer.world.skills[10].damage>peer.world.skills[0].damage);
 assert.equal(send('upgradeSkill',{index:10}),false,'Master strike is locked until the strike is Lv 10');
 assert.equal(send('skill',{index:10}),false,'an unlearned Master skill cannot be cast');
 for(let l=1;l<SKILL_MAX;l++)assert.equal(send('upgradeSkill',{index:0}),true);
 assert.equal(send('upgradeSkill',{index:10}),true,'learning the opened Master skill is free');
 assert.equal(realm.record(peer,record).skills.shaman[10],1);
 assert.equal(send('skill',{index:10}),true);assert.equal(send('skill',{index:0}),true,'the base strike still casts');
 assert.equal(send('skill',{index:15}),false);
 assert.ok(peer.world.cooldowns[10]>0&&peer.world.cooldowns[0]>0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld,MONSTER_TYPES} from '../combat-core.js';
import {deriveStats} from '../character-stats.js';
import {ROLE_MARK} from '../role-skill-progress.js';
import {SKILL_PROFILES,ALL_PROFILES} from '../assets/skill-polish/library-profiles.js';
import {ROLES} from '../assets/skills-next/catalog.js';
import {basicTiming,roleTiming,createCombatPresentation,presentationDelta} from '../combat-timing.js';
import {applyPoison,poisonFor,takePoison,tickPoison} from '../role-poison.js';
import {stepRoleMonsters} from '../role-combat.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {createSkillEffects} from '../skill-effects.js';
import {skillTrack} from '../skill-choreography.js';
import * as THREE from '../vendor/build/three.module.js';
import {recordBossDamage,finishBossDamage} from '../boss-results.js';
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},input={x:0,z:0,attack:false};
function world(classId='rogue',jobId='assassin'){
 const w=new CombatWorld({classId,jobId,roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[1,0,0]]});w.skillLevels.fill(10);w.skillLevels[13]=w.skillLevels[14]=0;w.player.mp=w.player.maxMp=1e6;w.mobs[0].hp=w.mobs[0].maxHp=1e7;w.targetId=0;return w;
}
function tick(w,seconds){for(let t=0;t<seconds-1e-8;t+=.05)w.update(Math.min(.05,seconds-t),input,{monsters:false});}
test('a live basic starts once, hits on its advertised beat, and fast ASPD produces proportionally more complete swings',t=>{
 t.mock.method(Math,'random',()=>.5);
 const run=agi=>{const w=world();w.applyDerived(deriveStats({level:60,classId:'rogue',stats:{str:40,agi,dex:30}}));w.derived.crit=0;w.derived.hit=10000;const attacks=[],hits=[];
  for(let n=0;n<80;n++){w.basicAttack(true);for(const e of w.events.splice(0)){if(e.type==='cast')attacks.push({...e,time:w.time});if(e.type==='damage')hits.push({...e,time:w.time});}w.update(.05,input,{monsters:false});}
  for(const e of w.events)if(e.type==='damage')hits.push({...e,time:w.time});
  assert.ok(hits.length>5);assert.equal(new Set(attacks.map(a=>a.castId)).size,attacks.length);
  for(const hit of hits){const cast=attacks.find(c=>c.castId===hit.castId);assert.ok(cast);assert.ok(hit.time-cast.time>=cast.timing.impacts[0]-1e-8);assert.ok(hit.time-cast.time<=cast.timing.impacts[0]+.050001);assert.equal(hit.source,'basic');assert.equal(hit.synced,true);}
  return {attacks:attacks.length,timing:attacks[0].timing};
 };
 const slow=run(1),fast=run(99);assert.ok(fast.attacks>=slow.attacks*1.5);assert.ok(fast.timing.duration<slow.timing.duration);assert.ok(fast.timing.duration<=fast.timing.period);
 const w=world(),hp=w.mobs[0].hp;assert.equal(w.basicAttack(true),true);assert.equal(w.mobs[0].hp,hp);w.status.stun=1;tick(w,.2);assert.equal(w.mobs[0].hp,hp);assert.ok(w.events.some(e=>e.type==='castCancel'));
});
test('the novice live path also reserves cost and releases damage once at the advertised impact',()=>{
 const w=world('novice',''),hp=w.mobs[0].hp,mp=w.player.mp;assert.equal(w.skill(0),true);const cast=w.events.find(e=>e.type==='cast');assert.ok(cast.timing);assert.equal(w.mobs[0].hp,hp);assert.ok(w.player.mp<mp);assert.equal(w.skill(0),false);tick(w,cast.timing.impacts[0]-.01);assert.equal(w.mobs[0].hp,hp);tick(w,.06);assert.ok(w.mobs[0].hp<hp);assert.equal(w.events.filter(e=>e.type==='damage').length,1);
});
test('every direct multi-hit skill releases each hit on the authored beat without multiplying total base power',()=>{
 for(const profile of ALL_PROFILES.filter(p=>!p.passive&&p.impacts.length>1&&!['storm','rain','thorns','regen','lifeTree','holyField'].includes(p.skill.kind))){
  const branch=ROLES.find(r=>r.id===profile.classId).branches.find(b=>b.active.some(s=>s.id===profile.id));const w=world(profile.classId,branch?.id??''),i=w.skills.findIndex(s=>s.roleSkillId===profile.id);w.roleCombat.state.pets=[{kind:'rooster',left:100,power:0,tick:100,x:0,z:0}];
  assert.equal(w.skill(i),true,profile.id);const cast=w.events.find(e=>e.type==='cast');assert.deepEqual(cast.timing.impacts,profile.impacts);const releases=[],hits=[];
  for(let n=0;n<60;n++){w.update(.05,input,{monsters:false});for(const event of w.events.splice(0)){if(event.type==='roleRelease'&&event.castId===cast.castId)releases.push({...event,time:w.time});if(event.type==='damage'&&event.castId===cast.castId)hits.push(event);}}
  assert.equal(hits.length,profile.impacts.length,profile.id+' actual damage per beat');
  assert.equal(releases.length,profile.impacts.length,profile.id);for(const [index,event] of releases.entries()){assert.equal(event.hitIndex,index);assert.ok(Math.abs(event.time-profile.impacts[index])<=.050001,profile.id);}
  assert.ok(cast.timing.duration<profile.duration,'body recovery is independent of lingering particles');
 }
});
test('AUTO can cast after a fast basic windup, while weaker poison is skipped during active Master venom',()=>{
 const w=world();w.basicAttack(true);assert.equal(w.roleCombat.autoIndex({skills:[3]}),-1);tick(w,.2);assert.equal(w.roleCombat.autoIndex({skills:[3]}),3);
 applyPoison(w.target.roleStatus??={},{owner:'self',left:8,power:10000});assert.equal(w.roleCombat.autoIndex({skills:[3,10]}),-1);w.cooldowns.fill(0);w.autoConfig={skills:[3]};w.autoCast=0;w.auto=true;tick(w,1);assert.ok(!w.events.some(e=>e.type==='cast'&&e.roleSkillId==='poison'));
});
test('splitting direct hits does not multiply mana refunds or line cooldown recovery',()=>{
 const boxer=world('boxer','master-boxer');boxer.skillLevels[13]=boxer.skillLevels[14]=1;boxer.derived={mpRegen:0};boxer.player.mp=100;const mana=boxer.roleCombat.mods().comboMana;assert.ok(mana);const index=boxer.skills.findIndex(s=>s.type==='combo');assert.equal(boxer.skill(index),true);const paid=boxer.player.mp;tick(boxer,2);assert.equal(boxer.player.mp,paid+mana);
 const lancer=world('lancer','war-lancer');lancer.skillLevels[13]=lancer.skillLevels[14]=1;lancer.mobs.push({...lancer.target,id:1,x:2},{...lancer.target,id:2,x:3});lancer.cooldowns[0]=10;const recovery=lancer.roleCombat.mods().lineRecovery;assert.ok(recovery);assert.equal(lancer.skill(lancer.skills.findIndex(s=>s.type==='chainLine')),true);tick(lancer,2);assert.ok(Math.abs(lancer.cooldowns[0]-(8-recovery))<1e-8);
});
test('basic projectile contact occurs on the advertised beat and cancelling one actor never erases another actor with the same cast ID',()=>{
 const scene=new THREE.Scene(),effects=createSkillEffects(scene),timing=basicTiming('hunter',.4),track={...skillTrack('hunter',0),duration:timing.duration,strikes:[.42]},options={classId:'hunter',skillIndex:null,synced:true,castId:1,actor:'a',from:{x:0,z:0},to:{x:4,z:0}};
 const a=effects.create(track,options),b=effects.create(track,{...options,actor:'b'}),camera=new THREE.PerspectiveCamera();a.sample(timing.impacts[0]+.01,camera);assert.ok(a.group.children.some(m=>m.userData.shape==='star'&&m.visible&&Math.abs(m.position.x-4)<.01));effects.cancel(1,'a');assert.equal(effects.count,1);assert.equal(scene.children[0],b.group);effects.dispose();
});
test('poison cannot be weakened by a base cast, retains tick phase, and isolates two owners and their detonations',()=>{
 const status={};applyPoison(status,{owner:'a',left:10,power:80});tickPoison(status,.6,()=>{});assert.equal(applyPoison(status,{owner:'a',left:6,power:30}),false);assert.equal(poisonFor(status,'a').power,80);assert.ok(Math.abs(poisonFor(status,'a').tick-.4)<1e-8);
 applyPoison(status,{owner:'b',left:8,power:45});const hits=[];tickPoison(status,.4,s=>hits.push(s.owner));assert.deepEqual(hits,['a']);assert.equal(takePoison(status,'b').power,45);assert.equal(poisonFor(status,'b'),null);assert.equal(poisonFor(status,'a').power,80);
 const end={};applyPoison(end,{owner:'a',left:2,power:10});const ticks=[];for(let n=0;n<40;n++)tickPoison(end,.05,s=>ticks.push(s.power));assert.equal(ticks.length,2,'full-duration final tick is paid once');assert.equal(end.poison,undefined);
});
test('assassin detonation adds already resolved poison once and never consumes another assassin poison',()=>{
 const w=world();w.applyDerived(deriveStats({level:60,classId:'rogue',stats:{str:70,dex:30}}));const target=w.target;applyPoison(target.roleStatus??={}, {owner:'other',left:9,power:300});assert.equal(w.skill(11),false);
 applyPoison(target.roleStatus,{owner:'self',left:8,power:200});const before=target.hp;assert.equal(w.skill(11),true);tick(w,1.5);const damage=w.events.filter(e=>e.type==='damage'&&e.source==='skill');assert.equal(damage.length,1);assert.ok(damage[0].amount<before*.01,'no second multiplication of resolved poison');assert.equal(poisonFor(target.roleStatus,'self'),null);assert.ok(poisonFor(target.roleStatus,'other'));
 const base=damage[0].amount;assert.ok(base>w.power(187,target),'stored poison contributes');
});
test('Master last-drop applies to basics and DOTs below 35%, with no double application on skills',t=>{
 t.mock.method(Math,'random',()=>.5);const w=world();w.skillLevels[14]=1;w.derived={crit:0,hit:10000};w.target.hp=w.target.maxHp*.3;applyPoison(w.target.roleStatus??={}, {owner:'self',left:8,power:40});
 const hit=source=>{w.events=[];if(source==='poison')stepRoleMonsters([w.target],1,()=>w);else if(source==='skill')w.roleCombat.damage(w.target,40);else{w.player.attackCD=0;w.basicAttack(true);tick(w,.2);}return w.events.find(e=>e.type==='damage').amount;};
 assert.equal(hit('poison'),50);assert.equal(hit('skill'),Math.round(w.power(40,w.target)*1.25));assert.equal(hit('basic'),Math.round(Math.round(w.profession.damage*w.affinity(w.target,true)*w.guardOf(w.target,false))*1.25));
});
test('snapshot batching, cancellation and poison share one presentation clock for self and remote players',()=>{
 let now=0;const queue=createCombatPresentation({now:()=>now}),seen=[];
 queue.push({type:'cast',at:1,castId:1},1.05);queue.push({type:'damage',at:1.1,castId:1},1.1);queue.flush(e=>seen.push(e));assert.equal(seen.length,0);
 now=.071;queue.flush(e=>seen.push(e));assert.equal(seen[0].type,'cast');assert.ok(seen[0].lag<.002);
 now=.121;queue.flush(e=>seen.push(e));assert.deepEqual(seen.map(e=>e.type),['cast','damage']);
 queue.push({type:'castCancel',at:1.2},1.2);queue.push({type:'damage',source:'poison',at:1.2},1.2);now=.25;queue.flush(e=>seen.push(e));assert.deepEqual(seen.slice(-2).map(e=>e.type),['castCancel','damage']);queue.push({type:'cast'},2);queue.clear();assert.equal(queue.size,0);
});
test('combat presentation keeps wall-clock cadence at 15 FPS and can pause hidden rendering independently of movement',()=>{
 assert.ok(Math.abs(Array.from({length:15},()=>presentationDelta(1/15)).reduce((a,b)=>a+b,0)-1)<1e-8);
 assert.equal(presentationDelta(.1),.1);assert.equal(presentationDelta(.1,{hidden:true}),0);assert.equal(presentationDelta(5),.25);assert.equal(presentationDelta(NaN),0);
});
function realmFixture(){let now=1000000;const map={id:'field',name:'Test Field',nav,spawn:{x:0,z:0},mobs:[]},realm=new RealmServer({catalog:{capital:'field',maps:[map]},roleSkills:true,now:()=>now}),messages=new Map();const join=(uid,slotId='slot-1')=>{const output=[],p=realm.join({uid,slotId,serverId:'server-1',record:{character:{name:uid,gender:'male',classId:'rogue',jobId:'assassin'},skills:{[ROLE_MARK]:Array(15).fill(0),rogue:Array(15).fill(10)},state:initialSave()},send:m=>output.push(m)});messages.set(p.id,output);return p;};return {realm,join,messages};}
test('boss summaries rank real damage, cap overkill, include all viewers, omit private identity, and isolate simultaneous bosses',()=>{
 const {realm,join,messages}=realmFixture(),a=join('Alice'),b=join('Bob'),watcher=join('Viewer');realm.summonBoss({mapId:'field',count:2,x:2,z:0});const [first,second]=a.room.mobs.filter(m=>m.summoned);first.hp=first.maxHp=1000;second.hp=second.maxHp=1000;
 realm.hurt(a,first,100);realm.hurt(b,second,800);realm.clock+=10;realm.hurt(b,first,300);realm.hurt(a,first,1e9);realm.hurt(a,second,1e9);realm.step(.05);realm.step(.05);
 const reports=messages.get(watcher.id).flatMap(m=>m.events??[]).filter(e=>e.type==='bossResult');assert.equal(reports.length,2);assert.equal(reports[0].total,1000);assert.deepEqual(reports[0].rows.map(r=>[r.name,r.damage]),[['Alice',700],['Bob',300]]);assert.equal(reports[0].rows[0].dps,70);assert.equal(reports[1].rows[0].name,'Bob');assert.equal(a.room.damageEncounters.size,0);assert.ok(!JSON.stringify(reports).includes('slot-1'));assert.ok(!reports[0].rows.some(r=>'uid' in r||'key' in r));
});
test('field bosses, disconnect/rejoin and identical names keep separate encounter credit without leaking it into respawns',()=>{
 const {realm,join}=realmFixture(),a=join('same'),b=join('different','slot-2'),mob={id:999,type:MONSTER_TYPES.findIndex(t=>t.worldBoss),hp:1000,maxHp:1000,x:0,z:0};a.room.mobs.push(mob);b.character.name=a.character.name;realm.hurt(a,mob,500);realm.hurt(b,mob,200);realm.leave(a.id);const returned=join('same');realm.hurt(returned,mob,300);
 const report=returned.room.events.find(e=>e.type==='bossResult');assert.equal(report.rows.length,2);assert.equal(report.rows[0].damage,800);assert.equal(report.rows[0].id,returned.id);assert.equal(report.rows[0].connected,true);assert.equal(returned.room.damageEncounters.size,0);
 const room={id:'room',map:{id:'f',name:'F'},peers:new Set()};recordBossDamage(room,{id:1},{id:'old',key:'private-key',character:{name:'Gone',classId:'rogue'}},10,0);const result=finishBossDamage(room,{id:1},{id:'boss',name:'Boss'},1);assert.equal(result.rows[0].connected,false);assert.ok(!JSON.stringify(result).includes('private-key'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {ROLE_MARK} from '../role-skill-progress.js';
import {initialSave} from '../realm-state.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]};
const input={x:0,z:0,attack:false};
function world(prototype=true){const w=new CombatWorld({classId:'shaman',jobId:'spirit-master',roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[3,0,0]]});w.spiritPrototype=prototype;w.roleOwnerId='test-owner';w.skillLevels.fill(1);w.skillLevels[13]=w.skillLevels[14]=0;w.player.hp=w.player.maxHp=5000;w.player.mp=w.player.maxMp=10000;w.mobs[0].hp=w.mobs[0].maxHp=100000;w.targetId=0;return w;}
function advance(w,seconds){for(let left=seconds;left>1e-9;left-=.05)w.update(Math.min(.05,left),input,{monsters:false});}
function summon(w,id='spirit'){w.cooldowns.fill(0);assert.equal(w.skill(w.skills.findIndex(s=>s.roleSkillId===id)),true);let steps=0;while(!w.roleCombat.state.pets.length&&steps++<30)w.update(.05,input,{monsters:false});assert.equal(w.roleCombat.state.pets.length,1);return w.roleCombat.state.pets[0];}
function shot(w){let steps=0;while(!w.events.some(e=>e.type==='spiritShot')&&steps++<30)w.update(.05,input,{monsters:false});const event=w.events.find(e=>e.type==='spiritShot');assert.ok(event);return event;}
test('prototype summon exposes stable identity and timing while preserving base and Master skill values',()=>{
 for(const [id,tier,duration,power,shield,cd] of [['spirit','base',14,28,70,20],['spirit-lord','master',24,48,130,30]]){
  const w=world(),pet=summon(w,id),event=w.events.find(e=>e.type==='spiritSummon');assert.equal(pet.owner,'test-owner');assert.equal(pet.id,event.petId);assert.equal(pet.tier,tier);assert.equal(pet.skillId,id);assert.equal(pet.maxLeft,duration);assert.equal(pet.endsAt-pet.spawnedAt,duration);assert.equal(pet.power,power);assert.equal(w.roleCombat.state.shield,shield);assert.ok(w.cooldowns[w.skills.findIndex(s=>s.roleSkillId===id)]<=cd);assert.ok(w.cooldowns[w.skills.findIndex(s=>s.roleSkillId===id)]>cd-1);
 }
});
test('prototype damage happens once at projectile impact rather than at launch, using matching shot IDs',()=>{
 const w=world();summon(w);const hp=w.target.hp,e=shot(w);assert.equal(e.duration,.3);assert.equal(w.target.hp,hp);assert.equal(e.owner,'test-owner');assert.equal(e.targetId,w.target.id);assert.ok(e.shotId.startsWith(e.petId));assert.equal(e.impactAt,e.launchAt+.3);
 advance(w,.25);assert.equal(w.target.hp,hp);advance(w,.05);assert.ok(w.target.hp<hp);const impacts=w.events.filter(x=>x.type==='spiritImpact');assert.equal(impacts.length,1);assert.equal(impacts[0].shotId,e.shotId);assert.equal(impacts[0].hit,true);assert.ok(Math.abs(impacts[0].impactAt-e.impactAt)<1e-8);const damaged=w.target.hp;advance(w,.1);assert.equal(w.target.hp,damaged);
});
test('prototype remains a shoulder follower and retains the 1.2-second firing cadence',()=>{
 const w=world();w.mobs[0].x=9;summon(w);shot(w);advance(w,3.7);const pet=w.roleCombat.state.pets[0];assert.ok(Math.hypot(pet.x-w.player.x,pet.z-w.player.z)<1.5);assert.ok(pet.x<w.player.x-1);assert.ok(pet.z<w.player.z-.4);const shots=w.events.filter(e=>e.type==='spiritShot');assert.ok(shots.length>=3);for(let i=1;i<shots.length;i++)assert.ok(Math.abs(shots[i].launchAt-shots[i-1].launchAt-1.2)<.051);
});
test('dead targets, dead owners, removed or expired companions cancel in-flight prototype damage',()=>{
 for(const reason of ['target','owner','removed','expired']){const w=world();summon(w);shot(w);const target=w.target,hp=target.hp;
  if(reason==='target')target.hp=0;if(reason==='owner')w.player.hp=0;if(reason==='removed')w.roleCombat.state.pets=[];if(reason==='expired')w.roleCombat.state.pets[0].left=.01;
  advance(w,.4);assert.equal(target.hp,reason==='target'?0:hp,reason);assert.equal(w.roleCombat.state.spiritShots.length,0);assert.ok(w.events.some(e=>e.type==='spiritImpact'&&!e.hit),reason);
 }
});
test('resummoning replaces identity and cancels the old pet projectile; no attack crosses walls',()=>{
 const w=world();const old=summon(w);shot(w);w.roleCombat.state.pets=[];w.targetId=null;const newer=summon(w);assert.notEqual(newer.id,old.id);assert.equal(w.roleCombat.state.spiritShots.length,0);
 const blocked=world();blocked.nav={...nav,obstacles:[{x:1,z:-2,w:1,d:4}]};summon(blocked);advance(blocked,1);assert.equal(blocked.events.some(e=>e.type==='spiritShot'),false);
});
test('live default spirit attacks keep immediate damage and rooster behavior is untouched',()=>{
 const w=world(false);summon(w);const hp=w.target.hp;advance(w,.5);assert.ok(w.target.hp<hp);assert.equal(w.events.some(e=>e.type==='spiritShot'),false);assert.equal(w.events.some(e=>e.type==='spiritSummon'),false);assert.ok(w.events.filter(e=>e.type==='damage').every(e=>e.source!=='spirit'&&e.petId===undefined&&e.shotId===undefined));
 const hunter=new CombatWorld({classId:'hunter',roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[1,0,0]]});hunter.spiritPrototype=true;hunter.skillLevels.fill(1);hunter.player.mp=10000;hunter.targetId=0;hunter.mobs[0].hp=100000;const index=hunter.skills.findIndex(s=>s.type==='summon');assert.equal(hunter.skill(index),true);advance(hunter,2);assert.ok(hunter.mobs[0].hp<100000);assert.equal(hunter.events.some(e=>e.type==='spiritShot'),false);
});
test('realm pet snapshots include stable identity, skill and tier without enabling prototype behavior',()=>{
 const map={id:'field',safe:false,nav,spawn:{x:0,z:0},mobs:[[3,0,0]],portals:[]},realm=new RealmServer({catalog:{capital:'field',maps:[map]},roleSkills:true});
 const p=realm.join({uid:'spirit-view',serverId:'server-1',slotId:'slot-1',record:{character:{name:'SpiritView',classId:'shaman',jobId:'spirit-master',gender:'male'},skills:{[ROLE_MARK]:Array(15).fill(0),shaman:Array(15).fill(1)},state:initialSave(),bag:{items:{},coins:0}},send(){}});
 p.world.player.mp=10000;p.world.skillLevels.fill(1);summon(p.world);realm.clock=120;const view=realm.snapshot(p).rolePets[0];assert.equal(view.owner,p.id);assert.equal(view.id,p.world.roleCombat.state.pets[0].id);assert.equal(view.skillId,'spirit');assert.equal(view.tier,'base');assert.equal(view.maxLeft,14);assert.equal(view.spawnedAt,120);assert.equal(view.endsAt,134);assert.equal(p.world.spiritPrototype,undefined);
});


test('prototype spirit damage carries companion identity and never leaks into later player hits',()=>{
 const w=world();summon(w);const e=shot(w),beforeContext=w.damageContext;advance(w,.3);
 const damage=w.events.find(event=>event.type==='damage'&&event.shotId===e.shotId);assert.ok(damage);assert.equal(damage.source,'spirit');assert.equal(damage.petId,e.petId);assert.equal(damage.roleSkillId,'spirit');assert.equal(damage.owner,'test-owner');assert.equal(damage.id,e.targetId);assert.equal(w.damageContext,beforeContext);
 const prior={source:'basic',castId:882};w.damageContext=prior;w.hurt(w.target,5);const later=w.events.filter(event=>event.type==='damage').at(-1);assert.equal(later.source,'basic');assert.equal(later.castId,882);assert.equal(later.petId,undefined);assert.equal(later.shotId,undefined);assert.equal(w.damageContext,prior);
});

test('prototype spirit attribution restores an existing context even if damage processing throws',()=>{
 const w=world();summon(w);shot(w);const prior={source:'skill',castId:111};w.damageContext=prior;const hurt=w.hurt;w.hurt=()=>{throw Error('injected-impact-failure');};
 assert.throws(()=>advance(w,.3),/injected-impact-failure/);assert.equal(w.damageContext,prior);w.hurt=hurt;
});

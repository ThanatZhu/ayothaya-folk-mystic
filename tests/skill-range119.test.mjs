import test from 'node:test';import assert from 'node:assert/strict';
import {CombatWorld} from '../combat-core.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]};
function party(){
 const make=id=>{const w=new CombatWorld({classId:'acolyte',jobId:'healer',roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[2,0,0]]});w.skillLevels.fill(5);w.player.hp=w.player.maxHp=5000;w.player.mp=w.player.maxMp=1000;w.roleOwnerId=id;return w;};
 const me=make('hero'),ally=make('ally');ally.player.x=5;ally.player.hp=1000;
 const all=()=>[{id:'hero',world:me,player:me.player},{id:'ally',world:ally,player:ally.player}];me.roleAllies=ally.roleAllies=all;me.supportTargetId='ally';
 return {me,ally,heal:me.skills.findIndex(s=>s.roleSkillId==='aco-heal')};
}
const step=(w,t)=>{for(let n=0;n<t;n+=.05)w.update(.05,{x:0,z:0,attack:false},{monsters:false});};
const notices=w=>w.events.filter(e=>e.type==='notice').map(e=>e.text??e.message);

test('a party friend picked from the roster stays the heal target (not the caster)',()=>{
 const {me,ally,heal}=party();assert.ok(heal>=0);
 assert.equal(me.skill(heal),true);step(me,1.2);
 assert.ok(ally.player.hp>1000,'friend healed');assert.equal(me.player.hp,5000);
});
test('a friend out of reach is refused at the press with a reason, nothing spent',()=>{
 const {me,ally,heal}=party();ally.player.x=9;const mp=me.player.mp;
 assert.equal(me.skill(heal),false);assert.equal(me.player.mp,mp);assert.equal(me.cooldowns[heal],0);
});
test('a friend who steps away during the wind-up still receives it; one who runs off refunds MP and cooldown',()=>{
 let {me,ally,heal}=party();assert.equal(me.skill(heal),true);ally.player.x=8.8;step(me,1.2);assert.ok(ally.player.hp>1000,'2 m grace');
 ({me,ally,heal}=party());const mp=me.player.mp;assert.equal(me.skill(heal),true);assert.ok(me.player.mp<mp);ally.player.x=15;step(me,1.2);
 assert.equal(ally.player.hp,1000);assert.equal(me.player.mp,mp,'MP back');assert.equal(me.cooldowns[heal],0,'cooldown back');
 assert.ok(me.events.some(e=>e.type==='castCancel'));
});
test('when the locked friend leaves the party the heal falls back to the caster',()=>{
 const {me,ally,heal}=party();me.roleAllies=()=>[{id:'hero',world:me,player:me.player}];me.player.hp=1000;
 assert.equal(me.skill(heal),true);step(me,1.2);assert.ok(me.player.hp>1000);assert.equal(ally.player.hp,1000);
});

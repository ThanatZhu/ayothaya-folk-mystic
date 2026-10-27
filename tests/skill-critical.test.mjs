import test from 'node:test';
import assert from 'node:assert/strict';
import {skillHit} from '../skill-critical.js';
import {CombatWorld} from '../combat-core.js';
import {deriveStats} from '../character-stats.js';
import {applyPoison} from '../role-poison.js';
import {stepRoleMonsters} from '../role-combat.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
function world(classId,crit=0){
 const w=new CombatWorld({classId,roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[1,0,0]]});w.skillLevels.fill(1);
 for(const i of [6,7,8,14,15,16])w.skillLevels[i]=0;
 w.applyDerived({...deriveStats({level:40,classId}),crit,critMult:2});w.player.hp=w.player.maxHp;w.player.mp=w.player.maxMp=1e6;
 w.mobs[0].hp=w.mobs[0].maxHp=1e7;w.targetId=0;return w;
}
function tick(w,n=2){for(let t=0;t<n;t+=.05)w.update(.05,{x:0,z:0,attack:false},{monsters:false});}
test('skill critical rolls use the character chance and multiplier once, and restore impact context even on failure',()=>{
 const seen=[],ctx={source:'skill',castId:8,hitIndex:2},w={derived:{crit:.25,critMult:1.8},damageContext:ctx,hurt(m,n,color){seen.push({n,color,ctx:this.damageContext});}},target={hp:1000};
 skillHit(w,target,100,'blue',{},()=>.249);skillHit(w,target,100,'blue',{},()=>.25);
 assert.deepEqual(seen.map(x=>[x.n,x.ctx.crit]),[[180,true],[100,false]]);assert.equal(seen[0].color,'#ffd27a');assert.equal(seen[0].ctx.castId,8);assert.equal(seen[0].ctx.hitIndex,2);assert.equal(w.damageContext,ctx);
 w.hurt=()=>{throw Error('test-hit');};assert.throws(()=>skillHit(w,target,1,'blue',{},()=>0),/test-hit/);assert.equal(w.damageContext,ctx);
 const length=seen.length;skillHit(w,{hp:0},100,'blue');skillHit(w,target,0,'blue');assert.equal(seen.length,length);
});
test('physical, magical and Novice legacy skills crit on their actual impact, retaining cast IDs and multi-hit count',t=>{
 t.mock.method(Math,'random',()=>.5);
 for(const classId of ['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte','novice']){
  const run=crit=>{const w=world(classId,crit);assert.equal(w.skill(0),true,classId);const cast=w.events.find(e=>e.type==='cast');assert.equal(w.events.some(e=>e.type==='damage'),false,'no damage before release');tick(w);return {cast,hits:w.events.filter(e=>e.type==='damage')};};
  const normal=run(0),critical=run(1);assert.ok(normal.hits.length>0,classId);assert.equal(critical.hits.length,normal.hits.length);
  critical.hits.forEach((e,i)=>{assert.equal(e.amount,normal.hits[i].amount*2,classId);assert.equal(e.crit,true);assert.equal(e.color,'#ffd27a');assert.equal(e.castId,critical.cast.castId);assert.equal(e.magic,['shaman','acolyte'].includes(classId));});
 }
});
test('skill fields and poison ticks roll separately without multiplying stored poison twice; healing is unchanged',t=>{
 t.mock.method(Math,'random',()=>.5);
 const run=crit=>{const w=world('shaman',crit);w.roleCombat.state.fields.push({x:0,z:0,left:3,tick:0,radius:5,power:50,kind:'zone',skillId:'test-zone'});tick(w,.1);const field=w.events.filter(e=>e.type==='damage');w.events=[];applyPoison(w.target.roleStatus??={},{owner:'self',left:2,power:40});stepRoleMonsters(w.mobs,1,()=>w);return {field,poison:w.events.filter(e=>e.type==='damage')};};
 const a=run(0),b=run(1);assert.ok(a.field.length);assert.equal(b.field[0].amount,a.field[0].amount*2);assert.equal(b.poison[0].amount,80);assert.equal(b.poison[0].source,'poison');assert.equal(b.poison[0].crit,true);
 const w=world('novice',1);w.player.hp=1;assert.equal(w.skill(4),true);tick(w);assert.ok(w.player.hp>1);assert.equal(w.events.filter(e=>e.type==='damage').length,0);
});
test('reflected damage does not roll or inherit another skill critical',t=>{
 t.mock.method(Math,'random',()=>0);const w=world('swordsman',1),previous={source:'skill',crit:true,castId:7};w.damageContext=previous;
 w.roleCombat.damage(w.target,100,'reflection');const hit=w.events.findLast(e=>e.type==='damage');assert.equal(hit.amount,100);assert.equal(hit.crit,false);assert.equal(hit.source,'reflection');assert.equal(w.damageContext,previous);
});
test('server-owned PvE and PvP hits publish critical flags with the actual damage and cast identity',t=>{
 t.mock.method(Math,'random',()=>.5);
 const map={id:'f',name:'Field',safe:false,nav,spawn:{x:0,z:0},mobs:[[1,0,0]]},realm=new RealmServer({catalog:{capital:'f',maps:[map]},roleSkills:true});
 const join=uid=>{const state=initialSave();state.mapId='f';return realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:uid,classId:'shaman',gender:'male'},state},send(){}});};
 const p=join('Mage'),q=join('Fighter');p.world.derived.crit=1;p.world.derived.critMult=2;p.world.damageContext={source:'skill',castId:42,hitIndex:1};
 const mob=p.room.mobs[0];mob.hp=mob.maxHp=1e6;skillHit(p.world,mob,100,'blue');let hit=p.world.events.findLast(e=>e.type==='damage');assert.equal(hit.amount,200);assert.equal(hit.crit,true);assert.equal(hit.castId,42);
 realm.startDuel(p,q);skillHit(p.world,p.world.foe,20,'blue');hit=p.world.events.findLast(e=>e.type==='damage');assert.equal(hit.crit,true);assert.equal(hit.castId,42);assert.ok(hit.amount>0);assert.equal(hit.source,'skill');
});

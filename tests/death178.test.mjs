import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {serializeTraveler,restoreTraveler} from '../world-state.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]};
function fixture(roleSkills=false){
 const maps=[{id:'field',safe:false,nav,spawn:{x:-5,z:-5},mobs:[],portals:[]},{id:'ayutthaya',safe:true,nav,spawn:{x:5,z:5},mobs:[],portals:[]}],messages=[];
 const realm=new RealmServer({catalog:{capital:'ayutthaya',maps},roleSkills});
 const record={character:{name:'RespawnTest',gender:'male',classId:'novice'},state:{...initialSave(),mapId:'field'},bag:{coins:0,items:{'soul-talisman':2}}};
 const peer=realm.join({uid:'death-test',serverId:'server-1',slotId:'slot-1',record,send:m=>messages.push(m)});
 return {realm,peer,record,messages};
}
test('dead players wait indefinitely, manual motion cannot revive them, and here preserves position',()=>{
 for(const roleSkills of [false,true]){
  const w=new CombatWorld({nav,spawn:{x:-5,z:-5},mobs:[],roleSkills,classId:'novice'});Object.assign(w.player,{x:3,z:4,hp:0});w.fall();
  for(let i=0;i<2400;i++)w.update(.05,{x:1,z:0,attack:true});
  assert.equal(w.player.hp,0);assert.equal(w.player.x,3);assert.equal(w.player.z,4);
  assert.equal(w.respawn(),true);assert.equal(w.player.hp,w.player.maxHp);assert.equal(w.player.mp,w.player.maxMp);assert.equal(w.player.x,3);assert.equal(w.auto,false);assert.equal(w.respawn(),false);
 }
});
test('online here is authoritative, rejects living users and duplicate requests without healing again',()=>{
 const {realm,peer:p,messages}=fixture();p.world.player.hp=0;p.world.fall();Object.assign(p.world.player,{x:3,z:4});
 assert.equal(realm.receive(p.id,{type:'respawn',id:'r1',seq:1,destination:'here'}),true);
 assert.equal(p.bag.items['soul-talisman'],1);assert.equal(p.world.player.hp,p.world.player.maxHp);assert.equal(p.world.player.x,3);assert.ok(messages.some(m=>m.type==='respawned'));assert.ok(messages.some(m=>m.type==='snapshot'&&m.self.player.hp>0));
 p.world.player.hp=20;realm.receive(p.id,{type:'respawn',id:'r2',seq:2,destination:'here'});assert.equal(p.world.player.hp,20);assert.equal(p.bag.items['soul-talisman'],1);assert.ok(messages.some(m=>m.type==='respawnError'));
});
test('death travel is only to the capital, needs death and spends no coins or incense',()=>{
 const {realm,peer:p}=fixture();assert.throws(()=>realm.travelDestination(p,'ayutthaya',{respawn:true}),/respawn-invalid/);
 p.world.player.hp=0;assert.throws(()=>realm.travelDestination(p,'field',{respawn:true}),/respawn-invalid/);assert.throws(()=>realm.travelDestination(p,'ayutthaya'),/travel-invalid/);
 const before=structuredClone(p.bag);assert.equal(realm.travelDestination(p,'ayutthaya',{respawn:true}).id,'ayutthaya');assert.deepEqual(p.bag,before);assert.equal(p.world.player.hp,0,'wait for the travel save to commit');
});
test('zero HP survives serialization and relog for novice and advanced role worlds',()=>{
 for(const roleSkills of [false,true]){
  const {realm,peer:p,record}=fixture(roleSkills);p.world.player.hp=0;p.world.fall();
  const next=new CombatWorld({nav,mobs:[]});restoreTraveler(next,serializeTraveler(p.world));assert.equal(next.player.hp,0);
  const saved=realm.record(p,record);realm.leave(p.id);const joined=realm.join({uid:'death-test',serverId:'server-1',slotId:'slot-1',record:saved,send(){}});assert.equal(joined.world.player.hp,0);
 }
});

test('missing revival item blocks both local revival commands without changing inventory or HP',()=>{
 const {realm,peer:p,messages}=fixture();p.bag.items={};p.world.player.hp=0;
 realm.receive(p.id,{type:'respawn',id:'empty',seq:1,destination:'here'});assert.equal(p.world.player.hp,0);assert.ok(messages.some(m=>m.type==='respawnError'&&m.code==='no-revival-item'));
 realm.receive(p.id,{type:'returnToSpawn',seq:2});assert.equal(p.world.player.hp,0);assert.deepEqual(p.bag.items,{});
 assert.equal(realm.travelDestination(p,'ayutthaya',{respawn:true}).id,'ayutthaya');
});
test('last revival talisman is removed and the deduction persists in the saved record',()=>{
 const {realm,peer:p,record}=fixture();p.bag.items={'soul-talisman':1};p.world.player.hp=0;
 realm.receive(p.id,{type:'respawn',id:'last',seq:1,destination:'here'});assert.equal(p.bag.items['soul-talisman'],undefined);assert.equal(realm.record(p,record).bag.items['soul-talisman'],undefined);
});

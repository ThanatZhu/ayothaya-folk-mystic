import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {spawnMonsterLoot,pickGroundLoot,stepGroundLoot,groundSnapshot} from '../server/ground-loot.js';
import {GROUND_LOOT} from '../ground-loot.js';
import {normalizePetAccount,petAccountAction} from '../pet-account.js';
import {PREMIUM_PETS} from '../premium-pets.js';
import {ITEMS,bagCap,normalizeBag} from '../items.js';
import {mergeBossLoot} from '../boss-results.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},map={id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],npcs:[],portals:[]};
const loot={coins:17,items:[{id:'rat-tooth',count:2}]};
function setup(extraMaps=[]){
 const realm=new RealmServer({catalog:{capital:'field',maps:[map,...extraMaps]},now:()=>1000000});
 const join=(name,options={})=>realm.join({uid:name,slotId:'slot-1',serverId:'server-1',record:{character:{name:name+'xx',gender:options.gender??'female',classId:options.classId??'novice'},state:{...initialSave(),mapId:options.mapId??'field'},daily:{day:'1970-01-01',streak:1}},send(){}});
 const tick=(seconds=1)=>{for(let i=0;i<seconds*20;i++){realm.clock+=.05;for(const room of realm.rooms.values())stepGroundLoot(realm,room,.05);}};
 return {realm,join,tick};
}
function equip(p,id='rice-rabbit'){
 let state=petAccountAction(null,{type:'petGrant',pet:id,gems:0,requestId:'grant-00001'}).state;
 p.petCollection=petAccountAction(state,{type:'petEquip',pet:id,requestId:'equip-00001'}).state;
}
const drop=(realm,p,at={x:4,z:0},reward=loot,receipt=null)=>{spawnMonsterLoot(realm,p,reward,at,receipt);return [...p.room.groundLoot.values()].at(-1);};
test('AUTO without an equipped owned pet never collects; manual pickup works and ignores client reward/position claims',()=>{
 const {realm,join,tick}=setup(),p=join('NoPet');p.world.auto=true;const d=drop(realm,p);
 tick(3);assert.equal(p.bag.coins,0);assert.equal(p.room.groundLoot.size,1);
 equip(p);p.petCollection.equipped=null;tick(2);assert.equal(p.bag.coins,0,'ownership alone is insufficient');
 assert.equal(realm.receive(p.id,{type:'pickupLoot',seq:1,dropId:d.id,x:4,z:0,coins:999999}),false,'client coordinates are ignored');
 Object.assign(p.world.player,{x:4,z:0});
 assert.equal(realm.receive(p.id,{type:'pickupLoot',seq:2,dropId:d.id,coins:999999,items:[{id:'king-ember',count:999}]}),true);
 assert.equal(p.bag.coins,17);assert.equal(p.bag.items['rat-tooth'],2);assert.equal(p.bag.items['king-ember'],undefined);
 assert.equal(realm.receive(p.id,{type:'pickupLoot',seq:3,dropId:d.id}),false);assert.equal(p.bag.coins,17);
});
test('equipping a companion collects without combat AUTO or a pickup key; resting, dead and observers cannot collect',()=>{
 const {realm,join,tick}=setup(),p=join('Pet');equip(p);const d=drop(realm,p,{x:7,z:0});
 assert.equal(p.world.auto,false);tick(.5);
 assert.ok(p.groundPet.x>0&&p.groundPet.x<7,'travelling, not instant vacuum');assert.equal(p.bag.coins,0);
 tick(2);assert.equal(p.bag.coins,17);assert.equal(p.room.groundLoot.has(d.id),false);tick(3);assert.ok(Math.hypot(p.groundPet.x-p.world.player.x,p.groundPet.z-p.world.player.z)<2,'returns to owner');
 assert.equal(p.world.auto,false,'collection never turns combat AUTO on');
 for(const state of ['dead','observer','rest','busy']){
  drop(realm,p,{x:4,z:0});p.world.player.hp=state==='dead'?0:100;p.observer=state==='observer';p.petCollection.equipped=state==='rest'?null:'rice-rabbit';p.mailMutationBusy=state==='busy';
  tick(1);assert.equal(p.bag.coins,17,state);p.room.groundLoot.clear();
 }
});
test('all ten owned companions collect for every class and gender without changing their stats or skill-auto preference',()=>{
 for(const id of PREMIUM_PETS.map(p=>p.id))for(const classId of ['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'])for(const gender of ['female','male'])for(const combatAuto of [false,true]){
  const {realm,join,tick}=setup(),p=join('Collector',{classId,gender});equip(p,id);p.petCollection.auto=false;p.world.auto=combatAuto;
  const account=structuredClone(p.petCollection);drop(realm,p,{x:3,z:0});tick(3);
  assert.equal(p.bag.coins,17,id+'/'+classId+'/'+gender);assert.deepEqual(p.petCollection,account);
 }
});
test('priority belongs to killer and captured party, becomes public later, and cannot cross map/channel or be forged',()=>{
 const {realm,join}=setup([{...map,id:'other'}]),a=join('A'),b=join('B'),c=join('C'),elsewhere=join('D',{mapId:'other'});
 a.partyId=b.partyId='party';realm.parties.set('party',{members:new Set([a.id,b.id])});
 const d=drop(realm,a,{x:0,z:0});assert.equal(pickGroundLoot(realm,c,d.id),'reserved');assert.equal(pickGroundLoot(realm,elsewhere,d.id),'gone');
 assert.equal(pickGroundLoot(realm,b,d.id),null);assert.equal(b.bag.coins,17);assert.equal(a.bag.coins,0);
 const e=drop(realm,a,{x:0,z:0});realm.clock=GROUND_LOOT.priority+.01;assert.equal(pickGroundLoot(realm,c,e.id),null);assert.equal(c.bag.coins,17);
 c.observer=true;const f=drop(realm,c,{x:0,z:0});assert.equal(pickGroundLoot(realm,c,f.id),'unavailable');
});
test('two pets cannot duplicate a party drop; unequipping stops collection and combat AUTO is independent',()=>{
 const {realm,join,tick}=setup(),a=join('A'),b=join('B');equip(a);equip(b);
 a.partyId=b.partyId='p';realm.parties.set('p',{members:new Set([a.id,b.id])});drop(realm,a,{x:5,z:0});tick(3);
 assert.equal(a.bag.coins+b.bag.coins,17);
 b.petCollection.equipped=null;drop(realm,a,{x:9,z:0});tick(.2);a.petCollection.equipped=null;tick(3);assert.equal(a.bag.coins+b.bag.coins,17);
 equip(a);a.world.auto=true;tick(.2);a.world.auto=false;tick(3);assert.equal(a.bag.coins+b.bag.coins,34,'turning combat AUTO off does not stop the pet');
});
test('ground pickup uses bag-full mail, blocks active mail transactions, and boss receipts resolve on pickup or expiration',()=>{
 const {realm,join,tick}=setup(),p=join('Full');
 const valid=Object.keys(normalizeBag({coins:0,items:Object.fromEntries(Object.keys(ITEMS).filter(id=>id!=='king-ember'&&ITEMS[id].kind!=='gear').map(id=>[id,1]))},999).items);
 p.bag={coins:0,items:Object.fromEntries(valid.slice(0,bagCap(p.bag)).map(id=>[id,1]))};
 const receipt={encounterId:'boss',rows:[]},d=drop(realm,p,{x:0,z:0},{coins:0,items:[{id:'king-ember',count:1}]},receipt);
 assert.equal(receipt.rows[0].status,'ground');p.mailMutationBusy=true;assert.equal(pickGroundLoot(realm,p,d.id),'busy');assert.equal(p.room.groundLoot.size,1);
 p.mailMutationBusy=false;assert.equal(pickGroundLoot(realm,p,d.id),null);assert.equal(p.bag.items['king-ember'],undefined);
 assert.equal(p.mailbox.messages[0].attachments.items[0].count,1);
 const update=p.room.events.find(e=>e.type==='bossLoot');assert.equal(update.rows[0].status,'mailed');
 assert.equal(mergeBossLoot({encounterId:'boss',rewards:receipt.rows},update).rewards[0].status,'mailed');
 const e=drop(realm,p,{x:0,z:0},{coins:0,items:[{id:'king-ember',count:1}]},{encounterId:'late',rows:[]});tick(91);
 assert.equal(p.room.groundLoot.has(e.id),false);assert.equal(p.room.events.find(x=>x.encounterId==='late').rows[0].status,'expired');
});
test('snapshots delta ground drops, clear stale entries, omit private ownership keys, and preserve reservations across reconnect ids',()=>{
 const {realm,join}=setup(),p=join('PrivateOwner'),other=join('Viewer'),d=drop(realm,p,{x:0,z:0});
 const first=groundSnapshot(realm,p,false);assert.equal(first.reset,true);assert.equal(first.upserts.length,1);assert.deepEqual(groundSnapshot(realm,p,true).upserts,[]);
 const encoded=JSON.stringify(groundSnapshot(realm,other,false));assert.ok(!encoded.includes(p.key));assert.ok(!encoded.includes('priorityKeys'));assert.ok(!encoded.includes('receipt'));
 p.room.groundLoot.delete(d.id);assert.deepEqual(groundSnapshot(realm,p,true).removed,[d.id]);
 const next=drop(realm,p,{x:0,z:0});realm.leave(p.id);const again=join('PrivateOwner');assert.equal(pickGroundLoot(realm,again,next.id),null,'stable character key survives reconnect');
});
test('unreachable drops across water stay on ground and pets stay on walkable land',()=>{
 const {realm,join,tick}=setup(),p=join('Bank');p.room.map={...map,nav:{zones:[{x:-2,z:-2,w:4,d:4},{x:5,z:-2,w:4,d:4}],obstacles:[],props:[]}};
 p.world.nav=p.room.map.nav;equip(p);p.world.auto=true;const d=drop(realm,p,{x:6,z:0});tick(3);assert.equal(p.bag.coins,0);assert.equal(p.room.groundLoot.has(d.id),true);assert.ok(p.groundPet.x<2);
 Object.assign(p.world.player,{x:2,z:0});assert.equal(pickGroundLoot(realm,p,d.id),'far');
});
test('direct quest/login/mail rewards stay direct and ground expiry is bounded room memory',()=>{
 const {realm,join}=setup(),p=join('Rewards');realm.grantLoot(p,loot);assert.equal(p.bag.coins,17);assert.equal(p.room.groundLoot,undefined);
 for(let i=0;i<GROUND_LOOT.maxDrops+4;i++)drop(realm,p,{x:0,z:0});
 assert.equal(p.room.groundLoot.size,GROUND_LOOT.maxDrops);assert.equal(p.saveNow,false,'ground spawns do not create new durable writes');
});

test('remote observers see current pet travel in snapshots and delta packets remain quiet while drops are unchanged',()=>{
 const {realm,join,tick}=setup(),p=join('Walker'),viewer=join('Watcher');equip(p);p.world.auto=true;drop(realm,p,{x:7,z:0});tick(.4);
 const first=realm.snapshot(viewer),remote=first.players.find(a=>a.id===p.id);assert.equal(remote.petMotion.id,'rice-rabbit');assert.equal(remote.petMotion.mode,'collect');
 assert.ok(remote.petMotion.x>0);const own=realm.snapshot(p).self.groundPet;assert.equal(own.x,remote.petMotion.x);
 const initial=groundSnapshot(realm,p,false);realm.clock+=1;assert.deepEqual(groundSnapshot(realm,p,true).upserts,[],'absolute expiry times do not resend each tick');
 assert.ok(initial.upserts.length);
 p.world.auto=false;tick(.05);assert.ok(realm.snapshot(viewer).players.find(a=>a.id===p.id).petMotion.targetId,'combat AUTO off still collects');p.petCollection.equipped=null;tick(.05);assert.equal(realm.snapshot(viewer).players.find(a=>a.id===p.id).petMotion,null);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {dungeonWorld} from './helpers/dungeon.mjs';
import {dungeonReservation} from '../server/dungeon-runs.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {dungeonById} from '../dungeons.js';

const D=dungeonById('krasue'),R=D.rooms;
const idOf=m=>MONSTER_TYPES[m.type].id;
const live=p=>p.room.mobs.filter(m=>m.hp>0);
const killAll=(realm,p)=>{for(const m of live(p)){m.hp=1;realm.hurt(p,m,1e6);}};
const at=(p,pt)=>Object.assign(p.world.player,{x:pt.x,z:pt.z});
const safe=p=>{p.world.player.maxHp=p.world.player.hp=1e9;};

test('a section wakes when the team walks in; waves follow one another; clearing opens the gate and seals nothing behind',()=>{
 const w=dungeonWorld(),[a,b]=w.enter([w.join('เอ'),w.join('บี')]);safe(a);safe(b);
 w.run(.2);assert.equal(live(a).length,0,'nothing until someone walks in');at(a,R[0].center);w.run(.2);assert.equal(live(a).length,4);assert.ok(live(a).every(m=>idOf(m)==='dg35-krasue-wisp'));
 const run=dungeonReservation(w.realm,a.key);
 assert.equal(live(a)[0].maxHp,Math.round(MONSTER_TYPES.find(t=>t.id==='dg35-krasue-wisp').hp*.6),'2 players: HP x .6');
 killAll(w.realm,a);w.run(.2);assert.equal(live(a).length,5,'wave 2');
 killAll(w.realm,a);w.run(.2);killAll(w.realm,a);w.run(.2);assert.equal(live(a).length,0);
 assert.equal(run.roomIndex,1);assert.match(w.events(a,'dungeonRun').at(-1).text,/ประตูวิญญาณ/);
 at(b,R[2].center);w.run(.1);assert.ok(Math.hypot(b.world.player.x-R[1].hold.x,b.world.player.z-R[1].hold.z)<1,'a sealed section sends you back');
});
test('a lantern lights after 3 seconds of standing beside it, and four open the door',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);safe(a);const run=dungeonReservation(w.realm,a.key);
 run.roomIndex=1;run.state={};w.run(.1);
 at(a,R[1].lanterns[0]);w.run(2.8);assert.equal(run.state.lit[0],false);
 w.run(.4);assert.equal(run.state.lit[0],true);
 w.run(5);assert.ok(live(a).some(m=>idOf(m)==='dg35-krahang'),'krahang swoop in every 8 s while lanterns burn');
 for(const l of R[1].lanterns.slice(1)){at(a,l);w.run(3.2);}
 assert.equal(live(a).length,0,'the krahang vanish when the last lantern lights');
 w.run(.1);assert.equal(run.roomIndex,2,'four lanterns open the gate');
});
test('the krahang chief calls two helpers once at half HP',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);safe(a);const run=dungeonReservation(w.realm,a.key);
 run.roomIndex=2;run.state={};at(a,R[2].center);w.run(.1);
 const chief=live(a).find(m=>idOf(m)==='dg35-krahang-chief');assert.ok(chief);
 chief.hp=Math.floor(chief.maxHp*.49);w.run(.2);w.run(.2);
 assert.equal(live(a).filter(m=>idOf(m)==='dg35-krahang').length,2);
});
test('the boss turns into her krasue form at half HP and the room never clears in between; a wipe resets her',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')],'hell');const run=dungeonReservation(w.realm,a.key);
 run.roomIndex=3;run.state={};at(a,R[3].center);safe(a);w.run(3.3);
 const boss=live(a).find(m=>idOf(m)==='dg35-mae-krasue');assert.ok(boss,'boss appears after the delay');
 boss.hp=Math.floor(boss.maxHp*.5)-1;w.run(.1);
 assert.equal(boss.hp,0);const head=live(a).find(m=>idOf(m)==='dg35-mae-krasue-head');assert.ok(head);
 assert.ok(dungeonReservation(w.realm,a.key),'still running');
 w.run(10.2);assert.ok(live(a).some(m=>idOf(m)==='dg35-khamot'),'hell adds khamot');
 a.world.player.hp=0;w.run(.2);
 assert.equal(live(a).filter(m=>idOf(m)==='dg35-mae-krasue-head').length,0,'no head left after the wipe');
 assert.ok(a.world.player.hp>0);at(a,R[3].center);w.run(3.4);assert.ok(live(a).some(m=>idOf(m)==='dg35-mae-krasue'&&m.hp===m.maxHp),'phase 1 again at full HP');
});
test('normal runs have no khamot adds; monsters hit harder on hell',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);const run=dungeonReservation(w.realm,a.key);
 run.roomIndex=3;run.state={};at(a,R[3].center);safe(a);w.run(15);
 assert.ok(!live(a).some(m=>idOf(m)==='dg35-khamot'));
 assert.equal(live(a).find(m=>idOf(m)==='dg35-mae-krasue').power,1);
});
test('down in a dungeon: no item respawn and no free trip to the capital',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);a.world.player.hp=0;a.bag.items['soul-talisman']=3;
 w.realm.receive(a.id,{type:'respawn',seq:5000,destination:'here'});assert.equal(a.world.player.hp,0);
 w.realm.receive(a.id,{type:'returnToSpawn',seq:5001});assert.equal(a.world.player.hp,0);
 assert.throws(()=>w.realm.travelDestination(a,w.realm.catalog.capital,{respawn:true}),/dungeon-down/);
});
test('killing the boss clears the run',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);const run=dungeonReservation(w.realm,a.key);
 run.roomIndex=3;run.state={};at(a,R[3].center);safe(a);w.run(3.3);
 const boss=live(a).find(m=>idOf(m)==='dg35-mae-krasue');boss.hp=Math.floor(boss.maxHp*.4);w.run(.1);
 const head=live(a).find(m=>idOf(m)==='dg35-mae-krasue-head');head.hp=1;w.realm.hurt(a,head,1e6);w.run(.1);
 assert.equal(dungeonReservation(w.realm,a.key),null);assert.equal(w.events(a,'dungeonEnded').at(-1)?.cleared,true);
});
test('dungeon monsters rush the nearest player however far, with no leash',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);safe(a);at(a,R[0].center);w.run(.2);
 const m=live(a)[0];assert.equal(m.rush,true);
 at(a,{x:0,z:52});const far=()=>Math.hypot(m.x-a.world.player.x,m.z-a.world.player.z),before=far();
 w.run(8);assert.ok(m.aggro,'still chasing');assert.ok(far()<before-2,'closed in: '+before+' → '+far());
 assert.ok(Math.hypot(m.x-m.home.x,m.z-m.home.z)>10,'well past the 9 m leash of field monsters');
});

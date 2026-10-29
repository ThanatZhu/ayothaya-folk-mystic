import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {RealmServer} from '../server/realm.js';import {arenaCommand,arenaReservation,ARENA_MAP} from '../server/arena-rooms166.js';
import {initialSave} from '../realm-state.js';import {walkable} from '../combat-core.js';import {warpCost} from '../world-state.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url))),arena=catalog.maps.find(m=>m.id===ARENA_MAP);
function setup(){let now=10000;const r=new RealmServer({catalog,now:()=>now,roleSkills:true});
 const record=(name,mapId='ayutthaya')=>({character:{name,gender:'male',classId:'swordsman'},state:{...initialSave(),mapId},bag:{items:{},coins:100}});
 const join=(name,serverId='server-1',rec=record(name))=>r.join({uid:name,serverId,slotId:'slot-1',channel:1,record:rec,send(){}});
 const enter=p=>{const rec=r.record(p,record(p.uid));assert.equal(r.travelDestination(p,ARENA_MAP).id,ARENA_MAP);r.leave(p.id,{travel:true});rec.state.mapId=ARENA_MAP;return join(p.uid,p.serverId,rec);};
 return {r,join,enter,record,advance:ms=>now+=ms};}
test('small circular arena has no monsters, respects body clearance and cannot be warped into',()=>{
 assert.ok(arena.bounds.w<=30);assert.deepEqual(arena.mobs,[]);assert.equal(walkable(10,0,.32,arena.nav),true);assert.equal(walkable(8,8,.32,arena.nav),false);assert.equal(walkable(10.9,0,.32,arena.nav),false);assert.equal(warpCost(catalog,'ayutthaya',ARENA_MAP),null);
});
test('lobby membership, realm isolation, 2-seat capacity and private instances are authoritative',()=>{
 const {r,join,enter}=setup();let a=join('Alice'),b=join('Bobby'),c=join('Carol'),d=join('David'),other=join('Other','server-2');
 assert.throws(()=>r.travelDestination(c,ARENA_MAP),/arena-not-ready/);
 const first=arenaCommand(r,a,{action:'create'}).mine.id;assert.throws(()=>arenaCommand(r,other,{action:'join',room:first}),/arena-full/);
 arenaCommand(r,b,{action:'join',room:first});assert.throws(()=>arenaCommand(r,c,{action:'join',room:first}),/arena-full/);
 const second=arenaCommand(r,c,{action:'create'}).mine.id;arenaCommand(r,d,{action:'join',room:second});
 a=enter(a);b=enter(b);c=enter(c);d=enter(d);assert.equal(a.room,b.room);assert.equal(c.room,d.room);assert.notEqual(a.room,c.room);assert.equal(a.world.mobs.length,0);assert.equal(a.world.player.x,-5);assert.equal(b.world.player.x,5);
 assert.equal(r.receive(a.id,{type:'duel',seq:1,target:b.id}),false);assert.equal(a.duel,undefined);
 arenaCommand(r,a,{action:'ready'});assert.equal(a.duel,undefined);arenaCommand(r,b,{action:'ready'});assert.equal(a.duel.foe,b.id);assert.equal(c.duel,undefined);
 const random=Math.random;try{Math.random=()=>.99;r.hurt(a,a.world.foe,1e6);}finally{Math.random=random;}assert.equal(b.world.player.hp,1);assert.equal(a.duel,null);assert.match(arenaReservation(r,a.key).result,/Alice/);
 arenaCommand(r,a,{action:'ready'});arenaCommand(r,b,{action:'ready'});assert.ok(a.duel);r.travelDestination(b,'ayutthaya');assert.equal(a.duel,null);r.leave(b.id,{travel:true});assert.equal(arenaReservation(r,a.key).members.length,1);assert.throws(()=>arenaCommand(r,a,{action:'ready'}),/arena-not-ready/);
});
test('pending seats expire, disconnected seats clean up, restart returns stranded players to capital',()=>{
 const {r,join,enter,record,advance}=setup();let a=join('Alice');arenaCommand(r,a,{action:'create'});advance(120001);arenaCommand(r,a,{action:'list'});assert.equal(arenaReservation(r,a.key),undefined);
 arenaCommand(r,a,{action:'create'});a=enter(a);r.suspend(a.id);advance(21000);r.step(.05);assert.equal(arenaReservation(r,a.key),undefined);
 const b=join('Bobby','server-1',record('Bobby',ARENA_MAP));assert.equal(b.room.map.id,catalog.capital);assert.deepEqual({x:b.world.player.x,z:b.world.player.z},catalog.maps.find(m=>m.id===catalog.capital).spawn);
});

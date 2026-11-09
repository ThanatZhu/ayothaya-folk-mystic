import test from 'node:test';import assert from 'node:assert/strict';
import {dungeonWorld} from './helpers/dungeon.mjs';
import {dungeonReservation,grantRunRewards} from '../server/dungeon-runs.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {dungeonById} from '../dungeons.js';

const D=dungeonById('krasue');
test('review: no crafting while a mail or auction save is in flight or a trade is open',()=>{
 const w=dungeonWorld(),a=w.join('เอ');a.bag.items[D.shard]=500;a.mailMutationBusy=true;
 const craft=()=>w.realm.receive(a.id,{type:'craft',item:'dg-krasue-head-r',seq:a.seq+1,times:1});
 craft();assert.equal(a.bag.items[D.shard],500);
 a.mailMutationBusy=false;a.trade={};craft();assert.equal(a.bag.items[D.shard],500);
});
test('review: only members inside the run room are paid, and the only way out of a dungeon is home',()=>{
 const w=dungeonWorld(),a=w.join('เอ'),b=w.join('บี');w.party(a,b);
 w.cmd(a,{action:'enter',dungeon:'krasue',difficulty:'normal'});w.cmd(b,{action:'ready',yes:true});
 const a2=w.move(a,D.map);w.realm.dungeonRandom=()=>.99;   // บี said yes but never travelled in
 grantRunRewards(w.realm,dungeonReservation(w.realm,a2.key));
 assert.equal(a2.bag.items[D.shard],1);assert.ok(!b.bag.items[D.shard],'not inside, not paid');
 a2.bag.items['return-incense']=1;assert.throws(()=>w.realm.travelDestination(a2,w.realm.catalog.capital),/dungeon-use-exit/);
});
test('review: an abandoned run frees its room',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);const roomId=a.room.id;
 w.realm.leave(a.id);assert.ok(w.realm.rooms.has(roomId),'kept while the run lives');
 w.tick(11*60e3);w.tick(50);assert.equal(dungeonReservation(w.realm,a.key),null);assert.equal(w.realm.rooms.has(roomId),false);
});
test('review: a one-hit kill on the phase-1 boss still brings out her krasue form',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);const run=dungeonReservation(w.realm,a.key);
 run.roomIndex=3;run.state={};Object.assign(a.world.player,D.rooms[3].center,{maxHp:1e9,hp:1e9});w.run(3.3);
 const boss=a.room.mobs.find(m=>m.hp>0);boss.hp=0;boss.dead=1e9;w.run(.1);
 assert.ok(a.room.mobs.some(m=>m.hp>0&&MONSTER_TYPES[m.type].id==='dg35-mae-krasue-head'));
});
test('review: the queue never matches players of different servers',()=>{
 const w=dungeonWorld(),ps=['ก่า','ข่า','ค่า','ง่า','จ่า'].map(n=>w.join(n));ps[4].serverId='server-2';
 ps.forEach(p=>w.cmd(p,{action:'queue',dungeon:'krasue',difficulty:'normal'}));w.run(.1);
 assert.equal(w.realm.dungeonQueue.size,5,'4 + 1 on another server is not 5');
});
test('review: one open ready check per leader',()=>{
 const w=dungeonWorld(),a=w.join('เอ'),b=w.join('บี');w.party(a,b);
 w.cmd(a,{action:'enter',dungeon:'krasue',difficulty:'normal'});w.cmd(a,{action:'enter',dungeon:'krasue',difficulty:'normal'});
 assert.equal(w.events(b,'dungeonReady').length,1);assert.equal(w.events(a,'dungeonError').at(-1)?.reason,'dungeon-checking');
});

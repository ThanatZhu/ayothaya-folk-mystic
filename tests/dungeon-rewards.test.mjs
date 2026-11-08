import test from 'node:test';import assert from 'node:assert/strict';
import {dungeonWorld} from './helpers/dungeon.mjs';
import {dungeonReservation,grantRunRewards,exchangeShards} from '../server/dungeon-runs.js';
import {dungeonById} from '../dungeons.js';
import {itemDef} from '../items.js';

const D=dungeonById('krasue');
const pieces=p=>Object.entries(p.bag.items).filter(([id,n])=>n>0&&itemDef(id)?.dungeonSet).map(([id])=>id);
const clear=(w,ps,difficulty,rand)=>{const inside=w.enter(ps,difficulty);w.realm.dungeonRandom=rand;const run=dungeonReservation(w.realm,inside[0].key);grantRunRewards(w.realm,run);return inside;};

test('every member gets shards by difficulty, outside the chest limit',()=>{
 const w=dungeonWorld(),[a,b]=clear(w,[w.join('เอ'),w.join('บี')],'hell',()=>.99);
 for(const p of [a,b])assert.equal(p.bag.items[D.shard],3);
 const r=w.events(a,'dungeonReward').at(-1);assert.equal(r.shards,3);assert.equal(r.chestsLeft,2);
});
test('a full party of 5 always finds a piece; the colour follows the difficulty table',()=>{
 const w=dungeonWorld(),ps=clear(w,['เอ','บี','ซี','ดี','อี'].map(n=>w.join(n)),'hell',()=>0);
 for(const p of ps){const [id]=pieces(p);assert.ok(id,p.character.name);assert.equal(itemDef(id).grade??0,2,'hell, roll 0 → purple');}
});
test('solo: half the piece chance; shards still come',()=>{
 const w=dungeonWorld(),[a]=clear(w,[w.join('เอ')],'normal',()=>.6);
 assert.equal(pieces(a).length,0);assert.equal(a.bag.items[D.shard],1);
});
test('three chests a Thai day per dungeon, then shards only; a new day resets it',()=>{
 const w=dungeonWorld(),a=w.join('เอ');w.realm.dungeonRandom=()=>0;
 let p=a;for(let i=0;i<4;i++){[p]=w.enter([p]);grantRunRewards(w.realm,dungeonReservation(w.realm,p.key));w.cmd(p,{action:'leave'});p=w.move(p,'rice-fields');}
 const total=q=>pieces(q).reduce((n,id)=>n+q.bag.items[id],0);assert.equal(total(p),3);assert.equal(p.bag.items[D.shard],4);assert.equal(p.dungeonChests.counts.krasue,3,'the count survives travel (saved on the record)');
 w.tick(24*3600e3);[p]=w.enter([p]);grantRunRewards(w.realm,dungeonReservation(w.realm,p.key));assert.equal(total(p),4);
});
test('a full bag sends the piece to mail, never lost',()=>{
 const w=dungeonWorld(),a=w.join('เอ');
 for(let i=0;i<200;i++)a.bag.items['fill-'+i]=1;   // more distinct stacks than any bag holds
 const [p]=w.enter([a]);w.realm.dungeonRandom=()=>0;const before=p.mailbox?.length??0;
 grantRunRewards(w.realm,dungeonReservation(w.realm,p.key));
 assert.ok(pieces(p).length||(p.mailbox?.length??0)>before);
});
test('500 shards buy one rainbow piece of the chosen slot',()=>{
 const w=dungeonWorld(),a=w.join('เอ');a.bag.items[D.shard]=499;
 assert.throws(()=>exchangeShards(w.realm,a,{dungeon:'krasue',slot:'head'}),/not-enough/);
 a.bag.items[D.shard]=500;assert.throws(()=>exchangeShards(w.realm,a,{dungeon:'krasue',slot:'weapon'}),/bad-slot/);
 exchangeShards(w.realm,a,{dungeon:'krasue',slot:'head'});
 assert.equal(a.bag.items['dg-krasue-head-r'],1);assert.ok(!a.bag.items[D.shard]);
});
test('the boss kill pays the rewards through finishRun',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);const run=dungeonReservation(w.realm,a.key);w.realm.dungeonRandom=()=>.99;
 run.roomIndex=3;run.state={};Object.assign(a.world.player,D.rooms[3].start,{maxHp:1e9,hp:1e9});w.run(3.3);
 const boss=a.room.mobs.find(m=>m.hp>0);boss.hp=Math.floor(boss.maxHp*.4);w.run(.1);
 const head=a.room.mobs.find(m=>m.hp>0);head.hp=1;w.realm.hurt(a,head,1e6);w.run(.1);
 assert.equal(a.bag.items[D.shard],1);
});

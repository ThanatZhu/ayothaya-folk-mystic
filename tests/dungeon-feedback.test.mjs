import test from 'node:test';import assert from 'node:assert/strict';
import {dungeonWorld} from './helpers/dungeon.mjs';
import {dungeonReservation,grantRunRewards} from '../server/dungeon-runs.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {dungeonById,DIFFICULTY} from '../dungeons.js';

const D=dungeonById('krasue'),R=D.rooms;
const live=p=>p.room.mobs.filter(m=>m.hp>0);
const killAll=(w,p)=>{for(const m of live(p)){m.hp=1;w.realm.hurt(p,m,1e6);}};
const at=(p,pt)=>Object.assign(p.world.player,{x:pt.x,z:pt.z});
const safe=p=>{p.world.player.maxHp=p.world.player.hp=1e9;};

// owner 9 Nov: every clear pays cowries and refine stones (random kind and amount), not only the chest
test('every clear pays cowries and random refine stones, even after the three chests',()=>{
 const w=dungeonWorld();let p=w.join('เอ');
 const coins=()=>p.bag.coins,stones=()=>(p.bag.items['iron-ore']??0)+(p.bag.items['laterite']??0);
 for(let i=0;i<4;i++){[p]=w.enter([p],'hell');w.realm.dungeonRandom=()=>i%2?.99:0;const c0=coins(),s0=stones();
  grantRunRewards(w.realm,dungeonReservation(w.realm,p.key));
  assert.equal(coins()-c0,Math.round(D.level*40*DIFFICULTY.hell.mul),'cowries on clear '+(i+1));
  assert.ok(stones()-s0>=1&&stones()-s0<=DIFFICULTY.hell.shards+1,'stones on clear '+(i+1));
  w.cmd(p,{action:'leave'});p=w.move(p,'rice-fields');}
 assert.ok(p.bag.items['iron-ore']>0&&p.bag.items['laterite']>0,'both kinds turn up');
});
test('the boss result panel lists what the dungeon paid',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);const run=dungeonReservation(w.realm,a.key);w.realm.dungeonRandom=()=>0;
 run.roomIndex=3;run.state={};at(a,R[3].center);safe(a);w.run(3.3);
 const grants=[],grant=w.realm.grantLoot.bind(w.realm);w.realm.grantLoot=(p,loot,at,receipt)=>{grants.push({loot,receipt});return grant(p,loot,at,receipt);};
 const boss=live(a)[0];boss.hp=Math.floor(boss.maxHp*.4);w.run(.1);
 const head=live(a).find(m=>MONSTER_TYPES[m.type].id==='dg35-mae-krasue-head');head.hp=1;w.realm.hurt(a,head,1e6);w.run(.1);
 const paid=grants.find(g=>g.loot.items.some(i=>i.id===D.shard));
 assert.ok(paid,'the dungeon paid out');assert.ok(paid.receipt?.encounterId,'tied to the boss encounter, so the result panel lists it');
});
test('lanterns are lit with a button press beside them; each one calls a wave that must fall before the next',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ')]);safe(a);const run=dungeonReservation(w.realm,a.key);
 run.roomIndex=1;run.state={};at(a,R[1].center);w.run(.1);
 const L=R[1].lanterns,beside=l=>({x:l.x+1.2,z:l.z});
 w.cmd(a,{action:'lantern',index:0});assert.equal(w.events(a,'dungeonError').at(-1)?.reason,'dungeon-far');
 at(a,beside(L[0]));w.cmd(a,{action:'lantern',index:0});w.run(.1);
 assert.equal(run.state.lit[0],true);assert.ok(live(a).length>0,'the first lantern calls a wave');
 at(a,beside(L[1]));w.cmd(a,{action:'lantern',index:1});assert.equal(w.events(a,'dungeonError').at(-1)?.reason,'dungeon-wave');assert.equal(run.state.lit[1],false);
 for(let i=1;i<4;i++){killAll(w,a);w.run(.1);at(a,beside(L[i]));w.cmd(a,{action:'lantern',index:i});w.run(.1);assert.equal(run.state.lit[i],true,'lantern '+i);}
 assert.equal(run.roomIndex,1,'the last wave still stands');
 killAll(w,a);w.run(.2);assert.equal(run.roomIndex,2,'four lanterns and four waves open the gate');
});

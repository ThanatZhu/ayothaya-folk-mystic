import test from 'node:test';import assert from 'node:assert/strict';
import {RECIPES,craft,craftable} from '../crafting.js';
import {ITEMS,DROPS,rollLoot,BAG_SLOTS} from '../items.js';
import {FRONTIER_MONSTERS} from '../monster-catalog.js';
import {CONQUEST_SHARD,AMULET_CRAFT_SHARDS,conquestCount,conquestBoss,rainbowRecipe} from '../rainbow-crafting.js';
import {craftSources} from '../craft-view176.js';
import {warRound,warContribution,warRankings,finishWarRound} from '../guild-war-rewards.js';
import {drainWarMailbox} from '../server/war-mail.js';
import {deliverMail} from '../mailbox.js';
test('rainbow recipes use 50000 shards for amulets and 100 for other gear; original materials and 1m fee remain atomic',()=>{
 const gear=Object.entries(ITEMS).filter(([,i])=>i.kind==='gear'&&i.rainbow);assert.equal(gear.length,44);
 for(const [id,it]of gear){const recipes=RECIPES.filter(r=>r.out===id);assert.equal(recipes.length,1,id);const old=it.bossSet?(it.slot==='weapon'?{'shard-soul':40,'shard-gem':25,'shard-divine':10}:{'shard-soul':20,'shard-gem':12,'shard-divine':5}):{};assert.deepEqual(recipes[0].needs,{...old,[CONQUEST_SHARD]:it.amulet?AMULET_CRAFT_SHARDS:100});assert.equal(recipes[0].coins,1000000);assert.equal(recipes[0].count,1);}
 const original={'iron-ore':12,'lek-lai':4};assert.deepEqual(rainbowRecipe('test',original).needs,{...original,[CONQUEST_SHARD]:100});assert.deepEqual(original,{'iron-ore':12,'lek-lai':4});
 const out=gear[0][0],needs=RECIPES.find(r=>r.out===out).needs,bag={coins:2000000,items:Object.fromEntries(Object.entries(needs).map(([id,n])=>[id,n*2]))},before=structuredClone(bag);
 const made=craft(bag,out,2);assert.equal(made.bag.coins,0);assert.equal(made.bag.items[CONQUEST_SHARD],undefined);assert.equal(made.bag.items[out],2);assert.deepEqual(bag,before);
 assert.throws(()=>craft({coins:999999,items:{[CONQUEST_SHARD]:100}},out),/no-coins/);
 assert.throws(()=>craft({coins:1000000,items:{[CONQUEST_SHARD]:99}},out),/no-material/);
 assert.throws(()=>craft({coins:1000000,items:{[CONQUEST_SHARD]:100}},out),/no-material/);
 for(const id of ['shard-soul','shard-gem','shard-divine']){const items={...needs};items[id]--;assert.throws(()=>craft({coins:1000000,items},out),/no-material/);}
 const craftId=gear.find(([,it])=>!it.bossSet)[0],full={coins:1000000,items:{[CONQUEST_SHARD]:AMULET_CRAFT_SHARDS+1,...Object.fromEntries(Object.keys(ITEMS).filter(id=>![craftId,CONQUEST_SHARD].includes(id)).slice(0,BAG_SLOTS-1).map(id=>[id,1]))}},copy=structuredClone(full);
 assert.throws(()=>craft(full,craftId),/bag-full/);assert.deepEqual(full,copy);assert.equal(craftable(bag,RECIPES.find(r=>r.out===out)),2);
});
test('only MVP/world bosses drop 1–3 once, unaffected by additional loot rolls',()=>{
 assert.equal(conquestCount(()=>0),1);assert.equal(conquestCount(()=>1),3);
 const bosses=FRONTIER_MONSTERS.filter(conquestBoss);assert.ok(bosses.length>5);
 for(const m of FRONTIER_MONSTERS)assert.equal(!!DROPS[m.id]?.items.some(([id])=>id===CONQUEST_SHARD),conquestBoss(m),m.id);
 for(const random of [()=>0,()=>.99999])for(const rolls of [1,2,4])for(const boss of bosses){const items=rollLoot(boss.id,random,null,rolls).items.filter(i=>i.id===CONQUEST_SHARD);assert.equal(items.length,1,boss.id);assert.equal(items[0].count,random()===0?1:3);}
 assert.ok(craftSources(CONQUEST_SHARD).some(s=>s.kind==='event'));assert.ok(craftSources(CONQUEST_SHARD).some(s=>s.kind==='drop'));
});
const g=id=>({id,name:id}),p=(id,guildId)=>({key:id,uid:id,slotId:'slot-1',serverId:'server-1',guildId,character:{name:id}});
const setup=()=>{const r=warRound(null,123,'defender');for(const [id,damage]of [['defender',0],['a',90],['b',80],['c',70]])warContribution(r,p(id,id),g(id),{damage});warContribution(r,p('support','a'),g('a'));return r;};
test('holder is first, other podium guilds use real stone damage; participants lock to first guild',()=>{
 const round=setup();warContribution(round,p('spectator','a'),g('a'),{damage:0});delete round.participants.spectator;
 warContribution(round,{...p('observer','a'),observer:true},g('a'),{damage:9999});warContribution(round,p('a','b'),g('b'),{damage:9999});
 assert.deepEqual(warRankings(round).map(g=>g.id),['defender','a','b','c']);assert.equal(round.guilds.b.damage,80);
 const {board}=finishWarRound(null,round,'server-1',1000,()=>.9999);assert.equal(board.active,null);assert.deepEqual(board.last.rankings.map(g=>g.id),['defender','a','b']);assert.equal(Object.keys(board.pending).length,4);
 for(const gift of Object.values(board.pending)){assert.equal(gift.mail.attachments.items[0].count,3);assert.ok(!['c','observer','spectator'].includes(gift.uid));}
 assert.equal(finishWarRound(board,round,'server-1',2000,()=>{throw Error('reroll');}).changed,false);
});
test('mail journal saves before delivering, retries after interruption without duplication, preserves failed inboxes',async()=>{
 const {board}=finishWarRound(null,setup(),'server-1',1000,()=>0),boards=new Map([['guild-war:server-1',board]]),records=new Map(),saved=[];let fail=true;
 const save=async(key,b)=>{saved.push(structuredClone(b));};
 const deliver=async gift=>{assert.ok(saved.length);if(gift.uid==='b'&&fail)throw Error('mailbox-full');const old=records.get(gift.uid);records.set(gift.uid,deliverMail(old,gift.mail).mailbox);};
 await drainWarMailbox({boards,save,deliver});assert.equal(Object.keys(board.pending).length,1);assert.equal(records.size,3);
 fail=false;await drainWarMailbox({boards,save,deliver});assert.equal(Object.keys(board.pending).length,0);assert.equal(records.size,4);
 // Crash after mailbox write but before removing the journal entry: same immutable ID replays.
 const pending=Object.values(saved[0].pending)[0];board.pending[pending.mail.id]=pending;await drainWarMailbox({boards,save,deliver});assert.equal(records.get(pending.uid).messages.length,1);
 let writes=0;board.pending[pending.mail.id]=pending;await assert.rejects(drainWarMailbox({boards,save:async()=>{throw Error('disk-failed');},deliver:async()=>{writes++;}}),/disk-failed/);assert.equal(writes,0);assert.equal(Object.keys(board.pending).length,1);
});
import {RealmServer} from '../server/realm.js';import {initialSave} from '../realm-state.js';import {WAR} from '../guild-war.js';
test('war participation survives disconnect/restart, supports skill users and recovers a round after closing time',()=>{
 const start=Date.UTC(2026,9,24,13),map={id:WAR.map,name:'War',safe:false,nav:{zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},spawn:{x:0,z:20},mobs:[]},catalog={capital:WAR.map,maps:[map]};let time=start+1000;
 const realm=new RealmServer({catalog,now:()=>time});const join=uid=>realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:uid,classId:'acolyte',gender:'male'},state:initialSave(),bag:{coins:0,items:{}}},send:()=>{}});
 const healer=join('healer'),fighter=join('fighter'),idle=join('idle'),guild={id:'guild-a',name:'A',serverId:'server-1',castle:true,members:[healer,fighter,idle].map(p=>({key:p.key,name:p.character.name}))};realm.guilds.set(guild.id,guild);for(const p of [healer,fighter,idle])p.guildId=guild.id;
 realm.step(.05);healer.world.emit('cast',{skillIndex:0,kind:'heal'});realm.step(.05);assert.ok(realm.warState('server-1').round.participants[healer.key]);
 realm.warState('server-1').holder=null;realm.warRivals(fighter);realm.hurt(fighter,realm.warState('server-1').stone,10);realm.warState('server-1').round.holder=guild.id;
 const fighterKey=fighter.key;realm.leave(fighter.id);const board=structuredClone(realm.leaders.get('guild-war:server-1'));assert.ok(board.active.participants[fighterKey]);assert.equal(board.active.participants[idle.key],undefined);
 const reboot=new RealmServer({catalog,now:()=>start+31*60000});reboot.guilds.set(guild.id,guild);reboot.leaders.set('guild-war:server-1',board);reboot.step(.05);
 const result=reboot.leaders.get('guild-war:server-1');assert.equal(result.active,null);assert.equal(Object.values(result.pending).length,2);assert.ok(Object.values(result.pending).some(p=>p.key===fighterKey));
 reboot.step(.05);assert.equal(Object.values(result.pending).length,2);
});
test('a new war round cannot be overwritten by an earlier prize delivery finishing later',async()=>{
 const {board}=finishWarRound(null,setup(),'server-1',1000,()=>0),key='guild-war:server-1',boards=new Map([[key,board]]);let latest;
 await drainWarMailbox({boards,save:async(k,b)=>{latest=structuredClone(b);},deliver:async()=>{boards.set(key,{...board,active:warRound(null,99999)});}});
 assert.equal(latest.active.id,'99999');assert.equal(boards.get(key).active.id,'99999');assert.equal(Object.keys(boards.get(key).pending).length,3);
});

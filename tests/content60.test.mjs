import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dailyBounties,bountyDefeat,bountyClaim,normalizeBounty,albumAdd,ALBUM_CARDS} from '../bounty.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {STORY} from '../story-quests.js';
import {awardExperience} from '../experience.js';
import {itemDef} from '../items.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));

test('bounties: four per Thai day (easy, middle, hard, camp leaders), progress, claim once, reset next day', () => {
 const t=Date.UTC(2026,9,17,5),list=dailyBounties(t);assert.deepEqual(list.map(b=>b.tier),[0,1,2,3]);
 let s=null;for(let i=0;i<list[0].count;i++)s=bountyDefeat(s,t,list[0].monster).state;
 assert.throws(()=>bountyClaim(s,t,1),/bounty-unfinished/);const r=bountyClaim(s,t,0);assert.ok(r.reward.coins>0);assert.throws(()=>bountyClaim(r.state,t,0),/bounty-claimed/);
 assert.deepEqual(normalizeBounty(r.state,t+864e5).claimed,[false,false,false,false]);
 // 0.64 the leader card only counts camp leaders, of any monster
 const lead=list[3];let q=null;q=bountyDefeat(q,t,list[0].monster).state;assert.equal(q.progress[3],0);
 for(let i=0;i<lead.count;i++)q=bountyDefeat(q,t,'rat',true).state;assert.equal(q.progress[3],lead.count);assert.ok(bountyClaim(q,t,3).reward.baseXp>0);
});
test('album: each card counts once, milestones pay when crossed', () => {
 let a=albumAdd([],[ALBUM_CARDS[0],ALBUM_CARDS[0]+'+0',ALBUM_CARDS[1]]);assert.equal(a.album.length,2);assert.equal(a.milestones.length,0);
 a=albumAdd(a.album,[ALBUM_CARDS[2]]);assert.deepEqual(a.milestones.map(m=>m.count),[3]);assert.equal(albumAdd(a.album,[ALBUM_CARDS[0]]).added,0);
});
test('chapter 2 continues after chapter 1 and the marsh is reached from the mill', () => {
 assert.ok(STORY.length>=21);assert.equal(STORY.find(q=>q.chapter)?.chapter,'บทที่ 2 · โคมผีกลางบึง');
 assert.ok(catalog.maps.find(m=>m.id==='moonlit-mill').portals.some(p=>p.to==='lotus-marsh'));
});
test('server: bounty claim only in a town, pays EXP + coins; obtaining a card does not fill the album', () => {
 const realm=new RealmServer({catalog});let time=Date.now();realm.now=()=>time;
 const state=initialSave();const p=realm.join({uid:'ub',serverId:'server-1',slotId:'slot-1',record:{character:{name:'นักล่า',gender:'male',classId:'novice'},state,daily:{day:'2099-01-01',streak:1}},send:()=>{}});
 const b=dailyBounties(time)[0];p.bounty={...normalizeBounty(null,time),progress:[b.count,0,0]};
 const xp=p.world.baseXp,coins=p.bag.coins;time+=1000;assert.equal(realm.receive(p.id,{type:'bountyClaim',seq:1,index:0}),true);
 assert.ok(p.world.baseXp>xp&&p.bag.coins>coins);assert.equal(realm.record(p,{state:initialSave()}).bounty.claimed[0],true);
 realm.grantLoot(p,{coins:0,items:[{id:'card-rat',count:1}]});assert.deepEqual(p.album,[]);assert.equal(p.bag.items['card-rat'],1);
});
test('0.64 camps: one leader per camp with triple HP and slower respawn; surge doubles EXP on one field map; level gifts once each', async () => {
 const {CombatWorld,LEADER,mobXp,mobRespawn,MONSTER_TYPES}=await import('../combat-core.js');
 const {surge,expRate,SURGE_EVERY}=await import('../events.js');
 const {levelGifts}=await import('../experience.js');
 const {rollLoot}=await import('../items.js');
 const rice=catalog.maps.find(m=>m.id==='rice-fields'),w=new CombatWorld(rice),camps=new Set(w.mobs.map(m=>m.pack));
 for(const c of camps){const members=w.mobs.filter(m=>m.pack===c),leaders=members.filter(m=>m.leader);assert.equal(leaders.length,members.length>1?1:0);} // 0.72.1 elites stand alone
 const lead=w.mobs.find(m=>m.leader),member=w.mobs.find(m=>!m.leader);
 assert.equal(lead.maxHp,MONSTER_TYPES[lead.type].hp*LEADER.hp);assert.equal(mobXp(lead),LEADER.xp);assert.equal(mobXp(member),LEADER.member);
 assert.equal(mobRespawn(lead),(MONSTER_TYPES[lead.type].respawn??12)*LEADER.respawn);
 const s=surge(SURGE_EVERY*8+1000);assert.ok(s.active);assert.equal(expRate(SURGE_EVERY*8+1000,s.map)/expRate(SURGE_EVERY*8+1000,'ayutthaya'),2);
 assert.ok(!surge(SURGE_EVERY*8+6*60e3).active);
 assert.deepEqual(levelGifts(1,5).map(g=>g.level),[3,5]);assert.deepEqual(levelGifts(5,5),[]);
 let n=0;const rand=()=>((n=(n*9301+49297)%233280)/233280);assert.ok(rollLoot('rat',rand,null,3).coins>=rollLoot('rat',()=>0,null,1).coins);
});
test('0.64 server: crossing level 3 pays its gift once; a purple drop is announced to the channel', () => {
 const realm=new RealmServer({catalog});const sent=[];
 const p=realm.join({uid:'ug',serverId:'server-1',slotId:'slot-1',record:{character:{name:'ผู้โชคดี',gender:'male',classId:'novice'},state:initialSave(),daily:{day:'2099-01-01',streak:1}},send:m=>sent.push(m)});
 const before=p.bag.items['hp-small']??0;
 p.world.emit('experience',awardExperience(p.world,150,0));realm.step(.05);
 assert.equal((p.bag.items['hp-small']??0)-before,5);
 p.world.emit('experience',awardExperience(p.world,1,0));realm.step(.05);assert.equal((p.bag.items['hp-small']??0)-before,5);
 realm.grantLoot(p,{coins:0,items:[{id:'vest-buffalo!s2',count:1}]},{x:0,z:0});
 const rare=itemDef('vest-buffalo!s2');assert.ok(rare.rarity>=3);assert.ok(sent.some(m=>m.type==='chat'&&m.text.includes(rare.name)));
});

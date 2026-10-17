import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dailyBounties,bountyDefeat,bountyClaim,normalizeBounty,albumAdd,ALBUM_CARDS} from '../bounty.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {STORY} from '../story-quests.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));

test('bounties: three per Thai day (easy, middle, hard), progress, claim once, reset next day', () => {
 const t=Date.UTC(2026,9,17,5),list=dailyBounties(t);assert.deepEqual(list.map(b=>b.tier),[0,1,2]);
 let s=null;for(let i=0;i<list[0].count;i++)s=bountyDefeat(s,t,list[0].monster).state;
 assert.throws(()=>bountyClaim(s,t,1),/bounty-unfinished/);const r=bountyClaim(s,t,0);assert.ok(r.reward.coins>0);assert.throws(()=>bountyClaim(r.state,t,0),/bounty-claimed/);
 assert.deepEqual(normalizeBounty(r.state,t+864e5).claimed,[false,false,false]);
});
test('album: each card counts once, milestones pay when crossed', () => {
 let a=albumAdd([],[ALBUM_CARDS[0],ALBUM_CARDS[0]+'+0',ALBUM_CARDS[1]]);assert.equal(a.album.length,2);assert.equal(a.milestones.length,0);
 a=albumAdd(a.album,[ALBUM_CARDS[2]]);assert.deepEqual(a.milestones.map(m=>m.count),[3]);assert.equal(albumAdd(a.album,[ALBUM_CARDS[0]]).added,0);
});
test('chapter 2 continues after chapter 1 and the marsh is reached from the mill', () => {
 assert.ok(STORY.length>=12);assert.equal(STORY[8].chapter,'บทที่ 2 · โคมผีกลางบึง');
 assert.ok(catalog.maps.find(m=>m.id==='moonlit-mill').portals.some(p=>p.to==='lotus-marsh'));
});
test('server: bounty claim only in a town, pays EXP + coins; first card fills the album', () => {
 const realm=new RealmServer({catalog});let time=Date.now();realm.now=()=>time;
 const state=initialSave();const p=realm.join({uid:'ub',serverId:'server-1',slotId:'slot-1',record:{character:{name:'นักล่า',gender:'male',classId:'novice'},state,daily:{day:'2099-01-01',streak:1}},send:()=>{}});
 const b=dailyBounties(time)[0];p.bounty={...normalizeBounty(null,time),progress:[b.count,0,0]};
 const xp=p.world.baseXp,coins=p.bag.coins;time+=1000;assert.equal(realm.receive(p.id,{type:'bountyClaim',seq:1,index:0}),true);
 assert.ok(p.world.baseXp>xp&&p.bag.coins>coins);assert.equal(realm.record(p,{state:initialSave()}).bounty.claimed[0],true);
 realm.grantLoot(p,{coins:0,items:[{id:'card-rat',count:1}]});assert.deepEqual(p.album,['card-rat']);
});

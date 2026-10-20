import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {levelStart} from '../experience.js';
import {statPoints,earnedStatPoints,canWear} from '../character-stats.js';
import {WEEKLY,normalizeWeekly,weeklyDefeat,weeklyClaim,weekOf} from '../bounty.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {ITEMS} from '../items.js';
import catalog from '../maps/world.json' with {type:'json'};
test('weekly quests count kills, leaders and bosses, reset on Monday and pay out once',()=>{
 const mon=Date.UTC(2026,9,19,1),sun=mon+6*864e5;assert.equal(weekOf(mon),weekOf(sun));assert.notEqual(weekOf(mon),weekOf(sun+864e5));
 let s=null;for(let i=0;i<WEEKLY[0].count;i++)s=weeklyDefeat(s,mon);s=weeklyDefeat(s,mon,{leader:true,boss:true});
 assert.equal(s.progress[0],WEEKLY[0].count);assert.equal(s.progress[1],1);assert.equal(s.progress[2],1);
 const r=weeklyClaim(s,mon,0);assert.ok(r.reward.coins>0);assert.throws(()=>weeklyClaim(r.state,mon,0),/bounty-claimed/);assert.throws(()=>weeklyClaim(r.state,mon,2),/bounty-unfinished/);
 assert.equal(normalizeWeekly(r.state,sun+864e5).progress[0],0);
});
test('awakened bosses exist at Lv.60–95 and spawn once in each field map',()=>{
 const awake=MONSTER_TYPES.map((t,i)=>[t,i]).filter(([t])=>t.awakened);assert.equal(awake.length,4);
 for(const [t,i] of awake){assert.ok(t.boss&&t.level>=60&&t.respawn>=1800);assert.equal(catalog.maps.filter(m=>m.mobs?.some(x=>x[2]===i)).length,1,t.id);}
});
test('rebirth at Lv.99 in town: back to Lv.1, stats refunded with +40, gear limits lifted',()=>{
 assert.equal(earnedStatPoints(1,2),80);assert.equal(statPoints({},1,1),40);
 const high=Object.keys(ITEMS).find(id=>ITEMS[id].kind==='gear'&&(ITEMS[id].level??1)>10&&!ITEMS[id].classes);
 assert.equal(canWear(high,{classId:'swordsman',level:1}),'low-level');assert.equal(canWear(high,{classId:'swordsman',level:1,reborn:1}),null);
 const town={id:'t',name:'เมือง',safe:true,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
 const realm=new RealmServer({catalog:{capital:'t',maps:[town]},now:()=>1e4}),state=initialSave();state.mapId='t';state.traveler.baseXp=levelStart(99);
 const p=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record:{character:{name:'ผู้เกิดใหม่',gender:'male',classId:'swordsman'},state,bag:{coins:0,items:{}}},send:()=>{}});
 p.stats={str:30};assert.equal(realm.receive(p.id,{type:'rebirth',seq:1}),true);
 assert.equal(p.rebirth,1);assert.equal(p.world.baseXp,0);assert.equal(p.stats.str,1);assert.equal(realm.record(p,{state}).rebirth,1);
 assert.equal(realm.receive(p.id,{type:'rebirth',seq:2}),false,'needs Lv.99 again');
});

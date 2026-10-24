import {statsAfterClassChange} from '../character-stats.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStats,raiseStat,raiseCost,earnedStatPoints,statPoints,equipGear,unequipGear,dropInvalidGear,deriveStats,STATS} from '../character-stats.js';
import {ITEMS,SHOPS} from '../items.js';
import {CombatWorld,monsterHit} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

test('Lv1 with no stats or gear keeps the pre-0.43 numbers', () => {
 const d=deriveStats({level:1,classId:'swordsman'});
 assert.equal(d.maxHp,140);assert.equal(d.maxMp,100);assert.equal(d.def,0);assert.equal(d.basicBonus,0);assert.equal(d.skillPower,1);assert.equal(d.delay,1);
 assert.equal(monsterHit({player:{shield:0},derived:null},7),7,'no derived = unchanged damage');
});

test('status points follow the Ragnarok curve and cannot be overspent', () => {
 assert.equal(earnedStatPoints(1),0);assert.equal(earnedStatPoints(2),3);assert.equal(earnedStatPoints(5),3+3+3+4);
 assert.equal(raiseCost(1),2);assert.equal(raiseCost(10),2);assert.equal(raiseCost(11),3);
 let s=normalizeStats({str:'x',agi:-4,vit:500});assert.deepEqual(s,{str:1,agi:1,vit:99,int:1,dex:1,luk:1});
 s=normalizeStats(null);s=raiseStat(s,'str',2);assert.equal(s.str,2);assert.equal(statPoints(s,2),1);
 assert.throws(()=>raiseStat(s,'str',2),/no-stat-points/);assert.throws(()=>raiseStat(s,'cha',50),/bad-stat/);
});

test('stats and gear move the combat numbers the right way', () => {
 const base=deriveStats({level:20,classId:'swordsman'});
 const strong=deriveStats({level:20,classId:'swordsman',stats:{str:30,agi:30,vit:30,luk:20},gear:{weapon:'sword-iron',armor:'vest-buffalo',accessory:'ring-ruby'}});
 assert.ok(strong.atk>base.atk+14&&strong.maxHp>base.maxHp&&strong.def>=7&&strong.flee>0&&strong.delay<1&&strong.crit>base.crit);
 const mage=deriveStats({level:10,classId:'shaman',stats:{int:20},gear:{weapon:'staff-wan'}});
 assert.ok(mage.magic&&mage.matk>14&&mage.skillPower>1&&mage.maxMp>deriveStats({level:10,classId:'shaman'}).maxMp);
 const hunter=deriveStats({level:5,classId:'hunter',stats:{dex:20}});assert.ok(hunter.atk>=19,'hunters attack with DEX');
 assert.ok(monsterHit({player:{shield:0},derived:{flee:0,def:20}},40)<40);
});

test('gear equips from the bag, swaps back, respects class and level, and falls off after a class change', () => {
 const who={classId:'swordsman',level:15};
 let r=equipGear({items:{'sword-iron':1,'sword-silver':1}},{},'sword-iron',who);
 assert.deepEqual(r.gear.weapon,'sword-iron');assert.equal(r.bag.items['sword-iron'],undefined);
 r=equipGear(r.bag,r.gear,'sword-silver',who);assert.equal(r.gear.weapon,'sword-silver');assert.equal(r.bag.items['sword-iron'],1,'old weapon back in the bag');
 assert.throws(()=>equipGear({items:{'staff-wan':1}},{},'staff-wan',who),/wrong-class/);
 assert.throws(()=>equipGear({items:{'sword-silver':1}},{},'sword-silver',{classId:'swordsman',level:3}),/low-level/);
 r=unequipGear(r.bag,r.gear,'weapon');assert.equal(r.gear.weapon,null);assert.equal(r.bag.items['sword-silver'],1);
 const after=dropInvalidGear({},{weapon:'wrap-novice',armor:'vest-cotton'},{classId:'boxer',level:26});
 assert.deepEqual(after.gear,{weapon:null,head:null,armor:'vest-cotton',garment:null,shoes:null,accessory:null});assert.equal(after.bag.items['wrap-novice'],1);
 for(const id of SHOPS['ครูแสนดาบ'].stock)assert.ok(ITEMS[id].kind==='gear'||['iron-ore','laterite'].includes(id),id);
});

test('server: stat points, equipping and the saved record; max HP grows with VIT', () => {
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},map={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]};
 let time=1e4;const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[map]},now:()=>time});
 const state=initialSave();state.traveler.baseXp=900; // Lv10
 const record={character:{name:'tester',gender:'male',classId:'swordsman'},state,bag:{coins:0,items:{'sword-iron':1,'staff-wan':1}}};
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 const send=(type,data)=>{time+=500;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 const hp=peer.world.player.maxHp;
 for(let i=0;i<5;i++)assert.equal(send('statUp',{stat:'vit'}),true);
 assert.ok(peer.world.player.maxHp>hp);
 assert.equal(send('equip',{item:'staff-wan'}),false,'wrong class');
 assert.equal(send('equip',{item:'sword-iron'}),true);assert.ok(peer.derived.atk>=14);
 const saved=realm.record(peer,record);assert.equal(saved.stats.vit,6);assert.equal(saved.gear.weapon,'sword-iron');assert.equal(saved.bag.items['sword-iron'],undefined);
 const self=realm.snapshot(peer).self;assert.equal(self.gear.weapon,'sword-iron');assert.ok(self.statPoints>=0);
 for(const k of STATS)assert.ok(k in self.stats);
});

 test('class and Master changes refund exactly the allocated points; reload/appearance changes keep them',()=>{
  const stats=normalizeStats({str:25,agi:11,int:8}),novice={classId:'novice',jobId:''},boxer={classId:'boxer',jobId:''},master={...boxer,jobId:'master-boxer'};
  for(const [before,after] of [[novice,boxer],[boxer,master],[master,{...boxer,jobId:'iron-boxer'}]]){
   const reset=statsAfterClassChange(before,after,stats);assert.deepEqual(reset,normalizeStats(null));
   for(const reborn of [0,3,10]){assert.equal(statPoints(reset,60,reborn),earnedStatPoints(60,reborn));assert.equal(statPoints(statsAfterClassChange(after,after,reset),60,reborn),earnedStatPoints(60,reborn));}
  }
  assert.deepEqual(statsAfterClassChange(master,{...master,name:'New name',gender:'female'},stats),stats);
  assert.equal(stats.str,25,'never mutate the saved allocation');
 });

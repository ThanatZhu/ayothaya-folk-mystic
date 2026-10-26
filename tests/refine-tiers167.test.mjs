import test from 'node:test';
import assert from 'node:assert/strict';
import {REFINE_MAX,REFINE_TIERS,refineTier,refinePercent,effectiveGearStats,roundGearStat} from '../refine-tiers.js';
import {refineGear,REFINE_RATE,refineCost} from '../refine.js';
import {ITEMS,itemDef,normalizeBag} from '../items.js';
import {deriveStats,equipGear,unequipGear} from '../character-stats.js';
import {refineTierBadge,refineTierTrack} from '../refine-tier-ui.js';
import {RealmServer} from '../server/realm.js';
import {STORY,STORY_VERSION} from '../story-quests.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';

test('milestones use only the highest unlocked bonus, including +4/+9/+14/+19 boundaries',()=>{
 assert.equal(REFINE_MAX,20);assert.equal(REFINE_RATE.length,REFINE_MAX);assert.deepEqual(REFINE_TIERS.map(t=>[t.level,t.percent]),[[5,5],[10,10],[15,15],[20,20]]);
 for(const [n,t,p] of [[0,0,0],[4,0,0],[5,1,5],[9,1,5],[10,2,10],[14,2,10],[15,3,15],[19,3,15],[20,4,20]]){assert.equal(refineTier(n),t);assert.equal(refinePercent(n),p);assert.equal(itemDef('weapon-swordsman-one'+(n?'+'+n:'')).refineTier,t);}
 assert.equal(itemDef('weapon-swordsman-one+21'),null);assert.equal(itemDef('weapon-swordsman-one+01'),null);assert.equal(itemDef('weapon-swordsman-one+0'),null);
 assert.ok(REFINE_RATE.every(n=>n>0&&n<=1));assert.deepEqual(REFINE_RATE.slice(10),Array(10).fill(.1));
});
test('Tier scales each item after its existing linear refine gains; fractional bonuses are retained',()=>{
 for(const level of [4,5,10,15,20]){
  const multiplier=1+refinePercent(level)/100,it={slot:'weapon',refine:level,atk:100,matk:80,def:10,mdef:6,bonus:{str:1,int:5}},d=effectiveGearStats(it);
  assert.equal(d.atk,roundGearStat((100+level*8)*multiplier));assert.equal(d.matk,roundGearStat((80+level*6)*multiplier));assert.equal(d.def,roundGearStat(10*multiplier));assert.equal(d.mdef,roundGearStat(6*multiplier));assert.equal(d.bonus.str,multiplier);assert.equal(d.bonus.int,roundGearStat(5*multiplier));
  assert.equal(effectiveGearStats({...it,slot:'armor'}).def,roundGearStat((10+level)*multiplier));
 }
 assert.equal(effectiveGearStats({slot:'weapon',refine:20,atk:100}).atk,312,'+20 is 20%, not 50% from adding all milestones');
});
test('gear stats, affixes and item descriptions agree; cards, pet, food and rebirth stay outside Tier',()=>{
 const it=itemDef('ember-amulet+20!s3'),s=effectiveGearStats(it);assert.equal(s.bonus.str,6);assert.equal(s.bonus.int,2.4);assert.match(it.text,/STR \+6/);assert.match(it.text,/INT \+2\.4/);
 const plain={stats:{str:50,agi:10,vit:20,int:30,dex:40,luk:5},pet:{str:7},food:{str:3},reborn:2,gear:{accessory:it.id,weapon:'weapon-swordsman-one+20~card-monkey'}};
 const d=deriveStats(plain);assert.equal(d.total.str,50+4+7+3+6+ITEMS['card-monkey'].effect.bonus.str);assert.equal(d.total.int,36.4);
 const before=deriveStats({...plain,gear:{...plain.gear,weapon:'weapon-swordsman-one+20'}});assert.equal(d.total.str-before.total.str,2,'the card bonus is added once without scaling');
 assert.equal(d.coinPct,before.coinPct);assert.equal(itemDef('weapon-swordsman-one+20').refinePercent,20);
});
test('+11 through +20 preserve cards/affixes and survive bag/equip round trips; +20 rejects without spending',()=>{
 let bag={coins:100000,items:{'iron-ore':20,'break-guard':2}},gear={weapon:'weapon-swordsman-one+10~card-monkey!s2'};
 for(let level=11;level<=20;level++){const coins=bag.coins,r=refineGear(bag,gear,'weapon',{rand:()=>0});assert.equal(r.level,level);assert.equal(r.bag.coins,coins-refineCost(level));gear=r.gear;bag=r.bag;assert.equal(itemDef(gear.weapon).card,'card-monkey');assert.equal(itemDef(gear.weapon).affix,'s2');}
 const saved=structuredClone({bag,gear});assert.throws(()=>refineGear(bag,gear,'weapon'),/refine-max/);assert.deepEqual({bag,gear},saved);
 const off=unequipGear(bag,gear,'weapon'),back=equipGear(off.bag,off.gear,gear.weapon,{classId:'swordsman',level:99});assert.equal(back.gear.weapon,gear.weapon);assert.equal(normalizeBag(off.bag).items[gear.weapon],1);
 const guarded=refineGear(saved.bag,{weapon:'weapon-swordsman-one+19~card-monkey!s2'},'weapon',{guard:true,rand:()=>.99});assert.equal(guarded.result,'guarded');assert.equal(itemDef(guarded.gear.weapon).refine,19);assert.equal(itemDef(guarded.gear.weapon).refineTier,3);
 const broken=refineGear(saved.bag,{weapon:'weapon-swordsman-one+19'},'weapon',{rand:()=>.99});assert.equal(broken.result,'broken');assert.equal(broken.gear.weapon,null);
});
test('server upgrades +19 to +20, recalculates the real stats, saves Tier via item ID and rejects +21',()=>{
 const nav={zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},map={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[{name:'ครูแสนดาบ',x:0,z:0}]};let now=10000;
 const realm=new RealmServer({catalog:{capital:map.id,maps:[map]},now:()=>now}),record={serverId:'server-1',character:{name:'Tier Test',classId:'swordsman',gender:'male'},xpCurve:XP_CURVE,story:{v:STORY_VERSION,quest:STORY.length,step:0,count:0,done:true},state:initialSave(),gear:{weapon:'weapon-swordsman-one+19~card-monkey!s2'},bag:{coins:10000,items:{'iron-ore':2}}};record.state.traveler.baseXp=levelStart(99);
 const p=realm.join({uid:'tier-test',serverId:'server-1',slotId:'slot-1',record,send(){}}),before=p.derived.atk,coins=p.bag.coins;
 const random=Math.random;Math.random=()=>0;try{assert.equal(realm.receive(p.id,{type:'refine',seq:p.seq+1,slot:'weapon',npc:'ครูแสนดาบ',attempt:'tier-four'}),true);}finally{Math.random=random;}
 assert.equal(p.gear.weapon,'weapon-swordsman-one+20~card-monkey!s2');assert.ok(p.derived.atk>before);assert.equal(realm.record(p,record).gear.weapon,p.gear.weapon);assert.equal(p.bag.coins,coins-2000);
 now+=1000;const saved=structuredClone(p.bag);assert.equal(realm.receive(p.id,{type:'refine',seq:p.seq+1,slot:'weapon',npc:'ครูแสนดาบ',attempt:'too-high'}),false);assert.deepEqual(p.bag,saved);assert.equal(p.world.events.findLast(e=>e.type==='refineRejected').code,'refine-max');
});
test('Tier badges and forge milestones use refinement Tier, independent of equipment rarity',()=>{
 const it=itemDef('weapon-swordsman-one+20');assert.match(refineTierBadge(it),/Tier 4 · \+20%/);assert.equal(refineTierBadge(itemDef('weapon-swordsman-one+4')),'');
 const track=refineTierTrack(10);assert.equal((track.match(/<li /g)??[]).length,4);assert.equal((track.match(/reached/g)??[]).length,2);assert.equal((track.match(/current/g)??[]).length,1);
});

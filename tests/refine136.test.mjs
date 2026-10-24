import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,itemDef,normalizeBag} from '../items.js';
import {GEAR_SLOTS,deriveStats,equipGear,unequipGear} from '../character-stats.js';
import {REFINE_ORE,REFINE_SLOTS,refineGear} from '../refine.js';
import {createRefineSequence,forgePose,FORGE_DURATION,FORGE_TIMEOUT} from '../refine-sequence.js';
import {RealmServer} from '../server/realm.js';
import {levelStart,XP_CURVE} from '../experience.js';
import {initialSave} from '../realm-state.js';
const gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};
const bag={coins:50000,items:{'iron-ore':50,laterite:50,'lek-lai':3,'break-guard':3}};

test('every stat equipment item accepts +1 through +10 and persists through a bag/equip round trip',()=>{
 assert.deepEqual(Object.keys(REFINE_ORE),GEAR_SLOTS);assert.deepEqual(Object.keys(REFINE_SLOTS),GEAR_SLOTS);
 for(const [id,d] of Object.entries(ITEMS).filter(([,d])=>d.kind==='gear')){
  for(let n=1;n<=10;n++)assert.equal(itemDef(id+'+'+n)?.refine,n,id);
  assert.equal(itemDef(id+'+11'),null);assert.equal(itemDef(id+'+0'),null);
 }
 assert.equal(itemDef('hp-small+1'),null);
 for(const slot of GEAR_SLOTS){const id=gear[slot]+'+3!v2',worn=equipGear({items:{[id]:1}},{},id,{classId:'swordsman',level:99});assert.equal(worn.gear[slot],id);assert.equal(unequipGear(worn.bag,worn.gear,slot).bag.items[id],1);assert.equal(normalizeBag({items:{[id]:1}}).items[id],1);}
});

test('each slot spends the right ore and coins once; successes and failures preserve other equipment and affixes',()=>{
 const original=structuredClone({bag,gear});
 for(const slot of GEAR_SLOTS){
  const r=refineGear(bag,{...gear,[slot]:gear[slot]+'!v2'},slot,{rand:()=>.999});assert.equal(r.gear[slot],gear[slot]+'+1!v2');assert.equal(r.bag.coins,bag.coins-100);assert.equal(r.bag.items[REFINE_ORE[slot]],49);
  for(const other of GEAR_SLOTS.filter(k=>k!==slot))assert.equal(r.gear[other],gear[other]);
  const failed=refineGear(bag,{...gear,[slot]:gear[slot]+'+9!v2'},slot,{rand:()=>.99});assert.equal(failed.result,'broken');assert.equal(failed.gear[slot],null);
  const kept=refineGear(bag,{...gear,[slot]:gear[slot]+'+9!v2'},slot,{guard:true,rand:()=>.99});assert.equal(kept.result,'guarded');assert.equal(kept.gear[slot],gear[slot]+'+9!v2');assert.equal(kept.bag.items['break-guard'],2);
  assert.throws(()=>refineGear({coins:9999,items:{}},gear,slot),/no-ore/);
 }
 assert.deepEqual({bag,gear},original);assert.throws(()=>refineGear(bag,gear,'__proto__'),/not-refinable/);
});

test('non-weapon refinement grants DEF even on accessories with no base defence and keeps their stat bonuses',()=>{
 for(const slot of GEAR_SLOTS){const plain=deriveStats({gear}),up=deriveStats({gear:{...gear,[slot]:gear[slot]+'+7'}});if(slot==='weapon'){assert.ok(up.atk>plain.atk);assert.equal(up.def,plain.def);}else{assert.equal(up.def-plain.def,7);assert.deepEqual(up.total,plain.total);}}
 assert.match(itemDef('ring-ruby+3').text,/DEF \+3/);assert.match(itemDef('hat-headband+3').text,/DEF \+4/);
 const plain=deriveStats({gear}),all=deriveStats({gear:Object.fromEntries(GEAR_SLOTS.map(s=>[s,gear[s]+'+10']))});assert.equal(all.def-plain.def,50);
});

test('forge waits for both the real response and final hammer beat, ignores duplicates and never invents a late result',()=>{
 const s=createRefineSequence();assert.ok(s.start({attempt:'one',slot:'head'},100));assert.equal(s.start({attempt:'two'},110),false);
 assert.equal(s.receive({attempt:'wrong',result:'success'}),false);assert.equal(s.receive({attempt:'one',slot:'shoes',result:'success'}),false);
 assert.ok(s.receive({attempt:'one',slot:'head',result:'broken'}));assert.equal(s.receive({attempt:'one',result:'success'}),false);assert.equal(s.tick(100+FORGE_DURATION-1),null);assert.equal(s.tick(100+FORGE_DURATION).result,'broken');assert.equal(s.tick(9999),null);
 s.start({attempt:'two'},10000);assert.equal(s.tick(10000+FORGE_DURATION),null);assert.equal(s.tick(10000+FORGE_TIMEOUT).unconfirmed,true);
 s.start({attempt:'three'},40000);assert.equal(s.receive({attempt:'one',result:'success'}),false);s.receive({attempt:'three',code:'no-ore'});assert.equal(s.tick(40001).code,'no-ore');
 assert.equal(forgePose(300).frame,2);assert.equal(forgePose(520).impact,true);assert.equal(forgePose(1050).impact,true);assert.equal(forgePose(1570).impact,true);assert.equal(forgePose(FORGE_DURATION).impact,false);
});

test('server refines all six slots, saves the item and correlates accepted/rejected attempts without spending on rejection',()=>{
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},map={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[{name:'ครูแสนดาบ',x:0,z:0}]};let now=10000;
 const realm=new RealmServer({catalog:{capital:map.id,maps:[map]},now:()=>now}),record={character:{name:'ForgeQA',classId:'swordsman',gender:'male'},state:initialSave(),gear,bag};
 record.state.traveler.baseXp=levelStart(99);record.xpCurve=XP_CURVE;
 const peer=realm.join({uid:'forge-test',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 Object.assign(peer.world.player,{x:0,z:0});
 for(const slot of GEAR_SLOTS){now+=1000;const attempt='test-'+slot;assert.ok(realm.receive(peer.id,{type:'refine',seq:peer.seq+1,attempt,slot,npc:'ครูแสนดาบ'}),JSON.stringify({slot,gear:peer.gear,position:peer.world.player,events:peer.world.events}));assert.equal(peer.gear[slot],gear[slot]+'+1');const e=peer.world.events.findLast(e=>e.type==='refined');assert.equal(e.attempt,attempt);assert.equal(e.item,gear[slot]);assert.equal(e.upgradedItem,gear[slot]+'+1');}
 const before=structuredClone(peer.bag);Object.assign(peer.world.player,{x:30,z:30});now+=1000;assert.equal(realm.receive(peer.id,{type:'refine',seq:peer.seq+1,attempt:'far',slot:'head',npc:'ครูแสนดาบ'}),false);assert.deepEqual(peer.bag,before);assert.equal(peer.world.events.findLast(e=>e.type==='refineRejected').attempt,'far');
 assert.deepEqual(realm.record(peer,record).gear,peer.gear);
});

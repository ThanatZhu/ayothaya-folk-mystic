import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBag,addLoot,expandBag,expandCost,bagCap,BAG_SLOTS,BAG_MAX} from '../items.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const fill=n=>Object.fromEntries(['hp-small','mp-small','hp-large','mp-large','green-herb','sticky-rice','return-incense','pet-food','pet-lure','fly-wing','rat-tooth','straw-bundle','hopper-wing','iron-ore','lotus-seed'].slice(0,n).map(id=>[id,1]));
test('bags start at 40 slots and expand by 10 up to 100, each step costing more',()=>{
 let b={coins:100000,items:{}};assert.equal(bagCap(b),BAG_SLOTS);const costs=[];
 while(expandCost(b)!==null){costs.push(expandCost(b));b=expandBag(b);}
 assert.equal(bagCap(b),BAG_MAX);assert.deepEqual(costs,[2000,4000,6000,8000,10000,12000]);assert.equal(b.coins,100000-42000);
 assert.throws(()=>expandBag(b),/bag-max/);assert.throws(()=>expandBag({coins:10,items:{}}),/no-coins/);
 assert.equal(normalizeBag(b).slots,BAG_MAX,'the size survives normalisation');assert.equal(normalizeBag({coins:0,items:{},slots:999}).slots,BAG_MAX);
 assert.equal('slots' in normalizeBag({coins:0,items:{}}),false,'old saves stay as they were');
});
test('loot fills an expanded bag past 40 kinds instead of losing items',()=>{
 const forty=Object.fromEntries(Object.keys(fill(15)).map(id=>[id,1]));
 const at=n=>({coins:0,items:forty,slots:n});
 assert.equal(addLoot({...at(40),items:{}},{items:[{id:'laterite',count:1}]}).lost.length,0);
 assert.equal(bagCap(at(15)),BAG_SLOTS,'never below 40');
 assert.equal(addLoot(at(60),{items:[{id:'laterite',count:2}]}).added[0].count,2);
});
test('the server sells +10 slots next to Mae Bua only',()=>{
 let time=1e4;const map={id:'ayutthaya',safe:true,nav:{zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[],npcs:[{name:'แม่บัว',x:0,z:0}]};
 const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[map]},now:()=>time});
 const p=realm.join({uid:'a',serverId:'server-1',slotId:'slot-1',record:{character:{name:'hero',gender:'male',classId:'swordsman'},state:initialSave()},send:()=>{}});
 p.bag={coins:5000,items:{}};Object.assign(p.world.player,{x:1,z:0});
 const send=(type,data)=>{time+=1000;return realm.receive(p.id,{type,seq:p.seq+1,...data});};
 assert.equal(send('bagExpand',{npc:'แม่บัว'}),true);assert.equal(bagCap(p.bag),50);assert.equal(p.bag.coins,3000);
 assert.equal(realm.record(p,{state:initialSave()}).bag.slots,50,'saved');
 Object.assign(p.world.player,{x:20,z:0});assert.equal(send('bagExpand',{npc:'แม่บัว'}),false);assert.equal(bagCap(p.bag),50);
 Object.assign(p.world.player,{x:1,z:0});assert.equal(send('bagExpand',{npc:'แม่บัว'}),false,'not enough coins (needs 4000)');
});

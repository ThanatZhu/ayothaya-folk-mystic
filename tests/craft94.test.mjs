import test from 'node:test';
import assert from 'node:assert/strict';
import {RECIPES,craft,craftable} from '../crafting.js';
import {ITEMS,itemDef,useItem,foodBuff} from '../items.js';
import {refineGear} from '../refine.js';
import {deriveStats} from '../character-stats.js';
import {CombatWorld} from '../combat-core.js';
import {serializeTraveler,restoreTraveler} from '../world-state.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
test('every recipe uses and makes real items',()=>{
 for(const r of RECIPES){assert.ok(itemDef(r.out),r.out);for(const id of Object.keys(r.needs))assert.ok(itemDef(id),id);}
});
test('crafting spends materials and cowries, and refuses when short',()=>{
 const bag={coins:100,items:{'straw-bundle':7}};
 assert.equal(craftable(bag,RECIPES.find(r=>r.out==='hp-small')),2);
 const r=craft(bag,'hp-small',2);assert.equal(r.bag.items['hp-small'],4);assert.equal(r.bag.items['straw-bundle'],1);assert.equal(r.bag.coins,90);
 assert.throws(()=>craft(r.bag,'hp-small'),/no-material/);assert.throws(()=>craft(bag,'nope'),/no-recipe/);
 assert.throws(()=>craft({coins:0,items:{'straw-bundle':3}},'hp-small'),/no-coins/);
});
test('food heals, grants a stat buff that runs out, and survives map travel',()=>{
 const w=new CombatWorld({classId:'swordsman'});w.safe=false;
 const p=w.player,r=useItem({items:{'khao-tom-mat':1}},'khao-tom-mat',p,{});assert.deepEqual(r.food,{id:'khao-tom-mat',left:600});
 w.food=r.food;assert.deepEqual(foodBuff(w),{str:4});
 const base=deriveStats({classId:'swordsman',stats:null,gear:null}),fed=deriveStats({classId:'swordsman',stats:null,gear:null,food:foodBuff(w)});assert.ok(fed.atk>base.atk);
 const moved=new CombatWorld({classId:'swordsman'});restoreTraveler(moved,serializeTraveler(w));assert.equal(moved.food.id,'khao-tom-mat');
 w.food.left=.03;w.update(.05,{x:0,z:0,attack:false});assert.equal(w.food,null);assert.equal(foodBuff(w),null);
});
test('the break guard keeps +5 and above gear on a failed refine and is only spent then',()=>{
 const gear={weapon:'weapon-swordsman-one+5'},bag={coins:5000,items:{'iron-ore':3,'break-guard':1}};
 const kept=refineGear(bag,gear,'weapon',{guard:true,rand:()=>.99});assert.equal(kept.result,'guarded');assert.equal(kept.gear.weapon,'weapon-swordsman-one+5');assert.equal(kept.bag.items['break-guard'],undefined);
 assert.equal(refineGear(bag,gear,'weapon',{rand:()=>.99}).gear.weapon,null,'no guard: breaks');
 const win=refineGear(bag,gear,'weapon',{guard:true,rand:()=>0});assert.equal(win.bag.items['break-guard'],1,'kept on success');
 assert.throws(()=>refineGear({coins:5000,items:{'iron-ore':1}},gear,'weapon',{guard:true}),/no-break-guard/);
});
test('the realm server crafts and applies a meal to the stats',()=>{
 const map={id:'f',safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
 let time=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>time});
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record:{character:{name:'cook',gender:'male',classId:'swordsman'},state:initialSave(),bag:{coins:100,items:{'rice-sheaf':2,'sticky-rice':1}}},send:()=>{}});
 const send=(type,data)=>{time+=1000;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 const coins=peer.bag.coins;assert.equal(send('craft',{item:'khao-tom-mat',times:1}),true);assert.equal(peer.bag.items['khao-tom-mat'],1);assert.equal(peer.bag.coins,coins-20);
 const atk=peer.derived.atk;assert.equal(send('useItem',{item:'khao-tom-mat'}),true);realm.refreshStats(peer);assert.ok(peer.derived.atk>atk);
});

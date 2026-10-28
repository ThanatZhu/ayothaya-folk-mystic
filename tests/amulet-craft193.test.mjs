import test from 'node:test';import assert from 'node:assert/strict';
import {AMULETS} from '../amulets.js';import {recipeFor,craft,craftable} from '../crafting.js';
import {CONQUEST_SHARD,AMULET_CRAFT_SHARDS,CONQUEST_STACK} from '../rainbow-crafting.js';
import {normalizeBag,addLoot,MAX_STACK,stackLimit} from '../items.js';import {normalizeStorage,moveOffer} from '../market.js';
import {normalizeListing,tradePerks,openShop,collectShop,MARKET_ZONE} from '../market-board.js';
import {RealmServer} from '../server/realm.js';import {initialSave} from '../realm-state.js';
test('all five rainbow amulets require exactly 50000 shards, including batched crafts; smaller balances cannot craft',()=>{
 for(const {id}of AMULETS){assert.equal(recipeFor(id).needs[CONQUEST_SHARD],50000);assert.equal(recipeFor(id).coins,1000000);
  const short={coins:2000000,items:{[CONQUEST_SHARD]:49999}},copy=structuredClone(short);assert.equal(craftable(short,recipeFor(id)),0);assert.throws(()=>craft(short,id),/no-material/);assert.deepEqual(short,copy);
  const exact=craft({coins:1000000,items:{[CONQUEST_SHARD]:50000}},id);assert.equal(exact.bag.items[id],1);assert.equal(exact.bag.items[CONQUEST_SHARD],undefined);assert.equal(exact.bag.coins,0);
  const batch=craft({coins:2000000,items:{[CONQUEST_SHARD]:100001}},id,2);assert.equal(batch.bag.items[id],2);assert.equal(batch.bag.items[CONQUEST_SHARD],1);assert.equal(batch.bag.coins,0);
 }
 assert.equal(AMULET_CRAFT_SHARDS,50000);assert.equal(recipeFor('boss-weapon-swordsman').needs[CONQUEST_SHARD],100);
});
test('shards accumulate beyond 999 and survive inventory/storage normalization; ordinary items retain their cap',()=>{
 const bag={coins:0,items:{[CONQUEST_SHARD]:49999,'rat-tooth':2000}};assert.equal(normalizeBag(bag).items[CONQUEST_SHARD],49999);assert.equal(normalizeBag(bag).items['rat-tooth'],MAX_STACK);assert.equal(normalizeStorage(bag).items[CONQUEST_SHARD],49999);
 const grown=addLoot(bag,{items:[{id:CONQUEST_SHARD,count:3}]});assert.equal(grown.bag.items[CONQUEST_SHARD],50002);assert.deepEqual(grown.lost,[]);assert.equal(stackLimit(CONQUEST_SHARD),CONQUEST_STACK);
 const capped=addLoot({items:{[CONQUEST_SHARD]:CONQUEST_STACK-1}},{items:[{id:CONQUEST_SHARD,count:3}]});assert.equal(capped.bag.items[CONQUEST_SHARD],CONQUEST_STACK);assert.equal(capped.lost[0].count,2);
 const [from,to]=moveOffer({items:{[CONQUEST_SHARD]:50000}},{items:{}},{items:{[CONQUEST_SHARD]:50000}});assert.equal(from.items[CONQUEST_SHARD],undefined);assert.equal(to.items[CONQUEST_SHARD],50000);
});
test('shop escrow and returned stock preserve a large shard stack without truncating it',()=>{
 const bag={coins:0,items:{[CONQUEST_SHARD]:50000}},req={items:{[CONQUEST_SHARD]:{count:50000,price:1}}},perks=tradePerks(0);assert.equal(normalizeListing(req,bag,perks).items[CONQUEST_SHARD].count,50000);
 const opened=openShop({bag,req,perks,owner:{key:'owner',name:'Owner',serverId:'server-1'},x:MARKET_ZONE.x+3,z:MARKET_ZONE.z+3,mapId:'ayutthaya',now:1000,id:'test'});assert.equal(opened.shop.items[CONQUEST_SHARD].count,50000);const closed=collectShop(opened.shop,opened.bag,{close:true});assert.equal(closed.bag.items[CONQUEST_SHARD],50000);
});
test('realm ignores forged cheap costs and enforces the 50000 requirement on authoritative inventory',()=>{
 const map={id:'f',safe:true,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};let now=10000;
 const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>now}),p=realm.join({uid:'amulet193',serverId:'server-1',slotId:'slot-1',record:{character:{name:'Crafter',gender:'male',classId:'shaman'},state:initialSave(),bag:{coins:1000000,items:{[CONQUEST_SHARD]:49999}}},send:()=>{}});
 const send=data=>{now+=1000;return realm.receive(p.id,{type:'craft',seq:p.seq+1,item:'amulet-nang-phaya',times:1,...data});};
 assert.equal(p.bag.items[CONQUEST_SHARD],49999);const before=structuredClone(p.bag);assert.equal(send({needs:{[CONQUEST_SHARD]:100},coins:0}),false);assert.deepEqual(p.bag,before);
 realm.setBag(p,{coins:1000000,items:{[CONQUEST_SHARD]:50000}});assert.equal(send({}),true);assert.equal(p.bag.items['amulet-nang-phaya'],1);assert.equal(p.bag.items[CONQUEST_SHARD],undefined);assert.equal(p.bag.coins,0);
});

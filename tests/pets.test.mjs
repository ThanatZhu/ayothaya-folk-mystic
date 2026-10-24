import test from 'node:test';import assert from 'node:assert/strict';
import {activeEvent,expRate} from '../events.js';
import {rollLoot,buy,ITEMS,SHOPS,normalizeBag,sell} from '../items.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MONSTER_TYPES} from '../combat-core.js';
test('festival: date window, weekend EXP, token drops and the token stall', () => {
 const fri=Date.UTC(2026,9,16,3),sat=Date.UTC(2026,9,17,3),after=Date.UTC(2026,11,2,3);
 assert.equal(activeEvent(fri),null);assert.equal(activeEvent(sat).id,'loy-krathong-2026');assert.equal(activeEvent(after),null);
 assert.equal(expRate(fri),1);assert.equal(expRate(sat),1.5);assert.equal(expRate(Date.UTC(2026,11,5,3)),1.25,'plain weekend');
 assert.ok(rollLoot('rat',()=>0,activeEvent(sat)).items.some(i=>i.id==='event-token'));
 assert.ok(!rollLoot('rat',()=>0,null).items.some(i=>i.id==='event-token'));
 const b=buy({coins:0,items:{'event-token':10}},'เจ้าจุก','krathong',2);assert.deepEqual(b.items,{'event-token':2,krathong:2});
 assert.throws(()=>buy({coins:9999,items:{}},'เจ้าจุก','krathong',1),/no-tokens/);
});


test('retired capture supplies are sellable keepsakes, absent from every NPC shop',()=>{
 for(const id of ['pet-lure','pet-food','egg-rat','egg-straw','egg-hopper','egg-monkey']){assert.equal(ITEMS[id].retired,true);assert.equal(ITEMS[id].kind,'loot');for(const shop of Object.values(SHOPS))assert.ok(!shop.stock.includes(id));const bag={coins:1000,items:{[id]:1}};assert.equal(normalizeBag(bag).items[id],1);assert.ok(sell(bag,id,1).coins>1000);}
});
test('old capture commands cannot kill monsters, spend items, hatch pets or grant old bonuses',()=>{
 const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},rat=MONSTER_TYPES.findIndex(t=>t.id==='rat'),map={id:'field',nav,spawn:{x:0,z:0},mobs:[[1,0,rat]],npcs:[]};
 const realm=new RealmServer({catalog:{capital:'field',maps:[map]}}),record={character:{name:'RetiredPet',gender:'male',classId:'novice'},state:{...initialSave(),mapId:'field'},pet:{id:'rat',intimacy:900,hunger:100},bag:{coins:0,items:{'pet-lure':2,'egg-rat':1,'pet-food':2}}};const p=realm.join({uid:'retired',serverId:'server-1',slotId:'slot-1',record,send(){}}),before=structuredClone(p.bag),hp=p.room.mobs[0].hp;
 for(const [i,type] of ['tame','hatch','petFeed','petReturn'].entries())realm.receive(p.id,{type,seq:i+1,target:p.room.mobs[0].id,item:'egg-rat'});
 assert.deepEqual(p.bag,before);assert.equal(p.room.mobs[0].hp,hp);assert.equal(p.pet,null);assert.equal(realm.record(p,record).pet,null);
});

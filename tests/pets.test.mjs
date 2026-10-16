import test from 'node:test';
import assert from 'node:assert/strict';
import {tame,hatch,feedPet,returnPet,petTick,petBonus,LOYAL,PETS} from '../pets.js';
import {activeEvent,expRate} from '../events.js';
import {rollLoot,buy} from '../items.js';
import {deriveStats} from '../character-stats.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MONSTER_TYPES} from '../combat-core.js';

test('taming spends the lure, works better on a weak monster and only on tameable ones', () => {
 const bag={coins:0,items:{'pet-lure':3}},rat={hp:5,maxHp:38};
 const ok=tame(bag,'rat',rat,()=>.4);assert.equal(ok.ok,true);assert.deepEqual(ok.bag.items,{'pet-lure':2,'egg-rat':1});
 assert.equal(tame(bag,'rat',{hp:38,maxHp:38},()=>.4).ok,false,'full HP rat: .35×.6 < .4');
 assert.throws(()=>tame(bag,'mill-keeper',rat),/not-tameable/);
 assert.throws(()=>tame({coins:0,items:{}},'rat',rat),/no-item/);
});

test('hatch, feed, starve and return: intimacy rules and the loyal bonus', () => {
 let {bag,pet}=hatch({coins:0,items:{'egg-monkey':1,'pet-food':20}},null,'egg-monkey');
 assert.deepEqual(pet,{id:'monkey',intimacy:250,hunger:80});
 assert.throws(()=>hatch({coins:0,items:{'egg-rat':1}},pet,'egg-rat'),/pet-active/);
 let r=feedPet(bag,pet);assert.equal(r.pet.intimacy,250+10,'nearly full: small gain');
 pet={...pet,hunger:10};r=feedPet(bag,pet);assert.equal(r.pet.intimacy,330);assert.equal(r.pet.hunger,40);
 pet={...pet,hunger:100};assert.equal(feedPet(bag,pet).pet.intimacy,200,'overfed');
 const starving={id:'rat',intimacy:500,hunger:1};petTick(starving,120);assert.equal(starving.hunger,0);assert.ok(starving.intimacy<500);
 assert.equal(petBonus({id:'monkey',intimacy:LOYAL-1,hunger:50}),null);assert.deepEqual(petBonus({id:'monkey',intimacy:LOYAL,hunger:50}),{agi:2});
 const plain=deriveStats({level:10,classId:'rogue'}),loyal=deriveStats({level:10,classId:'rogue',pet:{agi:2}});assert.equal(loyal.total.agi,plain.total.agi+2);
 const back=returnPet(r.bag,r.pet);assert.equal(back.pet,null);assert.equal(back.bag.items['egg-monkey'],1);
 assert.equal(Object.keys(PETS).length,4);
});

test('festival: date window, weekend EXP, token drops and the token stall', () => {
 const fri=Date.UTC(2026,9,16,3),sat=Date.UTC(2026,9,17,3),after=Date.UTC(2026,11,2,3);
 assert.equal(activeEvent(fri),null);assert.equal(activeEvent(sat).id,'loy-krathong-2026');assert.equal(activeEvent(after),null);
 assert.equal(expRate(fri),1);assert.equal(expRate(sat),1.5);assert.equal(expRate(Date.UTC(2026,11,5,3)),1.25,'plain weekend');
 assert.ok(rollLoot('rat',()=>0,activeEvent(sat)).items.some(i=>i.id==='event-token'));
 assert.ok(!rollLoot('rat',()=>0,null).items.some(i=>i.id==='event-token'));
 const b=buy({coins:0,items:{'event-token':10}},'เจ้าจุก','krathong',2);assert.deepEqual(b.items,{'event-token':2,krathong:2});
 assert.throws(()=>buy({coins:9999,items:{}},'เจ้าจุก','krathong',1),/no-tokens/);
});

test('server: tame a selected rat, hatch it, the pet shows to others and is saved', () => {
 const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},rat=MONSTER_TYPES.findIndex(t=>t.id==='rat');
 const field={id:'rice-fields',safe:false,nav,spawn:{x:0,z:0},mobs:[[1,0,rat]],portals:[],npcs:[]};
 let time=Date.UTC(2026,9,16,3);const realm=new RealmServer({catalog:{capital:'rice-fields',maps:[field]},now:()=>time});
 const mk=name=>{const state=initialSave();state.mapId='rice-fields';return realm.join({uid:'u'+name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state,daily:{day:'2026-10-16',streak:1},bag:{coins:0,items:{'pet-lure':30}}},send:()=>{}});};
 const a=mk('เจ้าของ'),b=mk('คนดู');let seq=0;const send=(type,data)=>{time+=1000;return realm.receive(a.id,{type,seq:++seq,...data});};
 const mob=a.room.mobs[0];mob.hp=1;
 for(let i=0;i<30&&!a.bag.items['egg-rat'];i++){mob.hp=1;mob.dead=0;send('tame',{target:mob.id});}
 assert.equal(a.bag.items['egg-rat'],1,'tamed within 30 tries at 1 HP');assert.equal(mob.hp,0,'the tamed monster leaves');
 assert.equal(send('hatch',{item:'egg-rat'}),true);assert.equal(a.pet.id,'rat');
 assert.equal(realm.snapshot(b).players.find(x=>x.id===a.id).pet,'rat');
 assert.deepEqual(realm.record(a,{state:initialSave()}).pet,a.pet);
 assert.equal(send('petReturn',{}),true);assert.equal(a.pet,null);assert.equal(a.bag.items['egg-rat'],1);
});

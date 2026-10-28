import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,DROPS,itemDef} from '../items.js';
import {insertCard,deriveStats,unequipGear} from '../character-stats.js';
import {refineGear} from '../refine.js';
import {MONSTER_TYPES,CombatWorld,monsterHit} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

test('every monster with drops has exactly one card, and every card is dropped by its monster', () => {
 const cards=Object.keys(ITEMS).filter(id=>ITEMS[id].kind==='card');
 assert.equal(cards.length,Object.keys(DROPS).filter(id=>!MONSTER_TYPES.find(t=>t.id===id)?.draft).length);
 for(const [monster,d] of Object.entries(DROPS).filter(([id])=>!MONSTER_TYPES.find(t=>t.id===id)?.draft))assert.ok(d.items.some(([id])=>id==='card-'+monster),monster);
 for(const id of cards)assert.ok(['weapon','armor','accessory'].includes(ITEMS[id].slot)&&ITEMS[id].effect);
});

test('cards slot once into a matching worn piece, survive refine and unequip, and refuse wrong slots', () => {
 let r=insertCard({items:{'card-rat':1,'card-straw':1}},{weapon:'weapon-swordsman-one+3'},'weapon','card-rat');
 assert.equal(r.gear.weapon,'weapon-swordsman-one+3~card-rat');assert.equal(r.bag.items['card-rat'],undefined);
 assert.equal(itemDef(r.gear.weapon).name,'ดาบทุ่งนา +3 [การ์ดหนูยุ้งข้าว]');
 assert.throws(()=>insertCard({items:{'card-rat':1}},r.gear,'weapon','card-rat'),/slot-full/);
 assert.throws(()=>insertCard({items:{'card-straw':1}},{weapon:'weapon-swordsman-one'},'weapon','card-straw'),/card-slot/);
 assert.throws(()=>insertCard({items:{'card-rat-chief':1}},{accessory:'bia-gae'},'accessory','card-rat-chief'),/no-card-slot/);
 const up=refineGear({coins:9999,items:{'iron-ore':1}},r.gear,'weapon',{rand:()=>0});assert.equal(up.gear.weapon,'weapon-swordsman-one+4~card-rat','refine keeps the card');
 assert.equal(unequipGear({},up.gear,'weapon').bag.items['weapon-swordsman-one+4~card-rat'],1);
});

test('card effects reach the numbers and the fight', () => {
 const plain=deriveStats({level:10,classId:'rogue',gear:{weapon:'weapon-rogue-one',armor:'starter-shirt'}});
 const carded=deriveStats({level:10,classId:'rogue',gear:{weapon:'weapon-rogue-one~card-rat',armor:'starter-shirt~card-mill-keeper'}});
 assert.equal(carded.vsSize.small,.15);assert.ok(carded.maxHp>plain.maxHp);assert.equal(carded.resist.ghost,.3);
 assert.ok(monsterHit({player:{shield:0},derived:carded},100,()=>1,'lantern')<monsterHit({player:{shield:0},derived:plain},100,()=>1,'lantern'));
 const rat=MONSTER_TYPES.findIndex(t=>t.id==='rat'),nav={zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]};
 const swing=gear=>{const w=new CombatWorld({classId:'rogue',safe:false,nav,spawn:{x:0,z:0},mobs:[[1,0,rat]]});w.applyDerived(deriveStats({level:10,classId:'rogue',gear}));w.derived.crit=0;const m=w.mobs[0];m.hp=9999;w.basicAttack();return 9999-m.hp;};
 assert.ok(swing({weapon:'weapon-rogue-one~card-rat'})>swing({weapon:'weapon-rogue-one'}),'rat card hits small monsters harder');
});

test('server: insertCard validates and saves; coin card raises monster coins', () => {
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},boss=MONSTER_TYPES.findIndex(t=>t.id==='mill-keeper');
 const map={id:'moonlit-mill',safe:false,nav,spawn:{x:0,z:0},mobs:[[2,0,boss]],portals:[],npcs:[]};
 let time=1e4;const realm=new RealmServer({catalog:{capital:'moonlit-mill',maps:[map]},now:()=>time});
 const state=initialSave();state.mapId='moonlit-mill';state.traveler.baseXp=900;
 const record={character:{name:'tester',gender:'male',classId:'swordsman'},state,bag:{coins:0,items:{'card-rat-chief':1,'card-vine':1}},gear:{weapon:'weapon-swordsman-one',accessory:'ring-ruby'}};
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 const send=(type,data)=>{time+=1000;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 assert.equal(send('insertCard',{slot:'weapon',card:'card-vine'}),false,'armor card in a weapon');
 assert.equal(send('insertCard',{slot:'accessory',card:'card-rat-chief'}),true);
 assert.equal(realm.record(peer,record).gear.accessory,'ring-ruby~card-rat-chief');
 assert.equal(peer.derived.coinPct,.25);
 const mob=peer.room.mobs[0];Object.assign(peer.world.player,{x:mob.x+1,z:mob.z});realm.hurt(peer,mob,99999);
 assert.ok(peer.bag.coins>=500,'boss coins 400-600 × 1.25');
});

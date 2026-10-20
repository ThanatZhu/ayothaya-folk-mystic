import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MONSTER_TYPES} from '../combat-core.js';

const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const city={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[{name:'แม่บัว',x:5,z:0,text:'-'},{name:'ลุงเรือง',x:-5,z:0,text:'-'}]};
const boss=MONSTER_TYPES.findIndex(t=>t.id==='mill-keeper');
const mill={id:'moonlit-mill',safe:false,nav,spawn:{x:0,z:0},mobs:[[2,0,boss]],portals:[],npcs:[]};

function setup(map,bag){
 let time=1e4;const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[city,mill]},now:()=>time});
 const state=initialSave();state.mapId=map.id;
 const record={character:{name:'tester',gender:'female',classId:'novice'},state,daily:{day:'1970-01-01',streak:1},...(bag?{bag}:{})};
 const sent=[],peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:m=>sent.push(m)});
 const send=(type,data)=>{time+=1000;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 return {realm,peer,send,record,sent};
}

test('the shop only trades next to its NPC, charges coins, and the bag is saved privately', () => {
 const {realm,peer,send,record}=setup(city,{coins:100,items:{'rat-tooth':5}});
 Object.assign(peer.world.player,{x:-4,z:0});
 assert.equal(send('buy',{npc:'แม่บัว',item:'hp-small',count:2}),false,'too far from the shop');
 assert.equal(send('buy',{npc:'ลุงเรือง',item:'hp-small',count:1}),false,'not a shop');
 Object.assign(peer.world.player,{x:4,z:0});
 assert.equal(send('buy',{npc:'แม่บัว',item:'hp-small',count:2}),true);
 assert.equal(send('buy',{npc:'แม่บัว',item:'hp-large',count:1}),false,'not enough coins');
 assert.equal(send('sell',{npc:'แม่บัว',item:'rat-tooth',count:5}),true);
 assert.deepEqual(realm.record(peer,record).bag,{coins:65,items:{'hp-small':2}});
 assert.ok(peer.world.events.some(e=>e.type==='notice'&&e.text==='เบี้ยไม่พอ'));
});

test('potions heal on the server and are spent; the bag rides in the snapshot only when it changed', () => {
 const {realm,peer,send,sent}=setup(city,{coins:0,items:{'hp-small':2}});
 assert.deepEqual(sent.find(m=>m.type==='welcome').snapshot.self.bag,{coins:0,items:{'hp-small':2}},'welcome carries the bag');
 assert.equal(realm.snapshot(peer).self.bag,undefined,'unchanged bag is not resent');
 peer.world.player.hp=50;
 assert.equal(send('useItem',{item:'hp-small'}),true);
 assert.equal(peer.world.player.hp,110);
 assert.deepEqual(realm.snapshot(peer).self.bag,{coins:0,items:{'hp-small':1}});
 peer.world.player.hp=peer.world.player.maxHp;
 assert.equal(send('useItem',{item:'hp-small'}),false,'already full');
});

test('defeating a monster auto-loots coins and its drops into the bag', () => {
 const {realm,peer}=setup(mill);
 const mob=peer.room.mobs[0];Object.assign(peer.world.player,{x:mob.x+1,z:mob.z});
 realm.hurt(peer,mob,99999);
 assert.ok(peer.bag.coins>=400,'boss coins');assert.equal(peer.bag.items['spirit-rope'],1,'boss always drops its rope');
 assert.ok(peer.world.events.some(e=>e.type==='loot'&&e.items.some(i=>i.id==='spirit-rope')));
});

test('0.100.10 discard is validated on the server; a quantity buy is one atomic purchase', () => {
 const {realm,peer,send,record}=setup(city,{coins:1000,items:{'rat-tooth':5}});
 assert.equal(send('discard',{item:'rat-tooth',count:6}),false,'more than the stack');
 assert.equal(send('discard',{item:'rat-tooth',count:'2'}),false,'not an integer');
 assert.equal(send('discard',{item:'hp-large',count:1}),false,'not in the bag');
 assert.equal(send('discard',{item:'rat-tooth',count:2}),true);
 assert.equal(peer.bag.items['rat-tooth'],3);
 peer.trade={locked:true};assert.equal(send('discard',{item:'rat-tooth',count:1}),false,'offer is locked in a trade');peer.trade=null;
 assert.equal(send('discard',{item:'rat-tooth',count:3}),true);
 assert.equal(peer.bag.items['rat-tooth'],undefined);
 Object.assign(peer.world.player,{x:4,z:0});
 assert.equal(send('buy',{npc:'แม่บัว',item:'hp-small',count:1.5}),false);
 assert.equal(send('buy',{npc:'แม่บัว',item:'hp-small',count:41}),false,'41 × 25 is more than 1000 Bia');
 assert.deepEqual(peer.bag,{coins:1000,items:{}},'a refused buy changes nothing');
 assert.equal(send('buy',{npc:'แม่บัว',item:'hp-small',count:40}),true);
 assert.equal(realm.record(peer,record).bag.items['hp-small'],40);
 assert.ok(peer.bag.coins<1000);
});

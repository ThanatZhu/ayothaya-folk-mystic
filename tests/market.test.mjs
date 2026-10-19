import test from 'node:test';
import {MARKET_ZONE} from '../market-board.js';
import assert from 'node:assert/strict';
import {moveOffer,swapOffers,normalizeStall,buyFromStall,STORAGE_SLOTS} from '../market.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

test('offers move all-or-nothing and never create items', () => {
 const [a,b]=moveOffer({coins:50,items:{'rat-tooth':3}},{coins:0,items:{}},{coins:20,items:{'rat-tooth':2}});
 assert.deepEqual(a,{coins:30,items:{'rat-tooth':1}});assert.deepEqual(b,{coins:20,items:{'rat-tooth':2}});
 assert.throws(()=>moveOffer({coins:5,items:{}},{},{coins:6,items:{}}),/no-coins/);
 assert.throws(()=>moveOffer({coins:0,items:{'rat-tooth':1}},{},{coins:0,items:{'rat-tooth':2}}),/no-item/);
 const [x,y]=swapOffers({coins:10,items:{'hp-small':1}},{coins:10,items:{'hp-small':1}},{coins:0,items:{'card-rat':1}},{coins:0,items:{'card-rat':1}});
 assert.deepEqual([x,y],[{coins:0,items:{'card-rat':1}},{coins:10,items:{'hp-small':1}}]);
 assert.equal(moveOffer({coins:0,items:{'hp-small':1}},{},{coins:0,items:{'hp-small':1}},{toCap:STORAGE_SLOTS})[1].items['hp-small'],1);
});

test('stall rows cap to what the owner holds and selling moves coins and items', () => {
 const stall=normalizeStall({title:'ของดี',items:{'rat-tooth':{count:9,price:15},'bogus':{count:1,price:1}}},{coins:0,items:{'rat-tooth':4}});
 assert.deepEqual(stall,{title:'ของดี',items:{'rat-tooth':{count:4,price:15}}});
 const r=buyFromStall({coins:0,items:{'rat-tooth':4}},stall,{coins:40,items:{}},'rat-tooth',2);
 assert.equal(r.cost,30);assert.deepEqual(r.sellerBag,{coins:30,items:{'rat-tooth':2}});assert.deepEqual(r.buyerBag,{coins:10,items:{'rat-tooth':2}});
 assert.equal(r.stall.items['rat-tooth'].count,2);
 assert.throws(()=>buyFromStall(r.sellerBag,r.stall,r.buyerBag,'rat-tooth',1),/no-coins/);
});

const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const city={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[{name:'ลุงเรือง',x:-5,z:0,text:'-'}]};
const field={id:'rice-field',safe:false,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]};
function realmWith(mapId,...bags){
 let time=1e4;const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[city,field]},now:()=>time});
 const peers=bags.map((bag,i)=>{const state=initialSave();state.mapId=mapId;return realm.join({uid:'u'+i,serverId:'server-1',slotId:'slot-1',record:{character:{name:'p'+i,gender:'male',classId:'novice'},state,bag,daily:{day:'1970-01-01',streak:1}},send:()=>{}});});
 const send=(p,type,data)=>{time+=1000;return realm.receive(p.id,{type,seq:p.seq+1,...data});};
 return {realm,peers,send};
}

test('server: storage at ลุงเรือง keeps items out of the bag and out of the public mirror', () => {
 const {realm,peers:[p],send}=realmWith('ayutthaya',{coins:0,items:{'rat-tooth':5}});
 Object.assign(p.world.player,{x:10,z:0});
 assert.equal(send(p,'store',{npc:'ลุงเรือง',item:'rat-tooth',count:3}),false,'too far');
 Object.assign(p.world.player,{x:-4,z:0});
 assert.equal(send(p,'store',{npc:'ลุงเรือง',item:'rat-tooth',count:3}),true);
 assert.equal(send(p,'retrieve',{npc:'ลุงเรือง',item:'rat-tooth',count:4}),false,'only 3 stored');
 assert.equal(send(p,'retrieve',{npc:'ลุงเรือง',item:'rat-tooth',count:1}),true);
 const rec=realm.record(p,{state:initialSave()});
 assert.deepEqual(rec.bag.items,{'rat-tooth':3});assert.deepEqual(rec.storage.items,{'rat-tooth':2});
});

test('server: a trade swaps only after both lock and confirm, and flags both for an immediate save', () => {
 const {peers:[a,b],send}=realmWith('ayutthaya',{coins:100,items:{'hp-small':2}},{coins:0,items:{'card-rat':1}});
 assert.equal(send(a,'tradeRequest',{target:b.id}),true);
 assert.equal(send(b,'tradeAnswer',{from:a.id,accept:true}),true);
 assert.equal(send(a,'tradeOffer',{offer:{coins:200,items:{}}}),false,'cannot offer what you lack');
 assert.equal(send(a,'tradeOffer',{offer:{coins:60,items:{'hp-small':1}}}),true);
 assert.equal(send(b,'tradeOffer',{offer:{coins:0,items:{'card-rat':1}}}),true);
 assert.equal(send(a,'tradeConfirm',{}),false,'lock first');
 send(a,'tradeLock',{});send(b,'tradeLock',{});
 assert.equal(send(a,'tradeOffer',{offer:{coins:1,items:{}}}),false,'locked');
 assert.equal(send(a,'tradeConfirm',{}),true);assert.equal(a.bag.coins,100,'nothing moves on one confirm');
 assert.equal(send(b,'tradeConfirm',{}),true);
 assert.deepEqual(a.bag,{coins:40,items:{'hp-small':1,'card-rat':1}});assert.deepEqual(b.bag,{coins:60,items:{'hp-small':1}});
 assert.ok(a.saveNow&&b.saveNow);assert.equal(a.trade,null);
});

test('server: stalls open only in town, sell to others, and close when the owner walks off', () => {
 const {realm,peers:[s,c],send}=realmWith('ayutthaya',{coins:0,items:{'rat-tooth':4}},{coins:100,items:{}});
 // 0.70 stalls open on the market street only
 const street={x:MARKET_ZONE.x+4,z:MARKET_ZONE.z+4};Object.assign(c.world.player,street);assert.equal(send(s,'stallOpen',{stall:{title:'x',items:{'rat-tooth':{count:1,price:1}}}}),false,'off the market street');Object.assign(s.world.player,street);
 assert.equal(send(s,'stallOpen',{stall:{title:'ฟันหนู',items:{'rat-tooth':{count:4,price:10}}}}),true);
 assert.equal(send(s,'stallBuy',{owner:s.id,item:'rat-tooth',count:1}),false,'own stall');
 assert.equal(send(c,'stallBuy',{owner:s.id,item:'rat-tooth',count:3}),true);
 assert.deepEqual([s.bag,c.bag],[{coins:30-Math.floor(30*.03),items:{'rat-tooth':1}},{coins:70,items:{'rat-tooth':3}}]); // 3% sales tax
 assert.equal(s.stall.items['rat-tooth'].count,1);
 s.world.player.x+=5;realm.snapshot(s);assert.equal(s.stall,null);
 const far=realmWith('rice-field',{coins:0,items:{'rat-tooth':1}});
 assert.equal(far.send(far.peers[0],'stallOpen',{stall:{items:{'rat-tooth':{count:1,price:5}}}}),false);
});

test('server: return incense recalls to the capital from anywhere and is spent', () => {
 const {realm,peers:[p]}=realmWith('rice-field',{coins:0,items:{'return-incense':1}});
 assert.equal(realm.travelDestination(p,'ayutthaya').id,'ayutthaya');
 assert.equal(p.bag.items['return-incense'],undefined);
 assert.throws(()=>realm.travelDestination(p,'ayutthaya'),/travel-invalid/,'no incense left');
});

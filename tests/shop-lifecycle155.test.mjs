import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {SHOP_DURATION,MARKET_ZONE,tradePerks,openShop,buyFromShop,sellToShop,collectShop,shopIsOpen,closeInactiveShop,searchMarket} from '../market-board.js';
import {MAX_STACK} from '../items.js';import {RealmServer} from '../server/realm.js';import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';import {initialSave} from '../realm-state.js';
const spot={x:MARKET_ZONE.x+5,z:MARKET_ZONE.z+5},map={id:'ayutthaya',safe:true,spawn:spot,nav:{zones:[{x:-50,z:-50,w:100,d:100}],obstacles:[],props:[]},mobs:[]},catalog={capital:map.id,maps:[map,{...map,id:'rice-field',safe:false}]};
const fixture=()=>{let now=1000000;const realm=new RealmServer({catalog,now:()=>now}),writes=[];realm.onShop=(s,deleted)=>writes.push({s,deleted});const join=(uid,bag={coins:1000,items:{}},serverId='server-1',mapId=map.id)=>{const p=realm.join({uid,serverId,slotId:'slot-1',record:{character:{name:uid,gender:'male',classId:'novice'},state:{...initialSave(),mapId,position:spot},bag,daily:{day:'2099-01-01',streak:1}},send(){}});p.bag.coins=bag.coins;return p;};return {realm,writes,join,send:(p,type,data={})=>realm.receive(p.id,{type,seq:p.seq+1,...data}),advance:ms=>now+=ms,get now(){return now;}};};
const listing=(item='rat-tooth',count=1,price=100)=>({title:'LifecycleShop',items:{[item]:{count,price}}});

test('the last sale removes the public shop immediately, preserves proceeds, frees its spot and pays exactly once',async()=>{
 const t=fixture(),owner=t.join('seller',{coins:0,items:{'rat-tooth':1,'straw-bundle':1}}),buyer=t.join('buyer');assert.equal(t.send(owner,'shopOpen',{shop:listing()}),true);const id=[...t.realm.shops.keys()][0];assert.equal(t.realm.shopList('server-1').length,1);
 assert.equal(t.send(buyer,'shopBuy',{shop:id,item:'rat-tooth',count:1}),true);const closed=t.realm.shops.get(id);assert.equal(closed.status,'closed');assert.equal(closed.closedReason,'sold-out');assert.equal(closed.pouch.coins,97);assert.equal(t.realm.shopList('server-1').length,0);assert.equal(searchMarket([closed],[],'rat',t.now).length,0);assert.equal(t.send(buyer,'shopBuy',{shop:id,item:'rat-tooth',count:1}),false);
 assert.equal(t.send(owner,'shopOpen',{shop:listing('straw-bundle')}),true,'closed claims do not reserve a slot or map position');assert.equal(t.realm.shopList('server-1').length,1);
 assert.equal(t.send(owner,'shopCollect',{shop:id}),true);assert.equal(owner.bag.coins,97);assert.equal(t.realm.shops.has(id),false);assert.equal(t.send(owner,'shopCollect',{shop:id}),false);assert.equal(owner.bag.coins,97);await t.realm.flushShops();assert.ok(t.writes.some(w=>w.deleted&&w.s.id===id));
});

test('24 hours is enforced at the exact boundary even without a sweep; expiry never discards escrow or unsold items',()=>{
 const t=fixture(),owner=t.join('seller',{coins:0,items:{'rat-tooth':5}}),buyer=t.join('buyer');t.send(owner,'shopOpen',{shop:listing('rat-tooth',5)});const s=[...t.realm.shops.values()][0];assert.equal(s.expiresAt-s.createdAt,SHOP_DURATION);
 t.advance(SHOP_DURATION-1);assert.equal(shopIsOpen(s,t.now),true);t.advance(1);assert.equal(t.realm.shopList('server-1').length,0);const before=structuredClone(buyer.bag);assert.equal(t.send(buyer,'shopBuy',{shop:s.id,item:'rat-tooth',count:1}),false);assert.deepEqual(buyer.bag,before);assert.equal(t.realm.shops.get(s.id).closedReason,'expired');assert.equal(t.realm.shops.get(s.id).items['rat-tooth'].count,5);
 owner.bag={coins:0,items:{'rat-tooth':MAX_STACK}};assert.equal(t.send(owner,'shopCollect',{shop:s.id}),false);assert.equal(t.realm.shops.has(s.id),true);owner.bag={coins:0,items:{}};assert.equal(t.send(owner,'shopCollect',{shop:s.id}),true);assert.equal(owner.bag.items['rat-tooth'],5);assert.equal(t.realm.shops.has(s.id),false);
});

test('buying stores close when filled or expired and return every acquired item and unused coin',()=>{
 const perks=tradePerks(0),o={key:'owner',name:'Owner',serverId:'server-1'},open=()=>openShop({bag:{coins:1000,items:{}},req:{kind:'buy',...listing('straw-bundle',10,20)},perks,owner:o,...spot,mapId:map.id,now:100,id:'buy-store'});
 const a=open(),partial=sellToShop(a.shop,{coins:0,items:{'straw-bundle':4}},'straw-bundle',4,perks,{now:101});assert.equal(partial.shop.escrow,120);const expired=closeInactiveShop(partial.shop,100+SHOP_DURATION),back=collectShop(expired,a.bag);assert.equal(back.shop,null);assert.equal(back.bag.coins,920);assert.equal(back.bag.items['straw-bundle'],4);
 const b=open(),full=sellToShop(b.shop,{coins:0,items:{'straw-bundle':10}},'straw-bundle',10,perks,{now:101});assert.equal(full.shop.closedReason,'filled');assert.equal(shopIsOpen(full.shop,102),false);const received=collectShop(full.shop,b.bag);assert.equal(received.bag.items['straw-bundle'],10);assert.equal(received.bag.coins,800);assert.equal(received.shop,null);
});

test('collecting proceeds never renews the deadline and a newly opened shop starts a fresh 24-hour period',()=>{
 const perks=tradePerks(0),owner={key:'owner',name:'Owner',serverId:'server-1'},a=openShop({bag:{coins:0,items:{'rat-tooth':2}},req:listing('rat-tooth',2),perks,owner,...spot,mapId:map.id,now:100,id:'first'}),sold=buyFromShop(a.shop,{coins:1000,items:{}},'rat-tooth',1,perks,{now:110});
 const collected=collectShop(sold.shop,a.bag);assert.equal(collected.shop.expiresAt,100+SHOP_DURATION);const ended=closeInactiveShop(collected.shop,100+SHOP_DURATION);assert.equal(ended.closedReason,'expired');const next=openShop({bag:{coins:0,items:{'rat-tooth':1}},req:{...listing(),expiresAt:1e15},perks,owner,...spot,mapId:map.id,now:SHOP_DURATION+200,id:'second',existing:[ended]});assert.equal(next.shop.expiresAt,2*SHOP_DURATION+200);assert.notEqual(next.shop.id,a.shop.id);
});

test('expiry sends one batched removal and no repeated writes/events; non-market maps receive only IDs',async()=>{
 const t=fixture(),owner=t.join('seller',{coins:0,items:{'rat-tooth':1,'straw-bundle':1}}),observer=t.join('observer',undefined,'server-1','rice-field'),other=t.join('elsewhere',undefined,'server-2');owner.tradeXp=150000;t.send(owner,'shopOpen',{shop:listing()});owner.world.player.x+=4;t.send(owner,'shopOpen',{shop:listing('straw-bundle')});await t.realm.flushShops();t.writes.length=0;for(const p of t.realm.peers.values())p.world.events=[];
 t.advance(SHOP_DURATION);t.realm.expireShops();await t.realm.flushShops();assert.equal(t.writes.length,2);assert.equal(owner.world.events.filter(e=>e.type==='shops').length,1);const notice=observer.world.events.find(e=>e.type==='shopsClosed');assert.equal(notice.ids.length,2);assert.equal(observer.world.events.some(e=>e.type==='shops'),false);assert.equal(other.world.events.some(e=>e.type==='shopsClosed'),false);assert.deepEqual(Object.keys(notice).sort(),['ids','type']);
 for(const p of t.realm.peers.values())p.world.events=[];t.realm.expireShops();t.realm.expireShops();await t.realm.flushShops();assert.equal(t.writes.length,2);assert.equal([...t.realm.peers.values()].some(p=>p.world.events.some(e=>['shops','shopsClosed','shopMine'].includes(e.type))),false);
});

test('online stalls disappear after selling out or 24 hours while their bag and proceeds remain intact',()=>{
 const t=fixture(),owner=t.join('seller',{coins:0,items:{'rat-tooth':2}}),buyer=t.join('buyer');t.send(owner,'stallOpen',{stall:listing('rat-tooth',1)});assert.equal(t.send(buyer,'stallBuy',{owner:owner.id,item:'rat-tooth',count:1}),true);assert.equal(owner.stall,null);assert.equal(owner.bag.items['rat-tooth'],1);assert.equal(owner.bag.coins,97);
 t.send(owner,'stallOpen',{stall:listing()});const deadline=owner.stall.expiresAt;t.advance(SHOP_DURATION);assert.equal(t.now,deadline);assert.equal(t.send(buyer,'stallBuy',{owner:owner.id,item:'rat-tooth',count:1}),false);assert.equal(owner.stall,null);assert.equal(owner.bag.items['rat-tooth'],1);assert.equal(owner.bag.coins,97);
});

test('queued shop writes cannot resurrect a sold-out shop after its proceeds have been collected',async()=>{
 const t=fixture(),saved=new Map(),order=[];t.realm.onShop=async(s,deleted)=>{if(s.status==='open')await new Promise(r=>setTimeout(r,20));order.push(deleted?'deleted':s.status);if(deleted)saved.delete(s.id);else saved.set(s.id,s);};const owner=t.join('seller',{coins:0,items:{'rat-tooth':1}}),buyer=t.join('buyer');t.send(owner,'shopOpen',{shop:listing()});const id=[...t.realm.shops.keys()][0];t.send(buyer,'shopBuy',{shop:id,item:'rat-tooth',count:1});t.send(owner,'shopCollect',{shop:id});await t.realm.flushShops();assert.deepEqual(order,['open','closed','deleted']);assert.equal(saved.has(id),false);assert.equal(owner.bag.coins,97);
});

test('legacy shops loaded after a restart expire once and keep all owner claims on disk',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'shops155-')),store=await new LocalStore(directory).init(),created=Date.now()-SHOP_DURATION-1000,s= openShop({bag:{coins:0,items:{'rat-tooth':3}},req:listing('rat-tooth',3),perks:tradePerks(0),owner:{key:'offline:slot-1',name:'Offline',serverId:'server-1'},...spot,mapId:map.id,now:created,id:'legacy-shop'}).shop;delete s.expiresAt;delete s.status;store.realmShops=new Map([[s.id,s]]);await store.saveShop();
 const host=await createHost({mode:'local',store,catalog});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));try{host.realm.expireShops();await host.realm.flushShops();assert.equal(host.realm.shopList('server-1').length,0);const rows=await store.loadShops();assert.equal(rows[0].status,'closed');assert.equal(rows[0].items['rat-tooth'].count,3);assert.equal(rows[0].createdAt,created);host.realm.expireShops();assert.equal(host.realm.shops.size,1);}finally{await host.close();}
 const reloaded=await new LocalStore(directory).init();const rows=await reloaded.loadShops();assert.equal(rows[0].closedReason,'expired');assert.equal(rows[0].items['rat-tooth'].count,3);
});

test('a replacement cloud host loads the latest shops only after acquiring world authority',async()=>{
 let held=true,loads=0;const stored={...openShop({bag:{coins:0,items:{'rat-tooth':1}},req:listing(),perks:tradePerks(0),owner:{key:'offline:slot-1',name:'Offline',serverId:'server-1'},...spot,mapId:map.id,now:Date.now()-SHOP_DURATION-100,id:'handover-shop'}).shop,pouch:{coins:100,items:{}}};
 const store={authorityUntil:0,async renewAuthority(){if(held)throw Error('another-authority-active');this.authorityUntil=Date.now()+120000;},async releaseAuthority(){this.authorityUntil=0;},async loadShops(){assert.ok(this.authorityUntil>Date.now());loads++;return [structuredClone(stored)];},async loadPrices(){return {};},async saveShop(s){Object.assign(stored,structuredClone(s));},async deleteShop(){},async savePrices(){}};
 const first=await createHost({mode:'firebase',store,catalog});await new Promise(r=>first.server.listen(0,'127.0.0.1',r));try{assert.equal(loads,0);assert.equal(first.realm.shops.size,0);}finally{await first.close();}
 stored.pouch.coins=400;held=false;const next=await createHost({mode:'firebase',store,catalog});await new Promise(r=>next.server.listen(0,'127.0.0.1',r));try{assert.equal(loads,1);assert.equal(next.realm.shops.get(stored.id).pouch.coins,400);next.realm.expireShops();await next.realm.flushShops();assert.equal(stored.status,'closed');assert.equal(stored.pouch.coins,400);}finally{await next.close();}
});

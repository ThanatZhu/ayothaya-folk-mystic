import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {browseMarket,marketOptions,marketDay,marketDemand,recordPrice,SHOP_DURATION,MARKET_ZONE} from '../market-board.js';
import {RealmServer} from '../server/realm.js';
import {LocalStore} from '../server/storage.js';
import {initialSave} from '../realm-state.js';
const now=Date.parse('2026-10-28T12:00:00Z'),spot={x:MARKET_ZONE.x+5,z:MARKET_ZONE.z+5};
const shop=(id,items,extra={})=>({id,kind:'sell',title:'ร้าน '+id,ownerKey:id,ownerName:id,serverId:'server-1',...spot,createdAt:now-1000,expiresAt:now-1000+SHOP_DURATION,status:'open',items,...extra});
const row=(count=5,price=10)=>({count,price});

test('browse opens on every sale listing and paginates beyond forty without duplicates or missing items',()=>{
 const shops=Array.from({length:83},(_,i)=>shop('shop-'+i,{'rat-tooth':row()},{createdAt:now-i*1000}));
 const seen=[];for(let page=1;page<=4;page++){const r=browseMarket(shops,[],{page},{},now);assert.equal(r.total,83);assert.equal(r.pages,4);assert.equal(r.stats.listings,83);seen.push(...r.rows.map(r=>r.shop));}
 assert.equal(seen.length,83);assert.equal(new Set(seen).size,83);assert.equal(seen[0],'shop-0');assert.equal(seen.at(-1),'shop-82');
 assert.equal(browseMarket(shops,[],{page:999},{},now).page,4);
});

test('filters combine category, item/seller query, shop kind and price; closed, expired and invalid goods never appear',()=>{
 const shops=[shop('old',{'rat-tooth':row(3,20),'weapon-swordsman-one+5':row(1,300),'pierce-armor-swordsman-one':row(1,100),'card-rat':row(2,50),'hp-small':row(4,10)}),
  shop('new',{'rat-tooth':row(3,30)},{createdAt:now,ownerName:'ผู้ขายใหม่'}),shop('wanted',{'rat-tooth':row(8,40)},{kind:'buy'}),
  shop('closed',{'rat-tooth':row()},{status:'closed'}),shop('expired',{'rat-tooth':row()},{expiresAt:now}),shop('invalid',{'rat-tooth':row(0),'fake-item':row()})];
 const stalls=[{owner:'live',name:'แผงสด',title:'แผงทดสอบ',items:{'rat-tooth':row(4,15)},createdAt:now+1,mapId:'ayutthaya',...spot}];
 assert.equal(browseMarket(shops,stalls,{}, {},now).total,7);
 assert.equal(browseMarket(shops,stalls,{kind:'buy'}, {},now).total,1);
 assert.equal(browseMarket(shops,stalls,{kind:'all'}, {},now).total,8);
 assert.deepEqual(browseMarket(shops,stalls,{category:'weapon'},{},now).rows.map(r=>r.item),['weapon-swordsman-one+5']);
 assert.deepEqual(browseMarket(shops,stalls,{category:'armor'},{},now).rows.map(r=>r.item),['pierce-armor-swordsman-one']);
 assert.equal(browseMarket(shops,stalls,{category:'card'},{},now).total,1);
 assert.equal(browseMarket(shops,stalls,{query:'ผู้ขายใหม่'},{},now).rows[0].shop,'new');
 assert.equal(browseMarket(shops,stalls,{query:'แผงทดสอบ'},{},now).rows[0].owner,'live');
 assert.deepEqual(browseMarket(shops,stalls,{category:'loot',minPrice:18,maxPrice:30,sort:'price-low'},{},now).rows.map(r=>r.price),[20,30]);
 assert.equal(browseMarket(shops,stalls,{sort:'price-high'},{},now).rows[0].item,'weapon-swordsman-one+5');
 assert.equal(browseMarket(shops,stalls,{}, {},now).rows[0].owner,'live');
 assert.equal(browseMarket(shops,stalls,{query:'not found'},{},now).pages,1);
 const o=marketOptions({category:'__proto__',sort:'fake',page:-1,pageSize:999,minPrice:100,maxPrice:20});
 assert.equal(o.category,'all');assert.equal(o.page,1);assert.equal(o.pageSize,48);assert.equal(o.minPrice,20);assert.equal(o.maxPrice,100);
});

test('popularity counts purchased units and transactions, combines equipment variants and resets at Bangkok midnight',()=>{
 const midnight=Date.parse('2026-10-28T17:00:00Z');let prices={'hp-small':{n:900,avg:20,t:now}};
 assert.deepEqual(marketDemand(prices,now),[],'legacy averages cannot stand in for actual purchases');
 prices=recordPrice(prices,'rat-tooth',10,midnight-1,7);
 prices=recordPrice(prices,'rat-tooth',12,midnight-1,2);
 prices=recordPrice(prices,'weapon-swordsman-one+5',300,midnight-1,3);
 prices=recordPrice(prices,'weapon-swordsman-one',100,midnight-1,1);
 const hot=marketDemand(prices,midnight-1);assert.equal(hot[0].units,9);assert.equal(hot[0].trades,2);assert.equal(hot[1].item,'weapon-swordsman-one');assert.equal(hot[1].units,4);
 assert.deepEqual(marketDemand(prices,midnight),[]);
 assert.equal(marketDay(midnight),marketDay(midnight-1)+1);
 prices=recordPrice(prices,'rat-tooth',20,midnight,4);assert.equal(marketDemand(prices,midnight)[0].units,4);
 const shops=[shop('a',{'rat-tooth':row(),'weapon-swordsman-one+5':row(1,500)})];
 assert.equal(browseMarket(shops,[],{sort:'popular'},prices,midnight-1).rows[0].item,'rat-tooth');
 for(let day=1;day<=14;day++)prices=recordPrice(prices,'rat-tooth',10,midnight+day*86400000,1);
 assert.equal(prices['rat-tooth'].days.length,7);
});

const fixture=()=>{
 let clock=now;const map={id:'ayutthaya',safe:true,spawn:spot,nav:{zones:[{x:-50,z:-50,w:100,d:100}],obstacles:[],props:[]},mobs:[]};
 const realm=new RealmServer({catalog:{capital:map.id,maps:[map]},now:()=>clock});
 const join=(uid,items={},serverId='server-1')=>{const p=realm.join({uid,serverId,slotId:'slot-1',record:{character:{name:uid,gender:'male',classId:'novice'},state:{...initialSave(),position:spot},bag:{coins:10000,items},daily:{day:'2099-01-01',streak:1}},send(){}});Object.assign(p.world.player,spot);p.world.events=[];return p;};
 return {realm,join,send:(p,type,data={})=>realm.receive(p.id,{type,seq:p.seq+1,...data}),advance:ms=>clock+=ms};
};
test('realm browse updates only subscribed viewers; sales remain in demand after shop collection and restart storage',async()=>{
 const t=fixture(),seller=t.join('seller',{'rat-tooth':3}),buyer=t.join('buyer'),watcher=t.join('watcher',{'hp-small':1}),other=t.join('other',{},'server-2');
 t.realm.prices.set('server-1',{'hp-small':{avg:30,last:25,n:2,t:now},'card-rat':{avg:50,last:40,n:10,t:now}});
 for(const p of [watcher,other])t.send(p,'marketSearch',{watch:true,requestId:1});
 assert.equal(watcher.world.events.at(-1).total,0);
 assert.equal(watcher.world.events.at(-1).prices['hp-small'].avg,30);assert.equal(watcher.world.events.at(-1).prices['card-rat'],undefined);
 t.send(seller,'shopOpen',{shop:{title:'ล่าสุด',items:{'rat-tooth':row(3,100)}}});t.realm.flushMarketBrowsers();
 assert.equal(watcher.world.events.filter(e=>e.type==='marketResults').at(-1).rows[0].name,'seller');
 assert.equal(other.world.events.filter(e=>e.type==='marketResults').at(-1).total,0);
 const id=[...t.realm.shops.keys()][0];assert.equal(t.send(buyer,'shopBuy',{shop:id,item:'rat-tooth',count:4}),false);
 assert.deepEqual(marketDemand(t.realm.prices.get('server-1'),now),[]);
 t.send(buyer,'shopBuy',{shop:id,item:'rat-tooth',count:3});t.send(seller,'shopCollect',{shop:id});t.realm.flushMarketBrowsers();
 const latest=watcher.world.events.filter(e=>e.type==='marketResults').at(-1);assert.equal(latest.total,0);assert.equal(latest.trending[0].units,3);assert.equal(latest.trending[0].trades,1);
 const count=watcher.world.events.length;t.realm.flushMarketBrowsers();assert.equal(watcher.world.events.length,count,'idle markets send no repeated rows');
 t.send(watcher,'marketSearch',{close:true});t.realm.traded('server-1',[],'hp-small',10,1);t.realm.flushMarketBrowsers();assert.equal(watcher.world.events.length,count);
 const store=await new LocalStore(await mkdtemp(path.join(tmpdir(),'market188-'))).init();await store.savePrices('server-1',t.realm.prices.get('server-1'));
 const saved=await store.loadPrices();assert.equal(marketDemand(saved['server-1'],now).find(r=>r.item==='rat-tooth').units,3);
});

test('live stalls appear and disappear on disconnect, and buying-store fills count as purchases',()=>{
 const t=fixture(),vendor=t.join('vendor',{'hp-small':2,'rat-tooth':3}),watcher=t.join('watcher'),customer=t.join('customer');
 t.send(watcher,'marketSearch',{watch:true});t.send(vendor,'stallOpen',{stall:{title:'แผงใหม่',items:{'hp-small':row(2,10)}}});t.realm.flushMarketBrowsers();
 assert.equal(watcher.world.events.filter(e=>e.type==='marketResults').at(-1).rows[0].live,true);
 t.send(customer,'stallBuy',{owner:vendor.id,item:'hp-small',count:1});t.realm.flushMarketBrowsers();
 assert.equal(watcher.world.events.filter(e=>e.type==='marketResults').at(-1).trending[0].units,1);
 t.realm.suspend(vendor.id);t.realm.flushMarketBrowsers();assert.equal(watcher.world.events.filter(e=>e.type==='marketResults').at(-1).total,0);
 t.send(customer,'shopOpen',{shop:{kind:'buy',items:{'rat-tooth':row(3,10)}}});const supplier=t.join('supplier',{'rat-tooth':3});
 t.send(supplier,'shopSell',{shop:[...t.realm.shops.keys()][0],item:'rat-tooth',count:3});t.realm.flushMarketBrowsers();
 const hot=watcher.world.events.filter(e=>e.type==='marketResults').at(-1).trending;assert.equal(hot[0].item,'rat-tooth');assert.equal(hot[0].units,3);
});

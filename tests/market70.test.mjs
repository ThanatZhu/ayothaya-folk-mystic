import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tradePerks,openShop,buyFromShop,sellToShop,collectShop,searchMarket,recordPrice,priceHint,inMarket,MARKET_ZONE} from '../market-board.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
const spot={x:MARKET_ZONE.x+5,z:MARKET_ZONE.z+5};

test('market rules: escrowed sell shop, buying store, tax, collect, close, search and prices', () => {
 const perks=tradePerks(0),owner={key:'u:s1',name:'แม่ค้า',serverId:'server-1'};
 assert.equal(perks.level,1);assert.equal(perks.slots,8);assert.equal(perks.shops,1);assert.ok(tradePerks(150000).shops===3&&tradePerks(150000).tax<perks.tax);
 assert.throws(()=>openShop({bag:{coins:0,items:{'rat-tooth':5}},req:{items:{'rat-tooth':{count:5,price:10}}},perks,owner,x:0,z:60,mapId:'ayutthaya',now:1,id:'a'}),/shop-zone/);
 const o=openShop({bag:{coins:0,items:{'rat-tooth':5}},req:{title:'ฟันหนู',items:{'rat-tooth':{count:5,price:100}}},perks,owner,...spot,mapId:'ayutthaya',now:1,id:'a'});
 assert.equal(o.bag.items['rat-tooth'],undefined);assert.equal(o.shop.items['rat-tooth'].count,5);
 assert.throws(()=>openShop({bag:{coins:0,items:{'rat-tooth':1}},req:{items:{'rat-tooth':{count:1,price:1}}},perks,owner,...spot,mapId:'ayutthaya',now:1,id:'b',existing:[o.shop]}),/shop-limit/);
 const b=buyFromShop(o.shop,{coins:500,items:{}},'rat-tooth',2,perks,{who:'ลูกค้า'});
 assert.equal(b.bag.coins,300);assert.equal(b.bag.items['rat-tooth'],2);assert.equal(b.tax,6);assert.equal(b.shop.pouch.coins,194);assert.equal(b.shop.items['rat-tooth'].count,3);
 assert.throws(()=>buyFromShop(b.shop,{coins:50,items:{}},'rat-tooth',1,perks),/no-coins/);
 const c=collectShop(b.shop,{coins:0,items:{}});assert.equal(c.bag.coins,194);assert.equal(c.shop.pouch.coins,0);
 const closed=collectShop(c.shop,{coins:0,items:{}},{close:true});assert.equal(closed.shop,null);assert.equal(closed.bag.items['rat-tooth'],3);
 // buying store: coins escrowed, seller paid less tax, goods wait in the pouch
 const w=openShop({bag:{coins:1000,items:{}},req:{kind:'buy',items:{'straw-bundle':{count:10,price:20}}},perks,owner,...spot,mapId:'ayutthaya',now:1,id:'w'});
 assert.equal(w.bag.coins,800);assert.equal(w.shop.escrow,200);
 const s=sellToShop(w.shop,{coins:0,items:{'straw-bundle':4}},'straw-bundle',4,perks);
 assert.equal(s.bag.coins,78);assert.equal(s.bag.items['straw-bundle'],undefined);assert.equal(s.shop.escrow,120);assert.equal(s.shop.pouch.items['straw-bundle'],4);
 assert.equal(collectShop(s.shop,{coins:0,items:{}},{close:true}).bag.coins,120);
 // search: cheapest sell first, buys after; reference prices warn on outliers
 const rows=searchMarket([o.shop,{...w.shop,items:{'rat-tooth':{count:1,price:50}}}],[{owner:'p',name:'ข',title:'แผง',items:{'rat-tooth':{count:1,price:80}},x:1,z:1,mapId:'ayutthaya'}],'ฟันหนู');
 assert.deepEqual(rows.map(r=>[r.kind,r.price]),[['sell',80],['sell',100],['buy',50]]);
 let prices={};for(const v of [100,110,90])prices=recordPrice(prices,'rat-tooth',v,1);
 assert.equal(priceHint(prices,'rat-tooth',1000),'high');assert.equal(priceHint(prices,'rat-tooth',100),null);
 assert.ok(inMarket('ayutthaya',spot.x,spot.z));assert.ok(!inMarket('rice-fields',spot.x,spot.z));
});

test('server: a consignment shop keeps selling after its owner logs out, and the owner collects on return', () => {
 const realm=new RealmServer({catalog});const saved=[];realm.onShop=(s,del)=>saved.push(del?'del':s.id);
 const join=(uid,coins,items)=>{const state=initialSave();state.position={...spot};const p=realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:uid,gender:'male',classId:'novice'},state,bag:{coins,items},daily:{day:'2099-01-01',streak:1}},send:()=>{}});Object.assign(p.world.player,spot);return p;};
 const seller=join('seller',0,{'rat-tooth':5});let t=Date.now()+1000;realm.now=()=>t;
 assert.equal(realm.receive(seller.id,{type:'shopOpen',seq:1,shop:{title:'ร้านฟัน',items:{'rat-tooth':{count:5,price:100}}}}),true);
 const shopId=[...realm.shops.keys()][0];assert.ok(shopId);assert.equal(seller.bag.items['rat-tooth'],undefined);
 realm.leave(seller.id);
 const buyer=join('buyer',1000,{});t+=1000;const coins0=buyer.bag.coins;
 assert.equal(realm.receive(buyer.id,{type:'shopBuy',seq:1,shop:shopId,item:'rat-tooth',count:3}),true);
 assert.equal(buyer.bag.items['rat-tooth'],3);assert.equal(coins0-buyer.bag.coins,300);assert.ok(buyer.tradeXp>=300);
 t+=1000;realm.receive(buyer.id,{type:'marketSearch',seq:2,query:'rat'});
 const back=join('seller',0,{});t+=1000;const sellerCoins=back.bag.coins;
 assert.equal(realm.receive(back.id,{type:'shopClose',seq:1,shop:shopId}),true);
 assert.equal(back.bag.coins-sellerCoins,291);assert.equal(back.bag.items['rat-tooth'],2);assert.equal(realm.shops.size,0);assert.ok(saved.includes('del'));
 assert.equal(realm.record(back,{state:initialSave()}).trade.xp,300);
});

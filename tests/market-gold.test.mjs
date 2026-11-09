import test from 'node:test';import assert from 'node:assert/strict';
import {MARKET_ZONE,GOLD_MAX,tradePerks,openShop,buyFromShop,sellToShop,collectShop,shopHasClaims,shopCurrency,publicShop,searchMarket,browseMarket,marketOptions,priceKey,recordPrice,priceHint} from '../market-board.js';
const perks=tradePerks(0),owner={key:'owner',name:'Owner',serverId:'server-1'},spot={x:MARKET_ZONE.x+5,z:MARKET_ZONE.z+5},mapId='ayutthaya';
const open=(o={})=>openShop({bag:{coins:0,items:{'hp-large':5}},req:{currency:'gold',title:'G',items:{'hp-large':{count:5,price:100}}},perks,owner,...spot,mapId,now:100,id:'g1',...o});
const openBuy=(gold=300,count=5,price=40)=>openShop({bag:{coins:7,items:{}},gold,req:{kind:'buy',currency:'gold',items:{'hp-large':{count,price}}},perks,owner,...spot,mapId,now:100,id:'b1'});

test('gold sell shop: buyer pays gold, owner pouch gets gold minus tax',()=>{
 const a=open(),r=buyFromShop(a.shop,{coins:50,items:{}},'hp-large',2,perks,{now:101,gold:1000});
 assert.equal(a.shop.currency,'gold');assert.deepEqual(a.shop.pouch,{coins:0,gold:0,items:{}});
 assert.equal(r.gold,800);assert.equal(r.currency,'gold');assert.equal(r.bag.items['hp-large'],2);assert.equal(r.bag.coins,50);assert.equal(r.shop.pouch.gold,194);assert.equal(r.shop.pouch.coins,0);
});
test('gold buy shop escrows gold and pays the seller',()=>{
 const a=openBuy();assert.equal(a.gold,100);assert.equal(a.shop.escrow,200);assert.equal(a.bag.coins,7);
 const r=sellToShop(a.shop,{coins:0,items:{'hp-large':5}},'hp-large',5,perks,{now:101,gold:10});
 assert.equal(r.gold,204);assert.equal(r.shop.escrow,0);assert.equal(r.bag.coins,0);assert.equal(r.shop.pouch.items['hp-large'],5);
});
test('no-gold refuses without moving anything',()=>{
 assert.throws(()=>openBuy(100),/no-gold/);
 const a=open();assert.throws(()=>buyFromShop(a.shop,{coins:999,items:{}},'hp-large',2,perks,{now:101,gold:199}),/no-gold/);
});
test('gold-cap on sell and on collect, nothing moved',()=>{
 const a=openBuy();assert.throws(()=>sellToShop(a.shop,{coins:0,items:{'hp-large':5}},'hp-large',5,perks,{now:101,gold:GOLD_MAX-100}),/gold-cap/);
 const s={...open().shop,pouch:{coins:0,gold:50,items:{}}};assert.throws(()=>collectShop(s,{coins:0,items:{}},{gold:GOLD_MAX}),/gold-cap/);
 const ok=collectShop(s,{coins:0,items:{}},{gold:5});assert.equal(ok.gold,55);assert.equal(ok.goldOut,50);assert.equal(ok.shop.pouch.gold,0);
});
test('closed gold shop keeps its claims',()=>{
 assert.equal(shopHasClaims({kind:'sell',items:{},pouch:{coins:0,gold:1,items:{}}}),true);
 assert.equal(shopHasClaims({kind:'buy',currency:'gold',items:{},escrow:5,pouch:{coins:0,gold:0,items:{}}}),true);
 const a=openBuy(),r=collectShop({...a.shop,status:'closed'},a.bag,{close:true,gold:a.gold});assert.equal(r.gold,300);assert.equal(r.goldOut,200);assert.equal(r.shop,null);assert.equal(r.coins,0);
});
test('old shops default to coins',()=>{
 const s={id:'o',kind:'sell',ownerKey:'o',ownerName:'O',title:'t',x:1,z:1,items:{'hp-large':{count:3,price:10}},escrow:0,pouch:{coins:0,items:{}},log:[],createdAt:1,expiresAt:1e12,status:'open'};
 assert.equal(shopCurrency(s),'coins');const r=buyFromShop(s,{coins:100,items:{}},'hp-large',1,perks,{now:2});
 assert.equal(r.currency,'coins');assert.equal(r.bag.coins,90);assert.equal(r.shop.pouch.coins,10);assert.equal(r.gold,0);assert.equal(publicShop(s).currency,'coins');
});
test('browse sorts within one currency',()=>{
 const mk=(id,currency,price)=>({id,kind:'sell',currency,ownerKey:id,ownerName:id,title:id,x:1,z:1,items:{'hp-large':{count:1,price}},escrow:0,pouch:{coins:0,items:{}},createdAt:1,expiresAt:1e12,status:'open'});
 const shops=[mk('g10','gold',10),mk('c500','coins',500),mk('g60','gold',60),mk('c20','coins',20)],cur=r=>r.rows.map(x=>x.shop);
 assert.deepEqual(cur(browseMarket(shops,[],{sort:'price-low'},{},5)),['c20','c500','g10','g60']);
 assert.deepEqual(cur(browseMarket(shops,[],{currency:'gold',minPrice:50},{},5)),['g60']);
 assert.deepEqual(cur(browseMarket(shops,[],{minPrice:50,maxPrice:100,sort:'price-low'},{},5)),['g10','g60'],'all: min/max never hide gold rows, coin rows are filtered');
 assert.equal(marketOptions({currency:'x'}).currency,'all');assert.equal(browseMarket(shops,[],{currency:'coins'},{},5).rows.every(x=>x.currency==='coins'),true);
 assert.deepEqual(searchMarket(shops,[],'hp-large',5).map(x=>x.currency).sort(),['coins','coins','gold','gold']);
});
test('gold prices are recorded apart',()=>{
 assert.equal(priceKey('hp-large','gold'),'gold:hp-large');assert.equal(priceKey('hp-large'),'hp-large');
 const p=recordPrice({},'gold:hp-large',50,1000);assert.ok(p['gold:hp-large']);assert.equal(priceHint(p,'gold:hp-large',50),null);
});

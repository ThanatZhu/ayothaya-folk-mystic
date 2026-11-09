import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {SHOP_DURATION,MARKET_ZONE} from '../market-board.js';import {RealmServer} from '../server/realm.js';import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';import {initialSave} from '../realm-state.js';
const spot={x:MARKET_ZONE.x+5,z:MARKET_ZONE.z+5},map={id:'ayutthaya',safe:true,spawn:spot,nav:{zones:[{x:-50,z:-50,w:100,d:100}],obstacles:[],props:[]},mobs:[]},catalog={capital:map.id,maps:[map,{...map,id:'rice-field',safe:false}]};
const fixture=()=>{let now=1000000;const realm=new RealmServer({catalog,now:()=>now}),evidence=[];realm.evidence=(p,kind,data)=>evidence.push({kind,data});
 const join=(uid,{coins=1000,items={},gold=0}={})=>{const sent=[];const p=realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:uid,gender:'male',classId:'novice'},state:{...initialSave(),mapId:map.id,position:spot},bag:{coins,items},petCollection:{balance:gold},daily:{day:'2099-01-01',streak:1}},send:m=>sent.push(m)});p.bag.coins=coins;p.sent=sent;return p;};
 return {realm,evidence,join,send:(p,type,data={})=>realm.receive(p.id,{type,seq:p.seq+1,...data}),advance:ms=>now+=ms};};
const sellShop=(item='rat-tooth',count=2,price=100,currency='gold')=>({title:'GoldShop',currency,items:{[item]:{count,price}}});
const buyShop=(item='straw-bundle',count=5,price=40,currency='gold')=>({kind:'buy',title:'GoldBuy',currency,items:{[item]:{count,price}}});
const noticed=(p,code)=>p.world.events.some(e=>e.type==='notice'&&e.text===code);
const shopOf=(t,owner)=>[...t.realm.shops.values()].find(s=>s.ownerKey===owner.key);

test('switch off refuses gold shops while coin shops still work',()=>{
 const t=fixture(),a=t.join('ownerA',{items:{'rat-tooth':2},gold:1000}),b=t.join('ownerB',{gold:1000}),c=t.join('ownerC',{items:{'rat-tooth':1}}),buyer=t.join('buyer',{items:{'straw-bundle':5},gold:1000});
 assert.equal(t.send(a,'shopOpen',{shop:sellShop()}),false);assert.ok(noticed(a,'gold-market-closed'));assert.equal(t.realm.shops.size,0);assert.equal(a.bag.items['rat-tooth'],2);
 assert.equal(t.send(c,'shopOpen',{shop:sellShop('rat-tooth',1,100,'coins')}),true,'coin shops still open');
 t.realm.goldMarketOpen=true;a.world.player.x+=4;b.world.player.x+=8;assert.equal(t.send(a,'shopOpen',{shop:sellShop()}),true);assert.equal(t.send(b,'shopOpen',{shop:buyShop()}),true);assert.equal(b.petCollection.balance,800);
 t.realm.goldMarketOpen=false;buyer.world.player.x+=4;
 assert.equal(t.send(buyer,'shopBuy',{shop:shopOf(t,a).id,item:'rat-tooth',count:1}),false);buyer.world.player.x+=4;assert.equal(t.send(buyer,'shopSell',{shop:shopOf(t,b).id,item:'straw-bundle',count:5}),false);
 assert.equal(buyer.world.events.filter(e=>e.type==='notice'&&e.text==='gold-market-closed').length,2);assert.equal(buyer.petCollection.balance,1000);assert.equal(buyer.bag.items['straw-bundle'],5);
 buyer.world.player.x-=8;assert.equal(t.send(buyer,'shopBuy',{shop:shopOf(t,c).id,item:'rat-tooth',count:1}),true,'coin shops still trade');
});

test('gold sale moves gold both ways and books tax',()=>{
 const t=fixture();t.realm.goldMarketOpen=true;const owner=t.join('owner',{items:{'rat-tooth':2}}),buyer=t.join('buyer',{gold:1000});
 assert.equal(t.send(owner,'shopOpen',{shop:sellShop()}),true);const id=shopOf(t,owner).id;buyer.saveNow=false;
 assert.equal(t.send(buyer,'shopBuy',{shop:id,item:'rat-tooth',count:2}),true);
 assert.equal(buyer.petCollection.balance,800);assert.equal(buyer.bag.items['rat-tooth'],2);assert.equal(buyer.bag.coins,1000);assert.equal(buyer.saveNow,true);
 assert.equal(t.realm.goldEcon.today().out.marketTax,6);assert.equal(t.realm.econ.today().out.marketTax,undefined,'coin books untouched');
 const prices=t.realm.prices.get('server-1');assert.ok(prices['gold:rat-tooth']);assert.equal(prices['rat-tooth'],undefined);
 assert.deepEqual(t.evidence.at(-1),{kind:'market-shop-buy',data:{shop:{id,owner:'owner'},item:'rat-tooth',count:2,gold:200,tax:6,currency:'gold'}});
 assert.equal(t.send(owner,'shopCollect',{shop:id}),true);assert.equal(owner.petCollection.balance,194);assert.equal(t.realm.shops.has(id),false);
 assert.equal(buyer.tradeXp??0,0);assert.equal(owner.tradeXp??0,0);
 const mine=owner.world.events.filter(e=>e.type==='shopMine').at(-1);assert.equal(mine.goldMarket,true);
 t.send(buyer,'marketSearch',{query:''});assert.equal(buyer.world.events.filter(e=>e.type==='marketResults').at(-1).goldMarket,true);
});

test('gold buy shop pays the seller in gold and records evidence',()=>{
 const t=fixture();t.realm.goldMarketOpen=true;const owner=t.join('owner',{gold:300}),seller=t.join('seller',{items:{'straw-bundle':5}});
 t.send(owner,'shopOpen',{shop:buyShop()});const id=shopOf(t,owner).id;assert.equal(owner.petCollection.balance,100);
 assert.equal(t.send(seller,'shopSell',{shop:id,item:'straw-bundle',count:5}),true);assert.equal(seller.petCollection.balance,194);assert.equal(seller.bag.coins,1000);
 assert.equal(t.evidence.at(-1).data.currency,'gold');assert.equal(t.evidence.at(-1).kind,'market-shop-sell');assert.equal(t.realm.goldEcon.today().out.marketTax,6);
 assert.equal(t.send(owner,'shopCollect',{shop:id}),true);assert.equal(owner.bag.items['straw-bundle'],5);assert.equal(owner.petCollection.balance,100);
});

test('busy wallet refuses gold trade',()=>{
 for(const flag of ['mailMutationBusy','petMutationBusy']){
  const t=fixture();t.realm.goldMarketOpen=true;const owner=t.join('owner',{items:{'rat-tooth':2},gold:500}),buyer=t.join('buyer',{gold:1000});
  t.send(owner,'shopOpen',{shop:sellShop()});const id=shopOf(t,owner).id,shop=structuredClone(t.realm.shops.get(id)),bag=structuredClone(buyer.bag);
  buyer[flag]=true;assert.equal(t.send(buyer,'shopBuy',{shop:id,item:'rat-tooth',count:1}),false,flag);
  assert.ok(buyer.sent.some(m=>m.type==='error'&&m.code==='server-busy'));assert.equal(buyer.petCollection.balance,1000);assert.deepEqual(buyer.bag,bag);assert.deepEqual(t.realm.shops.get(id),shop);
  owner[flag]=true;owner.world.player.x+=4;assert.equal(t.send(owner,'shopOpen',{shop:buyShop()}),false,'opening a gold buy shop is refused too');assert.equal(owner.petCollection.balance,500);
  assert.equal(t.send(owner,'shopClose',{shop:id}),false,'collect is refused too');assert.ok(t.realm.shops.has(id));
 }
});

test('switch off keeps collect and close working for a gold shop with pouch gold',()=>{
 const t=fixture();t.realm.goldMarketOpen=true;const owner=t.join('owner',{items:{'rat-tooth':2}}),buyer=t.join('buyer',{gold:1000});
 t.send(owner,'shopOpen',{shop:sellShop()});const id=shopOf(t,owner).id;t.send(buyer,'shopBuy',{shop:id,item:'rat-tooth',count:1});t.realm.goldMarketOpen=false;
 assert.equal(t.send(owner,'shopCollect',{shop:id}),true);assert.equal(owner.petCollection.balance,97);assert.ok(t.realm.shops.has(id));
 assert.equal(t.send(owner,'shopClose',{shop:id}),true);assert.equal(owner.bag.items['rat-tooth'],1);assert.equal(t.realm.shops.has(id),false);assert.equal(owner.petCollection.balance,97);
});

test('expired gold shop with claims is kept until collected',()=>{
 const t=fixture();t.realm.goldMarketOpen=true;const owner=t.join('owner',{gold:300});t.send(owner,'shopOpen',{shop:buyShop()});const id=shopOf(t,owner).id;
 t.advance(SHOP_DURATION);t.realm.expireShops();assert.equal(t.realm.shops.get(id).status,'closed');assert.equal(t.realm.shops.get(id).escrow,200);t.realm.expireShops();assert.ok(t.realm.shops.has(id));
 assert.equal(t.realm.goldInShops(),200);t.realm.goldMarketOpen=false;
 assert.equal(t.send(owner,'shopCollect',{shop:id}),true);assert.equal(owner.petCollection.balance,300);assert.equal(t.realm.shops.has(id),false);assert.equal(t.realm.goldInShops(),0);
});

test('goldInShops counts escrow and pouches',()=>{
 const t=fixture(),base={serverId:'server-1',ownerKey:'x',status:'open',items:{},log:[]};
 t.realm.shops.set('g-buy',{...base,id:'g-buy',kind:'buy',currency:'gold',escrow:200,pouch:{coins:0,gold:0,items:{}}});
 t.realm.shops.set('g-sell',{...base,id:'g-sell',kind:'sell',currency:'gold',escrow:0,pouch:{coins:0,gold:50,items:{}}});
 t.realm.shops.set('c-buy',{...base,id:'c-buy',kind:'buy',currency:'coins',escrow:300,pouch:{coins:70,items:{}}});
 t.realm.shops.set('old',{...base,id:'old',kind:'buy',escrow:300,pouch:{coins:70,items:{}}});
 assert.equal(t.realm.goldInShops(),250);
});

test('/economy reports gold held in shops',async()=>{
 const store=await new LocalStore(await mkdtemp(path.join(tmpdir(),'gold-shops-'))).init(),host=await createHost({mode:'local',store,catalog});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 try{host.realm.shops.set('g',{id:'g',serverId:'server-1',kind:'buy',currency:'gold',escrow:120,pouch:{coins:0,gold:5,items:{}},items:{},status:'open'});
  const body=await (await fetch(`http://127.0.0.1:${host.server.address().port}/economy`)).json();assert.equal(body.gold.shops,125);}finally{await host.close();}
});

import test from 'node:test';import assert from 'node:assert/strict';
import {buyPremiumItem} from '../premium-shop-action.js';
import {PREMIUM_SHOP_PRODUCTS,PREMIUM_RENAME_PRICE} from '../premium-shop-catalog.js';
import {RENAME_PRICE,identityAction} from '../identity166.js';
import {publicPetAccount,petAccountAction} from '../pet-account.js';
import {drawAmulets} from '../amulet-gacha.js';
import {ITEMS,itemDef,MAX_STACK,bagCap} from '../items.js';
const fresh=()=>({character:{name:'Test'},bag:{coins:100,items:{}},petCollection:{balance:10000}});
const buy=(record,sku='rename-card',quantity=1,id='premium-order-0001')=>buyPremiumItem(record,{sku,quantity,id,price:0,count:9999,item:'amulet-somdej'});

test('premium products grant real inventory items at server-owned prices; rename price stays compatible',()=>{
 assert.equal(RENAME_PRICE,PREMIUM_RENAME_PRICE);
 for(const p of PREMIUM_SHOP_PRODUCTS){assert.ok(itemDef(p.item));const before=fresh(),copy=structuredClone(before),r=buy(before,p.sku,3);assert.equal(r.record.bag.items[p.item],p.count*3);assert.equal(r.record.petCollection.balance,10000-p.price*3);assert.equal(r.purchase.total,p.price*3);assert.deepEqual(before,copy);assert.equal(r.record.bag.items['amulet-somdej'],undefined);}
});
test('purchase receipts survive reconnect normalization and forbid conflicting replays',()=>{
 const a=buy(fresh(),'lek-lai-pack',2),b=buy(a.record,'lek-lai-pack',2);assert.equal(b.replayed,true);assert.deepEqual(b.record,a.record);assert.throws(()=>buy(a.record,'lek-lai-pack',1),/request-conflict/);assert.throws(()=>buy(a.record,'break-guard',2),/request-conflict/);
 const pub=publicPetAccount(a.record.petCollection);assert.ok(!('receipts' in pub.premiumShop));
 let r=a.record;r.petCollection=petAccountAction(r.petCollection,{type:'petDraw',count:1,requestId:'pet-order-0001'},()=>.8).state;r=drawAmulets(r,{id:'amulet-order-0001',count:1},()=>.8).record;r.petCollection=petAccountAction(r.petCollection,{type:'petGrant',gems:100,requestId:'gift-order-0001'}).state;r=identityAction(r,{id:'rename-order-0001',type:'renameBuy'});
 assert.equal(r.petCollection.premiumShop.receipts.length,1);assert.equal(buy(r,'lek-lai-pack',2).replayed,true);
});
test('invalid, unaffordable, full-bag and full-stack purchases never charge or partially grant',()=>{
 for(const n of [0,-1,21,1.1,'1',NaN,Infinity])assert.throws(()=>buy(fresh(),'rename-card',n),/bad-quantity/);
 assert.throws(()=>buy(fresh(),'invented'),/bad-product/);assert.throws(()=>buy(fresh(),'rename-card',1,'x'),/bad-request-id/);
 const poor=fresh();poor.petCollection.balance=99;assert.throws(()=>buy(poor,'break-guard'),/no-gems/);assert.equal(poor.petCollection.balance,99);
 const full=fresh();full.bag.items=Object.fromEntries(Object.keys(ITEMS).filter(k=>k!=='rename-card'&&['loot','potion','card'].includes(itemDef(k).kind)).slice(0,bagCap(full.bag)).map(k=>[k,1]));const copy=structuredClone(full);assert.throws(()=>buy(full),/bag-full/);assert.deepEqual(full,copy);
 const stack=fresh();stack.bag.items['lek-lai']=MAX_STACK-3;const before=structuredClone(stack);assert.throws(()=>buy(stack,'lek-lai-pack'),/bag-full/);assert.deepEqual(stack,before);
});

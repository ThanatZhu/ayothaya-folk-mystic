import test from 'node:test';
import assert from 'node:assert/strict';
import {identityAction} from '../identity166.js';
import {REVIVAL_PRICE} from '../revival-item.js';
import {ITEMS} from '../items.js';
const record=()=>({character:{name:'RevivalShop',gender:'male',classId:'novice'},bag:{coins:321,items:{}},petCollection:{balance:400}});
test('revival purchase costs 200 gold, gives one talisman, ignores client price/count, and retries never double charge',()=>{
 assert.equal(REVIVAL_PRICE,200);const a={id:'buy-revival-181',type:'revivalBuy',price:1,count:99},r=record(),next=identityAction(r,a);
 assert.equal(next.petCollection.balance,200);assert.equal(next.bag.coins,321);assert.equal(next.bag.items['soul-talisman'],1);assert.deepEqual(identityAction(next,a),next);assert.equal(r.petCollection.balance,400);
 assert.throws(()=>identityAction(next,{...a,type:'renameBuy'}),/request-conflict/);
});
test('insufficient gold, full bag and full stack do not deduct currency or mutate the record',()=>{
 for(const scenario of ['gold','bag','stack']){
  const r=record();if(scenario==='gold')r.petCollection.balance=199;
  if(scenario==='bag')r.bag.items=Object.fromEntries(Object.keys(ITEMS).filter(k=>['loot','gear','card'].includes(ITEMS[k].kind)).slice(0,40).map(k=>[k,1]));
  if(scenario==='stack')r.bag.items['soul-talisman']=999;
  const before=structuredClone(r);assert.throws(()=>identityAction(r,{type:'revivalBuy',id:'buy-revival-fail'}),scenario==='gold'?/not-enough-gold/:/bag-full/);assert.deepEqual(r,before);
 }
});

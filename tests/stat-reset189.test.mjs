import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePetAccount} from '../pet-account.js';
import {identityAction} from '../identity166.js';
import {buyPremiumItem} from '../premium-shop-action.js';
import {STAT_RESET_ITEM,STAT_RESET_PRICE} from '../stat-reset-item.js';
import {statPoints,earnedStatPoints,spentStatPoints,normalizeStats,deriveStats} from '../character-stats.js';
const original=()=>({character:{name:'ResetQA',classId:'swordsman',jobId:'warrior',gender:'male'},rebirth:3,stats:{str:32,agi:12,vit:5,int:1,dex:4,luk:1},gear:{weapon:'weapon-swordsman-one'},state:{traveler:{baseXp:9999,jobXp:200}},bag:{coins:456,items:{[STAT_RESET_ITEM]:2}},petCollection:normalizePetAccount({balance:1000}),story:{quest:18,step:1}});
const action={type:'statResetUse',id:'reset-order-189'};
test('reset voucher is a real 100 gold bar product, server owns price and quantity',()=>{
 const r=original();r.bag.items={};const purchase=buyPremiumItem(r,{sku:STAT_RESET_ITEM,id:'buy-reset-189',quantity:1,price:0});
 assert.equal(STAT_RESET_PRICE,100);assert.equal(purchase.record.petCollection.balance,900);assert.equal(purchase.record.bag.coins,456);assert.equal(purchase.record.bag.items[STAT_RESET_ITEM],1);
});
test('reset refunds exact increasing-cost allocations including rebirth budget, preserves permanent progression',()=>{
 const before=original(),copy=structuredClone(before),next=identityAction(before,action);
 assert.deepEqual(before,copy);assert.deepEqual(next.stats,normalizeStats(null));assert.equal(next.bag.items[STAT_RESET_ITEM],1);
 assert.equal(statPoints(next.stats,99,next.rebirth),earnedStatPoints(99,3));
 assert.equal(statPoints(next.stats,99,3)-statPoints(before.stats,99,3),spentStatPoints(before.stats));
 for(const key of ['gear','state','petCollection','story','character','rebirth'])assert.deepEqual(next[key],before[key]);
 assert.equal(deriveStats({classId:'swordsman',level:99,stats:next.stats,reborn:3,gear:next.gear}).rebirthBonus,6);
});
test('replaying after reallocating does not reset again or consume a second voucher',()=>{
 const next=identityAction(original(),action);next.stats.str=4;
 assert.deepEqual(identityAction(next,action),next);
 const second=identityAction(next,{...action,id:'reset-order-190'});assert.equal(second.stats.str,1);assert.equal(second.bag.items[STAT_RESET_ITEM],undefined);
});
test('empty allocations or missing item cannot consume currency, item or alter stats',()=>{
 for(const [change,code] of [[r=>r.stats=normalizeStats(null),'no-allocated-stats'],[r=>r.bag.items={stuff:1},'no-stat-reset']]){
  const r=original();change(r);const copy=structuredClone(r);assert.throws(()=>identityAction(r,action),new RegExp(code));assert.deepEqual(r,copy);
 }
});

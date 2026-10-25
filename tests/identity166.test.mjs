import test from 'node:test';import assert from 'node:assert/strict';import {identityAction,RENAME_PRICE} from '../identity166.js';
import {initialSave} from '../realm-state.js';import {ITEMS} from '../items.js';
const record=()=>({character:{name:'ชื่อเดิม',gender:'male',classId:'shaman',jobId:'spirit-master'},state:initialSave(),bag:{coins:321,items:{}},petCollection:{balance:2000}});
test('rename voucher costs exactly 1000 gold bars and leaves cowries intact; retries do not charge twice',()=>{
 assert.equal(RENAME_PRICE,1000);assert.ok(ITEMS['rename-card'].image);const original=record(),action={id:'purchase-123',type:'renameBuy'},bought=identityAction(original,action);assert.equal(original.petCollection.balance,2000);assert.equal(bought.petCollection.balance,1000);assert.equal(bought.bag.coins,321);assert.equal(bought.bag.items['rename-card'],1);assert.deepEqual(identityAction(bought,action),bought);assert.throws(()=>identityAction(bought,{...action,type:'renameUse',name:'ชื่อใหม่'}),/request-conflict/);
});
test('successful rename consumes one card, preserves character identity/progression, is replay safe',()=>{
 const bought=identityAction(record(),{id:'purchase-123',type:'renameBuy'}),action={id:'rename-test-123',type:'renameUse',name:'  ชื่อใหม่  '},renamed=identityAction(bought,action);
 assert.equal(renamed.character.name,'ชื่อใหม่');assert.equal(renamed.bag.items['rename-card'],undefined);assert.equal(renamed.petCollection.balance,1000);assert.equal(renamed.character.jobId,bought.character.jobId);assert.deepEqual(renamed.state,bought.state);assert.deepEqual(identityAction(renamed,action),renamed);
});
test('invalid/unchanged names, missing card, full bag and insufficient bars never mutate original records',()=>{
 const r=record(),copy=structuredClone(r);assert.throws(()=>identityAction(r,{id:'invalid-name',type:'renameUse',name:'<bad>'}));assert.throws(()=>identityAction(r,{id:'same-name-1',type:'renameUse',name:'ชื่อเดิม'}),/name-unchanged/);assert.throws(()=>identityAction(r,{id:'no-voucher1',type:'renameUse',name:'ชื่อใหม่'}),/no-rename-card/);assert.deepEqual(r,copy);
 r.petCollection.balance=999;assert.throws(()=>identityAction(r,{id:'insufficient',type:'renameBuy'}),/not-enough-gold/);assert.equal(r.petCollection.balance,999);
 r.petCollection.balance=2000;r.bag.items=Object.fromEntries(Object.keys(ITEMS).filter(k=>k!=='rename-card'&&['loot','potion','gear','card'].includes(ITEMS[k].kind)).slice(0,40).map(k=>[k,1]));assert.equal(Object.keys(r.bag.items).length,40);const full=structuredClone(r);assert.throws(()=>identityAction(r,{id:'full-bag-12',type:'renameBuy'}),/bag-full/);assert.deepEqual(r,full);
});

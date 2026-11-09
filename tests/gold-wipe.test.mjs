import test from 'node:test';
import assert from 'node:assert/strict';
import {wipeRecordGold,goldOf,mailGoldOf} from '../server/gold-wipe.js';
import {composeMail,deliverMail,mailboxAction} from '../mailbox.js';
const rec=(balance,attachments,extra={})=>({serverId:'server-1',bag:{coins:0,items:{}},petCollection:{balance},mailbox:deliverMail(null,composeMail({id:'gift-000001',title:'t',body:'b',attachments},1)).mailbox,...extra});
test('wipes wallet and unclaimed mail gold',()=>{
 const r=wipeRecordGold(rec(750,{goldBars:100}));
 assert.equal(goldOf(r.record),0);assert.equal(r.record.mailbox.messages[0].attachments.goldBars,0);assert.deepEqual(r.removed,{wallet:750,mail:100});assert.equal(r.record.goldWipe,1);assert.equal(r.skipped,false);
 assert.equal(mailGoldOf(r.record),0);
});
test('keeps other attachments',()=>{
 const a={coins:50,goldBars:20,items:[{id:'hp-large',count:2}],pets:['rice-rabbit']};
 const {record}=wipeRecordGold(rec(0,a));
 assert.deepEqual(record.mailbox.messages[0].attachments,{...a,goldBars:0});
 const c=mailboxAction(record,{type:'mailClaim',mailId:'gift-000001'},[],5);
 assert.equal(c.bag.coins,50);assert.equal(c.bag.items['hp-large'],2);assert.ok(c.petCollection.collection['rice-rabbit']);assert.equal(c.petCollection.balance,0);
});
test('keeps what gold already bought and claimed mail',()=>{
 const base=rec(300,{goldBars:9});base.petCollection={balance:300,collection:{'rice-rabbit':{stars:2,copies:3}}};base.bag.items={'hp-small':4};base.mailbox.messages[0].claimedAt=7;
 const {record,removed}=wipeRecordGold(base);
 assert.deepEqual(record.petCollection.collection,base.petCollection.collection);assert.deepEqual(record.bag,base.bag);assert.equal(record.mailbox.messages[0].attachments.goldBars,9);assert.equal(removed.mail,0);
});
test('goldWipe flag protects gold received after the wipe',()=>{
 const {record}=wipeRecordGold(rec(750,{goldBars:1}));
 const later={...record,petCollection:{...record.petCollection,balance:40}};
 const again=wipeRecordGold(later);assert.equal(again.skipped,true);assert.equal(goldOf(again.record),40);
});
test('input record is not mutated',()=>{
 const r=rec(750,{goldBars:100}),copy=JSON.stringify(r);wipeRecordGold(r);assert.equal(JSON.stringify(r),copy);
});

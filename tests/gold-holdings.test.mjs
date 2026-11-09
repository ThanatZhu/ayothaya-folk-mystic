import test from 'node:test';
import assert from 'node:assert/strict';
import {goldOf,mailGoldOf,goldHoldings} from '../server/gold-wipe.js';
const mail=(id,goldBars,claimedAt=0)=>({id,title:'t',body:'b',sender:'s',attachments:{goldBars},serverId:'all',createdAt:1,readAt:0,claimedAt});
const row=(uid,balance,messages=[],name='n'+uid)=>({uid,slotId:'slot-1',record:{character:{name},serverId:'server-1',petCollection:{balance},mailbox:{messages}}});
test('counts wallet and unclaimed mail gold',()=>{
 const h=goldHoldings([row('a',0),row('b',300,[mail('mail-001',200),mail('mail-002',999,5)]),row('c',50)],[]);
 assert.equal(h.held,350);assert.equal(h.holders,2);assert.equal(h.mailGold,200);assert.equal(h.characters,3);
 assert.equal(goldOf(row('b',300).record),300);
});
test('announcement gold counts once per character who has not claimed it',()=>{
 const ann=[{...mail('announce1',100),serverId:'all'}];
 const rows=[row('a',0),row('b',0)];rows[1].record.mailbox.broadcastDeleted={announce1:5};
 assert.equal(mailGoldOf(rows[0].record,ann),100);assert.equal(mailGoldOf(rows[1].record,ann),0);
 assert.equal(goldHoldings(rows,ann).mailGold,100);
});
test('top list sorted by wallet+mail, capped at top',()=>{
 const h=goldHoldings([row('a',10),row('b',5,[mail('mail-003',100)]),row('c',50),row('d',1)],[],2);
 assert.deepEqual(h.top.map(t=>t.uid),['b','c']);assert.deepEqual(h.top[0],{uid:'b',slotId:'slot-1',name:'nb',gold:5,mailGold:100});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {composeMail,deliverMail,mailboxAction} from '../mailbox.js';

const mail=(id,items)=>composeMail({id:'mail1162-'+id,title:id,body:'Test mail',attachments:{items}});

test('0.116.2 admin mail carries graded gear (God grade ^4) and the player claims it into the bag',()=>{
 const items=[{id:'weapon-boxer-five^4',count:1},{id:'exec-armor-boxer-five^4',count:1},{id:'exec-garment-boxer-five^2',count:1}];
 const m=mail('graded',items);
 assert.deepEqual(m.attachments.items,items);
 const record={serverId:'server-1',bag:{coins:0,items:{}},mailbox:deliverMail({messages:[]},m).mailbox};
 const after=mailboxAction(record,{type:'mailClaim',mailId:m.id});
 for(const {id} of items)assert.equal(after.bag.items[id],1,id);
});

test('0.116.2 admin mail still refuses unknown items, impossible grades and duplicates',()=>{
 assert.throws(()=>mail('unknown',[{id:'no-such-item^4',count:1}]),/bad-item/);
 assert.throws(()=>mail('ungraded',[{id:'hp-small^4',count:1}]),/bad-item/);
 assert.throws(()=>mail('dupe',[{id:'weapon-boxer-five^4',count:1},{id:'weapon-boxer-five^4',count:1}]),/bad-item/);
});

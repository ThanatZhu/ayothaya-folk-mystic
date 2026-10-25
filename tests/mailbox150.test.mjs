import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {composeMail,deliverMail,mailboxAction,mailboxBulkAction,publicInbox,normalizeMailbox} from '../mailbox.js';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';import {initialSave} from '../realm-state.js';
const mail=(id,attachments={})=>composeMail({id:'mail150-'+id,title:id,body:'Test mail',attachments});
const record=messages=>({serverId:'server-1',bag:{coins:0,items:{}},mailbox:{messages}});

test('delete all protects unread mail and unclaimed gifts, including broadcasts; deletion is private',()=>{
 const read=mail('read'),unread=mail('unread'),pending=mail('pending',{coins:3}),claimed=mail('claimed',{coins:4}),news=mail('news');
 read.readAt=pending.readAt=claimed.readAt=100;claimed.claimedAt=101;
 const r=record([read,unread,pending,claimed]);r.mailbox.broadcastRead={[news.id]:100};
 const {record:next,summary}=mailboxBulkAction(r,{type:'mailDeleteAll',mailId:pending.id},[news],200);
 assert.equal(summary.deleted,3);assert.deepEqual(publicInbox(next.mailbox,[news],r.serverId).map(m=>m.id).sort(),[pending.id,unread.id].sort());
 assert.equal(publicInbox(r.mailbox,[news],r.serverId).length,5);assert.equal(publicInbox(null,[news],r.serverId).length,1);
 assert.deepEqual(mailboxBulkAction(next,{type:'mailDeleteAll'},[news],300).summary.deleted,0);
 assert.deepEqual(publicInbox(normalizeMailbox(JSON.parse(JSON.stringify(next.mailbox))),[news],r.serverId).length,2);
});
test('claim all atomically receives each complete letter once; blocked letters retain every attachment',()=>{
 const blocked=mail('blocked',{coins:50,goldBars:20,items:[{id:'hp-small',count:2}]}),fits=mail('fits',{coins:3,goldBars:10,pets:['rice-rabbit','rice-rabbit']}),note=mail('note');
 const r=record([blocked,fits,note]);r.bag.items['hp-small']=999;
 const result=mailboxBulkAction(r,{type:'mailClaimAll',attachments:{coins:999999}},[],1000),next=result.record;
 assert.equal(result.summary.claimed,1);assert.equal(result.summary.remaining,1);assert.equal(result.summary.blocked[0].code,'bag-full');
 assert.equal(next.bag.coins,3);assert.equal(next.petCollection.balance,10);assert.equal(next.petCollection.collection['rice-rabbit'].copies,1);
 assert.equal(next.mailbox.messages.find(m=>m.id===blocked.id).readAt,0);assert.equal(next.mailbox.messages.find(m=>m.id===blocked.id).claimedAt,0);
 const replay=mailboxBulkAction(next,{type:'mailClaimAll'},[],2000);assert.equal(replay.summary.claimed,0);assert.deepEqual(replay.record.bag,next.bag);assert.equal(replay.record.petCollection.balance,10);
 next.bag.items['hp-small']=990;const retry=mailboxBulkAction(next,{type:'mailClaimAll'},[],3000);assert.equal(retry.summary.claimed,1);assert.equal(retry.record.bag.coins,53);assert.equal(retry.record.petCollection.balance,30);assert.equal(retry.record.bag.items['hp-small'],992);
});
test('deleted delivery IDs cannot resurrect or grant attachments again, while new deliveries still work',()=>{
 const m=mail('replay',{coins:10});let r=mailboxAction(record([m]),{type:'mailClaim',mailId:m.id},[],100);
 r=mailboxBulkAction(r,{type:'mailDeleteAll'},[],200).record;
 const delivered=deliverMail(JSON.parse(JSON.stringify(r.mailbox)),m);assert.equal(delivered.replayed,true);assert.equal(publicInbox(delivered.mailbox,[],r.serverId).length,0);
 assert.throws(()=>mailboxAction(r,{type:'mailClaim',mailId:m.id}),/mail-not-found/);assert.equal(r.bag.coins,10);
 assert.equal(deliverMail(r.mailbox,mail('fresh')).replayed,false);
});
const wait=(ws,type,id)=>new Promise((yes,no)=>{const timer=setTimeout(()=>{ws.off('message',fn);no(Error('message-timeout '+type));},10000);const fn=data=>{const m=JSON.parse(data);if(m.type===type&&(!id||m.id===id)){clearTimeout(timer);ws.off('message',fn);yes(m);}};ws.on('message',fn);});
const catalog={capital:'field',maps:[{id:'field',name:'Field',spawn:{x:0,z:0},nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},mobs:[],npcs:[]}]};
test('host persists bulk grants before acknowledging, handles retries, and retains deleted mail across reconnect',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'mail150-')),store=await new LocalStore(directory).init(),user=await store.createLocal({name:'BulkMailQA'}),r=store.rows.get(user.uid);
 r.state={...initialSave(),mapId:'field'};r.mailbox={messages:[mail('host-a',{coins:4,goldBars:5}),mail('host-b',{items:[{id:'hp-small',count:2}]}),mail('unread-host')]};
 const host=await createHost({mode:'local',store,catalog,origins:['http://localhost']});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));let ws;
 try{
  ws=new WebSocket('ws://127.0.0.1:'+host.server.address().port+'/realtime',{origin:'http://localhost'});await new Promise(r=>ws.on('open',r));let pending=wait(ws,'welcome');ws.send(JSON.stringify({type:'join',token:user.token,serverId:'server-1',slotId:'slot-1'}));await pending;
  const peer=[...host.realm.peers.values()][0],before=peer.bag.coins,checkpoint=store.checkpoint.bind(store);let release,entered,ack=false;
  const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);store.checkpoint=async(...args)=>{entered();await gate;return checkpoint(...args);};
  ws.on('message',d=>{if(JSON.parse(d).id==='bulk-claim'&&JSON.parse(d).type==='mailChanged')ack=true;});
  pending=wait(ws,'mailChanged','bulk-claim');ws.send(JSON.stringify({type:'mailClaimAll',id:'bulk-claim',seq:1}));await started;assert.equal(ack,false);assert.equal(peer.bag.coins,before);host.realm.grantLoot(peer,{coins:7,items:[]});release();const claimed=await pending;store.checkpoint=checkpoint;
  assert.equal(claimed.bulk.claimed,2);assert.equal(peer.bag.coins,before+11);assert.equal(claimed.petCollection.balance,5);
  pending=wait(ws,'mailChanged','bulk-retry');ws.send(JSON.stringify({type:'mailClaimAll',id:'bulk-retry',seq:2}));assert.equal((await pending).bulk.claimed,0);
  pending=wait(ws,'mailChanged','bulk-delete');ws.send(JSON.stringify({type:'mailDeleteAll',id:'bulk-delete',seq:3}));const deleted=await pending;assert.equal(deleted.bulk.deleted,2);assert.equal(deleted.mails.length,1);assert.equal(deleted.mails[0].readAt,0);
  ws.terminate();await host.close();const reloaded=await new LocalStore(directory).init(),saved=reloaded.rows.get(user.uid);assert.equal(saved.bag.coins,before+11);assert.equal(publicInbox(saved.mailbox,[],saved.serverId).length,1);assert.equal(deliverMail(saved.mailbox,mail('host-a',{coins:4,goldBars:5})).replayed,true);
 }finally{ws?.terminate();await host.close();await rm(directory,{recursive:true,force:true});}
});

import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {composeMail,deliverMail,mailboxAction,publicInbox,inboxSummary} from '../mailbox.js';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';import {initialSave} from '../realm-state.js';import {ITEMS,MAX_COINS} from '../items.js';
const gift=()=>composeMail({id:'gift-000001',title:'Test Gift',body:'Thank you',attachments:{coins:50,goldBars:1000,items:[{id:'hp-small',count:2}],pets:['rice-rabbit','rice-rabbit']}});
test('mail claims atomically grant all attachments once, even after pet receipts rotate',()=>{
 const mail=gift(),r={serverId:'server-1',bag:{coins:3,items:{}},mailbox:deliverMail(null,mail).mailbox};
 assert.equal(r.petCollection,undefined);assert.equal(deliverMail(r.mailbox,mail).replayed,true);assert.throws(()=>deliverMail(r.mailbox,{...mail,body:'different'}),/request-conflict/);
 const a=mailboxAction(r,{type:'mailClaim',mailId:mail.id},[],1000);assert.equal(a.bag.coins,53);assert.equal(a.bag.items['hp-small'],2);assert.equal(a.petCollection.balance,1000);assert.deepEqual(a.petCollection.collection['rice-rabbit'],{stars:1,copies:1});assert.equal(a.mailbox.messages[0].claimedAt,1000);
 a.petCollection.receipts=[];const again=mailboxAction(a,{type:'mailClaim',mailId:mail.id},[],2000);assert.deepEqual(again.bag,a.bag);assert.equal(again.petCollection.balance,1000);assert.equal(again.mailbox.messages[0].claimedAt,1000);assert.equal(r.mailbox.messages[0].claimedAt,0);
});
test('full bags and coin caps leave all mail attachments unclaimed and cannot partially credit a wallet',()=>{
 const r={serverId:'server-1',bag:{coins:0,items:{'hp-small':999}},mailbox:deliverMail(null,gift()).mailbox};assert.throws(()=>mailboxAction(r,{type:'mailClaim',mailId:'gift-000001'}),/bag-full/);assert.equal(r.petCollection,undefined);assert.equal(r.mailbox.messages[0].readAt,0);
 r.bag={coins:MAX_COINS,items:{}};assert.throws(()=>mailboxAction(r,{type:'mailClaim',mailId:'gift-000001'}),/coin-cap/);assert.equal(r.mailbox.messages[0].claimedAt,0);
 for(const id of ['pet-lure','egg-rat','pet-food'])assert.throws(()=>composeMail({id:'invalid-001',title:'X',body:'X',attachments:{items:[{id,count:1}]}}),/bad-item/);
 assert.throws(()=>composeMail({id:'invalid-001',title:'X',body:'X',attachments:{items:[{id:'hp-small',count:1},{id:'hp-small',count:1}]}}),/bad-item/);
});
test('large Thai letters stop before the inbox can exceed the document budget',()=>{let box;let stopped=false;for(let i=0;i<200;i++){const mail=composeMail({id:'size-test-'+i.toString().padStart(5,'0'),title:'Large letter',body:'ก'.repeat(4000)});try{box=deliverMail(box,mail).mailbox;}catch(e){assert.equal(e.message,'mailbox-full');stopped=true;break;}}assert.equal(stopped,true);assert.ok(new TextEncoder().encode(JSON.stringify(box)).length<=350000);});

test('announcements are scoped, read separately from personal gifts, and persist read state',()=>{
 const news=composeMail({id:'news-000001',title:'News',body:'Server maintenance',serverId:'server-2'}),r={serverId:'server-1'};
 assert.equal(publicInbox(null,[news],r.serverId).length,0);r.serverId='server-2';assert.equal(inboxSummary(null,[news],r.serverId).unread,1);
 const read=mailboxAction(r,{type:'mailRead',mailId:news.id,broadcast:true},[news],1000);assert.equal(inboxSummary(read.mailbox,[news],r.serverId).unread,0);assert.throws(()=>mailboxAction(read,{type:'mailClaim',mailId:news.id,broadcast:true},[news]),/mail-no-gift/);
});
const catalog={capital:'field',maps:[{id:'field',name:'Field',spawn:{x:0,z:0},nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},mobs:[],npcs:[]}]};
const wait=(ws,type)=>new Promise((yes,no)=>{const timer=setTimeout(()=>{ws.off('message',fn);no(Error('message-timeout'));},5000);const fn=data=>{const m=JSON.parse(data);if(m.type===type){clearTimeout(timer);ws.off('message',fn);yes(m);}};ws.on('message',fn);});
test('host delivers offline gifts, rejects forged attachments, saves claims before ack and persists broadcasts across restart',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'mail128-')),store=await new LocalStore(directory).init(),user=await store.createLocal({name:'MailboxTest'});store.rows.get(user.uid).state={...initialSave(),mapId:'field'};const origins=['http://localhost'];let service=await createHost({mode:'local',store,catalog,origins}),ws;
 await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port,post=(url,body,origin='http://localhost')=>fetch(base+url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/admin/mail',{peer:'all',title:'X',body:'X',requestId:'evil-00001'},'https://evil.test')).status,403);
  const b={peer:'off:'+user.uid+':slot-1',title:'Gift',body:'For your journey',attachments:gift().attachments,requestId:'mail-000001'};assert.equal((await post('/admin/mail',b)).status,200);assert.equal((await post('/admin/mail',b)).status,200);assert.equal(store.rows.get(user.uid).mailbox.messages.length,1);assert.equal(store.rows.get(user.uid).petCollection,undefined);
  assert.equal((await post('/admin/mail',{peer:'all',title:'News',body:'Welcome!',requestId:'news-000001'})).status,200);assert.equal((await post('/admin/mail',{peer:'all',title:'News',body:'Welcome!',attachments:{goldBars:10},requestId:'news-000002'})).status,400);
  ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:'http://localhost'});await new Promise(r=>ws.on('open',r));let pending=wait(ws,'welcome');ws.send(JSON.stringify({type:'join',token:user.token,serverId:'server-1',slotId:'slot-1'}));assert.equal((await pending).snapshot.self.mailbox.unread,2);
  const activePeer=[...service.realm.peers.values()][0],saveBefore=store.checkpoint.bind(store),coinsBefore=activePeer.bag.coins;let releaseSave;const saveGate=new Promise(r=>releaseSave=r);store.checkpoint=async(s,r,o)=>{if(r.mailbox?.messages[0]?.claimedAt)await saveGate;return saveBefore(s,r,o);};
  let seq=0;const claim={type:'mailClaim',mailId:'mail-000001',id:'claim-000001',attachments:{goldBars:999999}};pending=wait(ws,'mailChanged');ws.send(JSON.stringify({...claim,seq:++seq}));while(!activePeer.mailMutationBusy)await new Promise(r=>setTimeout(r,5));assert.equal(!!activePeer.suspended,false,'mail writes must not create combat invulnerability');service.realm.grantLoot(activePeer,{coins:7,items:[]});releaseSave();const claimed=await pending;assert.equal(activePeer.bag.coins,coinsBefore+57,'loot earned during the claim is not overwritten');store.checkpoint=saveBefore;assert.equal(claimed.petCollection.balance,1000);assert.equal(store.rows.get(user.uid).mailbox.messages[0].claimedAt>0,true);assert.equal(store.rows.get(user.uid).bag.items['hp-small'],2);
  pending=wait(ws,'mailChanged');ws.send(JSON.stringify({...claim,seq:++seq}));assert.equal((await pending).petCollection.balance,1000);assert.equal(store.rows.get(user.uid).bag.items['hp-small'],2);
  // An online gift is also a letter; a failing claim must never be acknowledged or write stale inventory on close.
  const peer=[...service.realm.peers.values()][0];assert.equal((await post('/admin/pets',{peer:peer.id,gems:20,requestId:'mail-000002'})).status,200);
  const original=store.checkpoint.bind(store);store.checkpoint=async(s,r,o)=>{if(r.mailbox?.messages.find(m=>m.id==='mail-000002')?.claimedAt)throw Error('simulated-save-failure');return original(s,r,o);};let ack=false;ws.on('message',data=>{const m=JSON.parse(data);if(m.type==='mailChanged'&&m.id==='claim-failed')ack=true;});const closed=new Promise(r=>ws.once('close',r));ws.send(JSON.stringify({type:'mailClaim',mailId:'mail-000002',id:'claim-failed',seq:++seq}));await closed;assert.equal(ack,false);assert.equal(store.rows.get(user.uid).petCollection.balance,1000);assert.equal(store.rows.get(user.uid).mailbox.messages[1].claimedAt,0);store.checkpoint=original;
  await service.close();service=null;const restarted=await new LocalStore(directory).init();assert.equal((await restarted.loadMailAnnouncements())[0].id,'news-000001');assert.equal(restarted.rows.get(user.uid).petCollection.balance,1000);
 }finally{ws?.terminate();if(service)await service.close();await rm(directory,{recursive:true,force:true});}
});

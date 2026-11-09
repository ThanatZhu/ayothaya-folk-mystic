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
import {initialGoldWipeState,goldWipeBackfill} from '../server/gold-wipe.js';
// Fake store: rows sorted by uid, paged like classRewardPage; deliver writes the wiped record back like giveOffline.
function fakeStore(n){
 const rows=new Map(Array.from({length:n},(_,i)=>['u'+String(i).padStart(4,'0'),rec(10+i,{goldBars:i%3})]));let state={...initialGoldWipeState(),startedAt:1};
 const seen=[];
 return {rows,seen,store:{loadGoldWipeState:async()=>structuredClone(state),saveGoldWipeState:async s=>{state=structuredClone(s);},
  classRewardPage:async({after,limit})=>{const all=[...rows.keys()].filter(k=>after===null||k>after),page=all.slice(0,limit);return {rows:page.map(uid=>({uid,slotId:'slot-1',record:structuredClone(rows.get(uid))})),after:page.at(-1)??after,done:all.length<=limit};}},
  deliver:async(row,wipe)=>{seen.push(row.uid);const x=wipe(rows.get(row.uid));rows.set(row.uid,x.record);return x.removed;}};
}
const expected=n=>Array.from({length:n},(_,i)=>({wallet:10+i,mail:i%3})).reduce((a,r)=>({wallet:a.wallet+r.wallet,mail:a.mail+r.mail}),{wallet:0,mail:0});
test('not started: no work, no save',async()=>{
 let saved=false;const s=await goldWipeBackfill({store:{loadGoldWipeState:async()=>null,saveGoldWipeState:async()=>{saved=true;},classRewardPage:async()=>{throw Error('scanned');}},deliver:async()=>{throw Error('delivered');}});
 assert.equal(s.startedAt,null);assert.equal(saved,false);
});
test('resumes from the saved cursor',async()=>{
 const f=fakeStore(250);let allowed=true;const run=()=>goldWipeBackfill({store:f.store,deliver:f.deliver,canWrite:()=>allowed});
 await run();await run();allowed=false;await assert.rejects(run(),/authority-lost/);
 assert.equal((await f.store.loadGoldWipeState()).scanned,200);
 allowed=true;let s;do s=await run();while(!s.completedAt);
 assert.equal(f.seen.length,250);assert.equal(new Set(f.seen).size,250);
 assert.equal(s.wiped,250);assert.equal(s.scanned,250);assert.deepEqual({wallet:s.wallet,mail:s.mail},expected(250));
 for(const r of f.rows.values()){assert.equal(goldOf(r),0);assert.equal(mailGoldOf(r),0);assert.equal(r.goldWipe,1);}
 const again=await run();assert.deepEqual(again,s);assert.equal(f.seen.length,250);
});
test('a page cut off half way is replayed without wiping a record twice',async()=>{
 const f=fakeStore(150);let n=0;const run=canWrite=>goldWipeBackfill({store:f.store,deliver:f.deliver,canWrite});
 await assert.rejects(run(()=>++n<40),/authority-lost/);
 for(const uid of f.seen)f.rows.get(uid).petCollection.balance=5; // gold received after the wipe must survive the replay
 let s;do s=await run(()=>true);while(!s.completedAt);
 assert.equal(new Set(f.seen).size,f.seen.length);assert.equal(f.seen.length,150);
 assert.equal([...f.rows.values()].filter(r=>goldOf(r)===5).length,39);
});
test('an online or busy character waits in pending and is retried',async()=>{
 const f=fakeStore(3),deliver=f.deliver;let busy=true;
 f.deliver=async(row,wipe)=>{if(row.uid==='u0001'&&busy){busy=false;throw Error('player-online');}return deliver(row,wipe);};
 let s=await goldWipeBackfill({store:f.store,deliver:f.deliver});
 assert.equal(s.completedAt,null);assert.deepEqual(s.pending.map(p=>p.uid),['u0001']);assert.equal(s.wiped,2);
 s=await goldWipeBackfill({store:f.store,deliver:f.deliver});
 assert.ok(s.completedAt);assert.equal(s.pending.length,0);assert.equal(s.wiped,3);assert.equal(goldOf(f.rows.get('u0001')),0);
});

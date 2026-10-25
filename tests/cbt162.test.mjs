import test from 'node:test';
import assert from 'node:assert/strict';
import {CBT_EVENT,CBT_REWARDS,CBT_IDEAS,CBT_ARENA_RULES,cbtPreviewProgress,cbtRewardTier,cbtEntryKey,cbtRewardPulls} from '../cbt-event.js';
import {composeMail,deliverMail,mailboxAction} from '../mailbox.js';
test('CBT remains a preview with a Thai-time start and no invented end or reward activation',()=>{
 assert.equal(CBT_EVENT.status,'preview');assert.equal(CBT_EVENT.endsAt,null);
 assert.equal(new Date(CBT_EVENT.startsAt).toISOString(),'2026-10-31T17:00:00.000Z');
 assert.equal(CBT_EVENT.claimEnabled,false);assert.equal(CBT_EVENT.rankedQueueEnabled,false);
});
test('every proposed reward can be received once through the existing real mailbox and gold-bar wallet',()=>{
 let i=0;
 for(const r of [...Object.values(CBT_REWARDS).flat(),...CBT_IDEAS]){
  const mail=composeMail({id:'cbt-preview-test-'+(++i),title:r.title,body:'Preview test only',attachments:{goldBars:r.goldBars,items:r.items}});
  const record={serverId:'server-1',bag:{coins:0,items:{}},mailbox:deliverMail(null,mail).mailbox};
  const next=mailboxAction(record,{type:'mailClaim',mailId:mail.id},[],1000);
  assert.equal(next.petCollection.balance,r.goldBars);
  for(const x of r.items)assert.equal(next.bag.items[x.id],x.count);
  const again=mailboxAction(next,{type:'mailClaim',mailId:mail.id},[],2000);
  assert.equal(again.petCollection.balance,r.goldBars);assert.deepEqual(again.bag,next.bag);
  assert.equal(cbtRewardPulls(r.goldBars),r.goldBars/100);
 }
 for(const r of [CBT_REWARDS.power[3],CBT_REWARDS.arena[3],...CBT_IDEAS])assert.deepEqual(r.items,[],'lower-tier rewards are gold bars only');
});
test('reward groups match 1, 2, 3, 4–9 exactly; tenth place has no promised CBT award',()=>{
 for(const group of ['power','arena'])assert.deepEqual(CBT_REWARDS[group].map(r=>r.rank),['1','2','3','4–9']);
 assert.deepEqual([1,2,3,4,9,10,0,-1,NaN,1.5].map(cbtRewardTier),[0,1,2,3,3,null,null,null,null,null]);
});
test('existing rebirth progress cannot turn a preview into an entitlement',()=>{
 for(const n of [0,9,10,999,NaN,-2]){
  const p=cbtPreviewProgress(n);assert.ok(p.current>=0&&p.current<=10);assert.equal(p.eligible,false);assert.equal(p.claimEnabled,false);
 }
 assert.equal(cbtPreviewProgress(10).current,10);
});
test('entry suppression is scoped by character, server and preview revision',()=>{
 assert.notEqual(cbtEntryKey({owner:'account-a'}),cbtEntryKey({owner:'account-b'}));
 assert.notEqual(cbtEntryKey({serverId:'server-1',slotId:'slot-1'}),cbtEntryKey({serverId:'server-1',slotId:'slot-2'}));
 assert.notEqual(cbtEntryKey({serverId:'server-1',slotId:'slot-1'}),cbtEntryKey({serverId:'server-2',slotId:'slot-1'}));
 assert.match(CBT_ARENA_RULES.join(' '),/ท้าดวลกันเอง.*ไม่นับคะแนน/);
});

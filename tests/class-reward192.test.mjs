import test from 'node:test';import assert from 'node:assert/strict';
import {ITEMS,itemDef,useItem} from '../items.js';
import {FAMILIES,WEAPON_CLASSES,pieceId,setBonuses} from '../gear-sets.js';
import {canWear} from '../character-stats.js';
import {CLASS_REWARD_BOX,CLASS_REWARD_MAIL_ID,familyWeaponId,familySetItemIds} from '../class-reward-items192.js';
import {grantClassReward,chooseClassSet} from '../class-reward192.js';
import {mailboxAction} from '../mailbox.js';
import {classRewardBackfill} from '../server/class-reward-backfill192.js';
const record=(classId='shaman')=>({serverId:'server-1',character:{name:'Reward Test',classId},bag:{coins:123,slots:100,items:{[CLASS_REWARD_BOX]:1}}});
test('all 35 family weapons are red Lv55 class weapons and join the selected set',()=>{
 assert.equal(Object.values(ITEMS).filter(x=>x.classReward).length,35);
 for(const f of FAMILIES)for(const [cls] of WEAPON_CLASSES){const it=itemDef(familyWeaponId(f.key,cls)+'^4');assert.equal(it.kind,'gear');assert.equal(it.level,55);assert.equal(it.grade,4);assert.deepEqual(it.classes,[cls]);assert.deepEqual(it.set,{family:f.key,tier:4});assert.deepEqual(it.pct,f.piece);assert.ok(it.image);}
});
test('reward weapon activates a four-piece family bonus with three armor pieces and requires Lv55',()=>{
 const id=familyWeaponId('mantra','shaman')+'^4',pieces=[id,...['head','armor','shoes'].map(slot=>pieceId('mantra',slot,'shaman',4))].map(itemDef);
 const bonus=setBonuses(pieces).total;assert.ok(Math.abs(bonus.cdr-.18)<1e-9);assert.equal(bonus.mpCut,.12);assert.equal(bonus.matkPct,.06);
 assert.equal(canWear(id,{classId:'shaman',level:54}),'low-level');assert.equal(canWear(id,{classId:'shaman',level:55}),null);assert.equal(canWear(id,{classId:'swordsman',level:99}),'wrong-class');
});
test('only changed classes receive one mail, including old characters; claiming and deletion do not regrant',()=>{
 const novice=record('novice');assert.equal(grantClassReward(novice),novice);
 let r=grantClassReward({...record(),bag:{coins:0,items:{}}},1000);assert.equal(r.mailbox.messages.length,1);assert.equal(r.mailbox.messages[0].attachments.items[0].id,CLASS_REWARD_BOX);assert.equal(grantClassReward(r),r);
 r=mailboxAction(r,{type:'mailClaim',mailId:CLASS_REWARD_MAIL_ID},[],2000);assert.equal(r.bag.items[CLASS_REWARD_BOX],1);assert.equal(grantClassReward(r),r);
 r=mailboxAction(r,{type:'mailDeleteAll'},[],3000);assert.equal(r.mailbox.messages.length,0);assert.ok(r.mailbox.deleted[CLASS_REWARD_MAIL_ID]);assert.equal(grantClassReward(r),r);
 r.character.jobId='spirit-master';assert.equal(grantClassReward(r),r);
});
test('every family/class opens exactly one box; client item/class/grade fields cannot choose another reward',()=>{
 for(const f of FAMILIES)for(const [cls] of WEAPON_CLASSES)for(const gender of ['male','female']){const before=record(cls);before.character.gender=gender;const next=chooseClassSet(before,{id:'test-open-'+cls,family:f.key,item:'weapon-swordsman-six^4',classId:'swordsman',grade:0,count:99});
  const ids=familySetItemIds(f.key,before.character);assert.equal(ids.length,5);assert.deepEqual(next.bag.items,Object.fromEntries(ids.map(id=>[id,1])));assert.deepEqual(ids.map(id=>itemDef(id).slot),['weapon','head','armor','garment','shoes']);for(const id of ids){const it=itemDef(id);assert.equal(it.level,55);assert.equal(it.grade,4);if(it.slot==='weapon')assert.ok(it.classes.includes(cls));else assert.equal(it.look,cls==='acolyte'?(gender==='female'?'nun':'monk'):cls);}
  assert.equal(next.bag.coins,123);assert.equal(before.bag.items[CLASS_REWARD_BOX],1);
 }
});
test('duplicate requests replay safely; validation rejects conflicts, novice, bad family and missing box',()=>{
 const action={id:'choice-request-192',family:'mantra'},r=chooseClassSet(record(),action);assert.deepEqual(chooseClassSet(r,action),r);assert.throws(()=>chooseClassSet(r,{...action,family:'wind'}),/request-conflict/);
 assert.throws(()=>chooseClassSet(record('novice'),action),/class-required/);assert.throws(()=>chooseClassSet({...record(),bag:{items:{}}},action),/no-set-box/);assert.throws(()=>chooseClassSet(record(),{...action,family:'cheat'}),/invalid-set-family/);assert.throws(()=>chooseClassSet(record(),{...action,id:'x'}),/invalid-request/);
 assert.throws(()=>useItem(record().bag,CLASS_REWARD_BOX,{hp:1,maxHp:10,mp:1,maxMp:10}),/not-usable/);
});
test('full bag does not lose box or grant a partial set; final box frees one of five required slots',()=>{
 const ids=Object.keys(ITEMS).filter(id=>ITEMS[id].kind==='loot').slice(0,39),r=record();r.bag={slots:40,coins:0,items:{...Object.fromEntries(ids.map(id=>[id,1])),[CLASS_REWARD_BOX]:2}};
 assert.equal(Object.keys(r.bag.items).length,40);const before=structuredClone(r);assert.throws(()=>chooseClassSet(r,{id:'full-bag-192',family:'wind'}),/bag-full/);assert.deepEqual(r,before);
 r.bag.items[CLASS_REWARD_BOX]=1;assert.throws(()=>chooseClassSet(r,{id:'one-free-192',family:'wind'}),/bag-full/);assert.equal(r.bag.items[CLASS_REWARD_BOX],1);
 for(const id of ids.slice(0,4))delete r.bag.items[id];assert.equal(Object.keys(chooseClassSet(r,{id:'free-slots-192',family:'wind'}).bag.items).length,40);
});
test('backfill pages beyond 2000 profiles, resumes after restart and retries busy inboxes without duplicate mails',async()=>{
 const rows=Array.from({length:2107},(_,i)=>({uid:'user-'+String(i).padStart(5,'0'),slotId:'slot-1',record:record(i%5?'shaman':'novice')}));let state=null,busy=true,attempts=0;
 const store={loadClassRewardState:async()=>state,saveClassRewardState:async s=>{state=structuredClone(s);},classRewardPage:async({after,limit})=>{const start=after===null?0:Number(after),page=rows.slice(start,start+limit);return {rows:structuredClone(page),after:String(start+page.length),done:start+page.length>=rows.length};}};
 const deliver=async row=>{attempts++;if(row.uid==='user-00001'&&busy)throw Error('player-online');const current=rows.find(r=>r.uid===row.uid);current.record=grantClassReward(current.record);};
 for(let i=0;i<22;i++)await classRewardBackfill({store,deliver});assert.equal(state.scanned,2107);assert.equal(state.pending.length,1);assert.equal(state.delivered,state.eligible-1);
 busy=false;await classRewardBackfill({store,deliver});assert.equal(state.pending.length,0);assert.equal(state.delivered,state.eligible);assert.ok(state.completedAt);const count=attempts;await classRewardBackfill({store,deliver});assert.equal(attempts,count);
 assert.ok(rows.every(r=>r.record.character.classId==='novice'?!r.record.mailbox:r.record.mailbox.messages.length===1));
 // Lost cursor commit: repeat page using already mailed records.
 state=null;await classRewardBackfill({store,deliver});assert.ok(rows.slice(0,100).every(r=>!r.record.mailbox||r.record.mailbox.messages.length===1));
});
test('backfill stops without moving cursor when authority is lost',async()=>{
 let saved=false;const store={loadClassRewardState:async()=>null,classRewardPage:async()=>({rows:[{record:record()}],after:'next',done:true}),saveClassRewardState:async()=>{saved=true;}};
 await assert.rejects(classRewardBackfill({store,deliver:async()=>{},canWrite:()=>false}),/authority-lost/);assert.equal(saved,false);
});

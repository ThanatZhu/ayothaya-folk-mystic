// Gold bars (ทองแท่ง) held by every character: wallet (petCollection.balance) plus gold still waiting in unclaimed mail.
// Mail uses mailbox.js's own inbox rule (publicInbox: deleted mail hidden, announcements only for the character's server).
import {normalizePetAccount} from '../pet-account.js';
import {publicInbox,normalizeMailbox} from '../mailbox.js';
export const goldOf=record=>normalizePetAccount(record?.petCollection).balance;
export const mailGoldOf=(record,announcements=[])=>publicInbox(record?.mailbox,announcements,record?.serverId).reduce((a,m)=>a+(m.claimedAt?0:m.attachments?.goldBars??0),0);
export function goldHoldings(rows,announcements=[],top=20){
 const list=rows.filter(r=>r.record).map(r=>({uid:r.uid,slotId:r.slotId,name:r.record.character?.name??'',gold:goldOf(r.record),mailGold:mailGoldOf(r.record,announcements)}));
 const total=key=>list.reduce((a,c)=>a+c[key],0);
 return {held:total('gold'),holders:list.filter(c=>c.gold+c.mailGold>0).length,mailGold:total('mailGold'),characters:list.length,
  top:list.filter(c=>c.gold+c.mailGold>0).sort((a,b)=>b.gold+b.mailGold-a.gold-a.mailGold).slice(0,top)};
}
// One-off wipe: wallet to 0 and goldBars cleared from unclaimed personal mail (same unclaimed rule as mailGoldOf); goldWipe:1 makes it run once per record. Pure.
export function wipeRecordGold(record){
 if(record?.goldWipe===1)return {record,removed:{wallet:0,mail:0},skipped:true};
 const wallet=goldOf(record),out={...record,goldWipe:1};let mail=0;
 if(wallet>0)out.petCollection={...normalizePetAccount(record.petCollection),balance:0};
 if(record?.mailbox){const box=normalizeMailbox(record.mailbox);
  out.mailbox={...box,messages:box.messages.map(m=>{const g=!m.claimedAt&&!Object.hasOwn(box.deleted,m.id)?m.attachments.goldBars:0;if(!g)return m;mail+=g;return {...m,attachments:{...m.attachments,goldBars:0}};})};}
 return {record:out,removed:{wallet,mail},skipped:false};
}
// Admin wipe of every saved character, one page per call (host drains it on its 10 s tick once the admin starts it).
// The cursor is saved after each page; a page cut off half way is replayed safely because wiped records carry goldWipe:1
// and are skipped (their tallies for that page are lost, the evidence log still has them). deliver(row,wipeRecordGold)
// writes the record (live session or offline save) and returns what it removed.
export const initialGoldWipeState=()=>({version:1,reportAt:null,report:null,startedAt:null,after:null,scanned:0,wiped:0,wallet:0,mail:0,pending:[],scanComplete:false,completedAt:null});
export async function goldWipeBackfill({store,deliver,canWrite=()=>true,pageSize=100}){
 const state=structuredClone(await store.loadGoldWipeState()??initialGoldWipeState());
 if(!state.startedAt||state.completedAt)return state;
 async function attempt(row){
  if(!canWrite())throw Error('authority-lost');
  try{const r=await deliver(row,wipeRecordGold);if(r.wallet+r.mail>0)state.wiped++;state.wallet+=r.wallet;state.mail+=r.mail;}
  catch(e){if(e.message==='authority-lost')throw e;if(e.message!=='character-not-found')state.pending.push({uid:row.uid,slotId:row.slotId});}
 }
 for(const row of state.pending.splice(0,25))await attempt(row);
 if(!state.scanComplete){
  const page=await store.classRewardPage({after:state.after,limit:pageSize});
  for(const row of page.rows){state.scanned++;if(row.record?.goldWipe!==1)await attempt(row);}
  state.after=page.after;state.scanComplete=page.done;
 }
 if(!canWrite())throw Error('authority-lost');
 if(state.scanComplete&&!state.pending.length)state.completedAt=Date.now();
 await store.saveGoldWipeState(state);return state;
}

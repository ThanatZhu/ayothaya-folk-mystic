// Private, server-owned inbox. Clients send a mail ID, never attachment amounts.
import {itemDef,addLoot,MAX_COINS} from './items.js';
import {normalizePetAccount,petAccountAction} from './pet-account.js';
import {premiumPet} from './premium-pets.js';
export const MAIL_ACTIONS=['mailList','mailRead','mailClaim','mailClaimAll','mailDeleteAll'];
export const MAIL_LIMIT=200;
export const MAIL_BYTES=350000; // Leave room for the rest of a private Firestore character document.
const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,56}$/.test(id);
const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('bad-mail-text');return v.trim();};
export const legacyPetItem=id=>['pet-lure','pet-food','egg-rat','egg-straw','egg-hopper','egg-monkey'].includes(id);
export function mailAttachments(raw={}){
 const {coins=0,goldBars=0,items=[],pets=[]}=raw;
 if(!Number.isSafeInteger(coins)||coins<0||coins>MAX_COINS||!Number.isSafeInteger(goldBars)||goldBars<0||goldBars>1000000)throw Error('bad-mail-currency');
 if(!Array.isArray(items)||items.length>20||!Array.isArray(pets)||pets.length>10)throw Error('bad-mail-items');
 // 0.116.2 graded / refined gear ('id^4', 'id+7') resolves through itemDef like the rest of the game
 const seen=new Set(),clean=items.map(x=>{const def=itemDef(x?.id);if(!def||!MAILABLE.has(def.kind)||legacyPetItem(x.id)||seen.has(x.id))throw Error('bad-item');seen.add(x.id);if(!Number.isSafeInteger(x.count)||x.count<1||x.count>999)throw Error('bad-count');return {id:x.id,count:x.count};});
 for(const id of pets)premiumPet(id);
 return {coins,goldBars,items:clean,pets:[...pets]};
}
const MAILABLE=new Set(['loot','potion','gear','card','scroll','wing']);
export const hasMailGift=a=>!!(a?.coins||a?.goldBars||a?.items?.length||a?.pets?.length);
export function composeMail({id,title,body,sender='ทีมงานอโยธยา',attachments={},serverId='all'},now=Date.now()){
 if(!idOK(id))throw Error('bad-request-id');
 if(!['all','server-1','server-2'].includes(serverId))throw Error('bad-scope');
 return {id,title:text(title,100),body:text(body,4000),sender:text(sender,100),attachments:mailAttachments(attachments),serverId,createdAt:now,readAt:0,claimedAt:0};
}
export function normalizeMailbox(raw){
 const v=raw??{},messages=[],seen=new Set();
 for(const m of Array.isArray(v.messages)?v.messages:[]){try{const c=composeMail(m,m.createdAt);if(seen.has(c.id))continue;seen.add(c.id);messages.push({...c,readAt:Number.isSafeInteger(m.readAt)&&m.readAt>0?m.readAt:0,claimedAt:Number.isSafeInteger(m.claimedAt)&&m.claimedAt>0?m.claimedAt:0});}catch{}}
 const dates=raw=>Object.assign(Object.create(null),Object.fromEntries(Object.entries(raw??{}).filter(([id,at])=>idOK(id)&&Number.isSafeInteger(at)&&at>0)));
 return {v:1,messages,broadcastRead:dates(v.broadcastRead),deleted:dates(v.deleted),broadcastDeleted:dates(v.broadcastDeleted)};
}
const signature=m=>JSON.stringify([m.title,m.body,m.sender,m.attachments,m.serverId]);
export function deliverMail(raw,mail){
 const box=normalizeMailbox(raw),old=box.messages.find(m=>m.id===mail.id);
 // A delivery ID is immutable even after deletion: an admin retry must never recreate a claimed gift.
 if(Object.hasOwn(box.deleted,mail.id))return {mailbox:box,mail,replayed:true};
 if(old){if(signature(old)!==signature(mail))throw Error('request-conflict');return {mailbox:box,mail:old,replayed:true};}
 if(box.messages.length>=MAIL_LIMIT)throw Error('mailbox-full');
 const next={...box,messages:[...box.messages,mail]};if(new TextEncoder().encode(JSON.stringify(next)).length>MAIL_BYTES)throw Error('mailbox-full');
 return {mailbox:next,mail,replayed:false};
}
export function publicInbox(raw,broadcasts=[],serverId){
 const box=normalizeMailbox(raw),personal=box.messages.filter(m=>!Object.hasOwn(box.deleted,m.id)).map(m=>({...m,broadcast:false}));
 const global=broadcasts.filter(m=>(m.serverId==='all'||m.serverId===serverId)&&!Object.hasOwn(box.broadcastDeleted,m.id)).map(m=>({...m,broadcast:true,readAt:box.broadcastRead[m.id]??0,claimedAt:0}));
 return [...personal,...global].sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
}
const summaries=new WeakMap();
export function inboxSummary(raw,broadcasts,serverId){
 // Mail mutations replace the inbox; simulation snapshots reuse a small cached summary.
 const cache=raw&&typeof raw==='object'?summaries.get(raw):null;if(cache?.broadcasts===broadcasts&&cache.serverId===serverId)return cache.summary;
 const rows=publicInbox(raw,broadcasts,serverId),summary={unread:rows.filter(m=>!m.readAt).length,gifts:rows.filter(m=>!m.claimedAt&&hasMailGift(m.attachments)).length,total:rows.length};
 if(raw&&typeof raw==='object')summaries.set(raw,{broadcasts,serverId,summary});return summary;
}
export function mailboxAction(record,action,broadcasts=[],now=Date.now()){
 if(['mailClaimAll','mailDeleteAll'].includes(action.type))return mailboxBulkAction(record,action,broadcasts,now).record;
 const mailbox=normalizeMailbox(record.mailbox),mail=publicInbox(mailbox,broadcasts,record.serverId).find(m=>m.id===action.mailId&&m.broadcast===(action.broadcast===true));
 if(!mail)throw Error('mail-not-found');
 if(!['mailRead','mailClaim'].includes(action.type))throw Error('bad-mail-action');
 if(mail.broadcast){if(action.type==='mailClaim')throw Error('mail-no-gift');mailbox.broadcastRead[mail.id]??=now;return {...record,mailbox};}
 const target=mailbox.messages.find(m=>m.id===mail.id);target.readAt||=now;
 if(action.type==='mailRead'||target.claimedAt)return {...record,mailbox};
 if(!hasMailGift(target.attachments))throw Error('mail-no-gift');
 const a=target.attachments;
 if((record.bag?.coins??0)+a.coins>MAX_COINS)throw Error('coin-cap');
 const {bag,lost}=addLoot(record.bag,{coins:a.coins,items:a.items});if(lost.length)throw Error('bag-full');
 let petCollection=normalizePetAccount(record.petCollection);
 if(a.goldBars)petCollection=petAccountAction(petCollection,{type:'petGrant',requestId:'mail-gold-'+mail.id,gems:a.goldBars}).state;
 for(let i=0;i<a.pets.length;i++)petCollection=petAccountAction(petCollection,{type:'petGrant',requestId:'mail-pet-'+i+'-'+mail.id,gems:0,pet:a.pets[i]}).state;
 target.claimedAt=now;
 return {...record,bag,petCollection,mailbox};
}
export const canDeleteMail=mail=>!!mail.readAt&&(!hasMailGift(mail.attachments)||!!mail.claimedAt);
export function mailboxBulkAction(record,action,broadcasts=[],now=Date.now()){
 const rows=publicInbox(record.mailbox,broadcasts,record.serverId),summary={claimed:0,deleted:0,remaining:0,blocked:[]};
 if(action.type==='mailDeleteAll'){
  const mailbox=normalizeMailbox(record.mailbox),remove=new Set();
  for(const m of rows){if(!canDeleteMail(m))continue;summary.deleted++;if(m.broadcast){mailbox.broadcastDeleted[m.id]=now;delete mailbox.broadcastRead[m.id];}else{remove.add(m.id);mailbox.deleted[m.id]=now;}}
  mailbox.messages=mailbox.messages.filter(m=>!remove.has(m.id));
  return {record:{...record,mailbox},summary};
 }
 if(action.type!=='mailClaimAll')throw Error('bad-mail-action');
 let next=record;
 for(const m of rows.slice().reverse()){
  if(m.broadcast||m.claimedAt||!hasMailGift(m.attachments))continue;
  try{next=mailboxAction(next,{type:'mailClaim',mailId:m.id},broadcasts,now);summary.claimed++;}
  catch(error){if(!['bag-full','coin-cap','bad-gems'].includes(error.message))throw error;summary.blocked.push({id:m.id,code:error.message});}
 }
 summary.remaining=publicInbox(next.mailbox,broadcasts,next.serverId).filter(m=>!m.claimedAt&&hasMailGift(m.attachments)).length;
 return {record:next,summary};
}
// 0.122 loot that does not fit a full bag waits in one "bag full" mail (topped up until claimed) instead of being lost.
// Returns {mailbox, mailed, left}: left is what still could not go anywhere (mailbox full, item that cannot be mailed).
export const OVERFLOW_PREFIX='bagfull-';
export function mailOverflow(raw,items,{id,now=Date.now(),serverId='all'}={}){
 const box=normalizeMailbox(raw),open=box.messages.find(m=>m.id.startsWith(OVERFLOW_PREFIX)&&!m.claimedAt);
 const list=(open?.attachments.items??[]).map(i=>({...i})),mailed=[],left=[];
 for(const {id:itemId,count} of items??[]){
  const def=itemDef(itemId);let slot=list.find(i=>i.id===itemId);
  if(!def||!MAILABLE.has(def.kind)||legacyPetItem(itemId)||!slot&&list.length>=20){left.push({id:itemId,count});continue;}
  if(!slot)list.push(slot={id:itemId,count:0});
  const take=Math.min(999-slot.count,count);if(take>0)mailed.push({id:itemId,count:take});slot.count+=take;if(take<count)left.push({id:itemId,count:count-take});
 }
 const none={mailbox:box,mailed:[],left:items??[]};
 if(!mailed.length||!open&&box.messages.length>=MAIL_LIMIT)return none;
 const mail={...composeMail({id:open?.id??id,title:'กระเป๋าเต็ม · ของที่เก็บไม่ได้',body:'ของที่ได้ตอนกระเป๋าเต็มถูกเก็บไว้ที่นี่ · ทำช่องว่างในกระเป๋าแล้วกดรับ',sender:'ระบบอโยธยา',attachments:{items:list.filter(i=>i.count>0)},serverId},open?.createdAt??now)};
 const next={...box,messages:open?box.messages.map(m=>m.id===open.id?mail:m):[...box.messages,mail]};
 if(new TextEncoder().encode(JSON.stringify(next)).length>MAIL_BYTES)return none;
 return {mailbox:next,mailed,left};
}

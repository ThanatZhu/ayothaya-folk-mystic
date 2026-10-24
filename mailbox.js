// Private, server-owned inbox. Clients send a mail ID, never attachment amounts.
import {ITEMS,addLoot,MAX_COINS} from './items.js';
import {normalizePetAccount,petAccountAction} from './pet-account.js';
import {premiumPet} from './premium-pets.js';
export const MAIL_ACTIONS=['mailList','mailRead','mailClaim'];
export const MAIL_LIMIT=200;
export const MAIL_BYTES=350000; // Leave room for the rest of a private Firestore character document.
const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,56}$/.test(id);
const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('bad-mail-text');return v.trim();};
export const legacyPetItem=id=>['pet-lure','pet-food','egg-rat','egg-straw','egg-hopper','egg-monkey'].includes(id);
export function mailAttachments(raw={}){
 const {coins=0,goldBars=0,items=[],pets=[]}=raw;
 if(!Number.isSafeInteger(coins)||coins<0||coins>MAX_COINS||!Number.isSafeInteger(goldBars)||goldBars<0||goldBars>1000000)throw Error('bad-mail-currency');
 if(!Array.isArray(items)||items.length>20||!Array.isArray(pets)||pets.length>10)throw Error('bad-mail-items');
 const seen=new Set(),clean=items.map(x=>{if(!ITEMS[x?.id]||!['loot','potion','gear','card','scroll','wing'].includes(ITEMS[x.id].kind)||legacyPetItem(x.id)||seen.has(x.id))throw Error('bad-item');seen.add(x.id);if(!Number.isSafeInteger(x.count)||x.count<1||x.count>999)throw Error('bad-count');return {id:x.id,count:x.count};});
 for(const id of pets)premiumPet(id);
 return {coins,goldBars,items:clean,pets:[...pets]};
}
export const hasMailGift=a=>!!(a?.coins||a?.goldBars||a?.items?.length||a?.pets?.length);
export function composeMail({id,title,body,sender='ทีมงานอโยธยา',attachments={},serverId='all'},now=Date.now()){
 if(!idOK(id))throw Error('bad-request-id');
 if(!['all','server-1','server-2'].includes(serverId))throw Error('bad-scope');
 return {id,title:text(title,100),body:text(body,4000),sender:text(sender,100),attachments:mailAttachments(attachments),serverId,createdAt:now,readAt:0,claimedAt:0};
}
export function normalizeMailbox(raw){
 const v=raw??{},messages=[],seen=new Set();
 for(const m of Array.isArray(v.messages)?v.messages:[]){try{const c=composeMail(m,m.createdAt);if(seen.has(c.id))continue;seen.add(c.id);messages.push({...c,readAt:Number.isSafeInteger(m.readAt)&&m.readAt>0?m.readAt:0,claimedAt:Number.isSafeInteger(m.claimedAt)&&m.claimedAt>0?m.claimedAt:0});}catch{}}
 const read={};for(const [id,at] of Object.entries(v.broadcastRead??{}))if(idOK(id)&&Number.isSafeInteger(at)&&at>0)read[id]=at;
 return {v:1,messages,broadcastRead:read};
}
const signature=m=>JSON.stringify([m.title,m.body,m.sender,m.attachments,m.serverId]);
export function deliverMail(raw,mail){
 const box=normalizeMailbox(raw),old=box.messages.find(m=>m.id===mail.id);
 if(old){if(signature(old)!==signature(mail))throw Error('request-conflict');return {mailbox:box,mail:old,replayed:true};}
 if(box.messages.length>=MAIL_LIMIT)throw Error('mailbox-full');
 const next={...box,messages:[...box.messages,mail]};if(new TextEncoder().encode(JSON.stringify(next)).length>MAIL_BYTES)throw Error('mailbox-full');
 return {mailbox:next,mail,replayed:false};
}
export function publicInbox(raw,broadcasts=[],serverId){
 const box=normalizeMailbox(raw),personal=box.messages.map(m=>({...m,broadcast:false}));
 const global=broadcasts.filter(m=>m.serverId==='all'||m.serverId===serverId).map(m=>({...m,broadcast:true,readAt:box.broadcastRead[m.id]??0,claimedAt:0}));
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

// Gold bars (ทองแท่ง) held by every character: wallet (petCollection.balance) plus gold still waiting in unclaimed mail.
// Mail uses mailbox.js's own inbox rule (publicInbox: deleted mail hidden, announcements only for the character's server).
import {normalizePetAccount} from '../pet-account.js';
import {publicInbox} from '../mailbox.js';
export const goldOf=record=>normalizePetAccount(record?.petCollection).balance;
export const mailGoldOf=(record,announcements=[])=>publicInbox(record?.mailbox,announcements,record?.serverId).reduce((a,m)=>a+(m.claimedAt?0:m.attachments?.goldBars??0),0);
export function goldHoldings(rows,announcements=[],top=20){
 const list=rows.filter(r=>r.record).map(r=>({uid:r.uid,slotId:r.slotId,name:r.record.character?.name??'',gold:goldOf(r.record),mailGold:mailGoldOf(r.record,announcements)}));
 const total=key=>list.reduce((a,c)=>a+c[key],0);
 return {held:total('gold'),holders:list.filter(c=>c.gold+c.mailGold>0).length,mailGold:total('mailGold'),characters:list.length,
  top:list.filter(c=>c.gold+c.mailGold>0).sort((a,b)=>b.gold+b.mailGold-a.gold-a.mailGold).slice(0,top)};
}

// Only live server-authored chat is promoted; ordinary chat and local loot logs stay in chat.
export function realmAnnouncement(message){
 return message?.actor===null&&message.name==='ประกาศ'&&['system','world'].includes(message.channel)&&typeof message.text==='string';
}
export function createAnnouncementQueue({limit=24,now=()=>Date.now()}={}){
 const pending=[],seen=new Map();
 return {
  push({text,id,kind='realm'}={}){
   if(typeof text!=='string'||!text.trim())return false;
   text=text.trim().slice(0,1200);const time=now(),key=id??kind+':'+text;
   for(const [k,t] of seen)if(time-t>60000)seen.delete(k);
   if(seen.has(key))return false;
   seen.set(key,time);while(seen.size>160)seen.delete(seen.keys().next().value);
   // Replace stale queued weather, but never interrupt a message already on screen.
   if(kind==='weather'){const index=pending.findIndex(m=>m.kind==='weather');if(index!==-1)pending.splice(index,1);}
   if(pending.length>=limit)pending.shift(); // full history remains available in chat
   pending.push({text,id,kind});return true;
  },
  next(){return pending.shift()??null;},
  get size(){return pending.length;}
 };
}

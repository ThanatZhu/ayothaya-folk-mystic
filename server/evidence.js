// 0.118 evidence log for disputes and the Computer Crime Act's traffic-data duty: who did what, when, from which IP.
// Two streams: 'players' (sign-in/out, chat on every channel, trades, stalls, shops, mail, renames, travel, consent)
// kept 90 days, and 'admin' (every back-office action, including who searched this log) kept 3 years.
// Events are buffered and written as one batch document every 30 s (or every 400 events), so Firestore pays one
// write per batch, not per message. A failed write keeps the batch in memory and retries.
// ponytail: a server crash loses up to 30 s of events; shorten flushMs if that window matters.
export const EVIDENCE_DAYS={players:90,admin:1095},EVIDENCE_STREAMS=Object.keys(EVIDENCE_DAYS),EVIDENCE_RANGE_DAYS=31;
const BACKLOG=20000;
// Thailand day (UTC+7, no DST) so a day in the log is a day on the admin's calendar.
export const evidenceDay=t=>new Date(t+7*3600e3).toISOString().slice(0,10);
const shiftDay=(day,days)=>new Date(Date.parse(day+'T00:00:00Z')+days*86400e3).toISOString().slice(0,10);
export const isDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'));
export const daySpan=(from,to)=>Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400e3)+1;

// One player event: identity, network and place first, then what happened.
export function playerEvent(p,type,detail={}){
 return {type,uid:p?.uid??null,slot:p?.slotId??null,server:p?.serverId??null,name:p?.character?.name??null,ip:p?.ip??null,ch:p?.channel??null,map:p?.room?.map?.id??null,...detail};
}
const who=o=>o?{uid:o.uid??null,name:o.character?.name??null,ip:o.ip??null}:null;
export const counterpart=who;

export class EvidenceLog{
 constructor(store,{now=Date.now,flushMs=30000,batch=400}={}){this.store=store;this.now=now;this.flushMs=flushMs;this.batch=batch;this.buffers={players:[],admin:[]};this.flushing=null;}
 add(stream,event){
  const list=this.buffers[stream];if(!list)return;
  list.push({t:this.now(),...event});if(list.length>BACKLOG)list.splice(0,list.length-BACKLOG); // a long outage keeps the newest
  if(list.length>=this.batch)this.flush().catch(()=>{});
 }
 flush(){return this.flushing??=(async()=>{try{for(const stream of EVIDENCE_STREAMS)await this.flushStream(stream);}finally{this.flushing=null;}})();}
 async flushStream(stream){
  const list=this.buffers[stream];if(!list.length)return;
  const events=list.splice(0),byDay=new Map();for(const e of events){const d=evidenceDay(e.t);if(!byDay.has(d))byDay.set(d,[]);byDay.get(d).push(e);}
  for(const [day,rows] of byDay){
   try{await this.store.appendEvidence(stream,{day,at:this.now(),events:rows});}
   catch(e){list.unshift(...rows);console.error('evidence-flush',stream,e.message);throw e;}
  }
 }
 // Newest first. q matches name, uid, ip, chat text or any detail; type 'chat' also matches nothing else.
 async search({stream='players',from,to,type='',q='',limit=2000}){
  if(!EVIDENCE_STREAMS.includes(stream))throw Error('bad-stream');
  if(!isDay(from)||!isDay(to)||from>to)throw Error('bad-range');
  if(daySpan(from,to)>EVIDENCE_RANGE_DAYS)throw Error('range-too-long');
  await this.flush().catch(()=>{});
  const docs=await this.store.loadEvidence(stream,from,to),needle=String(q).trim().toLowerCase();
  let rows=docs.flatMap(d=>Array.isArray(d.events)?d.events:[]);
  if(type)rows=rows.filter(e=>e.type===type||e.type?.startsWith(type+'-'));
  if(needle)rows=rows.filter(e=>JSON.stringify(e).toLowerCase().includes(needle));
  rows.sort((a,b)=>b.t-a.t);
  return {events:rows.slice(0,limit),total:rows.length,truncated:rows.length>limit};
 }
 async purge(){for(const stream of EVIDENCE_STREAMS){const before=shiftDay(evidenceDay(this.now()),-EVIDENCE_DAYS[stream]);await this.store.purgeEvidence(stream,before).catch(e=>console.error('evidence-purge',stream,e.message));}}
 start(){
  this.timer=setInterval(()=>this.flush().catch(()=>{}),this.flushMs);this.timer.unref?.();
  this.purgeTimer=setInterval(()=>this.purge(),6*3600e3);this.purgeTimer.unref?.();this.purge();
  return this;
 }
 async stop(){clearInterval(this.timer);clearInterval(this.purgeTimer);await this.flush().catch(()=>{});}
}

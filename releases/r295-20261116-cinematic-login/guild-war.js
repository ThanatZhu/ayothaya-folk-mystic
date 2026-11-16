// 0.95 weekly guild war: every Saturday 20:00–20:30 (Thai time) the moonlit mill becomes a siege ground. Players of
// different guilds can hit each other there, and the guild that breaks the guardian stone holds the mill until the
// stone falls again. Whoever holds it when time runs out owns the fort for the week (crown tag + war chest).
export const WAR={map:'moonlit-mill',name:'ป้อมโรงสี',day:6,hour:20,minutes:30,stone:{x:1,z:2,hp:20000,name:'ศิลาราชสีห์'},scale:.35,
 reward:{coins:5000,items:[{id:'break-guard',count:1},{id:'lek-lai',count:2}]}};
const WEEK=7*864e5,TH=7*36e5;
// Start of this week's war (ms, UTC) and whether it is running now. always=true (local tests) keeps it open.
export function warWindow(now,always=false){
 const t=new Date(now+TH),start=Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()-((t.getUTCDay()-WAR.day+7)%7),WAR.hour)-TH;
 const end=start+WAR.minutes*6e4,next=now<end?start:start+WEEK;
 if(always)return {active:true,startsAt:now,endsAt:Infinity,nextAt:now};
 return {active:now>=start&&now<end,startsAt:start,endsAt:end,nextAt:next};
}
export function warLabel(now){const n=new Date(warWindow(now).nextAt+TH);return `เสาร์ ${n.getUTCDate()}/${n.getUTCMonth()+1} · ${String(WAR.hour).padStart(2,'0')}:00–${String(WAR.hour).padStart(2,'0')}:${String(WAR.minutes).padStart(2,'0')} น.`;}

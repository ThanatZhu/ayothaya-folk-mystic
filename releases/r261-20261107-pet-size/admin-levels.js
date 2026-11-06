import {baseProgress,jobProgress,experienceOf,levelStart,levelGifts,migrateXp,XP_CURVE} from './experience.js';
import {composeMail,deliverMail} from './mailbox.js';

export function characterLevels(record){
 const raw=record.state?.traveler??{},xp=experienceOf(raw);
 if(record.xpCurve!==XP_CURVE)xp.baseXp=migrateXp(xp.baseXp,record.xpCurve??1);
 const base=baseProgress(xp),job=jobProgress(xp,record.character?.classId,record.character?.jobId);
 return {level:base.level,baseCap:99,jobLevel:job.level,jobCap:job.cap};
}
const jobStart=level=>{let xp=0;for(let l=1;l<level;l++)xp+=40+l*20;return xp;};

// Absolute targets make retries harmless. Only increases are applied; neither
// a replay nor a stale admin page can take earned levels/EXP away.
export function raiseCharacterLevels(record,{baseLevel,jobLevel}={}){
 if(!record?.character)throw Error('character-not-found');
 const before=characterLevels(record);
 if(baseLevel===undefined&&jobLevel===undefined)throw Error('bad-level');
 for(const [n,cap] of [[baseLevel,99],[jobLevel,before.jobCap]])if(n!==undefined&&(!Number.isInteger(n)||n<1||n>cap))throw Error('bad-level');
 const raw=record.state?.traveler??{},xp=experienceOf(raw);
 if(record.xpCurve!==XP_CURVE)xp.baseXp=migrateXp(xp.baseXp,record.xpCurve??1);
 const nextBase=Math.max(before.level,baseLevel??before.level),nextJob=Math.max(before.jobLevel,jobLevel??before.jobLevel);
 const nextXp={baseXp:Math.max(xp.baseXp,levelStart(nextBase)),jobXp:Math.max(xp.jobXp,jobStart(nextJob))};
 const event={base:nextXp.baseXp-xp.baseXp,job:nextXp.jobXp-xp.jobXp,baseFrom:before.level,baseLevel:nextBase,jobLevel:nextJob,baseUp:nextBase>before.level,jobUp:nextJob>before.jobLevel,levelGiftsGranted:true};
 if(!event.baseUp&&!event.jobUp)return {record,before,after:before,event,changed:false};
 const next=structuredClone(record);next.xpCurve=XP_CURVE;next.state={...next.state,traveler:{...raw,...nextXp}};
 const gifts=levelGifts(before.level,nextBase);
 if(gifts.length){
  const items=new Map();for(const g of gifts)for(const item of g.items)items.set(item.id,(items.get(item.id)??0)+item.count);
  const mail=composeMail({id:`admin-level-${record.rebirth??0}-${before.level}-${nextBase}`,title:'ของขวัญเลเวลจากทีมงาน',body:`ของขวัญตามระดับ Base Lv.${before.level+1}–${nextBase} ที่ทีมงานเพิ่มให้`,sender:'ทีมงานอโยธยา',attachments:{coins:gifts.reduce((n,g)=>n+g.coins,0),items:[...items].map(([id,count])=>({id,count}))}});
  next.mailbox=deliverMail(next.mailbox,mail).mailbox;
 }
 return {record:next,before,after:characterLevels(next),event,changed:true};
}

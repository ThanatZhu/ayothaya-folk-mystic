import {randomUUID} from 'node:crypto';
export function appendDashboardLog(logs,now,category,text,meta={}){
 logs.push({id:randomUUID(),time:now,category,text,meta});
 if(logs.length>250)logs.shift();
}
export const logJoin=(logs,now,name,ch,mapId)=>appendDashboardLog(logs,now,'join',`${name} เข้าสู่ แนล ${ch} (${mapId})`,{name,channel:ch,mapId});
export const logLeave=(logs,now,name,ch,mapId)=>appendDashboardLog(logs,now,'leave',`${name} ออกจาก แนล ${ch} (${mapId})`,{name,channel:ch,mapId});
export const logChannel=(logs,now,name,from,to,mapId)=>appendDashboardLog(logs,now,'channel',`${name} ย้ายจาก แนล ${from} ไป แนล ${to} (${mapId})`,{name,from,to,mapId});
export const logChat=(logs,now,ch,mapId,name,text)=>appendDashboardLog(logs,now,'chat',`[แนล ${ch} · ${mapId}] ${name}: ${text}`,{name,channel:ch,mapId});
export const logMvp=(logs,now,bossName,ch,mapId,winner)=>appendDashboardLog(logs,now,'mvp',`ปราบ MVP ${bossName} ที่ แนล ${ch} (${mapId})${winner?' โดย '+winner:''}`,{boss:bossName,winner:winner??null});
export const logTrade=(logs,now,a,b,ch)=>appendDashboardLog(logs,now,'trade',`${a} แลกเปลี่ยนไอเทมสำเร็จกับ ${b} (แนล ${ch})`,{a,b});
export const logMarket=(logs,now,buyer,seller,item,count,coins)=>appendDashboardLog(logs,now,'market',`${buyer} ซื้อ ${item} x${count} จากร้าน ${seller} (${coins} เบี้ย)`,{buyer,seller,item,count,coins});
export const logGuild=(logs,now,leader,guildName)=>appendDashboardLog(logs,now,'guild',`${leader} ก่อตั้งกิลด์ "${guildName}"`,{leader,guild:guildName});

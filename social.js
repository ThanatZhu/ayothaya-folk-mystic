// Friends, whisper and guild rules (0.47), shared by the realm server and the social window.
export const FRIEND_MAX=50,GUILD_MAX=30,GUILD_COST=3000,EMBLEMS=24;
export const SOCIAL_ERRORS={'whisper-offline':'ผู้เล่นคนนี้ไม่ได้ออนไลน์อยู่','friend-self':'เพิ่มตัวเองเป็นเพื่อนไม่ได้','friend-already':'เป็นเพื่อนกันอยู่แล้ว','friend-full':'รายชื่อเพื่อนเต็มแล้ว',
 'friend-none':'ไม่มีคำขอเป็นเพื่อนนี้','guild-name':'ชื่อกิลด์ต้องยาว 2–16 ตัวอักษร','guild-taken':'ชื่อกิลด์นี้มีคนใช้แล้ว','guild-already':'อยู่ในกิลด์อยู่แล้ว',
 'guild-none':'ยังไม่ได้อยู่ในกิลด์','guild-leader':'ต้องเป็นหัวหน้ากิลด์','guild-full':'กิลด์เต็มแล้ว','guild-target':'ผู้เล่นคนนี้อยู่ในกิลด์อื่นแล้ว','guild-invite':'ไม่มีคำเชิญเข้ากิลด์นี้'};
export const cleanName=s=>typeof s==='string'?s.normalize('NFC').replace(/[\u0000-\u001f<>]/g,'').trim():'';
export const validGuildName=s=>{const n=cleanName(s);return n.length>=2&&n.length<=16?n:null;};
export const validEmblem=n=>Number.isInteger(n)&&n>=1&&n<=EMBLEMS;
export function normalizeFriends(list){
 const out=[],seen=new Set();
 for(const f of Array.isArray(list)?list:[])if(typeof f?.key==='string'&&f.key.length<=160&&cleanName(f.name)&&!seen.has(f.key)&&out.length<FRIEND_MAX){seen.add(f.key);out.push({key:f.key,name:cleanName(f.name).slice(0,24)});}
 return out;
}

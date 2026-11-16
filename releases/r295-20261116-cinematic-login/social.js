// Friends, whisper and guild rules (0.47), shared by the realm server and the social window.
export const FRIEND_MAX=50,GUILD_MAX=30,GUILD_COST=3000,EMBLEMS=24;
export const GUILD_SEARCH_LIMIT=24,GUILD_APPLICATION_MAX=50,GUILD_APPLICATION_LIMIT=5,GUILD_APPLICATION_TTL=7*864e5;
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
// 1.01 guild progression: guild EXP (donations, members' kills, the daily goal), a treasury of เบี้ย the members
// donate to, ranks (leader / deputy / member), a notice board, upgrades that also appear in the guild hall, the
// pre-battle rite (a timed EXP blessing) and each guild's private hall (ทุ่งชุมพล). The realm server owns all of it.
export const GUILD_HALL='guild-hall',DEPUTY_MAX=3,NOTICE_MAX=120,DONATE_MIN=100,DONATE_MAX=1e6;
export const GUILD_LEVELS=[0,1000,3000,7000,15000,30000,55000,90000,140000,200000]; // EXP needed for Lv. 1..10
export const guildLevel=exp=>{let l=1;while(l<GUILD_LEVELS.length&&exp>=GUILD_LEVELS[l])l++;return l;};
export const GUILD_UPGRADES={
 flag:{name:'ธงชัยเฉลิมพล',text:'EXP จากมอนสเตอร์ +3% ต่อขั้น',costs:[5000,15000,40000],levels:[2,4,6],exp:.03},
 armory:{name:'โรงศัสตราวุธ',text:'เบี้ยที่ดรอป +5% ต่อขั้น',costs:[8000,20000,50000],levels:[3,5,7],coins:.05},
 stable:{name:'โรงช้างม้าศึก',text:'ที่นั่งสมาชิก +5 ต่อขั้น',costs:[10000,25000,60000],levels:[2,5,8],seats:5},
};
export const GUILD_RITE={name:'พิธีปลุกเสกก่อนออกศึก',cost:3000,minutes:60,exp:.1,level:3};
export const GUILD_GOAL={kills:200,exp:400,treasury:1000}; // per Thai day, shared by every member
export const guildSeats=g=>GUILD_MAX+GUILD_UPGRADES.stable.seats*(g?.upgrades?.stable??0);
export const cleanNotice=s=>typeof s==='string'?s.normalize('NFC').replace(/[\u0000-\u0009\u000b-\u001f<>]/g,'').trim().slice(0,NOTICE_MAX):'';
Object.assign(SOCIAL_ERRORS,{'guild-rank':'ยศไม่พอสำหรับคำสั่งนี้','guild-deputies':'มีรองหัวหน้าครบ '+DEPUTY_MAX+' คนแล้ว','guild-treasury':'คลังกิลด์มีเบี้ยไม่พอ',
 'guild-level':'ระดับกิลด์ยังไม่ถึง','guild-max':'อัปเกรดนี้สูงสุดแล้ว','guild-rite':'พิธีปลุกเสกยังมีผลอยู่','guild-hall':'เข้าได้เฉพาะสมาชิกกิลด์','guild-busy':'ออกจากสงคราม/ดวลก่อน'});
Object.assign(SOCIAL_ERRORS,{'guild-missing':'ไม่พบกิลด์นี้แล้ว','guild-applications-full':'กิลด์นี้มีคำขอเต็มแล้ว ลองใหม่ภายหลัง','guild-application-limit':'ส่งคำขอเข้ากิลด์ได้ครั้งละไม่เกิน 5 กิลด์','guild-application-missing':'คำขอนี้หมดอายุหรือถูกจัดการแล้ว'});

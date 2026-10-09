export const SERVERS=[{id:'server-1',name:'เซิร์ฟ 1',subtitle:'อยุธยา · ริมเจ้าพระยา'},{id:'server-2',name:'เซิร์ฟ 2',subtitle:'อยุธยา · แสงจันทร์'}];
export const ENTRY_KEY='ayothaya-entry-v1';
export const isServer=id=>SERVERS.some(s=>s.id===id);
export function guestKey(server){if(!isServer(server))throw new Error('invalid-server');return 'ayothaya-character-v1:'+server;}
export function character(input){
 const name=String(input.name||'').normalize('NFC').trim();
 if(!/^[\p{L}\p{M}\p{N} _-]{2,16}$/u.test(name))throw new Error('ชื่อใช้ตัวอักษร ตัวเลข ช่องว่าง _ หรือ - ความยาว 2–16 ตัว');
 if(!['male','female'].includes(input.gender))throw new Error('กรุณาเลือกชายหรือหญิง');
 if(input.classId!=='shaman')throw new Error('อาชีพนี้ยังไม่เปิดให้เล่น');
 return {name,gender:input.gender,classId:'shaman'};
}
export function validEntry(entry,owner,server){return !!entry&&entry.owner===owner&&entry.serverId===server&&isServer(server);}
export function initialSave(){return {schema:1,mapId:'ayutthaya',traveler:{version:5,hp:140,mp:100,kills:0,cooldowns:Array(10).fill(0)},position:{x:0,z:0},settings:{zoom:1.05,azimuth:.68,motion:true}};}
export function validateRecord(record,validateState){
 if(!record||!Number.isSafeInteger(record.revision)||record.revision<1)throw new Error('save-data');
 character(record.character);validateState(record.state);return record;
}

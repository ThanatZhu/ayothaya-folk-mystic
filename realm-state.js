import {validateAppearance} from './appearance-state.js';
import {jobFor,validateJob} from './advancement.js?v=73';
import {isClass} from './classes.js?v=73';
export const SERVERS=[{id:'server-1',name:'เซิร์ฟ 1',subtitle:'อยุธยา · ริมเจ้าพระยา'},{id:'server-2',name:'เซิร์ฟ 2',subtitle:'อยุธยา · แสงจันทร์'}];
export const CHARACTER_SLOTS=['slot-1','slot-2','slot-3','slot-4','slot-5'];
export const isSlot=id=>CHARACTER_SLOTS.includes(id);
export const ENTRY_KEY='ayothaya-entry-v1';
export const isServer=id=>SERVERS.some(s=>s.id===id);
export function guestKey(server){if(!isServer(server))throw new Error('invalid-server');return 'ayothaya-character-v1:'+server;}
export function character(input){
 const name=String(input.name||'').normalize('NFC').trim();
 if(!/^[\p{L}\p{M}\p{N} _-]{2,16}$/u.test(name))throw new Error('ชื่อใช้ตัวอักษร ตัวเลข ช่องว่าง _ หรือ - ความยาว 2–16 ตัว');
 if(!['male','female'].includes(input.gender))throw new Error('กรุณาเลือกชายหรือหญิง');
 if(!isClass(input.classId))throw new Error('อาชีพนี้ยังไม่เปิดให้เล่น');
 const result={name,gender:input.gender,classId:input.classId};
 if(input.appearance!==undefined)result.appearance=validateAppearance(input.appearance);
 if(input.jobId!==undefined){if(typeof input.jobId!=='string')throw new Error('invalid-job');jobFor(input.classId,input.jobId);result.jobId=input.jobId;}
 return result;
}
export function validEntry(entry,owner,server){return !!entry&&entry.owner===owner&&entry.serverId===server&&isServer(server)&&(!entry.slotId||isSlot(entry.slotId));}
export function initialSave(){return {schema:1,mapId:'ayutthaya',traveler:{version:5,hp:140,mp:100,kills:0,baseXp:0,jobXp:0,cooldowns:Array(10).fill(0)},position:{x:.5,z:36},settings:{zoom:1.05,azimuth:.68,motion:true}};}
export function validateRecord(record,validateState){
 if(!record||!Number.isSafeInteger(record.revision)||record.revision<1)throw new Error('save-data');
 character(record.character);validateState(record.state);return record;
}

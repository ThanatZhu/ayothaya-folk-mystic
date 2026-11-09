// Pure rules for the dungeon window (dungeon-ui.js): which buttons are on and why, in Thai.
import {DIFFICULTY,MAX_PARTY,canEnter} from './dungeons.js';
const COLOUR=['ฟ้า','เขียว','ม่วง','ส้ม','แดง'];
export const oddsText=difficulty=>(DIFFICULTY[difficulty]??DIFFICULTY.normal).grades.map(([g,p])=>COLOUR[g]+' '+Math.round(p*100)+'%').join(' · ');
const ERRORS={'dungeon-level':'เลเวลไม่ถึง','dungeon-busy':'ตอนนี้เข้าดันไม่ได้ · กำลังดวล เทรด หมดแรง หรืออยู่ในแมพพิเศษ','dungeon-not-leader':'หัวหน้าปาร์ตี้เป็นคนกดเข้า',
 'dungeon-cancelled':'ยกเลิกการเข้าดันแล้ว','dungeon-queued':'กำลังหาคนอยู่แล้ว','dungeon-party-full':'ปาร์ตี้ครบ 5 คนแล้ว · กดเข้าดันได้เลย','not-enough':'เศษไม่พอ',
 'dungeon-no-offer':'ข้อเสนอหมดเวลาแล้ว','dungeon-not-ready':'ยังเข้าดันไม่ได้'};
export const errorText=code=>ERRORS[code]??'เข้าดันไม่สำเร็จ';
export function dungeonActions({level=1,dungeon,party=null,selfId=null,online=true,queue=null,inRun=false}){
 const member=!!party?.members?.includes(selfId),leader=!member||party.leader===selfId,queued=queue?.state==='waiting'||queue?.state==='offer';
 const block=!online?'ต้องเข้าโหมดออนไลน์':inRun?'อยู่ในดันแล้ว':!canEnter(dungeon,level)?'เลเวลไม่ถึง':!leader?'หัวหน้าปาร์ตี้เป็นคนกดเข้า':null;
 const enter=queued?{on:false,reason:'กำลังหาคน'}:{on:!block,reason:block};
 const full=member&&party.members.length>=MAX_PARTY;
 const queueState=queued?{on:leader&&online,cancel:true,reason:null}:{on:!block&&!full,cancel:false,reason:block??(full?'ปาร์ตี้ครบแล้ว':null)};
 return {enter,queue:queueState};
}

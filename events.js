// Seasonal events (0.50): a date window (Thai calendar days) with an EXP rate and a token drop exchanged at เจ้าจุก.
// Weekends (Sat–Sun, Thai time) always give at least EXP ×1.25.
import {thaiDay} from './daily.js?v=01';
export const EVENTS=[
 {id:'loy-krathong-2026',name:'เทศกาลลอยกระทง',start:'2026-10-17',end:'2026-11-30',token:'event-token',drop:.06,exp:1.5,
  text:'มอนสเตอร์ดรอปเหรียญงานวัด · EXP ×1.5 · แลกของที่เจ้าจุกในเมืองหลวง'},
];
export const WEEKEND_EXP=1.25;
export const activeEvent=now=>{const d=thaiDay(now);return EVENTS.find(e=>d>=e.start&&d<=e.end)??null;};
export function expRate(now){const wd=new Date(now+7*3600e3).getUTCDay();return Math.max(activeEvent(now)?.exp??1,wd===0||wd===6?WEEKEND_EXP:1);}

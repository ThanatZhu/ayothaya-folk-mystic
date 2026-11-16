// Seasonal events (0.50): a date window (Thai calendar days) with an EXP rate and a token drop exchanged at เจ้าจุก.
// Weekends (Sat–Sun, Thai time) always give at least EXP ×1.25.
import {thaiDay} from './daily.js?v=01';
export const EVENTS=[
 {id:'loy-krathong-2026',name:'เทศกาลลอยกระทง',start:'2026-10-17',end:'2026-11-30',token:'event-token',drop:.06,exp:1.5,
  text:'มอนสเตอร์ดรอปเหรียญงานวัด · EXP ×1.5 · แลกของที่เจ้าจุกในเมืองหลวง'},
];
export const WEEKEND_EXP=1.25;
export const activeEvent=now=>{const d=thaiDay(now);return EVENTS.find(e=>d>=e.start&&d<=e.end)??null;};
// 0.64 field surge: every 20 minutes one field map gets 5 minutes of EXP x2 and double drops. Same clock offline and online.
export const SURGE_MAPS=['rice-fields','old-orchard','moonlit-mill','lotus-marsh'],SURGE_EVERY=20*60e3,SURGE_FOR=5*60e3;
export function surge(now){const slot=Math.floor(now/SURGE_EVERY),start=slot*SURGE_EVERY;return {slot,map:SURGE_MAPS[slot%SURGE_MAPS.length],active:now-start<SURGE_FOR,endsAt:start+SURGE_FOR,nextAt:start+SURGE_EVERY,nextMap:SURGE_MAPS[(slot+1)%SURGE_MAPS.length]};}
export const surgeOn=(now,mapId)=>{const s=surge(now);return s.active&&s.map===mapId;};
export function expRate(now,mapId=null){const wd=new Date(now+7*3600e3).getUTCDay();return Math.max(activeEvent(now)?.exp??1,wd===0||wd===6?WEEKEND_EXP:1)*(surgeOn(now,mapId)?2:1);}

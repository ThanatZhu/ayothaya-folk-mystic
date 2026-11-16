// CBT proposal only. Never use the preview UI or local progress to grant rewards.
import {PET_PRICE} from './pet-gacha.js';
export const CBT_EVENT=Object.freeze({id:'cbt-november-2026-preview',revision:2,status:'preview',startsAt:'2026-11-01T00:00:00+07:00',endsAt:null,claimEnabled:false,rankedQueueEnabled:false});
export const CBT_REBIRTH_TARGET=10;
export const CBT_REWARDS={
 rebirth:[{title:'รางวัลจุติครบขั้น',goldBars:1000,items:[{id:'break-guard',count:5},{id:'lek-lai',count:5}]}],
 power:[
  {rank:'1',title:'ค่าพลังอันดับหนึ่ง',goldBars:2000,items:[{id:'break-guard',count:10},{id:'lek-lai',count:10}]},
  {rank:'2',title:'ค่าพลังอันดับสอง',goldBars:1500,items:[{id:'break-guard',count:6},{id:'lek-lai',count:6}]},
  {rank:'3',title:'ค่าพลังอันดับสาม',goldBars:1000,items:[{id:'break-guard',count:3},{id:'lek-lai',count:3}]},
  {rank:'4–9',title:'ค่าพลังอันดับ 4–9',goldBars:500,items:[]}
 ],
 arena:[
  {rank:'1',title:'ลานประลองอันดับหนึ่ง',goldBars:2000,items:[{id:'break-guard',count:10},{id:'lek-lai',count:10}]},
  {rank:'2',title:'ลานประลองอันดับสอง',goldBars:1500,items:[{id:'break-guard',count:6},{id:'lek-lai',count:6}]},
  {rank:'3',title:'ลานประลองอันดับสาม',goldBars:1000,items:[{id:'break-guard',count:3},{id:'lek-lai',count:3}]},
  {rank:'4–9',title:'ลานประลองอันดับ 4–9',goldBars:500,items:[]}
 ]
};
export const CBT_IDEAS=[
 {id:'attendance',title:'ร่วมทดสอบครบ 7 วัน',goal:'เข้าเล่นอย่างน้อย 7 วันต่างกัน ไม่ต้องต่อเนื่อง',goldBars:500,items:[],why:'ให้ผู้เล่นทั่วไปมีเป้าหมาย โดยไม่ต้องแข่งกับคนเล่นทั้งวัน'},
 {id:'story',title:'นักสำรวจเรื่องราว',goal:'ผ่านเนื้อเรื่องบทแรก',goldBars:300,items:[],why:'ชวนให้ลองเควส แผนที่ และระบบที่ต้องทดสอบจริง'},
 {id:'bug',title:'ช่วยตรวจบั๊กที่ยืนยันแล้ว',goal:'ส่งบั๊กพร้อมขั้นตอนทำซ้ำ และทีมงานตรวจยืนยัน',goldBars:500,items:[],why:'เสนอให้รับครั้งเดียวต่อบัญชี ไม่ใช่ให้ซ้ำทุกข้อความที่ส่ง'}
];
export const CBT_ARENA_RULES=[
 'นับเฉพาะแมตช์ที่เซิร์ฟเวอร์จับคู่ผ่านปุ่มค้นหาคู่ประลอง',
 'การกดท้าดวลกันเอง ไม่นับคะแนนและไม่นับจำนวนแมตช์ CBT',
 'บัญชีเดียวกันเล่นเจอกันไม่รับคะแนน แม้เป็นคนละตัวละคร',
 'เสนอให้คู่เดิมนับคะแนนได้ 1 ครั้งต่อวัน และนับไม่เกิน 10 แมตช์ต่อวัน',
 'เสนอให้มีอย่างน้อย 10 แมตช์ที่ผ่านเกณฑ์ กับคู่แข่งต่างบัญชีอย่างน้อย 5 คน จึงรับสิทธิ์อันดับได้',
 'ชนะ +3 · เสมอ +1 · แพ้ +0 · แมตช์ต้องจบและผ่านการตรวจจากเซิร์ฟเวอร์',
 'ตรวจการยอมแพ้ซ้ำ แมตช์ผิดปกติ และการสลับบัญชีปั๊มคะแนนก่อนประกาศผล'
];
export const cbtRewardTier=rank=>Number.isInteger(rank)&&rank>=1&&rank<=9?(rank<=3?rank-1:3):null;
export const cbtRewardPulls=goldBars=>Math.floor(goldBars/PET_PRICE);
export const cbtPreviewProgress=value=>({current:Math.min(CBT_REBIRTH_TARGET,Math.max(0,Number.isFinite(value)?Math.trunc(value):0)),target:CBT_REBIRTH_TARGET,eligible:false,claimEnabled:false});
export const cbtEntryKey=entry=>`${CBT_EVENT.id}:r${CBT_EVENT.revision}:${entry?.owner??'guest'}:${entry?.serverId??'server-1'}:${entry?.slotId??'slot-1'}`;

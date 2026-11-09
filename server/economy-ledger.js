// In-game money books (owner 9 Nov 2026, like lumivaraonline's "Silver Flow"): every เบี้ย the game creates (sources) or
// destroys (sinks), per reason, per Thai day. Trades between players are not recorded: they only move coins around.
// The realm calls record(delta, reason) at each faucet and sink; the host saves toJSON() every few minutes and serves
// publicView() on /economy for the public explorer page (explorer.html).
// ponytail: the auction house's 3% sale tax is not booked yet (it is taken at settlement in auction code); the held total
// reads at most 2000 characters (store.listProfiles). Add both when the market or player count outgrows them.
import {thaiDay} from '../daily.js';
export const ECON_SOURCES={
 monster:{th:'ดรอปจากมอนสเตอร์',en:'Monster drops'},boss:{th:'รางวัลบอส',en:'Boss rewards'},npcSell:{th:'ขายของให้ NPC',en:'Sold to NPCs'},
 quest:{th:'รางวัลเควส',en:'Quest rewards'},daily:{th:'รางวัลล็อกอินรายวัน',en:'Daily login rewards'},bounty:{th:'ภารกิจรายวัน / รายสัปดาห์',en:'Daily and weekly tasks'},
 dungeon:{th:'ดันเจี้ยน',en:'Dungeons'},level:{th:'ของขวัญเลเวลอัป',en:'Level-up gifts'},album:{th:'รางวัลสมุดการ์ด',en:'Card album rewards'},starter:{th:'ของเริ่มต้นผู้เล่นใหม่',en:'Starter kits'},event:{th:'กิจกรรม',en:'Events'},mail:{th:'จดหมายจากระบบ',en:'System mail'},other:{th:'อื่นๆ',en:'Other'},
};
export const ECON_SINKS={
 npcBuy:{th:'ซื้อของจาก NPC',en:'Bought from NPCs'},refine:{th:'ค่าตีบวก',en:'Refine fees'},craft:{th:'ค่าคราฟ',en:'Crafting fees'},
 warp:{th:'ค่าวาร์ป',en:'Warp fares'},bag:{th:'ขยายกระเป๋า / คลัง',en:'Bag and storage'},card:{th:'ค่าถอดการ์ด',en:'Card removal'},
 hire:{th:'จ้างนักผจญภัย',en:'Hired adventurers'},reset:{th:'รีเซ็ตสเตตัส / สกิล',en:'Stat and skill resets'},
 marketFee:{th:'ค่าวางขายในตลาด',en:'Market listing fees'},marketTax:{th:'ภาษีตลาด',en:'Market sales tax'},guild:{th:'กิลด์',en:'Guilds'},
 rebirth:{th:'จุติ',en:'Rebirth'},other:{th:'อื่นๆ',en:'Other'},
};
export const GOLD_SOURCES={mail:{th:'แจกจากแอดมิน / จดหมาย',en:'Admin gifts / mail'},topup:{th:'เติมเงิน',en:'Top-ups'},other:{th:'อื่นๆ',en:'Other'}};
export const GOLD_SINKS={gacha:{th:'กาชา',en:'Gacha'},shop:{th:'ร้านค้า',en:'Item mall'},wipe:{th:'ล้างทองแท่ง',en:'Gold wipe'},marketTax:{th:'ภาษีตลาด',en:'Market sales tax'},other:{th:'อื่นๆ',en:'Other'}};
const KEEP_DAYS=30;
export function createLedger({now=()=>Date.now(),saved=null,sources=ECON_SOURCES,sinks=ECON_SINKS}={}){
 let books=Array.isArray(saved?.days)?saved.days.filter(d=>typeof d?.day==='string').map(d=>({day:d.day,in:{...d.in},out:{...d.out}})):[];
 let held=Number.isFinite(saved?.held)?saved.held:null,characters=Number.isFinite(saved?.characters)?saved.characters:null,heldAt=saved?.heldAt??null,pending=Number.isFinite(saved?.pending)?saved.pending:null;
 const ledger={dirty:false};
 function today(){const key=thaiDay(now());let d=books.at(-1);if(d?.day!==key){d={day:key,in:{},out:{}};books.push(d);books=books.slice(-KEEP_DAYS);}return d;}
 ledger.today=today;
 ledger.days=()=>books.map(d=>({day:d.day,in:{...d.in},out:{...d.out}}));
 ledger.record=(delta,reason)=>{
  const n=Math.round(Number(delta));if(!Number.isFinite(n)||n===0)return;
  const side=n>0?'in':'out',list=n>0?sources:sinks;if(!list[reason])throw Error('econ-reason');
  const d=today();d[side][reason]=(d[side][reason]??0)+Math.abs(n);ledger.dirty=true;
 };
 ledger.setHeld=(coins,count,pend=null)=>{if(Number.isFinite(coins))held=Math.round(coins);if(Number.isFinite(count))characters=count;if(Number.isFinite(pend))pending=Math.round(pend);heldAt=now();ledger.dirty=true;};
 ledger.markSaved=()=>{ledger.dirty=false;};
 ledger.toJSON=()=>({days:ledger.days(),held,characters,heldAt,pending});
 const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
 ledger.publicView=()=>({updatedAt:now(),held,characters,heldAt,pending,sources,sinks,
  days:books.map(d=>{const i=sum(d.in),o=sum(d.out);return {day:d.day,in:{...d.in},out:{...d.out},totalIn:i,totalOut:o,net:i-o};})});
 return ledger;
}

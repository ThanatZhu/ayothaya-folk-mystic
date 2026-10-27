import {STAT_RESET_ITEM} from './stat-reset-item.js';
import {spentStatPoints} from './character-stats.js';
import {iconStyle} from './bag-ui.js?v=stat-reset189';

const errors={'no-stat-reset':'ไม่มียันต์คืนวิถีในกระเป๋า','no-allocated-stats':'ยังไม่ได้ลงแต้มสถานะ','server-busy':'กำลังบันทึกรายการอื่น กรุณาลองใหม่','arena-busy':'ออกจากลานประลองก่อนรีเซ็ตสถานะ','rate-limit':'ส่งคำขอเร็วเกินไป รอสักครู่แล้วลองใหม่','not-connected':'เชื่อมต่อเกมออนไลน์ก่อนใช้ไอเท็ม'};
export function createStatResetUI({game,bagUI,stats,onOpen,resetOffline}){
 const dialog=document.createElement('dialog');dialog.id='stat-reset-window';dialog.setAttribute('aria-labelledby','stat-reset-title');
 dialog.innerHTML='<h2 id="stat-reset-title">ยันต์คืนวิถี</h2><i class="item-icon"></i><p>รีเซ็ต STR AGI VIT INT DEX LUK ที่ลงไว้เป็น 1 และคืนแต้มทั้งหมด</p><p>เก็บเลเวล อาชีพ โบนัสจุติ และอุปกรณ์ไว้ตามเดิม</p><strong class="stat-refund"></strong><p>ใช้ยันต์คืนวิถี 1 ชิ้นจากกระเป๋า</p><p class="stat-reset-message" role="status"></p><footer><button type="button" data-reset>ยืนยันรีเซ็ตสถานะ</button><button type="button" data-cancel>ยกเลิก</button></footer>';
 dialog.querySelector('.item-icon').style.cssText=iconStyle(STAT_RESET_ITEM);
 const style=document.createElement('style');style.textContent='#stat-reset-window{box-sizing:border-box;width:min(470px,92vw);max-height:90dvh;overflow:auto;padding:24px;background:#102d25;color:#f3dfa7;border:1px solid #c5a459;border-radius:12px;text-align:center}#stat-reset-window::backdrop{background:#000a}#stat-reset-window .item-icon{display:block;width:96px;height:96px;margin:0 auto}#stat-reset-window footer{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:18px}#stat-reset-window button{padding:12px 18px;border:1px solid #c5a459;border-radius:6px;background:#1c493b;color:#ffe4a1}#stat-reset-window button:disabled{opacity:.5}#status-stats [data-stat]{touch-action:none;user-select:none;-webkit-user-select:none}';
 document.head.append(style);(document.getElementById('game-shell')??document.body).append(dialog);
 let busy=false,pending=null;
 const message=dialog.querySelector('.stat-reset-message'),confirm=dialog.querySelector('[data-reset]'),cancel=dialog.querySelector('[data-cancel]');
 function update(){
  if(!dialog.open)return;
  const refund=spentStatPoints(stats());dialog.querySelector('.stat-refund').textContent='คืนแต้มสถานะ '+refund;
  confirm.disabled=busy||(!pending&&(!refund||!(bagUI.bag().items[STAT_RESET_ITEM]>0)));cancel.disabled=busy;
  confirm.textContent=busy?'กำลังบันทึก…':pending?'ตรวจสอบรายการเดิม':'ยืนยันรีเซ็ตสถานะ';
 }
 bagUI.onStatReset=()=>{onOpen();if(dialog.open)return;message.textContent='';dialog.showModal();update();};
 cancel.onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 confirm.onclick=async()=>{
  if(busy)return;onOpen();busy=true;pending??=crypto.randomUUID();message.textContent='';update();
  try{
   if(game.online){
    if(!game.world.petCommand)throw Error('not-connected');
    const r=await game.world.petCommand('statResetUse',{},pending);
    Object.assign(game.world,{bag:r.bag,petCollection:r.petCollection,stats:r.stats,statPoints:r.statPoints,derivedView:r.derived});
   }else{
    const bag=structuredClone(bagUI.bag());if(!(bag.items[STAT_RESET_ITEM]>0))throw Error('no-stat-reset');
    if(!spentStatPoints(stats()))throw Error('no-allocated-stats');
    if(--bag.items[STAT_RESET_ITEM]===0)delete bag.items[STAT_RESET_ITEM];resetOffline();bagUI.setLocal(bag);
   }
   pending=null;game.world.notice('รีเซ็ตสถานะแล้ว · คืนแต้มที่ลงไว้ทั้งหมด');dialog.close();bagUI.render();
  }catch(e){message.textContent=errors[e.message]??'ยังยืนยันผลไม่ได้ · ตรวจสอบรายการเดิมเพื่อไม่ใช้ไอเท็มซ้ำ';if(errors[e.message])pending=null;}
  finally{busy=false;update();}
 };
 return {get busy(){return busy||dialog.open;},update};
}

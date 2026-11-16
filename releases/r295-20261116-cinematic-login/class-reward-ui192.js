import {FAMILIES,setLines} from './gear-sets.js';
import {itemDef} from './items.js?v=class-reward192';
import {CLASS_REWARD_BOX,REWARD_BOX_TIER,familySetItemIds} from './class-reward-items192.js?v=farm211';
import {TIERS} from './gear-sets.js';
import {iconStyle} from './bag-ui.js?v=surfaces222';
import {paintedPanels} from './painted-panels.js';

const tips={pierce:'เจาะเกราะสำหรับรับมือศัตรูป้องกันสูง',exec:'เน้นโอกาสคริติคอลและความแรงคริติคอล',mantra:'ลดคูลดาวน์และประหยัด MP',wall:'เพิ่มความอึดและลดความเสียหาย',wind:'โจมตีและเคลื่อนที่คล่องตัว'};
const errors={'no-set-box':'ไม่มีกล่องยุทธภัณฑ์ในกระเป๋า','class-required':'เปลี่ยนอาชีพก่อนเลือกเซ็ต','bag-full':'กระเป๋าเต็ม · กล่องยังอยู่ กรุณาจัดช่องว่างก่อน','server-busy':'กำลังบันทึกรายการอื่น กรุณาลองใหม่','arena-busy':'ออกจากลานประลองก่อนเลือกเซ็ต','rate-limit':'ส่งคำขอเร็วเกินไป รอสักครู่แล้วลองใหม่','not-connected':'เชื่อมต่อเกมออนไลน์ก่อนใช้ไอเท็ม'};
export function createClassRewardUI({game,bagUI,account}){
 paintedPanels();const css=document.createElement('link');css.rel='stylesheet';css.href='class-reward192.css';document.head.append(css);
 const dialog=document.createElement('dialog');dialog.id='class-reward-window';dialog.setAttribute('aria-labelledby','class-reward-title');
 dialog.innerHTML=`<header><div><small>CLASS ADVANCEMENT REWARD</small><h2 id="class-reward-title">เลือกเซ็ตคู่กาย</h2></div><button type="button" data-close aria-label="ปิด">×</button></header>
 <section class="reward-intro"><img src="assets/class-reward192/weapon-choice-box.png" alt="กล่องยุทธภัณฑ์แดง"><div><b>รางวัลเปลี่ยนอาชีพ · ทั้งเซ็ตสีแดง <span data-lv>Lv.55</span></b><p>เลือก 1 จาก 5 สายเซ็ต · ได้อุปกรณ์ทั้งเซ็ตตรงอาชีพตนเอง</p><small>ร่วมโบนัสเซ็ตสายเดียวกัน · ต้องเลเวล 55 จึงสวมใส่ได้</small></div></section>
 <div class="reward-families" role="group" aria-label="เลือกสายเซ็ตอุปกรณ์"></div><section class="reward-preview" aria-live="polite"></section>
 <p class="reward-message" role="status"></p><footer><small>ใช้กล่อง 1 ใบ · รับอุปกรณ์ครบ 5 ชิ้น</small><button type="button" data-confirm>ยืนยันเลือกทั้งเซ็ต</button></footer>`;
 (document.getElementById('game-shell')??document.body).append(dialog);
 const $=s=>dialog.querySelector(s),character=()=>account?.character??{classId:game.world.profession.id,gender:'male'};
 const key='ayothaya-class-reward192:'+String(account?.owner??'guest')+':'+String(account?.serverId??'local')+':'+String(account?.slotId??'guest');
 // 0.123 two boxes: the Lv.25 one a job change pays now, and the Lv.55 one handed out before
 let selected=null,busy=false,pending=null,message='',box=CLASS_REWARD_BOX;try{const saved=JSON.parse(sessionStorage.getItem(key));if(FAMILIES.some(f=>f.key===saved?.family)&&typeof saved.id==='string'){pending=saved;selected=saved.family;box=REWARD_BOX_TIER[saved.box]?saved.box:CLASS_REWARD_BOX;}}catch{}
 const tier=()=>REWARD_BOX_TIER[box],lv=()=>TIERS[tier()-1];
 function remember(){try{if(pending)sessionStorage.setItem(key,JSON.stringify(pending));else sessionStorage.removeItem(key);}catch{}}
 function render(){
  const person=character(),online=game.online&&game.world.petCommand;
  $('.reward-families').innerHTML=FAMILIES.map(f=>{const id=familySetItemIds(f.key,person,tier())[2],it=itemDef(id);return `<button type="button" data-family="${f.key}" aria-pressed="${selected===f.key}" ${busy||pending||!it?'disabled':''}><i class="item-icon" style="${it?iconStyle(id):''}"></i><b>${f.name}</b><span>${tips[f.key]}</span></button>`;}).join('');
  const family=FAMILIES.find(f=>f.key===selected),ids=family?familySetItemIds(family.key,person,tier()):[],valid=ids.length===5&&ids.every(id=>itemDef(id));
  $('.reward-preview').innerHTML=valid?`<strong>${family.sets[tier()-1]} · Lv.${lv()}</strong><div class="reward-receive">${ids.map(id=>{const it=itemDef(id);return `<div title="${it.text}"><i class="item-icon" style="${iconStyle(id)}"></i><b>${it.name}</b></div>`;}).join('')}</div><small>โบนัสเมื่อสะสมเซ็ตเดียวกัน</small>${setLines(family.key,tier(),5).map(([text])=>`<small>${text}</small>`).join('')}`:'<p>เลือกสายเซ็ตเพื่อดูอุปกรณ์และโบนัส</p>';
  $('[data-lv]').textContent='Lv.'+lv();$('.reward-message').textContent=message||(!online?errors['not-connected']:'');
  $('[data-confirm]').disabled=busy||!valid||!online||(!pending&&!(bagUI.bag().items[box]>0));
  $('[data-confirm]').textContent=busy?'กำลังบันทึก…':pending?'ตรวจสอบรายการเดิม':'ยืนยันเลือกทั้งเซ็ต';$('[data-close]').disabled=busy;
  dialog.querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>{if(busy||pending)return;selected=b.dataset.family;message='';render();});
 }
 bagUI.onSetChoice=id=>{if(dialog.open)return;if(!pending&&REWARD_BOX_TIER[id])box=id;message='';dialog.showModal();render();};
 $('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 $('[data-confirm]').onclick=async()=>{
  if(busy||!selected)return;
  if(!game.online||!game.world.petCommand){message=errors['not-connected'];render();return;}
  pending??={id:crypto.randomUUID(),family:selected,box};remember();busy=true;message='';render();
  try{const r=await game.world.petCommand('classSetChoose',{family:pending.family,box:pending.box??CLASS_REWARD_BOX},pending.id);game.world.bag=r.bag;pending=null;remember();bagUI.render();game.world.notice('ได้รับเซ็ตสีแดง Lv.'+lv()+' ครบ 5 ชิ้นแล้ว · ตรวจดูในกระเป๋า');dialog.close();}
  catch(e){message=errors[e.message]??'ยังยืนยันผลไม่ได้ · ตรวจสอบรายการเดิมเพื่อไม่ใช้กล่องซ้ำ';if(errors[e.message]){pending=null;remember();}}
  finally{busy=false;if(dialog.open)render();}
 };
 return {dialog};
}

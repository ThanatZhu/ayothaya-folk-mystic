import {installJadeSurfaces} from './jade-surfaces222.js?v=surfaces222';
import {CARD_REMOVAL_FEE,UTILITY_ERRORS,extractCard,sellBatch,quoteSale,valuableItem} from './farm-utility221.js?v=surfaces222';
import {itemDef,ITEM_ERRORS} from './items.js';import {cardArt} from './card-slot-ui.js';import {openHudPanel} from './hud-panels.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function loadFarmStyles(){installJadeSurfaces();if(document.getElementById('farm-qol-style'))return;const l=document.createElement('link');l.id='farm-qol-style';l.rel='stylesheet';l.href='farm-qol221.css?v=surfaces222-tip1';document.head.append(l);}
export function createFarmUtilityUI({game,bag,gear,applyLocal,itemIcon}){
 loadFarmStyles();const d=document.createElement('dialog');d.id='farm-utility-window';d.className='qol-window';d.setAttribute('aria-labelledby','farm-utility-title');
 d.innerHTML='<header><h2 id="farm-utility-title"></h2><button type="button" class="qol-close" aria-label="ปิดหน้าต่าง">×</button></header><div class="qol-body"></div><p class="qol-status" role="status"></p><footer class="qol-actions"><button type="button" class="qol-btn" data-qol-back>กลับ</button><button type="button" class="qol-btn qol-primary" data-qol-confirm></button></footer>';
 (document.getElementById('game-shell')??document.body).append(d);const $=s=>d.querySelector(s),choices=new Map();let mode,npc,slot,expected,includeRare=false,review=false,pending=null,message='',opener=null,connectionPoll=null;
 $('.qol-close').onclick=()=>d.close();const lines=()=>[...choices].filter(([,count])=>count>0).map(([id,count])=>({id,count})),errors={...ITEM_ERRORS,...UTILITY_ERRORS};
 function available(){return Object.keys(bag().items).filter(id=>itemDef(id)?.sell&&(includeRare||!valuableItem(id)));}
 function totals(){try{return quoteSale(bag(),lines());}catch{return 0;}}
 function render(){d.dataset.mode=mode;d.dataset.review=String(review);
  $('#farm-utility-title').textContent=mode==='card'?'ถอดการ์ดออกจากอุปกรณ์':'ขายหลายชิ้น';
  if(mode==='card'){const it=itemDef(expected),card=it?.card;$('.qol-body').innerHTML='<p>คืนการ์ดเต็มใบ · ค่าตีบวกและออปชั่นเดิมคงอยู่</p><h3>'+esc(it?.name)+'</h3><div class="qol-card-preview">'+cardArt(card)+'<div><strong>'+esc(itemDef(card)?.name)+'</strong><p>'+esc(itemDef(card)?.text)+'</p></div></div><p class="qol-total">ค่าถอด '+CARD_REMOVAL_FEE.toLocaleString('th-TH')+' เบี้ย</p><small>ในกระเป๋า '+bag().coins.toLocaleString('th-TH')+' เบี้ย</small>';}
  else if(review){$('.qol-body').innerHTML='<p>ตรวจรายการก่อนขาย · ขายแล้วนำของกลับคืนไม่ได้</p>'+lines().map(r=>'<div class="qol-review-line"><span>'+esc(itemDef(r.id).name)+' ×'+r.count+'</span><strong>'+(itemDef(r.id).sell*r.count).toLocaleString('th-TH')+' เบี้ย</strong></div>').join('')+'<p class="qol-total">รวม '+totals().toLocaleString('th-TH')+' เบี้ย</p>';}
  else{
   $('.qol-body').innerHTML='<div class="qol-toolbar"><button class="qol-btn" type="button" data-sale-all>เลือกทั้งหมดที่แสดง</button><button class="qol-btn" type="button" data-sale-clear>ล้างที่เลือก</button><label><input type="checkbox" data-sale-rare '+(includeRare?'checked':'')+'> รวมอุปกรณ์และของหายาก</label></div><small>ของหายากและอุปกรณ์จะไม่ถูกเลือกจนกว่าจะเปิดตัวเลือกด้านบน</small><div class="qol-sale-list">'+available().map(id=>'<div class="qol-sale-line" data-sale-id="'+esc(id)+'"><input type="checkbox" '+(choices.has(id)?'checked':'')+' aria-label="เลือก '+esc(itemDef(id).name)+'">'+itemIcon(id)+'<span><strong>'+esc(itemDef(id).name)+'</strong><small>มี '+bag().items[id]+' · ชิ้นละ '+itemDef(id).sell+' เบี้ย</small></span><input type="number" min="1" max="'+bag().items[id]+'" value="'+(choices.get(id)??bag().items[id])+'" aria-label="จำนวน '+esc(itemDef(id).name)+'"></div>').join('')+'</div><p class="qol-total" data-sale-total></p>';
   $('[data-sale-all]').onclick=()=>{for(const id of available())choices.set(id,bag().items[id]);render();};$('[data-sale-clear]').onclick=()=>{choices.clear();render();};$('[data-sale-rare]').onchange=e=>{includeRare=e.target.checked;if(!includeRare)for(const id of choices.keys())if(valuableItem(id))choices.delete(id);render();};
   for(const row of d.querySelectorAll('[data-sale-id]')){const id=row.dataset.saleId,check=row.querySelector('input[type=checkbox]'),qty=row.querySelector('input[type=number]');const change=()=>{const n=Math.max(1,Math.min(bag().items[id]??0,Math.floor(+qty.value)||1));qty.value=String(n);if(check.checked)choices.set(id,n);else choices.delete(id);update();};check.onchange=qty.onchange=change;}
  }update();
 }
 function update(){if(!d.open)return;const unsupported=game.online&&game.world.utilitySchema!==1,disconnected=game.online&&game.networkStatus!=='online';
  $('[data-qol-confirm]').textContent=pending?(pending.busy?'กำลังบันทึก…':'ตรวจสอบคำขอเดิม'):mode==='card'?'ยืนยันถอดการ์ด':review?'ยืนยันขาย':'ตรวจรายการขาย';
  $('[data-qol-confirm]').disabled=!!pending?.busy||unsupported||disconnected||(!pending&&(mode==='card'?gear()[slot]!==expected||bag().coins<CARD_REMOVAL_FEE:!lines().length));
  $('[data-qol-back]').disabled=!!pending;$('[data-qol-back]').textContent=review&&!pending?'แก้รายการ':'กลับ';$('.qol-status').textContent=disconnected?'รอเชื่อมต่อเพื่อยืนยันรายการ':unsupported?'เซิร์ฟเวอร์ยังไม่รองรับรายการนี้':message;
  const total=$('[data-sale-total]');if(total)total.textContent='เลือก '+lines().length+' รายการ · รวม '+totals().toLocaleString('th-TH')+' เบี้ย';
  for(const input of d.querySelectorAll('.qol-body input,.qol-body button'))input.disabled=!!pending;
 }
 $('[data-qol-back]').onclick=()=>{if(review){review=false;message='';render();}else d.close();};
 $('[data-qol-confirm]').onclick=async()=>{if($('[data-qol-confirm]').disabled)return;
  if(mode==='sale'&&!review&&!pending){try{quoteSale(bag(),lines());review=true;message='';render();}catch(e){message=errors[e.message]??e.message;update();}return;}
  try{pending??={id:crypto.randomUUID(),type:mode==='card'?'cardRemove':'sellBatch',data:mode==='card'?{slot,expected,quoted:CARD_REMOVAL_FEE}:{npc,lines:lines(),quoted:quoteSale(bag(),lines())}};pending.busy=true;update();
   if(game.online)await game.world.utilityCommand(pending.type,pending.data,pending.id);
   else{const r=mode==='card'?extractCard(bag(),gear(),slot,expected):sellBatch(bag(),pending.data.lines,pending.data.quoted);applyLocal(r);}
   pending=null;message=mode==='card'?'ถอดการ์ดและคืนเข้ากระเป๋าแล้ว':'ขายรายการที่เลือกเรียบร้อยแล้ว';game.world.notice(message);d.close();
  }catch(e){message=errors[e.message]??'ยังยืนยันผลไม่ได้ · กดตรวจสอบคำขอเดิม';if(['no-item','no-card','no-coins','bag-full','gear-changed','card-price-changed','sale-changed','empty-sale','shop-too-far','coin-cap','bad-count','not-sellable','defeated'].includes(e.message)){pending=null;review=false;choices.clear();render();}}
  finally{if(pending)pending.busy=false;update();}
 };
 d.addEventListener('close',()=>{clearInterval(connectionPoll);connectionPoll=null;if(opener?.isConnected)opener.focus({preventScroll:true});});
 return {card(next,button){if(!pending){mode='card';slot=next;expected=gear()[slot];opener=button;review=false;message='';}openHudPanel(d);connectionPoll??=setInterval(update,300);render();},sale(next,button){if(!pending){mode='sale';npc=next;opener=button;review=false;message='';choices.clear();includeRare=false;}openHudPanel(d);render();},update};
}

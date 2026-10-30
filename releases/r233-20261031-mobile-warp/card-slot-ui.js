import{CARD_REMOVAL_FEE}from'./farm-utility221.js';
import {itemDef,ITEM_ERRORS} from './items.js?v=refine136';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Use the same authored card artwork and crop as the card album, at a consistent 3:4 size.
export function cardArt(id){const d=itemDef(id);if(!d||d.kind!=='card')return '';
 if(d.monsterCard)return `<img class="slot-card-art" src="assets/cards147/${escape(id.slice(5))}.webp" alt="" width="192" height="256" decoding="async">`;
 const x=(d.icon%6)*256+32,y=Math.floor(d.icon/6)*256;return `<svg class="slot-card-art${d.tint==='gold'?' slot-card-gold':''}" viewBox="${x} ${y} 192 256" aria-hidden="true"><image href="assets/cards45/cards.png" width="1536" height="1024"/></svg>`;
}
export function cardEffectText(id){const text=itemDef(id)?.text??'';return text.startsWith('ใส่ใน')?text.split(' · ').slice(1).join(' · '):text;}
export function createCardSlotUI({game,bag,gear,onInsert}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./card-slot-ui.css?v=cards156';document.head.append(css);
 const panel=document.createElement('dialog');panel.id='card-slot-window';panel.setAttribute('aria-labelledby','card-slot-title');
 panel.innerHTML='<header><div><small>AYOTHAYA · CARD ENCHANTMENT</small><h2 id="card-slot-title">ใส่การ์ดในอุปกรณ์</h2></div><button type="button" class="slot-card-close" aria-label="ปิดหน้าใส่การ์ด">×</button></header><div class="slot-card-weapon"><strong></strong><small>ช่องการ์ดว่าง 1 ช่อง</small></div><section class="slot-card-list" aria-label="การ์ดที่ใส่ได้"></section><section class="slot-card-review" aria-label="ยืนยันการ์ดที่เลือก" hidden></section><footer><span class="slot-card-note">เลือกการ์ดเพื่อดูรายละเอียดก่อนยืนยัน</span></footer>';
 (document.getElementById('game-shell')??document.body).append(panel);const list=panel.querySelector('.slot-card-list'),review=panel.querySelector('.slot-card-review'),weapon=panel.querySelector('.slot-card-weapon strong'),note=panel.querySelector('.slot-card-note');
 let slot=null,expected=null,selected=null,opener=null,shown='',sent=false;
 const available=()=>Object.entries(bag().items??{}).filter(([id,n])=>n>0&&itemDef(id)?.kind==='card'&&itemDef(id).slot===slot);
 function close(){if(panel.open)panel.close();}
 function valid(){const id=gear()[slot],worn=itemDef(id);return id===expected&&worn?.kind==='gear'&&worn.slots!==0&&!worn.card;}
 function pick(id){if(!valid())return update();if(!available().some(([c])=>c===id))return render(true);selected=id;sent=false;render(true);review.querySelector('[data-confirm-card]')?.focus();}
 function render(force=false){if(!panel.open)return;const cards=available(),sig=JSON.stringify([cards,selected]);if(!force&&sig===shown)return;shown=sig;
  weapon.textContent=itemDef(expected)?.name??'';list.hidden=!!selected;review.hidden=!selected;
  if(!selected){note.textContent='เลือกการ์ดเพื่อดูรายละเอียดก่อนยืนยัน';list.innerHTML=cards.length?cards.map(([id,n])=>{const d=itemDef(id);return `<article class="slot-card-row">${cardArt(id)}<div><strong>${escape(d.name)}</strong><p>${escape(cardEffectText(id))}</p><small>มี ${n} ใบ</small></div><button type="button" data-pick-card="${escape(id)}">เลือก</button></article>`;}).join(''):'<p class="slot-card-empty">ยังไม่มีการ์ดที่ใส่กับอุปกรณ์นี้ได้ในกระเป๋า</p>';
   list.querySelectorAll('[data-pick-card]').forEach(b=>b.onclick=()=>pick(b.dataset.pickCard));return;
  }
  const d=itemDef(selected);note.textContent='ใช้การ์ดจากกระเป๋า 1 ใบ · ถอดคืนได้ที่สถานะอุปกรณ์';review.innerHTML=`<div class="slot-card-selected">${cardArt(selected)}<div><h3>${escape(d.name)}</h3><p>${escape(cardEffectText(selected))}</p></div></div><p class="slot-card-permanent">ใช้การ์ด 1 ใบ · ถอดคืนเต็มใบได้ ค่าถอด ${CARD_REMOVAL_FEE.toLocaleString('th-TH')} เบี้ย</p><div class="slot-card-actions"><button type="button" data-card-back>เลือกใบอื่น</button><button type="button" data-confirm-card>ยืนยันใส่การ์ด</button></div>`;
  review.querySelector('[data-card-back]').onclick=()=>{selected=null;render(true);list.querySelector('[data-pick-card]')?.focus();};
  review.querySelector('[data-confirm-card]').onclick=()=>{if(sent)return;if(!valid())return update();if(!available().some(([id])=>id===selected)){selected=null;render(true);return;}
   sent=true;review.querySelector('[data-confirm-card]').disabled=true;
   // The existing server/offline insertion owns consumption and validation. No predicted success or inventory mutation here.
   if(onInsert(slot,selected)!==false)close();else{sent=false;review.querySelector('[data-confirm-card]').disabled=false;}
  };
 }
 function update(){if(!panel.open)return;if(!valid()){close();game.world.notice('อุปกรณ์เปลี่ยนแล้ว กรุณาเลือกการ์ดใหม่');return;}if(selected&&!available().some(([id])=>id===selected))selected=null;render();}
 panel.querySelector('.slot-card-close').onclick=close;panel.addEventListener('close',()=>{if(panel.open)return;selected=null;sent=false;game.clearInput();if(opener?.isConnected)opener.focus({preventScroll:true});else document.querySelector(`#status-gear [data-slotcard="${slot}"]`)?.focus({preventScroll:true});});
 return {open(nextSlot,button){slot=nextSlot;expected=gear()[slot];selected=null;sent=false;opener=button;shown='';const it=itemDef(expected);if(!it||it.slots===0||it.card){game.world.notice(ITEM_ERRORS[it?.card?'slot-full':'no-card-slot']);return;}game.clearInput();panel.showModal();render(true);panel.querySelector('[data-pick-card]')?.focus();},update,close};
}

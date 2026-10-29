import {ITEMS} from './items.js';
import {PREMIUM_PET_IDS} from './premium-pets.js';
import {iconStyle} from './bag-ui.js?v=surfaces222';
import {hasMailGift,canDeleteMail} from './mailbox.js?v=150';
import {paintedPanels} from './painted-panels.js?v=150';
import {openHudPanel} from './hud-panels.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const ERRORS={'bag-full':'กระเป๋าเต็ม กรุณาจัดกระเป๋าก่อนรับของ','coin-cap':'เบี้ยเต็ม กรุณาใช้หรือฝากเบี้ยก่อน','server-busy':'กำลังบันทึกหรือแลกเปลี่ยนอยู่ ลองอีกครั้ง','not-connected':'เชื่อมต่อเกมก่อนเปิดจดหมาย','mail-not-found':'ไม่พบจดหมายฉบับนี้','disconnected':'การเชื่อมต่อขาด กดใหม่ได้โดยไม่รับของซ้ำ','mailbox-full':'กล่องจดหมายเต็ม'};
export function createMailboxUI({game}){
 if(document.getElementById('menu-mail'))return {update(){}};
 const css=document.createElement('link');css.rel='stylesheet';css.href='mailbox-ui.css?v=150';document.head.append(css);paintedPanels();
 const menu=document.createElement('button');menu.type='button';menu.id='menu-mail';menu.setAttribute('aria-label','จดหมาย');menu.innerHTML='<i class="mail-symbol" aria-hidden="true"></i><span>จดหมาย</span><b class="mail-badge" hidden></b>';document.getElementById('game-menu')?.append(menu);
 const dialog=document.createElement('dialog');dialog.id='mail-window';dialog.tabIndex=-1;dialog.setAttribute('aria-labelledby','mail-title');dialog.innerHTML='<header><h2 id="mail-title">จดหมาย</h2><button type="button" id="mail-refresh" class="mail-action">รีเฟรช</button><button type="button" id="mail-close" aria-label="ปิด">×</button></header><p id="mail-status" role="status"></p><div class="mail-layout"><nav id="mail-list" aria-label="รายการจดหมาย"></nav><article id="mail-detail"></article></div><footer class="mail-toolbar"><small>ลบเฉพาะฉบับที่อ่านแล้วและรับของครบแล้ว</small><button type="button" id="mail-delete-all" class="mail-action">ลบทั้งหมด</button><button type="button" id="mail-claim-all" class="mail-action">รับทั้งหมด</button></footer>';(document.getElementById('game-shell')??document.body).append(dialog);
 let rows=[],selected=null,busy=false,last=-1,status='';const $=id=>dialog.querySelector('#'+id);
 const badge=()=>{const n=game.world.mailbox?.unread??0,b=menu.querySelector('.mail-badge');b.hidden=!n;b.textContent=n>99?'99+':n;menu.title='จดหมาย'+(n?' · ยังไม่อ่าน '+n:'');};
 const attachments=m=>{const a=m.attachments;return `<div class="mail-attachments">${a.coins?`<span><i style="${iconStyle('cowrie')}"></i><b>${a.coins.toLocaleString()} เบี้ย</b></span>`:''}${a.goldBars?`<span><i class="mail-gold">▰</i><b>${a.goldBars.toLocaleString()} ทองแท่ง</b></span>`:''}${a.items.map(x=>`<span><i style="${iconStyle(x.id)}"></i><b>${esc(ITEMS[x.id]?.name??x.id)} ×${x.count}</b></span>`).join('')}${a.pets.map(id=>`<span><img src="assets/pets125/${id}.webp" alt=""><b>${esc(PREMIUM_PET_IDS[id].name)} ×1</b></span>`).join('')}</div>`;};
 function paint(){
  $('mail-status').textContent=status;$('mail-refresh').disabled=busy;
  $('mail-delete-all').disabled=busy||!rows.some(canDeleteMail);$('mail-claim-all').disabled=busy||!rows.some(m=>!m.broadcast&&!m.claimedAt&&hasMailGift(m.attachments));
  const m=rows.find(x=>x.id===selected);selected=m?.id??null;
  $('mail-list').innerHTML=rows.map(m=>`<button type="button" data-mail="${m.id}" data-broadcast="${m.broadcast}" aria-pressed="${selected===m.id}" ${busy?'disabled':''}><small>${m.broadcast?'ประกาศ':'จดหมายทีมงาน'}${!m.readAt?' · ใหม่':''}</small><strong>${esc(m.title)}</strong><span>${new Date(m.createdAt).toLocaleDateString('th-TH')} ${m.claimedAt?'· รับของแล้ว':hasMailGift(m.attachments)?'· มีของแนบ':''}</span></button>`).join('')||'<p>ยังไม่มีจดหมาย</p>';
  $('mail-detail').innerHTML=m?`<small>${esc(m.sender)}</small><h3>${esc(m.title)}</h3><p class="mail-body">${esc(m.body)}</p>${attachments(m)}${hasMailGift(m.attachments)?`<button type="button" id="mail-claim" ${busy||m.claimedAt?'disabled':''}>${m.claimedAt?'รับของแล้ว':'รับของแนบทั้งหมด'}</button><small class="mail-claim-note">ของที่รับจะเข้าตัวละครนี้ · สัตว์เลี้ยงตัวซ้ำเข้าคอลเลกชัน</small>`:''}`:rows.length?'<p>เลือกจดหมายเพื่ออ่านรายละเอียด</p>':'<p>ของแจกและประกาศจากทีมงานจะปรากฏที่นี่</p>';
  $('mail-list').querySelectorAll('[data-mail]').forEach(b=>b.onclick=()=>{selected=b.dataset.mail;const m=rows.find(x=>x.id===selected);if(m&&!m.readAt)request('mailRead',{mailId:m.id,broadcast:m.broadcast});else paint();});
  if($('mail-claim'))$('mail-claim').onclick=()=>request('mailClaim',{mailId:m.id,broadcast:m.broadcast});
 }
 async function request(type,data={}){
  if(busy)return;busy=true;status='กำลังโหลด…';paint();
  try{if(!game.online||!game.world.petCommand)throw Error('not-connected');const r=await game.world.petCommand(type,data);rows=r.mails;if(!rows.some(m=>m.id===selected))selected=type==='mailList'?rows[0]?.id??null:null;game.world.mailbox=r.summary;game.world.bag=r.bag;game.world.petCollection=r.petCollection;status=type==='mailClaim'?'รับของเรียบร้อยแล้ว':type==='mailClaimAll'?`รับแล้ว ${r.bulk.claimed} ฉบับ · ค้างรับ ${r.bulk.remaining} ฉบับ`:type==='mailDeleteAll'?`ลบแล้ว ${r.bulk.deleted} ฉบับ`:'';if(type==='mailClaimAll'&&r.bulk.remaining)status+=' · ของที่รับไม่ได้ยังอยู่ในจดหมาย';badge();}
  catch(e){status=ERRORS[e.message]??'ยังไม่สำเร็จ · '+e.message;}finally{busy=false;paint();}
  if(type==='mailList'){const m=rows.find(x=>x.id===selected)??rows[0];if(m&&!m.readAt){selected=m.id;await request('mailRead',{mailId:m.id,broadcast:m.broadcast});}}
 }
 menu.onclick=()=>{if(dialog.open)dialog.close();else{game.clearInput();openHudPanel(dialog);dialog.focus({preventScroll:true});request('mailList');}};$('mail-close').onclick=()=>dialog.close();$('mail-refresh').onclick=()=>request('mailList');$('mail-claim-all').onclick=()=>request('mailClaimAll');$('mail-delete-all').onclick=()=>request('mailDeleteAll');
 return {update(){const n=JSON.stringify(game.world.mailbox);if(last!==n){last=n;badge();}}};
}

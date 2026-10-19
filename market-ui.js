// Storage at ลุงเรือง, player trade and vending stalls (0.46). One window, five views.
// Online every move is a realm-server command; offline only storage works (kept in localStorage beside the bag).
import {ITEM_ERRORS,itemDef} from './items.js?v=70';
import {STORAGE_NPC,STORAGE_SLOTS,STALL_MAX,TRADABLE,normalizeStorage,moveOffer} from './market.js?v=70';
import {iconStyle} from './bag-ui.js?v=64';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
const coins=n=>icon('cowrie','item-icon small')+(n??0).toLocaleString('th-TH');
const TITLES={storage:'คลังเก็บของ · ลุงเรือง',pick:'แลกของกับผู้เล่น',ask:'คำขอแลกของ',trade:'แลกของ',stall:'ตั้งแผงขายของ',market:'ตลาด · แผงผู้เล่น'};

export function createMarketUI({game,map,account,bagUI}){
 if(!document.querySelector('link[data-market-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='market-ui.css?v=70';css.dataset.marketUi='';document.head.append(css);}
 const world=game.world,key='ayothaya-storage:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');
 let local;try{local=normalizeStorage(JSON.parse(localStorage.getItem(key)));}catch{local=normalizeStorage(null);}
 let remote=normalizeStorage(null),npc=null,view=null,trade=null,ask=null,players=[],stalls=[],shown='';
 const storage=()=>game.online?remote:local,cmd=(type,data)=>world.market?.(type,data),fail=code=>world.notice(ITEM_ERRORS[code]??code);

 const dialog=document.createElement('dialog');dialog.id='market-window';dialog.setAttribute('aria-labelledby','market-title');
 dialog.innerHTML='<header><h2 id="market-title"></h2><b class="coins" id="market-coins"></b><button class="mp-icon" id="market-close" aria-label="ปิดหน้าต่าง">×</button></header><div id="market-body"></div>';
 ($('game-shell')??document.body).append(dialog);
 const show=v=>{view=v;if(!dialog.open){game.clearInput();openHudPanel(dialog);}render(true);};
 dialog.querySelector('#market-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(trade)cmd('tradeCancel');if(ask)cmd('tradeAnswer',{from:ask.from,accept:false});ask=null;view=null;});

 // ลุงเรือง opens storage; the bag window gets the trade / stall / market buttons.
 bagUI.talkHooks.push(n=>{
  $('npc-storage')?.remove();if(n.name!==STORAGE_NPC)return;
  const b=document.createElement('button');b.id='npc-storage';b.type='button';b.innerHTML=icon('storage-chest','item-icon small')+' เปิดคลังเก็บของ';
  b.onclick=()=>{npc=n;$('close-npc').click();if(game.online)cmd('storageOpen',{npc:n.name});show('storage');};$('close-npc').before(b);
 });
 const bar=document.createElement('nav');bar.className='market-bar';
 bar.innerHTML=`<button type="button" data-go="pick">${icon('trade-hands','item-icon small')}แลกของ</button><button type="button" data-go="stall">${icon('stall-sign','item-icon small')}ตั้งแผง</button><button type="button" data-go="market">${icon('market-stalls','item-icon small')}ตลาด</button>`;
 $('bag-window')?.append(bar);
 bar.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{
  if(!game.online)return world.notice('แลกของและตั้งแผงต้องเข้าโหมดออนไลน์');
  const go=b.dataset.go;$('bag-window').close();
  if(go==='pick')cmd('tradeList');else if(go==='market')cmd('stallList');
  if(go==='stall'&&!map.safe)return fail('stall-city');
  show(go);
 });

 game.onEvent(e=>{
  if(e.type==='stored'){remote=normalizeStorage(e.storage);render(true);}
  if(e.type==='tradeAsk'){if(e.list){players=e.list;if(view==='pick')render(true);}else{ask={from:e.from,name:e.name};show('ask');}}
  if(e.type==='tradeState'){trade=e;ask=null;show('trade');}
  if(e.type==='tradeEnd'){trade=null;world.notice(e.reason);if(view==='trade')dialog.close();}
  if(e.type==='stalls'){stalls=e.list;render(true);}
  if(e.type==='stallSold')world.notice(`${e.buyer} ซื้อ ${itemDef(e.item)?.name} ×${e.count} จากแผง · +${e.coins} เบี้ย`);
 });

 function move(type,id,count){
  if(game.online)return cmd(type,{npc:STORAGE_NPC,item:id,count});
  const offer={coins:0,items:{[id]:count}};
  try{if(type==='store'){const [b,s]=moveOffer(bagUI.bag(),local,offer,{toCap:STORAGE_SLOTS});bagUI.setLocal(b);local=s;}
   else{const [s,b]=moveOffer(local,bagUI.bag(),offer,{fromCap:STORAGE_SLOTS});local=s;bagUI.setLocal(b);}
   localStorage.setItem(key,JSON.stringify(local));}catch(e){fail(e.message);}
  render(true);
 }
 const rows=(items,btns)=>Object.entries(items).map(([id,n])=>`<li data-id="${esc(id)}">${icon(id)}<div><strong>${esc(itemDef(id)?.name)}</strong><small>×${n}</small></div>${btns(id,n)}</li>`).join('')||'<li class="empty">— ว่าง —</li>';
 const offerView=o=>`<p>${coins(o.coins)}</p><ul class="market-list">${rows(o.items,()=>'')}</ul>`;
 const qty=max=>`<span class="qty"><button type="button" data-q="-1" aria-label="ลด">−</button><output>1</output><button type="button" data-q="1" aria-label="เพิ่ม" data-max="${max}">+</button></span>`;
 const wireQty=body=>body.querySelectorAll('.qty').forEach(q=>{const out=q.querySelector('output'),max=+q.querySelector('[data-max]').dataset.max;q.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{out.value=String(Math.min(max,Math.max(1,+out.value+ +b.dataset.q)));});});

 function render(force=false){
  if(!dialog.open)return;
  const bag=bagUI.bag(),sig=JSON.stringify([view,bag,storage(),trade,ask,players,stalls,world.myStall]);
  if(!force&&sig===shown)return;shown=sig;
  $('market-title').textContent=TITLES[view]??'';$('market-coins').innerHTML=coins(bag.coins);
  const body=$('market-body'),tradable=Object.fromEntries(Object.entries(bag.items).filter(([id])=>TRADABLE(id)));
  if(view==='storage'){
   body.innerHTML=`<div class="market-cols"><section><h3>กระเป๋า</h3><ul class="market-list">${rows(tradable,(id,n)=>`<button type="button" data-a="store" data-n="1">ฝาก 1</button>${n>1?`<button type="button" data-a="store" data-n="${n}">ทั้งหมด</button>`:''}`)}</ul></section>`+
    `<section><h3>คลัง <small>${Object.keys(storage().items).length}/${STORAGE_SLOTS}</small></h3><ul class="market-list">${rows(storage().items,(id,n)=>`<button type="button" data-a="retrieve" data-n="1">ถอน 1</button>${n>1?`<button type="button" data-a="retrieve" data-n="${n}">ทั้งหมด</button>`:''}`)}</ul></section></div>`;
   body.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>move(b.dataset.a,b.closest('li').dataset.id,+b.dataset.n));
  }
  if(view==='pick'){
   body.innerHTML=players.length?`<p class="market-note">เลือกผู้เล่นที่อยู่ใกล้ ๆ (ไม่เกิน 6 ก้าว)</p><ul class="market-list">${players.map(p=>`<li><div><strong>${esc(p.name)}</strong><small>${p.near?'อยู่ใกล้':'ไกลเกินไป'}</small></div><button type="button" data-id="${esc(p.id)}" ${p.near?'':'disabled'}>ขอแลกของ</button></li>`).join('')}</ul>`:'<p class="market-note">ยังไม่มีผู้เล่นอื่นในแผนที่นี้</p>';
   body.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{cmd('tradeRequest',{target:b.dataset.id});dialog.close();});
  }
  if(view==='ask'&&ask){
   body.innerHTML=`<p class="market-note"><b>${esc(ask.name)}</b> ขอแลกของกับคุณ</p><div class="market-actions"><button type="button" class="mp-primary" data-ok="1">ยอมรับ</button><button type="button" data-ok="">ปฏิเสธ</button></div>`;
   body.querySelectorAll('[data-ok]').forEach(b=>b.onclick=()=>{const a=ask;ask=null;cmd('tradeAnswer',{from:a.from,accept:!!b.dataset.ok});if(!b.dataset.ok)dialog.close();});
  }
  if(view==='trade'&&trade){
   const t=trade,mine=t.mine,edit=!t.myLock;
   body.innerHTML=`<div class="market-cols"><section class="${t.myLock?'locked':''}"><h3>ของเรา ${t.myLock?'🔒':''}${t.myOk?' ✔':''}</h3>${offerView(mine)}</section><section class="${t.theirLock?'locked':''}"><h3>ของ ${esc(t.partner.name)} ${t.theirLock?'🔒':''}${t.theirOk?' ✔':''}</h3>${offerView(t.theirs)}</section></div>`+
    (edit?`<h3>ใส่ของจากกระเป๋า</h3><label class="market-coin">เบี้ย <input type="number" min="0" max="${bag.coins}" value="${mine.coins}" id="trade-coins"></label><ul class="market-list">${rows(tradable,(id,n)=>`<button type="button" data-d="-1">−</button><output>${mine.items[id]??0}</output><button type="button" data-d="1" ${(mine.items[id]??0)>=n?'disabled':''}>+</button>`)}</ul>`:'')+
    `<div class="market-actions"><button type="button" data-t="tradeLock" ${t.myLock?'disabled':''}>ล็อกข้อเสนอ</button><button type="button" class="mp-primary" data-t="tradeConfirm" ${t.myLock&&t.theirLock&&!t.myOk?'':'disabled'}>ยืนยันแลก</button><button type="button" data-t="tradeCancel">ยกเลิก</button></div><p class="market-note">ทั้งสองฝ่ายต้องล็อก แล้วกดยืนยันทั้งคู่ ของจึงสลับกัน</p>`;
   const send=o=>cmd('tradeOffer',{offer:o});
   body.querySelector('#trade-coins')?.addEventListener('change',e=>send({...mine,coins:Math.max(0,Math.min(bag.coins,Math.floor(+e.target.value||0)))}));
   body.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const id=b.closest('li').dataset.id,items={...mine.items},n=Math.max(0,(items[id]??0)+ +b.dataset.d);if(n)items[id]=n;else delete items[id];send({...mine,items});});
   body.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>cmd(b.dataset.t));
  }
  if(view==='stall'){
   if(world.myStall){body.innerHTML=`<p class="market-note">${icon('stall-sign','item-icon small')}แผง <b>${esc(world.myStall)}</b> เปิดอยู่ · ยืนอยู่กับที่เพื่อขาย (เดินออกแผงจะปิด)</p><div class="market-actions"><button type="button" id="stall-close">ปิดแผง</button></div>`;body.querySelector('#stall-close').onclick=()=>cmd('stallClose');return;}
   body.innerHTML=`<label class="market-coin">ชื่อแผง <input id="stall-title" maxlength="24" placeholder="แผงขายของ"></label><p class="market-note">ติ๊กไอเทมที่จะขาย (สูงสุด ${STALL_MAX} ชนิด) แล้วตั้งราคาต่อชิ้น</p><ul class="market-list">${rows(tradable,(id,n)=>`<input type="checkbox" aria-label="ขาย"><input type="number" class="stall-count" min="1" max="${n}" value="${n}" aria-label="จำนวน"><input type="number" class="stall-price" min="1" value="${Math.max(1,(itemDef(id)?.sell??1)*2)}" aria-label="ราคา">`)}</ul><div class="market-actions"><button type="button" class="mp-primary" id="stall-open">เปิดแผง</button></div>`;
   body.querySelector('#stall-open').onclick=()=>{
    const items={};body.querySelectorAll('li[data-id]').forEach(li=>{if(li.querySelector('[type=checkbox]').checked)items[li.dataset.id]={count:Math.floor(+li.querySelector('.stall-count').value),price:Math.floor(+li.querySelector('.stall-price').value)};});
    if(!Object.keys(items).length)return world.notice('ติ๊กเลือกไอเทมที่จะขายก่อน');
    cmd('stallOpen',{stall:{title:body.querySelector('#stall-title').value.trim(),items}});
   };
  }
  if(view==='market'){
   const list=stalls;
   body.innerHTML=(list.length?list.map(s=>`<section class="market-stall"><h3>${icon('stall-sign','item-icon small')}${esc(s.title)} <small>· ${esc(s.name)}</small></h3><ul class="market-list">${Object.entries(s.items).map(([id,r])=>`<li data-owner="${esc(s.owner)}" data-id="${esc(id)}">${icon(id)}<div><strong>${esc(itemDef(id)?.name)}</strong><small>เหลือ ${r.count}</small></div><b>${r.price.toLocaleString('th-TH')} เบี้ย</b>${qty(r.count)}<button type="button" class="deal">ซื้อ</button></li>`).join('')}</ul></section>`).join(''):'<p class="market-note">ยังไม่มีใครตั้งแผงในแผนที่นี้</p>')+'<div class="market-actions"><button type="button" id="market-refresh">รีเฟรช</button></div>';
   wireQty(body);
   body.querySelectorAll('.deal').forEach(b=>b.onclick=()=>{const li=b.closest('li');cmd('stallBuy',{owner:li.dataset.owner,item:li.dataset.id,count:+li.querySelector('output').value});});
   body.querySelector('#market-refresh').onclick=()=>cmd('stallList');
  }
 }
 let stallShown=null; // the stall form is not re-rendered while typing, only when the stall opens or closes
 return {update(){
  if(view==='storage'&&npc&&Math.hypot(world.player.x-npc.x,world.player.z-npc.z)>4.5)dialog.close();
  if(view!=='stall')render();else if(world.myStall!==stallShown){stallShown=world.myStall;render(true);}
 }};
}

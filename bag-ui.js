// Bag (กระเป๋า · B), NPC shops, two quick-use slots (Q / E) and loot notices.
// Online the realm server owns the bag (snapshots set world.bag); offline guests keep it in this browser.
import {activeEvent} from './events.js?v=01';
import {ITEMS,ITEM_ATLAS,ATLASES,BAG_SLOTS,SHOPS,ITEM_ERRORS,normalizeBag,addLoot,rollLoot,buy,sell,useItem,itemLabel,itemDef} from './items.js?v=04';
import {MONSTER_TYPES} from './combat-core.js?v=63';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const QUICK_KEY='ayothaya-quick-slots';

// 0.57 tier 3/4 gear reuses the tier-2 icon recoloured until painted art lands.
const TINTS={gold:'sepia(.55) saturate(2.4) hue-rotate(-10deg) brightness(1.12) drop-shadow(0 0 3px #ffd25a)',violet:'hue-rotate(215deg) saturate(1.7) brightness(1.05) drop-shadow(0 0 4px #c27bff)'};
export function iconStyle(id){
 const item=itemDef(id);if(!item)return '';
 return `background-image:url(${ATLASES[item.atlas]??ITEM_ATLAS});background-size:600% 400%;background-position:${item.icon%6*20}% ${Math.floor(item.icon/6)/3*100}%`+(TINTS[item.tint]?';filter:'+TINTS[item.tint]:'');
}
const icon=(id,cls='item-icon')=>`<i class="${cls}" style="${iconStyle(id)}" aria-hidden="true"></i>`;

export function createBagUI({game,worldUI,map,account}){
 if(!document.querySelector('link[data-bag-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='bag-ui.css?v=01';css.dataset.bagUi='';document.head.append(css);}
 const world=game.world,key='ayothaya-bag:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const read=()=>{try{return normalizeBag(JSON.parse(localStorage.getItem(key)));}catch{return normalizeBag(null);}};
 let local=read();
 const bag=()=>game.online?normalizeBag(world.bag):local;
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(local));}catch{}};
 const fail=code=>world.notice(ITEM_ERRORS[code]??code);
 function showLoot({coins=0,items=[],lost=[]}){
  const parts=[];if(items.length)parts.push('ได้รับ '+itemLabel(items));if(coins)parts.push('เบี้ย +'+coins);
  if(parts.length)world.notice(parts.join(' · '));
  if(lost.length)world.notice('กระเป๋าเต็ม · '+itemLabel(lost)+' หายไป');
 }
 function grantLocal(loot,at=null){const r=addLoot(local,loot);local=r.bag;save();showLoot({coins:r.coins,items:r.added,lost:r.lost});if(at&&r.added.length)world.emit('drop',{items:r.added,x:at.x,z:at.z});render();}
 game.onEvent(e=>{
  if(game.online){
   if(e.type==='loot'){showLoot(e);if(e.items?.length&&e.x!==null)world.emit('drop',{items:e.items,x:e.x,z:e.z});}
   if(e.type==='trade')world.notice((e.kind==='buy'?'ซื้อ ':'ขาย ')+itemLabel([{id:e.item,count:e.count}])+' · เหลือเบี้ย '+e.coins);
   return;
  }
  if(e.type==='defeat'){const mob=world.mobs.find(m=>m.id===e.id),id=mob&&MONSTER_TYPES[mob.type]?.id;if(id){const loot=rollLoot(id,Math.random,activeEvent(Date.now()));loot.coins=Math.round(loot.coins*(1+(world.derived?.coinPct??0)));grantLocal(loot,{x:e.x??mob.x,z:e.z??mob.z});}}
  if(e.type==='reward')grantLocal(e);
 });

 // Actions: one path for online (server command) and offline (shared rules applied here).
 function use(id){
  if(!id)return;
  if(game.online){world.useItem?.(id);return;}
  try{const r=useItem(local,id,world.player,world.status);local=r.bag;world.player.hp=r.hp;world.player.mp=r.mp;world.status=r.status;save();render();}catch(e){fail(e.message);}
 }
 function trade(type,npc,id,qty){
  if(game.online){world.trade?.(type,npc,id,qty);return;}
  try{local=type==='buy'?buy(local,npc,id,qty):sell(local,id,qty);save();world.notice((type==='buy'?'ซื้อ ':'ขาย ')+itemLabel([{id,count:qty}])+' · เหลือเบี้ย '+local.coins);render();}catch(e){fail(e.message);}
 }

 // Menu button (appended to the travel-journal menu) and the bag window.
 const menuButton=document.createElement('button');menuButton.id='menu-bag';menuButton.type='button';menuButton.title='กระเป๋า';menuButton.setAttribute('aria-label','กระเป๋า');
 menuButton.innerHTML='<i>'+icon('cloth-bag','item-icon menu-item-icon')+'</i><span>กระเป๋า</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menuButton,$('menu-players')??null);
 const dialog=document.createElement('dialog');dialog.id='bag-window';dialog.setAttribute('aria-labelledby','bag-title');
 dialog.innerHTML='<header><h2 id="bag-title">กระเป๋า</h2><b class="coins" id="bag-coins"></b><button class="mp-icon" id="bag-close" aria-label="ปิดกระเป๋า">×</button></header><div class="bag-grid" id="bag-grid"></div><section class="bag-detail" id="bag-detail"></section>';
 ($('game-shell')??document.body).append(dialog);
 const open=()=>{game.clearInput();openHudPanel(dialog);render(true);};
 menuButton.onclick=()=>dialog.open?dialog.close():open();
 dialog.querySelector('#bag-close').onclick=()=>dialog.close();
 let selected=null;

 // Quick slots: per-viewer convenience, so localStorage is fine.
 let quick=['hp-small','mp-small'];try{const q=JSON.parse(localStorage.getItem(QUICK_KEY));if(Array.isArray(q)&&q.length===2)quick=q.map(id=>itemDef(id)?.kind==='potion'?id:null);}catch{}
 const bar=document.createElement('div');bar.id='quick-slots';bar.innerHTML='<button type="button" id="quick-0"></button><button type="button" id="quick-1"></button>';document.body.append(bar);
 [0,1].forEach(i=>$('quick-'+i).onclick=()=>use(quick[i]));
 addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select')||document.querySelector('dialog:modal'))return;
  if(e.code==='KeyB'){e.preventDefault();menuButton.click();}
  if(e.code==='KeyQ')use(quick[0]);
  if(e.code==='KeyE')use(quick[1]);
 });

 // Shop: the NPC dialog gets a button; the shop window closes if the player walks away.
 const shopDialog=document.createElement('dialog');shopDialog.id='shop-window';shopDialog.setAttribute('aria-labelledby','shop-title');
 shopDialog.innerHTML='<header><h2 id="shop-title"></h2><b class="coins" id="shop-coins"></b><button class="mp-icon" id="shop-close" aria-label="ปิดร้าน">×</button></header><div class="shop-tabs" role="tablist"><button type="button" role="tab" data-tab="buy" aria-selected="true">ซื้อ</button><button type="button" role="tab" data-tab="sell" aria-selected="false">ขาย</button></div><ol class="shop-list" id="shop-list"></ol>';
 ($('game-shell')??document.body).append(shopDialog);
 let shopNpc=null,tab='buy';
 shopDialog.querySelector('#shop-close').onclick=()=>shopDialog.close();
 shopDialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render(true);});
 function openShop(n){shopNpc=n;tab='buy';$('close-npc').click();openHudPanel(shopDialog);render(true);}
 worldUI.afterTalk=n=>{
  $('npc-shop')?.remove();const shop=SHOPS[n.name];if(!shop||shop.mapId!==map.id)return;
  const b=document.createElement('button');b.id='npc-shop';b.type='button';b.innerHTML=icon('shop-sign','item-icon small')+' เปิดร้าน · ซื้อ / ขาย';b.onclick=()=>openShop(n);
  $('close-npc').before(b);
 };
 const talk=worldUI.afterTalk;worldUI.afterTalk=n=>{talk(n);for(const f of api.talkHooks)f(n);};

 // Status window hooks: it reads and writes the offline bag through here and handles 'สวมใส่'.
 const api={bag,setLocal(b){local=normalizeBag(b);save();render(true);},onWear:null,render:()=>render(true),talkHooks:[]};
 // World-map warp: shows the purse, and pays offline (online the realm server charges).
 worldUI.coins=()=>bag().coins;worldUI.payWarp=cost=>{if(local.coins<cost)return false;local={...local,coins:local.coins-cost};save();return true;};
 let shown='';
 function render(force=false){
  const b=bag(),sig=JSON.stringify([b,selected,quick,tab,shopNpc?.name,dialog.open,shopDialog.open]);
  if(!force&&sig===shown)return;shown=sig;
  // Quick slots
  [0,1].forEach(i=>{const id=quick[i],el=$('quick-'+i),n=id?b.items[id]??0:0;
   el.innerHTML=id?icon(id)+'<b>'+n+'</b><kbd>'+(i?'E':'Q')+'</kbd>':'<kbd>'+(i?'E':'Q')+'</kbd>';
   el.disabled=!id||!n;el.title=id?itemDef(id).name+' ('+(i?'E':'Q')+')':'ตั้งปุ่มลัดในกระเป๋า';el.setAttribute('aria-label',el.title);});
  if(dialog.open){
   $('bag-coins').innerHTML=icon('cowrie','item-icon small')+b.coins.toLocaleString('th-TH');
   const ids=Object.keys(b.items);if(selected&&!b.items[selected])selected=null;
   $('bag-grid').innerHTML=Array.from({length:BAG_SLOTS},(_,i)=>{const id=ids[i];return id?`<button type="button" class="slot r${itemDef(id).rarity??0}${id===selected?' on':''}" data-id="${id}" title="${itemDef(id).name}">${icon(id)}<b>${b.items[id]}</b></button>`:'<span class="slot empty"></span>';}).join('');
   $('bag-grid').querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>{selected=el.dataset.id;render(true);});
   const it=selected&&itemDef(selected);
   $('bag-detail').innerHTML=it?`${icon(selected,'item-icon big')}<div><strong class="r${it.rarity??0}">${it.name} ×${b.items[selected]}</strong><p>${it.text??''}</p><small>ขายได้ ${it.sell??0} เบี้ย</small><div class="bag-actions">${it.kind==='potion'?'<button type="button" data-act="use">ใช้</button><button type="button" data-act="q0">ปุ่มลัด Q</button><button type="button" data-act="q1">ปุ่มลัด E</button>':''}${it.kind==='gear'?'<button type="button" data-act="wear">สวมใส่</button>':''}${it.kind==='scroll'?'<button type="button" data-act="recall">จุดธูป · กลับเมือง</button>':''}${it.kind==='lure'?'<button type="button" data-act="tame">ล่อสัตว์ (เป้าที่เลือก)</button>':''}${it.kind==='egg'?'<button type="button" data-act="hatch">ฟักไข่</button>':''}${it.kind==='petfood'?'<button type="button" data-act="petFeed">ให้อาหารสัตว์เลี้ยง</button>':''}${it.kind==='card'?'<small>ใส่การ์ดได้ที่หน้า สถานะ (C) ในช่องอุปกรณ์ที่สวมอยู่</small>':''}</div></div>`:'<p class="bag-hint">แตะไอเทมเพื่อดูรายละเอียด · ของจากมอนสเตอร์เข้ากระเป๋าเอง · ขายได้ที่ร้านแม่บัวในเมือง</p>';
   $('bag-detail').querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>{const a=el.dataset.act;if(a==='use')use(selected);else if(a==='wear')api.onWear?.(selected);else if(['tame','hatch','petFeed'].includes(a))api.onPet?.(a,selected);else if(a==='recall'){if(worldUI.recall()&&!game.online){const b=normalizeBag(local);b.items[selected]--;if(!b.items[selected])delete b.items[selected];local=b;save();}}else{quick[+a[1]]=selected;try{localStorage.setItem(QUICK_KEY,JSON.stringify(quick));}catch{}render(true);}});
  }
  if(shopDialog.open&&shopNpc){
   const shop=SHOPS[shopNpc.name];$('shop-title').textContent=shop.title;$('shop-coins').innerHTML=icon('cowrie','item-icon small')+b.coins.toLocaleString('th-TH');
   shopDialog.querySelectorAll('[data-tab]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===tab)));
   const myClass=account?.character?.classId??world.profession.id;
   const rows=tab==='buy'?shop.stock.filter(id=>!itemDef(id).classes||itemDef(id).classes.includes(myClass)).map(id=>({id,price:shop.currency?itemDef(id).tokens:itemDef(id).buy,have:b.items[id]??0})):Object.keys(b.items).filter(id=>itemDef(id).sell).map(id=>({id,price:itemDef(id).sell,have:b.items[id]}));
   $('shop-list').innerHTML=rows.length?rows.map(r=>`<li data-id="${r.id}">${icon(r.id)}<div><strong>${itemDef(r.id).name}</strong><small>${tab==='buy'?itemDef(r.id).text+' · มี '+r.have:'มี '+r.have+' ชิ้น'}</small></div><b>${r.price} ${tab==='buy'&&shop.currency?'เหรียญ':'เบี้ย'}</b><span class="qty"><button type="button" data-q="-1" aria-label="ลด">−</button><output>1</output><button type="button" data-q="1" aria-label="เพิ่ม">+</button></span><button type="button" class="deal">${tab==='buy'?'ซื้อ':'ขาย'}</button></li>`).join(''):'<li class="empty">ยังไม่มีของที่ขายได้</li>';
   $('shop-list').querySelectorAll('li[data-id]').forEach(li=>{
    const out=li.querySelector('output'),id=li.dataset.id,max=tab==='buy'?99:b.items[id];
    li.querySelectorAll('[data-q]').forEach(q=>q.onclick=()=>{out.value=String(Math.min(max,Math.max(1,+out.value+ +q.dataset.q)));});
    li.querySelector('.deal').onclick=()=>trade(tab,shopNpc.name,id,+out.value);
   });
  }
 }
 render(true);
 api.update=()=>{
  if(shopDialog.open&&shopNpc&&Math.hypot(world.player.x-shopNpc.x,world.player.z-shopNpc.z)>4.5)shopDialog.close();
  render();
 };
 return api;
}

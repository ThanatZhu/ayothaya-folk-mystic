// Bag (กระเป๋า · B), NPC shops, two quick-use slots (Q / E) and loot notices.
// Online the realm server owns the bag (snapshots set world.bag); offline guests keep it in this browser.
import {activeEvent,surgeOn} from './events.js?v=64';
import {levelGifts} from './experience.js?v=105.3';
import {ITEMS,ITEM_ATLAS,ATLASES,BAG_SLOTS,BAG_MAX,BAG_STEP,bagCap,expandCost,expandBag,MAX_STACK,SHOPS,ITEM_ERRORS,normalizeBag,addLoot,rollLoot,buy,sell,discard,useItem,itemLabel,itemDef} from './items.js?v=107';
import {MONSTER_TYPES,LEADER,randomSpot} from './combat-core.js?v=role116';
import {openHudPanel} from './hud-panels.js?v=34';
import {pickPotion} from './auto-play.js';

const $=id=>document.getElementById(id);
const QUICK_KEY='ayothaya-quick-slots';
// 0.109.4 four quick slots (Q E Z X); potions, the wind wing and the recall incense can sit in them
const QUICK_KEYS=['Q','E','Z','X'],QUICK_IDX=[0,1,2,3],quickable=id=>['potion','wing','scroll'].includes(itemDef(id)?.kind);
// 0.83 bag tabs: item kinds per category ('all' shows everything).
const TABS=[['all','ทั้งหมด',null],['use','ใช้ได้',['potion','scroll','wing']],['gear','อุปกรณ์',['gear']],['card','การ์ด',['card']],['loot','วัตถุดิบ',['loot']],['pet','สัตว์เลี้ยง',['lure','egg','petfood']]];
const GEAR_PLACES=[['head','หมวก'],['weapon','อาวุธ'],['accessory','เครื่องประดับ'],['armor','เสื้อเกราะ'],['garment','ผ้าคลุม'],['shoes','รองเท้า']]; // left column, then right

// 0.57 tier 3/4 gear reuses the tier-2 icon recoloured until painted art lands.
const TINTS={wind:'hue-rotate(95deg) saturate(1.5) brightness(1.15) drop-shadow(0 0 4px #8ff5d0)',gold:'sepia(.55) saturate(2.4) hue-rotate(-10deg) brightness(1.12) drop-shadow(0 0 3px #ffd25a)',violet:'hue-rotate(215deg) saturate(1.7) brightness(1.05) drop-shadow(0 0 4px #c27bff)'};
// 0.107 sheets that may not be painted yet: until one loads, its items (`ph`) show their stand-in cell, tagged --ph so
// icons already on screen swap to the painted cell once it arrives.
const loaded={};if(typeof Image==='function')for(const k of new Set(Object.values(ITEMS).filter(it=>it.ph).map(it=>it.atlas))){const im=new Image();im.onload=()=>{loaded[k]=true;
 for(const el of document.querySelectorAll('[style*="--ph:"]'))el.style.cssText=iconStyle(el.style.getPropertyValue('--ph').trim().slice(1,-1));};im.src=ATLASES[k];}
export function iconStyle(id){
 const def=itemDef(id);if(!def)return '';
 const ph=def.ph&&!loaded[def.atlas],item=ph?{...def,...def.ph}:def;
 return `background-image:url(${ATLASES[item.atlas]??ITEM_ATLAS});background-size:600% 400%;background-position:${item.icon%6*20}% ${Math.floor(item.icon/6)/3*100}%`+(TINTS[item.tint]?';filter:'+TINTS[item.tint]:'')+(ph?`;--ph:'${id}'`:'');
}
const icon=(id,cls='item-icon')=>`<i class="${cls}" style="${iconStyle(id)}" aria-hidden="true"></i>`;

export function createBagUI({game,worldUI,map,account,equipmentUI=null}){
 if(!document.querySelector('link[data-bag-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='bag-ui.css?v=110.4';css.dataset.bagUi='';document.head.append(css);}
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
  if(e.type==='defeat'){const mob=world.mobs.find(m=>m.id===e.id),id=mob&&MONSTER_TYPES[mob.type]?.id;if(id){const loot=rollLoot(id,Math.random,activeEvent(Date.now()),(mob.leader?LEADER.loot:1)*(surgeOn(Date.now(),map.id)?2:1));loot.coins=Math.round(loot.coins*(1+(world.derived?.coinPct??0)));grantLocal(loot,{x:e.x??mob.x,z:e.z??mob.z});}}
  if(e.type==='reward')grantLocal(e);
  if(e.type==='experience'&&e.baseUp)for(const g of levelGifts(e.baseFrom,e.baseLevel)){world.notice(`ของขวัญ Lv.${g.level} · ${g.text}`);grantLocal({coins:g.coins,items:g.items.map(i=>({...i}))});} // 0.64 offline level gifts
 });

 // Actions: one path for online (server command) and offline (shared rules applied here).
 function use(id){
  if(!id)return;
  if(game.online){world.useItem?.(id);return;}
  if(itemDef(id)?.kind==='wing'){const spot=!world.safe&&!map.instance&&!map.guildHall&&(local.items[id]??0)>0?randomSpot(world.nav):null; // offline: same rule as the server
   if(!spot){fail(map.instance||map.guildHall?'wing-blocked':'not-usable');return;}
   const b=normalizeBag(local);b.items[id]--;if(!b.items[id])delete b.items[id];local=b;Object.assign(world.player,spot);world.path=[];world.notice('ปีกเหินลมพาวาร์ปไปจุดใหม่');save();render();return;}
  try{const r=useItem(local,id,world.player,world.status);local=r.bag;world.player.hp=r.hp;world.player.mp=r.mp;world.status=r.status;if(r.food){world.food=r.food;world.notice('อิ่มอร่อย · '+itemDef(id).text);}save();render();}catch(e){fail(e.message);}
 }
 // quick slots: the incense recalls like its bag button, everything else is used
 function quickUse(id){if(!id)return;if(itemDef(id)?.kind!=='scroll'){use(id);return;}if(worldUI.recall()&&!game.online){const b=normalizeBag(local);b.items[id]--;if(!b.items[id])delete b.items[id];local=b;save();render();}}
 function trade(type,npc,id,qty){
  if(game.online){world.trade?.(type,npc,id,qty);return;}
  try{local=type==='buy'?buy(local,npc,id,qty):sell(local,id,qty);save();world.emit('storyDo',{action:'shop'});world.notice((type==='buy'?'ซื้อ ':'ขาย ')+itemLabel([{id,count:qty}])+' · เหลือเบี้ย '+local.coins);render();}catch(e){fail(e.message);}
 }

 // Menu button (appended to the travel-journal menu) and the bag window.
 const menuButton=document.createElement('button');menuButton.id='menu-bag';menuButton.type='button';menuButton.title='กระเป๋า';menuButton.setAttribute('aria-label','กระเป๋า');
 menuButton.innerHTML='<i>'+icon('cloth-bag','item-icon menu-item-icon')+'</i><span>กระเป๋า</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menuButton,$('menu-players')??null);
 const dialog=document.createElement('dialog');dialog.id='bag-window';dialog.setAttribute('aria-labelledby','bag-title');
 // 0.83 owner layout: the dressed character with the worn gear around it on the left, items by category on the right.
 dialog.innerHTML='<header><h2 id="bag-title">กระเป๋า</h2><b class="coins" id="bag-coins"></b><button class="mp-icon" id="bag-close" aria-label="ปิดกระเป๋า">×</button></header>'+
  '<div class="bag-body"><section class="bag-hero"><div class="bag-stage"><canvas id="bag-hero" width="320" height="320" aria-label="ตัวละครพร้อมชุดที่สวมใส่"></canvas><div id="bag-gear"></div></div><button type="button" id="bag-look">เปลี่ยนรูปลักษณ์</button></section>'+
  '<section class="bag-items"><div class="bag-tabs" role="tablist" id="bag-tabs"></div><small id="bag-space"></small><div class="bag-grid" id="bag-grid"></div><div class="bag-trash" id="bag-trash">🗑 ลากไอเทมมาวางที่นี่ (หรือนอกกระเป๋า) เพื่อทิ้ง</div><section class="bag-detail" id="bag-detail"></section></section></div>'+
  '<div class="bag-discard" id="bag-discard" role="dialog" aria-labelledby="discard-title" hidden><div><span id="discard-icon"></span><strong id="discard-title"></strong><label>จำนวนที่จะทิ้ง <input type="number" id="discard-count" min="1" step="1" inputmode="numeric"></label><small id="discard-have"></small><div class="bag-actions"><button type="button" id="discard-all">ทั้งหมด</button><button type="button" id="discard-ok" class="danger">ทิ้ง</button><button type="button" id="discard-cancel">ยกเลิก</button></div></div></div>';
 ($('game-shell')??document.body).append(dialog);
 const open=()=>{game.clearInput();openHudPanel(dialog);render(true);};
 menuButton.onclick=()=>dialog.open?dialog.close():open();
 dialog.querySelector('#bag-close').onclick=()=>dialog.close();
 dialog.querySelector('#bag-look').onclick=()=>{dialog.close();$('open-equipment')?.click();};
 let selected=null,category='all',worn=null; // worn = the gear slot picked on the character
 const tabs=dialog.querySelector('#bag-tabs');
 for(const [id,label] of TABS){const b=document.createElement('button');b.type='button';b.role='tab';b.dataset.cat=id;b.textContent=label;b.onclick=()=>{category=id;render(true);};tabs.append(b);}
 const heroCtx=dialog.querySelector('#bag-hero').getContext('2d');

 // Quick slots: per-viewer convenience, so localStorage is fine.
 let quick=['hp-small','mp-small',null,null];try{const q=JSON.parse(localStorage.getItem(QUICK_KEY));if(Array.isArray(q)&&q.length>=2&&q.length<=4)quick=QUICK_IDX.map(i=>quickable(q[i])?q[i]:null);}catch{}
 const bar=document.createElement('div');bar.id='quick-slots';bar.innerHTML=QUICK_IDX.map(i=>`<button type="button" id="quick-${i}"></button>`).join('');document.body.append(bar);
 QUICK_IDX.forEach(i=>$('quick-'+i).onclick=()=>quickUse(quick[i]));
 // 0.99.17 drag a potion from the bag onto the Q / E slot at the bottom (mouse or finger)
 let drag=null,dragged=false;
 const slotAt=(x,y)=>QUICK_IDX.find(i=>{const r=$('quick-'+i).getBoundingClientRect();return x>=r.left-10&&x<=r.right+10&&y>=r.top-10&&y<=r.bottom+10;});
 const marks=i=>{bar.classList.toggle('drop-ready',i!==null);QUICK_IDX.forEach(k=>$('quick-'+k).classList.toggle('drop-over',k===i));};
 // 0.100.10 any item can be dragged: onto the trash zone or out of the bag window asks how many to throw away.
 const inside=(el,x,y)=>{const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;};
 const toTrash=(x,y)=>inside($('bag-trash'),x,y)||!inside(dialog,x,y);
 function dragStart(e,id){if(e.button<=0)drag={id,x:e.clientX,y:e.clientY,pointer:e.pointerId,ghost:null,potion:quickable(id)};}
 addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;
  if(!drag.ghost){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8)return;drag.ghost=document.createElement('div');drag.ghost.className='bag-drag';drag.ghost.innerHTML=icon(drag.id,'item-icon big');dialog.append(drag.ghost);}
  e.preventDefault();drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';const i=drag.potion?slotAt(e.clientX,e.clientY):undefined;if(drag.potion)marks(i??-1);dialog.classList.add('dragging');$('bag-trash').classList.toggle('over',i===undefined&&toTrash(e.clientX,e.clientY));
 },{passive:false});
 function dragEnd(e){
  if(!drag||e.pointerId!==drag.pointer)return;const d=drag;drag=null;if(!d.ghost)return;
  d.ghost.remove();marks(null);dialog.classList.remove('dragging');$('bag-trash').classList.remove('over');dragged=true;setTimeout(()=>{dragged=false;},60);
  if(e.type!=='pointerup')return;
  const i=d.potion?slotAt(e.clientX,e.clientY):undefined;if(i===undefined){if(toTrash(e.clientX,e.clientY))askDiscard(d.id);return;}
  quick[i]=d.id;try{localStorage.setItem(QUICK_KEY,JSON.stringify(quick));}catch{}world.notice('ปุ่มลัด '+QUICK_KEYS[i]+' · '+itemDef(d.id).name);render(true);
 }
 addEventListener('pointerup',dragEnd);addEventListener('pointercancel',dragEnd);
 let discarding=null;
 const discardCount=()=>Math.min(bag().items[discarding]??0,Math.max(1,Math.floor(+$('discard-count').value)||1));
 function askDiscard(id){
  const have=bag().items[id]??0;if(!have)return;discarding=id;
  $('discard-icon').innerHTML=icon(id,'item-icon big');$('discard-title').textContent='ทิ้ง '+itemDef(id).name+' ?';$('discard-have').textContent='มี '+have+' ชิ้น';
  const n=$('discard-count');n.max=have;n.value='1';$('bag-discard').hidden=false;n.focus();n.select();
 }
 const closeDiscard=()=>{discarding=null;$('bag-discard').hidden=true;};
 function throwAway(){
  const id=discarding;if(!id)return;const n=discardCount();closeDiscard();if(!(bag().items[id]>0))return fail('no-item');
  if(game.online){world.discard?.(id,n);return;}
  try{local=discard(local,id,n);save();world.notice('ทิ้ง '+itemDef(id).name+' ×'+n+' แล้ว');render(true);}catch(e){fail(e.message);}
 }
 $('discard-all').onclick=()=>{$('discard-count').value=String(bag().items[discarding]??1);};
 $('discard-ok').onclick=throwAway;$('discard-cancel').onclick=closeDiscard;
 $('discard-count').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();throwAway();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeDiscard();}};
 dialog.addEventListener('close',closeDiscard);
 addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select')||document.querySelector('dialog:modal'))return;
  if(e.code==='KeyB'){e.preventDefault();menuButton.click();}
  const k=e.code.startsWith('Key')?QUICK_KEYS.indexOf(e.code.slice(3)):-1;if(k>=0)quickUse(quick[k]);
 });

 // Shop: the NPC dialog gets a button; the shop window closes if the player walks away.
 const shopDialog=document.createElement('dialog');shopDialog.id='shop-window';shopDialog.setAttribute('aria-labelledby','shop-title');
 shopDialog.innerHTML='<header><h2 id="shop-title"></h2><b class="coins" id="shop-coins"></b><button class="mp-icon" id="shop-close" aria-label="ปิดร้าน">×</button></header><div class="shop-tabs" role="tablist"><button type="button" role="tab" data-tab="buy" aria-selected="true">ซื้อ</button><button type="button" role="tab" data-tab="sell" aria-selected="false">ขาย</button></div><div class="shop-expand" id="shop-expand" hidden></div><ol class="shop-list" id="shop-list"></ol>';
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
  const b=bag(),gear=api.gearView?.()??{},sig=JSON.stringify([b,gear,selected,worn,category,quick,tab,shopNpc?.name,dialog.open,shopDialog.open]);
  if(!force&&sig===shown)return;shown=sig;
  // Quick slots
  QUICK_IDX.forEach(i=>{const id=quick[i],el=$('quick-'+i),n=id?b.items[id]??0:0,key=QUICK_KEYS[i];
   el.innerHTML=id?icon(id)+'<b>'+n+'</b><kbd>'+key+'</kbd>':'<kbd>'+key+'</kbd>';
   el.disabled=!id||!n;el.classList.toggle('empty',!id);el.title=id?itemDef(id).name+' ('+key+')':'ตั้งปุ่มลัดในกระเป๋า';el.setAttribute('aria-label',el.title);});
  if(dialog.open){
   $('bag-coins').innerHTML=icon('cowrie','item-icon small')+b.coins.toLocaleString('th-TH');
   const all=Object.keys(b.items),kinds=TABS.find(t=>t[0]===category)[2],ids=kinds?all.filter(id=>kinds.includes(itemDef(id)?.kind)):all;if(selected&&!b.items[selected])selected=null;
   tabs.querySelectorAll('[data-cat]').forEach(t=>{const k=TABS.find(x=>x[0]===t.dataset.cat)[2],n=k?all.filter(id=>k.includes(itemDef(id)?.kind)).length:all.length;t.setAttribute('aria-selected',String(t.dataset.cat===category));t.dataset.count=n;});
   $('bag-space').textContent=`ช่องที่ใช้ ${all.length} / ${bagCap(b)}`;
   $('bag-gear').innerHTML=GEAR_PLACES.map(([slot,label])=>{const id=gear[slot],it=id&&itemDef(id);return `<button type="button" class="gear-slot g-${slot}${worn===slot?' on':''}${it?' r'+(it.rarity??0):''}" data-gear="${slot}" title="${label}${it?' · '+it.name:''}">${it?icon(id):''}<small>${label}</small></button>`;}).join('');
   $('bag-gear').querySelectorAll('[data-gear]').forEach(el=>el.onclick=()=>{worn=el.dataset.gear;selected=null;render(true);});
   $('bag-grid').innerHTML=Array.from({length:Math.max(kinds?24:bagCap(b),Math.ceil(ids.length/6)*6)},(_,i)=>{const id=ids[i];return id?`<button type="button" class="slot r${itemDef(id).rarity??0}${id===selected?' on':''}${itemDef(id).kind==='potion'?' potion':''}" data-id="${id}" title="${itemDef(id).name}">${icon(id)}<b>${b.items[id]}</b></button>`:'<span class="slot empty"></span>';}).join('');
   $('bag-grid').querySelectorAll('[data-id]').forEach(el=>{el.onclick=()=>{if(dragged)return;selected=el.dataset.id;worn=null;render(true);};el.onpointerdown=e=>dragStart(e,el.dataset.id);});
   const wornId=worn&&gear[worn],wornIt=wornId&&itemDef(wornId);
   if(worn){$('bag-detail').innerHTML=wornIt?`${icon(wornId,'item-icon big')}<div><strong class="r${wornIt.rarity??0}">${wornIt.name}${wornIt.refine?' +'+wornIt.refine:''}</strong><p>${wornIt.text??''}</p>${wornIt.card?`<small>การ์ด: ${itemDef(wornIt.card)?.text??''}</small>`:''}<div class="bag-actions"><button type="button" data-act="off">ถอด</button><button type="button" data-act="status">ใส่การ์ด · หน้าสถานะ</button></div></div>`:`<p class="bag-hint">ช่อง${GEAR_PLACES.find(g=>g[0]===worn)[1]}ว่าง · แตะอุปกรณ์ในแท็บ อุปกรณ์ แล้วกด สวมใส่</p>`;
    $('bag-detail').querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>{if(el.dataset.act==='off'){api.onTakeOff?.(worn);}else{dialog.close();$('menu-status')?.click();}});}
   const it=!worn&&selected&&itemDef(selected);
   if(!worn)$('bag-detail').innerHTML=it?`${icon(selected,'item-icon big')}<div><strong class="r${it.rarity??0}">${it.name} ×${b.items[selected]}</strong><p>${it.text??''}</p><small>ขายได้ ${it.sell??0} เบี้ย</small><div class="bag-actions">${it.kind==='potion'||it.kind==='wing'?'<button type="button" data-act="use">'+(it.kind==='wing'?'ใช้ · วาร์ปสุ่ม':'ใช้')+'</button>':''}${quickable(selected)?QUICK_KEYS.map((k,i)=>'<button type="button" data-act="q'+i+'">'+'ปุ่มลัด '+k+'</button>').join(''):''}${it.kind==='gear'?'<button type="button" data-act="wear">สวมใส่</button>':''}${it.kind==='scroll'?'<button type="button" data-act="recall">จุดธูป · กลับเมือง</button>':''}${it.kind==='lure'?'<button type="button" data-act="tame">ล่อสัตว์ (เป้าที่เลือก)</button>':''}${it.kind==='egg'?'<button type="button" data-act="hatch">ฟักไข่</button>':''}${it.kind==='petfood'?'<button type="button" data-act="petFeed">ให้อาหารสัตว์เลี้ยง</button>':''}${it.kind==='card'?'<small>ใส่การ์ดได้ที่หน้า สถานะ (C) ในช่องอุปกรณ์ที่สวมอยู่</small>':''}<button type="button" data-act="discard" class="danger">ทิ้ง</button></div></div>`:'<p class="bag-hint">แตะไอเทมเพื่อดูรายละเอียด · ของจากมอนสเตอร์เข้ากระเป๋าเอง · ขายได้ที่ร้านแม่บัวในเมือง</p>';
   if(!worn)$('bag-detail').querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>{const a=el.dataset.act;if(a==='use')use(selected);else if(a==='discard')askDiscard(selected);else if(a==='wear')api.onWear?.(selected);else if(['tame','hatch','petFeed'].includes(a))api.onPet?.(a,selected);else if(a==='recall'){if(worldUI.recall()&&!game.online){const b=normalizeBag(local);b.items[selected]--;if(!b.items[selected])delete b.items[selected];local=b;save();}}else{quick[+a[1]]=selected;try{localStorage.setItem(QUICK_KEY,JSON.stringify(quick));}catch{}render(true);}});
  }
  if(shopDialog.open&&shopNpc){
   const shop=SHOPS[shopNpc.name];$('shop-title').textContent=shop.title;$('shop-coins').innerHTML=icon('cowrie','item-icon small')+b.coins.toLocaleString('th-TH');
   shopDialog.querySelectorAll('[data-tab]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===tab)));
   // 0.109.6 bag expansion at shops that offer it: +BAG_STEP slots for a price that rises each time, up to BAG_MAX
   {const box=$('shop-expand'),cost=expandCost(b),cap=bagCap(b);box.hidden=!shop.expand||tab!=='buy';if(box.hidden)box.innerHTML=''; // never keep another shop's button
    if(!box.hidden){box.innerHTML=cost===null?`<small>กระเป๋าขยายเต็มที่แล้ว · ${BAG_MAX} ช่อง</small>`:`<div><strong>ขยายกระเป๋า +${BAG_STEP} ช่อง</strong><small>${cap} → ${cap+BAG_STEP} ช่อง · สูงสุด ${BAG_MAX}</small></div><button type="button" class="deal"${b.coins<cost?' disabled':''}>${cost.toLocaleString('th-TH')} เบี้ย</button>${b.coins<cost?`<small class="short">เบี้ยไม่พอ · ขาดอีก ${(cost-b.coins).toLocaleString('th-TH')} เบี้ย</small>`:''}`;
     const btn=box.querySelector('button');if(btn)btn.onclick=()=>{if(game.online){world.market?.('bagExpand',{npc:shopNpc.name});return;}try{local=expandBag(local);save();world.emit('storyDo',{action:'shop'});world.notice('ขยายกระเป๋าแล้ว · '+local.slots+' ช่อง');render(true);}catch(e){fail(e.message);}};}}
   const myClass=account?.character?.classId??world.profession.id;
   const rows=tab==='buy'?shop.stock.filter(id=>!itemDef(id).classes||itemDef(id).classes.includes(myClass)).map(id=>({id,price:shop.currency?itemDef(id).tokens:itemDef(id).buy,have:b.items[id]??0})):Object.keys(b.items).filter(id=>itemDef(id).sell).map(id=>({id,price:itemDef(id).sell,have:b.items[id]}));
   $('shop-list').innerHTML=rows.length?rows.map(r=>`<li data-id="${r.id}">${icon(r.id)}<div><strong>${itemDef(r.id).name}</strong><small>${tab==='buy'?itemDef(r.id).text+' · มี '+r.have:'มี '+r.have+' ชิ้น'}</small></div><b>${r.price} ${tab==='buy'&&shop.currency?'เหรียญ':'เบี้ย'}</b><span class="qty"><button type="button" data-q="-1" aria-label="ลด">−</button><input type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="จำนวน"><button type="button" data-q="1" aria-label="เพิ่ม">+</button><small class="total"></small></span><button type="button" class="deal">${tab==='buy'?'ซื้อ':'ขาย'}</button></li>`).join(''):'<li class="empty">ยังไม่มีของที่ขายได้</li>';
   $('shop-list').querySelectorAll('li[data-id]').forEach((li,k)=>{
    const inp=li.querySelector('input'),total=li.querySelector('.total'),deal=li.querySelector('.deal'),{id,price,have}=rows[k],cur=tab==='buy'&&shop.currency;
    // 0.100.10 the most this row allows: buy = what the purse pays for and the bag holds; sell = what the bag holds.
    const funds=cur?b.items[shop.currency]??0:b.coins,room=have||Object.keys(b.items).length<bagCap(b)?MAX_STACK-have:0;
    const max=tab==='buy'?Math.min(room,Math.floor(funds/price)):have,n=()=>Math.min(max,Math.max(1,Math.floor(+inp.value)||1));
    const show=()=>{total.textContent=max<1?ITEM_ERRORS[room<1?'bag-full':cur?'no-tokens':'no-coins']:'รวม '+(n()*price).toLocaleString('th-TH')+(cur?' เหรียญ':' เบี้ย');};
    inp.max=String(Math.max(1,max));deal.disabled=max<1;inp.disabled=max<1;show();
    inp.oninput=()=>{if(+inp.value>max)inp.value=String(max);show();};inp.onchange=()=>{inp.value=String(n());show();};
    li.querySelectorAll('[data-q]').forEach(q=>q.onclick=()=>{inp.value=String(Math.min(max,Math.max(1,n()+ +q.dataset.q)));show();});
    inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();deal.click();}};
    deal.onclick=()=>{if(max>=1)trade(tab,shopNpc.name,id,n());};
   });
  }
 }
 render(true);
 let autoDrink=0;
 api.update=()=>{
  // 0.90 offline AUTO drinks potions under the thresholds set in the skill window (the server does this online).
  if(!game.online&&world.auto&&performance.now()-autoDrink>800){const id=pickPotion(local,world.player,world.autoConfig);if(id){autoDrink=performance.now();use(id);}}
  if(dialog.open)try{equipmentUI?.paint(heroCtx);}catch{} // a preview must never stop the game loop
  if(shopDialog.open&&shopNpc&&Math.hypot(world.player.x-shopNpc.x,world.player.z-shopNpc.z)>3.6)shopDialog.close();
  render();
 };
 return api;
}

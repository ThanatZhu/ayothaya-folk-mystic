import {PREMIUM_SHOP_PRODUCTS,SHOP_CATEGORIES,SHOP_COMING} from './premium-shop-catalog.js';
import {normalizePetAccount} from './pet-account.js';
import {itemDef} from './items.js';
import {iconStyle} from './bag-ui.js?v=surfaces222';
import {loadPaintedStanding} from './painted-character.js?v=podium153';

const errors={'no-gems':'ทองแท่งไม่พอ','bag-full':'กระเป๋าเต็ม · ยังไม่หักทอง กรุณาจัดช่องว่างก่อน','server-busy':'กำลังบันทึกรายการอื่น กรุณาลองใหม่','not-connected':'เชื่อมต่อเกมออนไลน์ก่อนซื้อสินค้า','rate-limit':'ส่งคำขอเร็วเกินไป รอสักครู่แล้วลองใหม่'};
const BADGES={new:'ใหม่',hot:'ขายดี',value:'คุ้ม'};
// Until the category and bundle art arrives, each category borrows one item icon from the game.
const HEART='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.1C.9 8.6 3 5 6.6 5c2.1 0 3.6 1.2 5.4 3.1C13.8 6.2 15.3 5 17.4 5 21 5 23.1 8.6 21.6 11.9 19.5 16.4 12 21 12 21z"/></svg>';
const CATEGORY_ICON={bundle:'treasure-chest',food:'khao-tom-mat',travel:'fly-wing',refine:'lek-lai',identity:'rename-card'},CATEGORY_GLYPH={featured:'★',favorite:HEART};
const FAVORITES='ayothaya-shop-favorites';
const productIcon=p=>iconStyle(p.items.length>1?'treasure-chest':p.item);
const loadFavorites=()=>{try{return new Set(JSON.parse(localStorage.getItem(FAVORITES))??[]);}catch{return new Set();}};

export function createPremiumShopPanel({game,dialog,account}){
 const root=document.createElement('section');root.className='premium-store-body shop-mall';dialog.append(root);
 const wallet=document.createElement('div');wallet.className='mall-wallet';wallet.innerHTML='<img src="assets/summon147/gold-bars.webp" alt=""><b></b><span>ทองแท่ง</span>';dialog.querySelector('.premium-close')?.before(wallet);
 root.innerHTML=`<aside class="mall-fit" aria-label="ห้องลองชุด"><h3>ห้องลองชุด</h3><div class="mall-stage"><canvas width="320" height="320" aria-hidden="true"></canvas><p class="mall-hero-name"></p></div><p class="mall-fit-note">ชุดแฟชั่นกำลังจะมา · ลองชุดได้ที่นี่</p></aside>
 <nav class="mall-cats" aria-label="หมวดสินค้า">${SHOP_CATEGORIES.map(c=>`<button type="button" data-cat="${c.id}" aria-pressed="false"><i aria-hidden="true" style="${CATEGORY_ICON[c.id]?iconStyle(CATEGORY_ICON[c.id]):''}">${CATEGORY_GLYPH[c.id]??''}</i>${c.name}</button>`).join('')}<hr>${SHOP_COMING.map(name=>`<button type="button" class="mall-soon" disabled><i aria-hidden="true"></i>${name}<em>เร็วๆ นี้</em></button>`).join('')}</nav>
 <div class="mall-main"><div class="mall-tools"><select aria-label="เรียงสินค้า"><option value="pick">แนะนำ</option><option value="low">ราคาต่ำ → สูง</option><option value="high">ราคาสูง → ต่ำ</option></select><input type="search" placeholder="ค้นหาสินค้า…" aria-label="ค้นหาสินค้า"></div>
 <div class="mall-grid" role="list"></div>
 <section class="mall-detail" aria-live="polite"><i class="mall-detail-icon" aria-hidden="true"></i><div class="mall-detail-copy"><h4></h4><p class="mall-detail-tip"></p><ul class="mall-contents"></ul><small class="mall-owned"></small></div>
 <div class="mall-buy"><div class="mall-qty"><button type="button" data-qty="-1" aria-label="ลดจำนวน">−</button><input type="number" inputmode="numeric" min="1" max="20" step="1" value="1" aria-label="จำนวนชุด"><button type="button" data-qty="1" aria-label="เพิ่มจำนวน">+</button></div><p class="mall-total"><strong></strong><span></span></p><div class="mall-actions"><button type="button" class="mall-fav-toggle" aria-pressed="false">♡ โปรด</button><button type="button" class="premium-confirm">ซื้อเลย</button></div></div></section></div>
 <p class="premium-shop-status" role="status"></p>`;
 const $=s=>root.querySelector(s),grid=$('.mall-grid'),favorites=loadFavorites();
 let category='featured',sort='pick',query='',selected=PREMIUM_SHOP_PRODUCTS.find(p=>p.featured),quantity=1,pending=null,busy=false,message='',signature='',listKey='';
 const balance=()=>normalizePetAccount(game.world.petCollection).balance;
 const saveFavorites=()=>{try{localStorage.setItem(FAVORITES,JSON.stringify([...favorites]));}catch{}};
 function visible(){
  const q=query.trim().toLowerCase(),list=PREMIUM_SHOP_PRODUCTS.filter(p=>q?(p.name+' '+p.tip).toLowerCase().includes(q):category==='featured'?p.featured:category==='favorite'?favorites.has(p.sku):p.category===category);
  return sort==='pick'?list:[...list].sort((a,b)=>sort==='low'?a.price-b.price:b.price-a.price);
 }
 function drawList(){
  const list=visible(),key=JSON.stringify([list.map(p=>p.sku),[...favorites]]);if(key===listKey)return;listKey=key;
  grid.replaceChildren(...list.map(p=>{const card=document.createElement('button');card.type='button';card.className='mall-card';card.role='listitem';card.dataset.product=p.sku;
   card.innerHTML=`${p.badge?`<span class="mall-badge" data-badge="${p.badge}">${BADGES[p.badge]}</span>`:''}${favorites.has(p.sku)?'<span class="mall-fav" aria-label="รายการโปรด">'+HEART+'</span>':''}<i class="item-icon" aria-hidden="true" style="${productIcon(p)}"></i><b>${p.name}</b><span class="mall-price"><img src="assets/summon147/gold-bars.webp" alt="">${p.price.toLocaleString()}</span>`;
   card.onclick=()=>{if(busy||pending)return;selected=p;quantity=1;message='';render(true);};return card;}));
  if(!list.length)grid.innerHTML=`<p class="mall-empty">${category==='favorite'&&!query?'ยังไม่มีรายการโปรด · กด ♡ โปรด ที่สินค้าที่ชอบ':'ไม่พบสินค้าที่ค้นหา'}</p>`;
 }
 function render(force=false){
  if(!dialog.open&&!force)return;
  const money=balance(),online=!!game.online&&!!game.world.petCommand,sig=JSON.stringify([money,game.world.bag?.items,selected?.sku,quantity,pending?.id,busy,message,online,category,sort,query,[...favorites]]);
  if(!force&&sig===signature)return;signature=sig;
  wallet.querySelector('b').textContent=money.toLocaleString();
  root.querySelectorAll('[data-cat]').forEach(b=>b.setAttribute('aria-pressed',String(!query&&b.dataset.cat===category)));
  drawList();grid.querySelectorAll('[data-product]').forEach(c=>c.setAttribute('aria-current',String(c.dataset.product===selected?.sku)));
  const p=selected,detail=$('.mall-detail');detail.hidden=!p;
  if(p){const total=p.price*quantity,bag=game.world.bag?.items??{};
   $('.mall-detail-icon').style.cssText=productIcon(p);$('.mall-detail h4').textContent=p.name;$('.mall-detail-tip').textContent=p.tip;
   $('.mall-contents').replaceChildren(...p.items.map(i=>{const li=document.createElement('li');li.innerHTML=`<i class="item-icon" aria-hidden="true" style="${iconStyle(i.id)}"></i>`;li.append(`${itemDef(i.id).name} ×${(i.count*quantity).toLocaleString()}`);return li;}));
   $('.mall-owned').textContent='ในกระเป๋า: '+p.items.map(i=>`${itemDef(i.id).name} ${(bag[i.id]??0).toLocaleString()}`).join(' · ');
   $('.mall-qty input').value=quantity;$('.mall-total strong').textContent=total.toLocaleString()+' ทองแท่ง';$('.mall-total span').textContent='คงเหลือ '+Math.max(0,money-total).toLocaleString();
   const fav=favorites.has(p.sku);$('.mall-fav-toggle').setAttribute('aria-pressed',String(fav));$('.mall-fav-toggle').textContent=(fav?'♥':'♡')+' โปรด';
   $('.premium-confirm').disabled=busy||!online||(!pending&&money<total);$('.premium-confirm').textContent=busy?'กำลังบันทึก…':pending?'ตรวจสอบรายการเดิม':money<total?'ทองแท่งไม่พอ':'ซื้อเลย';
   root.querySelectorAll('.mall-qty button,.mall-qty input').forEach(n=>n.disabled=busy||!!pending);}
  $('.premium-shop-status').textContent=message||(!online?errors['not-connected']:'เลือกสินค้า ตรวจจำนวนและยอดทองแท่ง แล้วกดซื้อ');
 }
 root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{category=b.dataset.cat;query='';$('.mall-tools input').value='';grid.scrollTop=0;render(true);});
 $('.mall-tools select').onchange=e=>{sort=e.target.value;render(true);};
 $('.mall-tools input').oninput=e=>{query=e.target.value;render(true);};
 function setQuantity(value){if(busy||pending)return;quantity=Math.max(1,Math.min(20,Math.trunc(Number(value))||1));render(true);}
 $('.mall-qty input').onchange=e=>setQuantity(e.target.value);root.querySelectorAll('[data-qty]').forEach(b=>b.onclick=()=>setQuantity(quantity+Number(b.dataset.qty)));
 $('.mall-fav-toggle').onclick=()=>{if(!selected)return;favorites.has(selected.sku)?favorites.delete(selected.sku):favorites.add(selected.sku);saveFavorites();render(true);};
 $('.premium-confirm').onclick=async()=>{
  if(busy||!selected)return;
  if(!game.online||!game.world.petCommand){message=errors['not-connected'];render(true);return;}
  pending??={id:crypto.randomUUID(),sku:selected.sku,quantity};busy=true;message='กำลังบันทึกการซื้อ กรุณารอสักครู่…';render(true);
  try{const r=await game.world.petCommand('premiumBuy',{sku:pending.sku,quantity:pending.quantity},pending.id);game.world.bag=r.bag;game.world.petCollection=r.petCollection;
   const got=(r.purchase.items??[{id:r.purchase.item,count:r.purchase.count}]).map(i=>`${itemDef(i.id).name} ×${i.count}`).join(' · ');
   message=`ได้รับ ${got} · ใช้ ${r.purchase.total.toLocaleString()} ทองแท่ง${r.replayed?' · ยืนยันรายการเดิมแล้ว':''}`;pending=null;quantity=1;}
  catch(e){message=errors[e.message]??'ยังยืนยันผลไม่ได้ · กดตรวจสอบรายการเดิมเพื่อรับผล โดยไม่ซื้อซ้ำ';if(errors[e.message])pending=null;}
  finally{busy=false;render(true);}
 };
 // The hero stands in the fitting room; fashion items will dress this same figure later.
 let heroKey='';
 function drawHero(){
  const c=account?.character;if(!c?.classId)return;const key=[c.classId,c.gender,c.name].join('|');if(key===heroKey)return;heroKey=key;
  $('.mall-hero-name').textContent=c.name??'';
  loadPaintedStanding(c.classId,c.gender==='female'?'female':'male',c.appearance??{}).then(art=>{const canvas=$('.mall-stage canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,320,320);ctx.imageSmoothingEnabled=false;ctx.drawImage(art,0,0,320,320);}).catch(()=>{heroKey='';});
 }
 dialog.addEventListener('toggle',()=>{if(dialog.open)drawHero();});
 return {root,render:force=>{if(dialog.open||force)drawHero();render(force);}};
}

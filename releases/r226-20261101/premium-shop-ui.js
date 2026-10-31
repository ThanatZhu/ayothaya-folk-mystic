import {PREMIUM_SHOP_PRODUCTS} from './premium-shop-catalog.js';
import {normalizePetAccount} from './pet-account.js';
import {itemDef} from './items.js';
import {iconStyle} from './bag-ui.js?v=surfaces222';

const errors={'no-gems':'ทองแท่งไม่พอ','bag-full':'กระเป๋าเต็ม · ยังไม่หักทอง กรุณาจัดช่องว่างก่อน','server-busy':'กำลังบันทึกรายการอื่น กรุณาลองใหม่','not-connected':'เชื่อมต่อเกมออนไลน์ก่อนซื้อสินค้า','rate-limit':'ส่งคำขอเร็วเกินไป รอสักครู่แล้วลองใหม่'};
export function createPremiumShopPanel({game,dialog}){
 const root=document.createElement('section');root.className='premium-store-body';dialog.append(root);
 root.innerHTML=`<div class="premium-hero premium-store-hero"><div><small>AYOTHAYA · PREMIUM STORE</small><h3>ร้านทองแห่งอโยธยา</h3><p>ไอเท็มตัวละครและของตีบวก · ใช้ทองแท่ง</p></div><div class="premium-balance"><img src="assets/summon147/gold-bars.webp" alt=""><b></b><span>ทองแท่ง</span></div></div>
 <div class="premium-shop-scroll"><nav class="premium-filter" aria-label="หมวดสินค้า"><button data-filter="all" aria-pressed="true">ทั้งหมด</button><button data-filter="identity" aria-pressed="false">ตัวละคร</button><button data-filter="refine" aria-pressed="false">ตีบวก</button></nav><div class="premium-products">${PREMIUM_SHOP_PRODUCTS.map(p=>`<article data-product="${p.sku}" data-category="${p.category}"><i class="item-icon shop-product-art" style="${iconStyle(p.item)}" aria-hidden="true"></i><h4>${p.name}</h4><p>${p.tip}</p><strong>${p.price.toLocaleString()} ทองแท่ง</strong><small>ในกระเป๋า <span data-owned="${p.item}">0</span> ชิ้น</small><button type="button" data-buy="${p.sku}">เลือกซื้อ</button></article>`).join('')}</div><p class="premium-shop-note">ราคาสินค้ารอบทดลอง · ของส่งเข้ากระเป๋าตัวละครนี้ · ยังไม่เปิดรับชำระเงินจริง</p></div>
 <section class="premium-order" aria-label="ตรวจสอบรายการก่อนซื้อ" hidden><div class="premium-order-copy"><small>ตรวจสอบรายการ</small><h4></h4><p></p></div><div class="premium-quantity"><label for="premium-order-quantity">จำนวนชุด</label><div><button data-qty="-1" aria-label="ลดจำนวน">−</button><input id="premium-order-quantity" type="number" inputmode="numeric" min="1" max="20" step="1" value="1"><button data-qty="1" aria-label="เพิ่มจำนวน">+</button></div></div><div class="premium-total"><small>รวมทั้งหมด</small><strong></strong><span></span></div><div class="premium-order-actions"><button class="premium-confirm">ยืนยันซื้อ</button><button class="premium-cancel">ยกเลิก</button></div></section><p class="premium-shop-status" role="status"></p>`;
 const $=s=>root.querySelector(s);let selected=null,quantity=1,pending=null,busy=false,message='',signature='';
 const balance=()=>normalizePetAccount(game.world.petCollection).balance;
 function render(force=false){
  if(!dialog.open&&!force)return;
  const wallet=balance(),online=!!game.online&&!!game.world.petCommand,sig=JSON.stringify([wallet,game.world.bag?.items,selected?.sku,quantity,pending?.id,busy,message,online]);
  if(!force&&sig===signature)return;signature=sig;$('.premium-balance b').textContent=wallet.toLocaleString();
  root.querySelectorAll('[data-owned]').forEach(n=>n.textContent=(game.world.bag?.items?.[n.dataset.owned]??0).toLocaleString());
  root.querySelectorAll('[data-buy]').forEach(b=>b.disabled=busy||!!pending||!online);
  $('.premium-order').hidden=!selected;root.dataset.review=String(!!selected);
  if(selected){const total=selected.price*quantity;$('.premium-order h4').textContent=selected.name;$('.premium-order-copy p').textContent=`ได้รับ ${itemDef(selected.item).name} ×${selected.count*quantity}`;$('#premium-order-quantity').value=quantity;$('.premium-total strong').textContent=total.toLocaleString()+' ทองแท่ง';$('.premium-total span').textContent='คงเหลือ '+Math.max(0,wallet-total).toLocaleString()+' ทองแท่ง';$('.premium-confirm').disabled=busy||!online||(!pending&&wallet<total);$('.premium-confirm').textContent=busy?'กำลังบันทึก…':pending?'ตรวจสอบรายการเดิม':'ยืนยันซื้อ';$('.premium-cancel').disabled=busy||!!pending;root.querySelectorAll('[data-qty],#premium-order-quantity').forEach(n=>n.disabled=busy||!!pending);}
  $('.premium-shop-status').textContent=message||(!online?errors['not-connected']:'เลือกสินค้า แล้วตรวจสอบจำนวนและยอดทองก่อนยืนยัน');
 }
 root.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(busy||pending)return;selected=PREMIUM_SHOP_PRODUCTS.find(p=>p.sku===b.dataset.buy);quantity=1;message='';render(true);$('.premium-order').scrollIntoView({block:'nearest'});});
 root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{root.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));root.querySelectorAll('[data-product]').forEach(x=>x.hidden=b.dataset.filter!=='all'&&x.dataset.category!==b.dataset.filter);});
 function setQuantity(value){if(busy||pending)return;quantity=Math.max(1,Math.min(20,Math.trunc(Number(value))||1));render(true);}
 $('#premium-order-quantity').onchange=e=>setQuantity(e.target.value);root.querySelectorAll('[data-qty]').forEach(b=>b.onclick=()=>setQuantity(quantity+Number(b.dataset.qty)));
 $('.premium-cancel').onclick=()=>{if(busy||pending)return;selected=null;message='';render(true);};
 $('.premium-confirm').onclick=async()=>{
  if(busy||!selected)return;
  if(!game.online||!game.world.petCommand){message=errors['not-connected'];render(true);return;}
  pending??={id:crypto.randomUUID(),sku:selected.sku,quantity};busy=true;message='กำลังบันทึกการซื้อ กรุณารอสักครู่…';render(true);
  try{const r=await game.world.petCommand('premiumBuy',{sku:pending.sku,quantity:pending.quantity},pending.id);game.world.bag=r.bag;game.world.petCollection=r.petCollection;message=`ได้รับ ${itemDef(r.purchase.item).name} ×${r.purchase.count} · ใช้ ${r.purchase.total.toLocaleString()} ทองแท่ง${r.replayed?' · ยืนยันรายการเดิมแล้ว':''}`;pending=null;selected=null;}
  catch(e){message=errors[e.message]??'ยังยืนยันผลไม่ได้ · กดตรวจสอบรายการเดิมเพื่อรับผล โดยไม่ซื้อซ้ำ';if(errors[e.message])pending=null;}
  finally{busy=false;render(true);}
 };
 return {root,render};
}

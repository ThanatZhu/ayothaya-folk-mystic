import {presentAmuletBanner} from './gacha-presentation199.js?v=202';
import {AMULETS,AMULET_TIERS,AMULET_MATERIALS,AMULET_PRICE,AMULET_PITY,AMULET_REWARDS,amuletArt,amuletAtTier} from './amulets.js';
import {normalizePetAccount} from './pet-account.js';
import {itemDef} from './items.js';
import {iconStyle,gradeFrame} from './bag-ui.js?v=amulet-aura1';
import {createAmuletRitual} from './amulet-ritual-ui.js?v=design202';
import {createGachaRatesHelp} from './gacha-rates-ui.js';

const errors={'no-gems':'ทองแท่งไม่พอ','bag-full':'กระเป๋าหรือกองไอเท็มเต็ม · ยังไม่หักทอง กรุณาจัดกระเป๋าก่อน',
 'not-connected':'เชื่อมต่อออนไลน์ก่อนสุ่มพระเครื่อง','server-busy':'เซิร์ฟเวอร์กำลังบันทึก ลองอีกครั้งด้วยคำขอเดิม',
 'rate-limit':'ส่งคำขอเร็วเกินไป รอสักครู่แล้วลองใหม่','request-conflict':'คำขอเดิมมีจำนวนไม่ตรงกัน กรุณาเปิดหน้าต่างใหม่'};
export function createAmuletGachaPanel({game,parent,dialog,ratesHelp=true,presentation='standard'}){
 const artwork=a=>presentation==='banner'?'assets/gacha-banner199/amulet-'+a.art+'.webp':amuletArt(a);
 if(!document.querySelector('link[data-amulet-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='amulet-gacha.css?v=amulet-aura1';css.dataset.amuletUi='';document.head.append(css);}
 const root=document.createElement('section');root.id='amulet-gacha';root.setAttribute('role','tabpanel');root.setAttribute('aria-labelledby','pet-tab-amulets');root.hidden=true;parent.append(root);
 root.innerHTML=`<div class="amulet-scroll"><header class="amulet-intro"><div><small>AYOTHAYA · BENCHAPHAKHI</small><h3>กรุเบญจภาคี</h3><p>พระเครื่อง 5 แบบ · ส้ม แดง และรุ้ง · มีวัตถุดิบร่วมในตู้</p></div><span class="amulet-rainbow-tag">ส้ม · แดง · รุ้ง</span></header>
 <div class="amulet-layout"><nav class="amulet-roster" aria-label="เลือกดูพระเครื่อง">${AMULETS.map(a=>`<button type="button" data-amulet="${a.id}" aria-pressed="false"><img class="amulet-rainbow-art" src="${artwork(a)}" alt="" width="96" height="96"><span><b>${a.name}</b><small>${a.theme}</small></span></button>`).join('')}</nav>
 <article class="amulet-inspect" aria-live="polite"></article>
 <aside class="amulet-odds"><h4>รายละเอียดตู้</h4><p class="amulet-tier-rates">${AMULET_TIERS.map(t=>`<span data-tier-rate="${t.id}">ระดับ${t.name} <strong>${Number((t.rate*100).toFixed(2))}%</strong><small>แต่ละองค์ ${Number((t.rate/AMULETS.length*100).toFixed(2))}%</small></span>`).join('')}<span data-tier-rate="material">วัตถุดิบ <strong>${AMULET_MATERIALS.reduce((n,r)=>n+r.rate,0)*100}%</strong></span></p><div class="amulet-pity"><b></b><progress max="${AMULET_PITY}" value="0" aria-label="จำนวนสะสมการันตีพระเครื่องรุ้ง"></progress><small>ครั้งการันตีมีโอกาสองค์ละ 20% · ได้รุ้งแล้วเริ่มนับใหม่ · แยกจากตู้สัตว์เลี้ยง</small></div><details><summary>ดูของทั้งหมดและอัตรารายชิ้น</summary><ul>${AMULET_REWARDS.map(r=>`<li><span>${itemDef(r.id).name} ×${r.count}</span><b>${Number((r.rate*100).toFixed(2))}%</b></li>`).join('')}</ul></details><p class="amulet-fine">ส้ม / แดง: สเตตัสพื้นฐานเท่านั้น<br>รุ้ง: สเตตัสและเอฟเฟกต์พิเศษเฉพาะองค์<br>ของซ้ำได้พระอีก 1 องค์ · ตีบวกได้ถึง +20<br>โบนัสเปอร์เซ็นต์ยังใช้เพดานรวมของเกม</p><button type="button" class="amulet-open-bag">เปิดกระเป๋าเพื่อสวมใส่</button></aside></div>
 <section class="amulet-results" aria-live="polite" aria-label="ผลสุ่มพระเครื่อง" hidden></section><p class="amulet-cultural">ชื่อและงานศิลป์ได้แรงบันดาลใจจากพระเครื่องไทย · ความสามารถและตัวเลขเป็นจินตนาการสำหรับเกม</p></div>
 <footer class="amulet-actions"><div><span>ใช้ทองแท่งร่วมกับตู้สัตว์เลี้ยง</span><strong class="amulet-wallet"></strong></div><button type="button" data-amulet-draw="1">สุ่ม 1 ครั้ง <small>${AMULET_PRICE.toLocaleString()} ทองแท่ง</small></button><button type="button" data-amulet-draw="10">สุ่ม 10 ครั้ง <small>${(AMULET_PRICE*10).toLocaleString()} ทองแท่ง</small></button></footer><p class="amulet-message" role="status"></p>`;
 if(ratesHelp)(dialog.querySelector(':scope>header')??root.querySelector('.amulet-intro')).append(createGachaRatesHelp({dialog,game}).button);
 const $=s=>root.querySelector(s);let selected=AMULETS[0].id,selectedTier=presentation==='banner'?'rainbow':'orange',signature='',message='',pending=null,results=[],lastConfirmedId=null;
 const banner=presentation==='banner'?presentAmuletBanner({root,dialog,onTier:tier=>{selectedTier=tier;render(true);}}):null;
 const ritual=createAmuletRitual({root,dialog,onDone:opened=>{results=opened;banner?.history.record(lastConfirmedId,opened);message='เปิดผนึกครบแล้ว · ของทั้งหมดบันทึกเข้ากระเป๋าเรียบร้อย';render(true);showResults();root.querySelector('[data-amulet-draw="1"]').focus({preventScroll:true});}});
 root.querySelectorAll('[data-amulet]').forEach(b=>b.onclick=()=>{selected=b.dataset.amulet;$('.amulet-results').hidden=true;render(true);$('.amulet-inspect').scrollTop=0;});
 $('.amulet-open-bag').onclick=()=>{dialog?.close();document.getElementById('menu-bag')?.click();};
 function render(force=false){
  if(root.hidden&&!force)return;
  const s=normalizePetAccount(game.world.petCollection),online=game.online&&!!game.world.petCommand;
  const sig=JSON.stringify([s.balance,s.amuletGacha.pity,game.world.bag?.items,game.world.gear?.accessory,selected,selectedTier,message,pending?.busy,pending?.count,online]);
  if(!force&&sig===signature)return;signature=sig;
  const a=amuletAtTier(selected,selectedTier),owned=Object.entries(game.world.bag?.items??{}).reduce((n,[id,count])=>n+(itemDef(id)?.base===a.id?count:0),0),equipped=itemDef(game.world.gear?.accessory)?.base===a.id;
  $('.amulet-inspect').innerHTML=`<div class="amulet-tier-choices" role="group" aria-label="ระดับพระที่ต้องการดู">${AMULET_TIERS.map(t=>`<button type="button" data-amulet-tier="${t.id}" aria-pressed="${t.id===selectedTier}">ระดับ${t.name}</button>`).join('')}</div><span class="amulet-region">${a.origin} · ${a.theme} · ระดับ${a.tierName}</span><img class="amulet-main-art amulet-${selectedTier}-art" src="${artwork(a)}" alt="${a.name} ระดับ${a.tierName}" width="320" height="320"><h3>${a.name}</h3><h4>${selectedTier==='rainbow'?a.ability+' · เอฟเฟกต์พิเศษเฉพาะรุ้ง':'สเตตัสอุปกรณ์เท่านั้น · ไม่มีเอฟเฟกต์พิเศษ'}</h4><ul>${a.effects.map(t=>`<li>${t}</li>`).join('')}</ul><div class="amulet-stat-chips">${Object.entries(a.bonus).map(([k,v])=>`<span>${k.toUpperCase()} +${v}</span>`).join('')}${['atk','matk','def','mdef'].filter(k=>a[k]).map(k=>`<span>${k.toUpperCase()} +${a[k]}</span>`).join('')}</div><p class="amulet-owned">${equipped?'สวมใส่อยู่ · ':''}ในกระเป๋า ${owned} องค์ · ทุกอาชีพ · Lv.1</p>`;
  $('.amulet-main-art').style.cssText='background:transparent;'+gradeFrame(itemDef(a.id));
  root.querySelectorAll('[data-amulet-tier]').forEach(b=>b.onclick=()=>{selectedTier=b.dataset.amuletTier;render(true);});
  root.querySelectorAll('[data-amulet]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.amulet===selected));const img=b.querySelector('img');img.className='amulet-'+selectedTier+'-art';img.style.cssText='background:transparent;'+gradeFrame(itemDef(amuletAtTier(b.dataset.amulet,selectedTier).id));});
  banner?.render(selected,selectedTier);if(banner)banner.history.button.disabled=ritual.active||!!pending?.busy;
  $('.amulet-wallet').textContent=s.balance.toLocaleString('th-TH')+' ทองแท่ง';
  $('.amulet-pity b').textContent=`การันตีรุ้งอีก ${AMULET_PITY-s.amuletGacha.pity} ครั้ง`;
  $('.amulet-pity progress').value=s.amuletGacha.pity;
  $('.amulet-message').textContent=message||(!online?errors['not-connected']:'ของเข้ากระเป๋าทันทีเมื่อสุ่มสำเร็จ · ยังไม่เปิดเติมเงินจริง');
  root.querySelectorAll('[data-amulet-draw]').forEach(b=>{const n=Number(b.dataset.amuletDraw);b.disabled=!online||ritual.active||!!pending?.busy||!!pending&&pending.count!==n||s.balance<AMULET_PRICE*n;b.dataset.retry=String(!!pending&&!pending.busy);});
 }
 function showResults(){
  const container=$('.amulet-results');container.hidden=false;
  container.innerHTML='<h4>บันทึกของรางวัลเข้ากระเป๋าแล้ว</h4><div>'+results.map((r,i)=>`<article class="${'is-'+(itemDef(r.id).amuletTier??'material')}" style="--i:${i}"><i style="${iconStyle(r.id)}"></i><b>${itemDef(r.id).name}</b><small>×${r.count}${r.guaranteed?' · การันตี':''}</small></article>`).join('')+'</div>';
  container.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
 }
 async function draw(count){
  if(ritual.active||pending?.busy||pending&&pending.count!==count)return;
  if(!game.online||!game.world.petCommand){message=errors['not-connected'];render(true);return;}
  pending??={id:crypto.randomUUID(),count};pending.busy=true;message='กำลังเปิดกรุและบันทึกของรางวัล…';ritual.waiting();render(true);let recorded=false;
  try{
   const r=await game.world.petCommand('amuletDraw',{count},pending.id);
   game.world.petCollection=r.petCollection;game.world.bag=r.bag;results=r.results;lastConfirmedId=pending.id;pending=null;recorded=true;
   message='สุ่มสำเร็จ · ของเข้ากระเป๋าแล้ว'+(r.replayed?' · ตรวจสอบคำขอเดิมสำเร็จ ไม่หักทองซ้ำ':'');render(true);ritual.play(results);
  }catch(e){
   ritual.fail();if(recorded){pending=null;message='ของบันทึกเข้ากระเป๋าแล้ว แต่แสดงพิธีไม่สำเร็จ · เปิดกระเป๋าเพื่อตรวจสอบ';}
   else{if(['no-gems','bag-full','bad-count','bad-request-id'].includes(e.message))pending=null;else if(pending)pending.busy=false;
   message=errors[e.message]??'ยังยืนยันผลไม่ได้ กดสุ่มจำนวนเดิมอีกครั้งเพื่อตรวจสอบ · ใช้คำขอเดิม ไม่หักซ้ำ';}render(true);
  }
 }
 root.querySelectorAll('[data-amulet-draw]').forEach(b=>b.onclick=()=>draw(Number(b.dataset.amuletDraw)));
 return {root,render};
}

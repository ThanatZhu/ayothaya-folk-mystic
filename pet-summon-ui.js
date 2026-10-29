import {GACHA_MOTION,createRitualFocus} from './gacha-motion201.js';
import {presentPetBanner} from './gacha-presentation199.js?v=surfaces222';
import {petAtStars} from './premium-pets.js';
import {normalizePetAccount} from './pet-account.js';
import {PET_PRICE,PET_PITY} from './pet-gacha.js';
import {summonBatch,openSummonEgg,openAllSummonEggs,allSummonEggsOpen,summonTier} from './pet-summon-state.js?v=ritual148';
import {createGachaRatesHelp} from './gacha-rates-ui.js?v=surfaces222';
const ART='assets/summon147/';
const errors={'no-gems':'ทองแท่งไม่พอ','pet-not-owned':'ยังไม่มีสัตว์เลี้ยงตัวนี้','max-stars':'ถึง 5 ดาวแล้ว','not-enough-copies':'ตัวซ้ำยังไม่ครบ','not-connected':'ต้องเชื่อมต่อออนไลน์ก่อน','server-busy':'เซิร์ฟเวอร์กำลังบันทึก กรุณาลองอีกครั้ง'};
export function createPetSummonPanel({game,parent,dialog,ratesHelp=true,presentation='standard'}){
 const root=document.createElement('section');root.id='pet-summon-premium';root.className='premium-pet-panel';root.hidden=true;parent.append(root);
 const legacyArtAttribute=presentation==='banner'?'data-inactive-src':'src';
 root.innerHTML=`<div class="summon-nav"><strong>เสียงปี่ปลุกคู่ขวัญ</strong><div class="summon-wallet"><img src="${ART}gold-bars.webp" alt="ทองแท่ง"><b id="pet-balance">0</b></div></div>
 <section id="pet-ritual" aria-label="พิธีอัญเชิญคู่ขวัญ"><div class="summon-scene" data-phase="idle" data-tier="B"><div class="summon-mist"></div><div class="summon-light"></div><div class="summon-particles" aria-hidden="true">${Array.from({length:16},(_,i)=>`<span class="summon-spark" style="--i:${i}"></span>`).join('')}</div><div class="summon-musician" role="img" aria-label="ผู้เป่าปี่เรียกขวัญแห่งป่าหิมพานต์"><img class="musician-rest" ${legacyArtAttribute}="assets/summon148/flutist-rest.webp" alt=""><img class="musician-lift" ${legacyArtAttribute}="assets/summon148/flutist-lift.webp" alt=""><img class="musician-play" ${legacyArtAttribute}="${ART}flutist.webp" alt=""></div><div class="summon-intro"><small>สายใยขวัญแห่งหิมพานต์</small><h3>เสียงปี่ปลุกคู่ขวัญ</h3><p>ให้เสียงแห่งป่านำทางเพื่อนร่วมผจญภัยมาพบคุณ</p></div><div id="pet-eggs" class="summon-eggs" aria-label="ไข่ขวัญ"></div><div class="summon-idle-egg"><img src="${ART}spirit-egg.webp" alt="ไข่ขวัญ"></div><p id="pet-ritual-hint" aria-live="polite"></p><button id="pet-skip" hidden>ข้ามพิธี</button></div>
 <footer class="summon-footer"><div class="summon-rates"><span>S <b>3%</b> · A <b>17%</b> · B <b>80%</b></span><span id="pet-pity"></span><div id="pet-pity-progress" class="summon-pity-track" role="progressbar" aria-label="ความคืบหน้าการันตี S" aria-valuemin="0" aria-valuemax="80" aria-valuenow="0"><span></span></div><label class="summon-skip-choice"><input type="checkbox" id="pet-skip-animation">ข้ามแอนิเมชัน</label></div><div class="summon-actions"><button id="pet-draw-one">อัญเชิญ 1 ครั้ง <small>${PET_PRICE.toLocaleString()} ทองแท่ง</small></button><button id="pet-draw-ten" class="summon-primary">อัญเชิญ 10 ครั้ง <small>${(PET_PRICE*10).toLocaleString()} ทองแท่ง</small></button><button id="pet-open-all" hidden>เปิดทั้งหมด</button><button id="pet-finish" class="summon-primary" hidden>รับคู่ขวัญ · เสร็จสิ้น</button></div></footer></section><p class="pet-account-message" role="status"></p>`;
 if(ratesHelp)(dialog.querySelector(':scope>header')??root.querySelector('.summon-nav')).append(createGachaRatesHelp({dialog,game,getCategory:()=> 'pets'}).button);
 const $=s=>root.querySelector(s),scene=$('.summon-scene'),eggs=$('#pet-eggs');
 let signature='',pending=null,message='',batch=null,phase='idle',ritualTimer,batchId=null;
 const banner=presentation==='banner'?presentPetBanner({root,dialog}):null;
 if(banner)createRitualFocus(scene,ART+'spirit-egg.webp');
 const account=()=>normalizePetAccount(game.world.petCollection);
 const SKIP_KEY='ayothaya-summon-skip-animation';let skipAnimation=false;try{skipAnimation=localStorage.getItem(SKIP_KEY)==='1';}catch{}
 $('#pet-skip-animation').checked=skipAnimation;root.dataset.skipAnimation=String(skipAnimation);
 const reduced=()=>skipAnimation||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';
 $('#pet-skip-animation').onchange=e=>{skipAnimation=e.target.checked;root.dataset.skipAnimation=String(skipAnimation);try{localStorage.setItem(SKIP_KEY,skipAnimation?'1':'0');}catch{}if(skipAnimation&&batch&&phase!=='eggs')readyEggs(true);};
 function readyEggs(skip=false){clearTimeout(ritualTimer);if(!batch)return;phase='eggs';scene.dataset.phase=phase;if(skip)scene.dataset.skip='true';eggs.setAttribute('aria-busy','false');$('#pet-skip').hidden=true;$('#pet-ritual-hint').textContent='แตะไข่แต่ละใบ เพื่อพบคู่ขวัญของคุณ';render(true);}
 function arriveEggs(){if(!batch)return;phase='arriving';scene.dataset.phase=phase;$('#pet-ritual-hint').textContent='ขวัญแห่งพงไพรกำลังมาพบคุณ…';ritualTimer=setTimeout(()=>readyEggs(),reduced()?0:GACHA_MOTION.arrival+(batch.results.length-1)*GACHA_MOTION.stagger);}
 function burstEggs(){if(!batch)return;phase='burst';scene.dataset.phase=phase;ritualTimer=setTimeout(arriveEggs,GACHA_MOTION.impact);}
 function openEggs(){if(!batch)return;phase='opening';scene.dataset.phase=phase;ritualTimer=setTimeout(burstEggs,GACHA_MOTION.anticipation);}
 dialog.addEventListener('close',()=>{if(batch&&phase!=='eggs')readyEggs(true);});
 function renderEggs(){
  if(!batch){eggs.replaceChildren();return;}
  eggs.dataset.count=batch.results.length;
  eggs.innerHTML=batch.results.map((r,i)=>`<button type="button" class="summon-egg" data-egg="${i}" data-tier="${r.tier}" style="--arrival-delay:${i*GACHA_MOTION.stagger}ms" aria-label="เปิดไข่ขวัญใบที่ ${i+1}" aria-disabled="false"><span class="egg-visual"><span class="egg-halo"></span><span class="egg-flare"></span><img class="egg-shell" src="${ART}spirit-egg.webp" alt=""><img class="egg-pet" src="${petAtStars(r.id).art}" alt=""></span><b>ไข่ขวัญ ${i+1}</b><small>แตะเพื่อเปิด</small></button>`).join('');
  eggs.querySelectorAll('[data-egg]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.egg);if(phase!=='eggs'||!openSummonEgg(batch,index))return;showReveal([index]);});
 }
 function showReveal(indices){
  indices.forEach((index,order)=>{const b=eggs.querySelector(`[data-egg="${index}"]`),r=batch.results[index],p=petAtStars(r.id);b.style.setProperty('--reveal-delay',order*75+'ms');b.classList.add('revealed','just-opened');b.setAttribute('aria-disabled','true');b.setAttribute('aria-label',r.tier+' '+p.name+' '+(r.duplicate?'ตัวซ้ำ':'พบใหม่'));b.querySelector('b').textContent=r.tier+' · '+p.name;b.querySelector('small').textContent=r.duplicate?'ตัวซ้ำ +1':'พบใหม่';});
  eggs.querySelector(`[data-egg="${indices[0]}"]`)?.focus({preventScroll:true});
  $('#pet-ritual-hint').textContent=allSummonEggsOpen(batch)?'คู่ขวัญทั้งหมดบันทึกเข้าตัวละครแล้ว':`เปิดแล้ว ${batch.opened.filter(Boolean).length}/${batch.results.length} ใบ · แตะใบถัดไปหรือเปิดทั้งหมด`;
  render(true);
 }
 $('#pet-skip').onclick=()=>readyEggs(true);
 $('#pet-open-all').onclick=()=>{if(!batch||phase!=='eggs')return;const indices=batch.opened.flatMap((open,i)=>open?[]:[i]);openAllSummonEggs(batch);showReveal(indices);};
 $('#pet-finish').onclick=()=>{if(!batch||!allSummonEggsOpen(batch))return;banner?.history.record(batchId,batch.results);clearTimeout(ritualTimer);batch=null;phase='idle';scene.dataset.phase=phase;scene.dataset.tier='B';scene.dataset.performing='false';delete scene.dataset.skip;scene.classList.remove('summon-flash');$('#pet-ritual-hint').textContent='';renderEggs();message='คู่ขวัญอยู่ในสมุดสะสมแล้ว · เลือกพาติดตามได้ที่หน้าสัตว์เลี้ยง';render(true);$('#pet-draw-one').focus();};
 async function mutate(type,data){
  if(pending?.busy||type==='petDraw'&&batch)return;
  if(!game.world.petCommand){message=errors['not-connected'];render(true);return;}
  const sig=JSON.stringify([type,data]);if(!pending||pending.signature!==sig)pending={id:crypto.randomUUID(),signature:sig};pending.busy=true;message='กำลังบันทึกคำขอ…';if(type==='petDraw'){phase='requesting';scene.dataset.phase=phase;scene.dataset.performing='true';delete scene.dataset.skip;}render(true);
  try{const r=await game.world.petCommand(type,data,pending.id);game.world.petCollection=r.petCollection;
   if(type==='petDraw'){batchId=pending.id;batch=summonBatch(r.results);phase='channeling';scene.dataset.phase=phase;scene.dataset.tier=summonTier(batch);scene.classList.remove('summon-flash');$('#pet-ritual-hint').textContent='พลังในไข่ขวัญกำลังตื่นขึ้น…';$('#pet-skip').hidden=false;renderEggs();eggs.setAttribute('aria-busy','true');if(!dialog.open||root.hidden||document.hidden||reduced())readyEggs(true);else ritualTimer=setTimeout(openEggs,GACHA_MOTION.gather);}
   message=type==='petDraw'?'บันทึกผลอัญเชิญแล้ว · การเปิดไข่ไม่คิดทองเพิ่ม':'บันทึกแล้ว';pending=null;
  }catch(e){message=errors[e.message]??'ยังไม่สำเร็จ · กรุณาลองอีกครั้ง';if(pending)pending.busy=false;if(type==='petDraw'&&!batch){phase='idle';scene.dataset.phase=phase;scene.dataset.performing='false';}}
  render(true);
 }
 $('#pet-draw-one').onclick=()=>mutate('petDraw',{count:1});$('#pet-draw-ten').onclick=()=>mutate('petDraw',{count:10});
 function render(force=false){
  if((!dialog.open||root.hidden)&&!force)return;
  const s=account();if(banner)banner.history.button.disabled=!!batch||!!pending?.busy;const connected=game.online!==false&&!!game.world.petCommand,busy=!!pending?.busy;
  const sig=JSON.stringify([s,message,busy,connected,batch?.opened,phase]);if(force||sig!==signature){signature=sig;
   $('#pet-balance').textContent=s.balance.toLocaleString('th-TH');$('#pet-pity').textContent='สะสม '+s.pity+'/'+PET_PITY+' · การันตี S อีก '+(PET_PITY-s.pity)+' ครั้ง';const progress=$('#pet-pity-progress');progress.setAttribute('aria-valuenow',String(s.pity));progress.setAttribute('aria-valuetext',$('#pet-pity').textContent);progress.firstElementChild.style.width=(s.pity/PET_PITY*100)+'%';$('.pet-account-message').textContent=message||(!connected?'เชื่อมต่อออนไลน์เพื่ออัญเชิญคู่ขวัญ':'ยังไม่เปิดเติมเงินจริง · ทองทดสอบในห้องทดลองใช้ในเกมไม่ได้');
   $('#pet-draw-one').hidden=$('#pet-draw-ten').hidden=!!batch;$('#pet-draw-one').disabled=busy||!connected||s.balance<PET_PRICE;$('#pet-draw-ten').disabled=busy||!connected||s.balance<PET_PRICE*10;
   $('#pet-open-all').hidden=!batch||phase!=='eggs'||allSummonEggsOpen(batch);$('#pet-finish').hidden=!batch||!allSummonEggsOpen(batch);
  }
 }
 new MutationObserver(()=>{if(root.hidden&&batch&&phase!=='eggs')readyEggs(true);}).observe(root,{attributes:true,attributeFilter:['hidden']});
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(reduced()&&batch&&phase!=='eggs')readyEggs(true);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&batch&&phase!=='eggs')readyEggs(true);});
 return {root,render};
}

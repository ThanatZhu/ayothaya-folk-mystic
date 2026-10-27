import {amuletRevealBatch,revealAmulet,revealAllAmulets,amuletRevealComplete,amuletRevealTier} from './amulet-ritual-state.js';
import {itemDef} from './items.js';
import {iconStyle} from './bag-ui.js?v=amulet-aura1';
const ART='assets/gacha-neutral/';

export function createAmuletRitual({root,dialog,onDone}){
 for(const href of ['amulet-ritual.css?v=amulet-aura1','amulet-ritual-v2.css?v=1']){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link);}
 const stage=document.createElement('section');stage.className='amulet-ceremony';stage.hidden=true;stage.dataset.phase='idle';stage.dataset.tier='material';stage.setAttribute('aria-label','พิธีเปิดกรุและเผยของรางวัล');
 stage.innerHTML=`<header class="relic-heading"><div><small>AYOTHAYA · SEALED REWARDS</small><h3>พิธีเปิดผนึก</h3></div><label><input class="relic-skip-choice" type="checkbox">ข้ามแอนิเมชัน</label><button type="button" class="relic-skip">ข้ามพิธี</button></header>
 <div class="relic-scene"><div class="relic-effects" aria-hidden="true"><div class="relic-rays" aria-hidden="true"></div><div class="relic-orbit" aria-hidden="true"></div><div class="relic-sparks" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div></div><div class="relic-vault" aria-hidden="true"><span class="relic-vault-halo"></span><img class="relic-vault-closed" src="${ART}sealed.webp" alt="" draggable="false"><img class="relic-vault-awakening" src="${ART}awakening.webp" alt="" draggable="false"><img class="relic-vault-open" src="${ART}revealed.webp" alt="" draggable="false"></div><div class="relic-impact" aria-hidden="true"><img src="assets/amulet-ritual-v2/flash.webp" alt="" draggable="false"></div><div class="relic-invocation"><small>ผนึกแห่งอโยธยา</small><strong>กำลังอัญเชิญ…</strong></div><div class="relic-grid" aria-label="ของรางวัลที่บันทึกแล้ว"></div></div>
 <footer class="relic-footer"><p class="relic-hint" role="status" aria-live="polite"></p><div><button type="button" class="relic-open-all">เปิดทั้งหมด</button><button type="button" class="relic-done">เสร็จสิ้น</button></div></footer>`;
 root.querySelector('.amulet-actions').before(stage);
 const $=s=>stage.querySelector(s),catalog=root.querySelector('.amulet-scroll'),actions=root.querySelector('.amulet-actions'),grid=$('.relic-grid'),media=matchMedia('(prefers-reduced-motion: reduce)');
 let batch=null,phase='idle',timer=null,skip=false;try{skip=localStorage.getItem('ayothaya-amulet-skip-animation')==='1';}catch{}
 $('.relic-skip-choice').checked=skip;
 const reduced=()=>skip||media.matches||document.documentElement.dataset.motion==='off';
 const visible=()=>!root.hidden&&!document.hidden&&(!dialog||dialog.open);
 function setPhase(next){phase=next;stage.dataset.phase=next;stage.dataset.reduced=String(reduced());sync();}
 function show(){stage.hidden=false;catalog.hidden=true;actions.hidden=true;root.dataset.ritualActive='true';stage.dataset.tier='material';}
 function stop(){clearTimeout(timer);timer=null;}
 function sync(){
  const complete=batch&&amuletRevealComplete(batch),ready=phase==='ready';
  $('.relic-skip').hidden=phase==='idle'||ready;$('.relic-skip').disabled=!batch;
  $('.relic-open-all').hidden=!ready||!!complete;$('.relic-done').hidden=!ready||!complete;
  grid.setAttribute('aria-busy',String(!ready));
  grid.querySelectorAll('button').forEach((b,i)=>b.disabled=!ready||batch.opened[i]);
  $('.relic-invocation strong').textContent=phase==='waiting'?'กำลังยืนยันของรางวัล…':phase==='opening'?'ผนึกกำลังคลาย…':phase==='burst'?'ผนึกเปิดแล้ว':'พลังงานในผนึกกำลังตื่นขึ้น';
  $('.relic-hint').textContent=phase==='waiting'?'รอการบันทึกจากเซิร์ฟเวอร์ · ยังไม่เปิดเผยผล':!ready?'พิธีกำลังดำเนิน · กดข้ามพิธีได้':complete?'เปิดครบแล้ว · ของทั้งหมดบันทึกเข้ากระเป๋าเรียบร้อย':`เปิดแล้ว ${batch.opened.filter(Boolean).length}/${batch.results.length} ชิ้น · แตะผนึกเพื่อเปิดทีละชิ้น`;
 }
 function ready(focus=false){if(!batch)return;stop();stage.dataset.tier=amuletRevealTier(batch);setPhase('ready');if(focus&&visible())grid.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
 function arrive(){if(!batch)return;setPhase('arriving');timer=setTimeout(()=>ready(),450+(batch.results.length-1)*50);}
 function burst(){if(!batch)return;setPhase('burst');timer=setTimeout(arrive,620);}
 function openVault(){if(!batch)return;stage.dataset.tier=amuletRevealTier(batch);setPhase('opening');timer=setTimeout(burst,900);}
 function paintCards(){
  grid.dataset.count=batch.results.length;
  grid.innerHTML=batch.results.map((_,i)=>`<button type="button" class="relic-prize" data-relic="${i}" style="--i:${i}" aria-label="เปิดผนึกชิ้นที่ ${i+1}" disabled><span class="relic-prize-art"><span class="relic-prize-halo" aria-hidden="true"></span><img class="relic-seal" src="${ART}sealed.webp" alt="" draggable="false"><i class="relic-item-art" aria-hidden="true"></i></span><b>ผนึก ${i+1}</b><small>แตะเพื่อเปิด</small></button>`).join('');
  grid.querySelectorAll('[data-relic]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.relic);if(phase!=='ready'||!revealAmulet(batch,index))return;paintReveals([index]);});
 }
 function paintReveals(indices){
  indices.forEach((index,order)=>{const result=batch.results[index],b=grid.querySelector(`[data-relic="${index}"]`),item=itemDef(result.id);
   b.dataset.tier=result.tier;b.style.setProperty('--reveal-delay',(reduced()?0:order*65)+'ms');b.querySelector('.relic-item-art').style.cssText=iconStyle(result.id);b.classList.add('is-open');b.setAttribute('aria-label',item.name+' ×'+result.count+(result.guaranteed?' · การันตี':''));b.querySelector('b').textContent=item.name;b.querySelector('small').textContent='×'+result.count+(result.guaranteed?' · การันตี':'');
  });
  sync();if(visible()){if(amuletRevealComplete(batch))$('.relic-done').focus({preventScroll:true});else grid.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
 }
 $('.relic-open-all').onclick=()=>{if(phase!=='ready'||!batch)return;paintReveals(revealAllAmulets(batch));};
 $('.relic-done').onclick=()=>{if(!batch||!amuletRevealComplete(batch))return;const results=batch.results.map(r=>({...r,rainbow:r.tier==='rainbow'}));hide();onDone(results);};
 $('.relic-skip').onclick=()=>ready(true);
 $('.relic-skip-choice').onchange=e=>{skip=e.target.checked;try{localStorage.setItem('ayothaya-amulet-skip-animation',skip?'1':'0');}catch{}stage.dataset.reduced=String(reduced());if(skip&&batch&&phase!=='ready')ready();};
 function settle(){if(batch&&phase!=='ready')ready();}
 dialog?.addEventListener('close',settle);document.addEventListener('visibilitychange',()=>{if(document.hidden)settle();});new MutationObserver(()=>{if(root.hidden)settle();}).observe(root,{attributes:true,attributeFilter:['hidden']});media.addEventListener('change',()=>{stage.dataset.reduced=String(reduced());if(reduced())settle();});
 function hide(){stop();batch=null;grid.replaceChildren();stage.hidden=true;catalog.hidden=false;actions.hidden=false;delete root.dataset.ritualActive;setPhase('idle');}
 return {get active(){return phase!=='idle';},waiting(){stop();batch=null;grid.replaceChildren();show();setPhase('waiting');},play(results){stop();batch=amuletRevealBatch(results);show();paintCards();if(reduced()||!visible())ready();else{setPhase('channeling');timer=setTimeout(openVault,900);}},fail(){hide();}};
}

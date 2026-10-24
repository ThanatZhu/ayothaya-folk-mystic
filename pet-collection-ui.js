import {PREMIUM_PETS,petAtStars} from './premium-pets.js';
import {normalizePetAccount,activePremiumPet} from './pet-account.js';
import {PET_PRICE,PET_STAR_COST} from './pet-gacha.js';
import {summonBatch,openSummonEgg,openAllSummonEggs,allSummonEggsOpen,summonTier} from './pet-summon-state.js?v=gacha147';
const ART='assets/summon147/';
const errors={'no-gems':'ทองแท่งไม่พอ','pet-not-owned':'ยังไม่มีสัตว์เลี้ยงตัวนี้','max-stars':'ถึง 5 ดาวแล้ว','not-enough-copies':'ตัวซ้ำยังไม่ครบ','not-connected':'ต้องเชื่อมต่อออนไลน์ก่อน','server-busy':'เซิร์ฟเวอร์กำลังบันทึก กรุณาลองอีกครั้ง'};
export function createPremiumPetPanel({game,dialog}){
 const root=document.createElement('section');root.id='pet-premium';dialog.querySelector('header').after(root);
 root.innerHTML=`<nav class="summon-nav" aria-label="สัตว์เลี้ยง"><div role="tablist"><button id="pet-tab-summon" role="tab" aria-controls="pet-ritual" aria-selected="true">อัญเชิญขวัญ</button><button id="pet-tab-collection" role="tab" aria-controls="pet-collection" aria-selected="false">คู่ขวัญ <span id="pet-owned"></span></button></div><div class="summon-wallet" title="ทองแท่ง"><img src="${ART}gold-bars.webp" alt="ทองแท่ง"><b id="pet-balance">0</b></div></nav>
 <section id="pet-ritual" role="tabpanel" aria-labelledby="pet-tab-summon"><div class="summon-scene" data-phase="idle" data-tier="B"><div class="summon-mist"></div><div class="summon-light"></div><div class="summon-particles" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><img class="summon-musician" src="${ART}flutist.webp" alt="ผู้เป่าปี่เรียกขวัญแห่งป่าหิมพานต์"><div class="summon-intro"><small>สายใยขวัญแห่งหิมพานต์</small><h3>เสียงปี่ปลุกคู่ขวัญ</h3><p>ให้เสียงแห่งป่านำทางเพื่อนร่วมผจญภัยมาพบคุณ</p></div><div id="pet-eggs" class="summon-eggs" aria-label="ไข่ขวัญ"></div><div class="summon-idle-egg"><img src="${ART}spirit-egg.webp" alt="ไข่ขวัญ"></div><p id="pet-ritual-hint" aria-live="polite"></p><button id="pet-skip" hidden>ข้ามพิธี</button></div>
 <footer class="summon-footer"><div class="summon-rates"><span>S <b>3%</b> · A <b>17%</b> · B <b>80%</b></span><span id="pet-pity"></span></div><div class="summon-actions"><button id="pet-draw-one">อัญเชิญ 1 ครั้ง <small>100 ทองแท่ง</small></button><button id="pet-draw-ten" class="summon-primary">อัญเชิญ 10 ครั้ง <small>1,000 ทองแท่ง</small></button><button id="pet-open-all" hidden>เปิดทั้งหมด</button><button id="pet-finish" class="summon-primary" hidden>รับคู่ขวัญ · เสร็จสิ้น</button></div></footer></section>
 <section id="pet-collection" role="tabpanel" aria-labelledby="pet-tab-collection" hidden><div class="pet-collection-layout"><div class="pet-roster"></div><article class="pet-inspect"></article></div><div class="pet-live-skill"></div></section><p class="pet-account-message" role="status"></p>`;
 const $=s=>root.querySelector(s),scene=$('.summon-scene'),eggs=$('#pet-eggs');
 let chosen=PREMIUM_PETS[0].id,signature='',pending=null,message='',batch=null,phase='idle',tab='summon',ritualTimer;
 const account=()=>normalizePetAccount(game.world.petCollection);
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off';
 function setTab(next){tab=next;$('#pet-ritual').hidden=tab!=='summon';$('#pet-collection').hidden=tab!=='collection';for(const name of ['summon','collection'])$('#pet-tab-'+name).setAttribute('aria-selected',String(name===tab));render(true);}
 $('#pet-tab-summon').onclick=()=>setTab('summon');$('#pet-tab-collection').onclick=()=>setTab('collection');
 root.querySelector('[role=tablist]').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setTab(e.key==='Home'?'summon':e.key==='End'?'collection':tab==='summon'?'collection':'summon');$('#pet-tab-'+tab).focus();};
 function readyEggs(){clearTimeout(ritualTimer);if(!batch)return;phase='eggs';scene.dataset.phase=phase;$('#pet-skip').hidden=true;$('#pet-ritual-hint').textContent='แตะไข่แต่ละใบ เพื่อพบคู่ขวัญของคุณ';renderEggs();render(true);}
 function renderEggs(){
  if(!batch){eggs.replaceChildren();return;}
  eggs.dataset.count=batch.results.length;
  eggs.innerHTML=batch.results.map((r,i)=>{const p=petAtStars(r.id),open=batch.opened[i];return `<button type="button" class="summon-egg${open?' revealed':''}" data-egg="${i}" data-tier="${open?r.tier:'sealed'}" aria-label="${open?r.tier+' '+p.name+' '+(r.duplicate?'ตัวซ้ำ':'พบใหม่'):'เปิดไข่ขวัญใบที่ '+(i+1)}" aria-disabled="${open}"><span class="egg-halo"></span><img src="${open?p.art:ART+'spirit-egg.webp'}" alt=""><b>${open?r.tier+' · '+p.name:'ไข่ขวัญ '+(i+1)}</b><small>${open?(r.duplicate?'ตัวซ้ำ +1':'พบใหม่'):'แตะเพื่อเปิด'}</small></button>`;}).join('');
  eggs.querySelectorAll('[data-egg]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.egg);if(phase==='channeling'||!openSummonEgg(batch,index))return;showReveal(index);});
 }
 function showReveal(index){
  renderEggs();scene.dataset.tier=summonTier(batch);scene.classList.remove('summon-flash');void scene.offsetWidth;scene.classList.add('summon-flash');
  const last=eggs.querySelector(`[data-egg="${index}"]`);last?.classList.add('just-opened');last?.focus({preventScroll:true});
  $('#pet-ritual-hint').textContent=allSummonEggsOpen(batch)?'คู่ขวัญทั้งหมดบันทึกเข้าตัวละครแล้ว':`เปิดแล้ว ${batch.opened.filter(Boolean).length}/${batch.results.length} ใบ · แตะใบถัดไปหรือเปิดทั้งหมด`;
  render(true);
 }
 $('#pet-skip').onclick=readyEggs;
 $('#pet-open-all').onclick=()=>{if(!batch||phase==='channeling')return;openAllSummonEggs(batch);showReveal(0);};
 $('#pet-finish').onclick=()=>{if(!batch||!allSummonEggsOpen(batch))return;clearTimeout(ritualTimer);batch=null;phase='idle';scene.dataset.phase=phase;scene.dataset.tier='B';scene.classList.remove('summon-flash');$('#pet-ritual-hint').textContent='';renderEggs();message='คู่ขวัญอยู่ในสมุดสะสมแล้ว · เลือกพาติดตามได้ที่แท็บคู่ขวัญ';render(true);$('#pet-draw-one').focus();};
 async function mutate(type,data){
  if(pending?.busy||type==='petDraw'&&batch)return;
  if(!game.world.petCommand){message=errors['not-connected'];render(true);return;}
  const sig=JSON.stringify([type,data]);if(!pending||pending.signature!==sig)pending={id:crypto.randomUUID(),signature:sig};pending.busy=true;message='กำลังบันทึกคำขอ…';render(true);
  try{const r=await game.world.petCommand(type,data,pending.id);game.world.petCollection=r.petCollection;
   if(type==='petDraw'){batch=summonBatch(r.results);phase='channeling';setTab('summon');scene.dataset.phase=phase;scene.dataset.tier='B';scene.classList.remove('summon-flash');$('#pet-ritual-hint').textContent='เสียงปี่กำลังปลุกขวัญแห่งพงไพร…';$('#pet-skip').hidden=false;renderEggs();ritualTimer=setTimeout(readyEggs,reduced()?0:2100);}
   message=type==='petDraw'?'บันทึกผลอัญเชิญแล้ว · การเปิดไข่ไม่คิดทองเพิ่ม':'บันทึกแล้ว';pending=null;
  }catch(e){message=errors[e.message]??'ยังไม่สำเร็จ · กรุณาลองอีกครั้ง';if(pending)pending.busy=false;}
  render(true);
 }
 $('#pet-draw-one').onclick=()=>mutate('petDraw',{count:1});$('#pet-draw-ten').onclick=()=>mutate('petDraw',{count:10});
 function render(force=false){
  if(!dialog.open&&!force)return;
  const s=account(),connected=!!game.world.petCommand,busy=!!pending?.busy,active=activePremiumPet(s),remain=Math.max(0,Math.ceil((s.readyAt-Date.now())/1000));
  if(!s.collection[chosen])chosen=PREMIUM_PETS.find(p=>s.collection[p.id])?.id??'';
  const sig=JSON.stringify([s,chosen,message,busy,connected,tab,batch?.opened,phase]);if(force||sig!==signature){signature=sig;
   $('#pet-balance').textContent=s.balance.toLocaleString('th-TH');$('#pet-owned').textContent=Object.keys(s.collection).length+'/10';$('#pet-pity').textContent='การันตี S ภายใน '+(80-s.pity)+' ครั้ง';$('.pet-account-message').textContent=message||(!connected?'เชื่อมต่อออนไลน์เพื่ออัญเชิญคู่ขวัญ':'ยังไม่เปิดเติมเงินจริง · ทองทดสอบในห้องทดลองใช้ในเกมไม่ได้');
   $('#pet-draw-one').hidden=$('#pet-draw-ten').hidden=!!batch;$('#pet-draw-one').disabled=busy||!connected||s.balance<PET_PRICE;$('#pet-draw-ten').disabled=busy||!connected||s.balance<PET_PRICE*10;
   $('#pet-open-all').hidden=!batch||phase==='channeling'||allSummonEggsOpen(batch);$('#pet-finish').hidden=!batch||!allSummonEggsOpen(batch);
   if(tab==='collection')renderCollection(s,busy,connected,active);
  }
  const use=$('#pet-use-live');if(use){use.disabled=!active||!connected||remain>0;use.textContent=remain?'พร้อมอีก '+remain+' วิ':'ใช้สกิลคู่ขวัญ';}
 }
 function renderCollection(s,busy,connected,active){
  const owned=PREMIUM_PETS.filter(p=>Object.hasOwn(s.collection,p.id));
  if(!owned.length){$('.pet-roster').innerHTML='<div class="pet-empty"><h3>ยังไม่มีคู่ขวัญ</h3><p>เสียงปี่แห่งหิมพานต์กำลังรอคุณอยู่</p><button id="pet-find-companion">ไปอัญเชิญคู่ขวัญ</button></div>';$('.pet-inspect').replaceChildren();$('.pet-live-skill').replaceChildren();$('#pet-find-companion').onclick=()=>setTab('summon');return;}
  if(!s.collection[chosen])chosen=owned[0].id;
  const pet=petAtStars(chosen,s.collection[chosen].stars),own=s.collection[chosen];
  $('.pet-roster').innerHTML=owned.map(p=>{const x=s.collection[p.id];return `<button type="button" data-pet="${p.id}" aria-pressed="${chosen===p.id}"><small class="pet-rank">${p.tier}</small><img src="assets/pets125/${p.id}.webp" alt=""><b>${p.name}</b><small>${x?'★'.repeat(x.stars):'ยังไม่พบ'}${s.equipped===p.id?' · ติดตาม':''}</small></button>`;}).join('');
  $('.pet-inspect').innerHTML=`<img src="${pet.art}" alt="${pet.name}"><div class="pet-inspect-copy"><h3>${pet.tier} · ${pet.name}</h3><p>${own?'★'.repeat(own.stars)+' · ตัวซ้ำ '+own.copies+' ตัว':'ยังไม่มีในคอลเลกชัน'}</p><div class="pet-bonus">${Object.entries(pet.bonus).map(([k,v])=>`<span>${k.toUpperCase()} +${v}</span>`).join('')}</div><h4 class="pet-skill-title"><img class="pet-skill-art" src="assets/pets128/skills/${pet.id}.webp" alt="">${pet.skill.name}</h4><p class="pet-skill-tip">${pet.skill.tip} · คูลดาวน์ ${pet.skill.cooldown} วิ</p><div class="pet-manage-actions"><button id="pet-equip-new" ${busy||!connected||!own?'disabled':''}>${s.equipped===chosen?'พักคู่ขวัญ':'พาติดตาม'}</button><button id="pet-upgrade-new" ${busy||!connected||!own||own.stars===5||own.copies<PET_STAR_COST[own.stars]?'disabled':''}>${own?.stars===5?'5 ดาวเต็ม':'อัปดาว · ตัวซ้ำ '+PET_STAR_COST[own?.stars??1]+' ตัว'}</button></div></div>`;
  $('.pet-live-skill').innerHTML=`<strong>${active?'คู่ขวัญ: '+active.name:'ยังไม่ได้เลือกคู่ขวัญ'}</strong><button id="pet-use-live">ใช้สกิลคู่ขวัญ</button><button id="pet-auto-live" aria-pressed="${s.auto}" ${busy||!connected?'disabled':''}>สกิล AUTO ${s.auto?'เปิด':'ปิด'}</button>`;
  root.querySelectorAll('[data-pet]').forEach(b=>b.onclick=()=>{chosen=b.dataset.pet;render(true);});$('#pet-equip-new').onclick=()=>mutate('petEquip',{pet:s.equipped===chosen?null:chosen});$('#pet-upgrade-new').onclick=()=>mutate('petUpgrade',{pet:chosen});$('#pet-auto-live').onclick=()=>mutate('petAuto',{on:!s.auto});$('#pet-use-live').onclick=()=>game.world.market?.('petSkill');
 }
 return {render};
}

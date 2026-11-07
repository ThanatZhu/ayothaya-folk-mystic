import {createPetBuildEditor} from './pet-stat-build-ui220.js?v=petbuild220';
import {petWithBuild,PET_BUILD_ERRORS} from './pet-stat-build220.js';
import {PREMIUM_PETS,petAtStars} from './premium-pets.js';
import {normalizePetAccount,activePremiumPet} from './pet-account.js?v=petbuild220';
import {PET_STAR_COST} from './pet-gacha.js';

export function createPremiumPetPanel({game,dialog,onSummon}){
 const root=document.createElement('section');root.id='pet-premium';root.dataset.presentation='companion201';root.className='premium-pet-panel';dialog.append(root);
 root.innerHTML=`<div class="pet-collection-heading"><div><small>AYOTHAYA · COMPANIONS</small><h3>คู่ขวัญร่วมผจญภัย <span id="pet-owned"></span></h3></div><button type="button" id="pet-go-gacha">ไปหน้ากาชา</button></div>
 <section id="pet-collection" aria-label="คู่ขวัญที่มีแล้ว"><div class="pet-collection-layout"><nav class="pet-roster" aria-label="เลือกคู่ขวัญ"></nav><article class="pet-inspect" aria-label="รายละเอียดคู่ขวัญที่เลือก">
 <img class="pet-hero-art" alt=""><div class="pet-inspect-copy"><small class="pet-detail-kicker"></small><h3 class="pet-detail-name"></h3><p class="pet-stars"></p><div class="pet-bonus" aria-label="สเตตัสที่ได้รับ"></div>
 <details class="pet-ability"><summary class="pet-skill-title"><img class="pet-skill-art" alt=""><span></span><i aria-hidden="true">⌄</i></summary><p class="pet-skill-tip"></p></details>
 <div class="pet-star-progress"><span></span><progress value="0" max="1" aria-label="ตัวซ้ำสำหรับอัปดาว"></progress></div>
 <div class="pet-manage-actions"><button type="button" class="pet-primary" id="pet-equip-new" title="พาติดตามแล้วสัตว์เลี้ยงจะวิ่งเก็บของให้อัตโนมัติ ไม่ต้องเปิด AUTO ต่อสู้">พาติดตาม</button><button type="button" id="pet-upgrade-new">อัปดาว</button></div></div></article></div>
 <div class="pet-empty" hidden><img src="assets/summon147/spirit-egg.webp" alt=""><h3>ยังไม่มีคู่ขวัญ</h3><p>อัญเชิญเพื่อนร่วมผจญภัย แล้วเลือกพาติดตามได้ที่นี่</p><button type="button" id="pet-find-companion">ไปอัญเชิญคู่ขวัญ</button></div></section>
 <div class="pet-live-skill"><img class="pet-active-art" alt=""><strong></strong><button type="button" id="pet-use-live">ใช้สกิลคู่ขวัญ</button><button type="button" id="pet-auto-live">สกิล AUTO ปิด</button></div>
 <p class="pet-account-message" role="status"></p><button class="pet-retry" type="button" hidden>ตรวจสอบคำขอเดิม</button>`;
 const $=s=>root.querySelector(s),account=()=>normalizePetAccount(game.world.petCollection),roster=$('.pet-roster'),hero=$('.pet-hero-art'),rosterNodes=new Map();
 let chosen='',pending=null,message='',signature='',shownPet='';
 const buildEditor=createPetBuildEditor({parent:$('.pet-inspect-copy'),onSave:stats=>mutate('petStatBuild',{stats})});
 $('.pet-ability').open=!matchMedia('(max-height:550px), (max-width:600px) and (orientation:portrait)').matches;
 $('#pet-go-gacha').onclick=$('#pet-find-companion').onclick=()=>onSummon?.();

 async function mutate(type,data){
  if(pending?.busy)return;
  const commandSignature=JSON.stringify([type,data]);
  if(pending&&pending.signature!==commandSignature){message='กรุณาตรวจสอบคำขอเดิมก่อนทำรายการใหม่';render(true);return;}
  if(!game.world.petCommand||game.online===false){message='เชื่อมต่อออนไลน์ก่อนจัดการคู่ขวัญ';render(true);return;}
  const origin=document.activeElement;
  pending??={id:crypto.randomUUID(),type,data,signature:commandSignature};pending.busy=true;message='กำลังบันทึก…';render(true);
  try{const r=await game.world.petCommand(type,data,pending.id);game.world.petCollection=r.petCollection;pending=null;message='บันทึกเรียบร้อยแล้ว';}
  catch(e){message=({...PET_BUILD_ERRORS,'pet-not-owned':'ยังไม่มีคู่ขวัญตัวนี้','not-enough-copies':'ตัวซ้ำยังไม่ครบ','server-busy':'เซิร์ฟเวอร์กำลังบันทึก ลองใหม่อีกครั้ง'})[e.message]??'ยังยืนยันผลไม่ได้ · กดตรวจสอบคำขอเดิม';if(['pet-not-owned','not-enough-copies','max-stars','server-busy','rate-limit','not-connected',...Object.keys(PET_BUILD_ERRORS)].includes(e.message))pending=null;}
  finally{if(pending)pending.busy=false;render(true);if(dialog.open&&origin?.isConnected&&!origin.disabled&&origin.getClientRects().length&&[document.body,dialog].includes(document.activeElement))origin.focus({preventScroll:true});}
 }
 $('.pet-retry').onclick=()=>pending&&mutate(pending.type,pending.data);
 $('#pet-equip-new').onclick=()=>mutate('petEquip',{pet:account().equipped===chosen?null:chosen});
 $('#pet-upgrade-new').onclick=()=>mutate('petUpgrade',{pet:chosen});
 $('#pet-auto-live').onclick=()=>mutate('petAuto',{on:!account().auto});
 $('#pet-use-live').onclick=()=>game.world.market?.('petSkill');

 function select(id,animate=false){
  chosen=id;render(true);
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.motion!=='off'){
   hero.getAnimations().forEach(a=>a.cancel());
   hero.animate([{opacity:.55,transform:'translateY(5px) scale(.985)'},{opacity:1,transform:'none'}],{duration:200,easing:'cubic-bezier(.22,1,.36,1)'});
  }
 }
 roster.addEventListener('click',e=>{const button=e.target.closest('[data-pet]');if(button)select(button.dataset.pet,e.detail>0);});
 roster.addEventListener('keydown',e=>{
  if(!e.target.dataset.pet||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();const ids=PREMIUM_PETS.filter(p=>Object.hasOwn(account().collection,p.id)).map(p=>p.id);if(!ids.length)return;
  const i=ids.indexOf(chosen),next=e.key==='Home'?0:e.key==='End'?ids.length-1:(i+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1)+ids.length)%ids.length;
  select(ids[next]);rosterNodes.get(chosen)?.focus({preventScroll:true});rosterNodes.get(chosen)?.scrollIntoView({block:'nearest',inline:'nearest'});
 });
 function render(force=false){
  if(!dialog.open&&!force)return;
  const s=account(),owned=PREMIUM_PETS.filter(p=>Object.hasOwn(s.collection,p.id)),connected=game.online!==false&&!!game.world.petCommand,busy=!!pending?.busy,active=activePremiumPet(s);
  if(!Object.hasOwn(s.collection,chosen))chosen=s.equipped&&Object.hasOwn(s.collection,s.equipped)?s.equipped:owned[0]?.id??'';
  const next=JSON.stringify([s,chosen,busy,connected,message]);
  if(force||next!==signature){
   signature=next;$('#pet-owned').textContent=owned.length+'/'+PREMIUM_PETS.length;$('.pet-account-message').textContent=message||(!connected?'เชื่อมต่อออนไลน์ก่อนจัดการคู่ขวัญ':'');
   $('.pet-retry').hidden=!pending||busy;$('.pet-collection-layout').hidden=!owned.length;$('.pet-empty').hidden=!!owned.length;$('.pet-live-skill').hidden=!owned.length;
   for(const [id,b] of rosterNodes)if(!Object.hasOwn(s.collection,id)){b.remove();rosterNodes.delete(id);}
   for(const p of owned){
    let b=rosterNodes.get(p.id);
    if(!b){b=document.createElement('button');b.type='button';b.dataset.pet=p.id;b.innerHTML='<small class="pet-rank"></small><img alt=""><b></b><small class="pet-roster-stars"></small>';b.querySelector('img').src=petAtStars(p.id).art;roster.append(b);rosterNodes.set(p.id,b);}
    b.tabIndex=chosen===p.id?0:-1;b.setAttribute('aria-pressed',String(chosen===p.id));b.querySelector('.pet-rank').textContent=p.tier;b.querySelector('b').textContent=p.name;b.querySelector('.pet-roster-stars').textContent='★'.repeat(s.collection[p.id].stars)+(s.equipped===p.id?' · ติดตาม':'');
   }
   if(chosen){
    const own=s.collection[chosen],pet=petWithBuild(petAtStars(chosen,own.stars),s.statBuild),cost=PET_STAR_COST[own.stars];
    if(shownPet!==chosen){hero.src=pet.art;hero.alt=pet.name;shownPet=chosen;}
    $('.pet-detail-kicker').textContent='คู่ขวัญร่วมผจญภัย · '+pet.tier;$('.pet-detail-name').textContent=pet.name;$('.pet-stars').textContent='★'.repeat(own.stars)+' · ตัวซ้ำ '+own.copies+' ตัว';
    $('.pet-bonus').replaceChildren(...Object.entries(pet.bonus).map(([k,v])=>{const span=document.createElement('span');span.textContent=k.toUpperCase()+' +'+v;return span;}));
    $('.pet-skill-art').src='assets/pets128/skills/'+pet.id+'.webp';$('.pet-skill-title span').textContent=pet.skill.name;$('.pet-skill-tip').textContent=pet.skill.tip+' · คูลดาวน์ '+pet.skill.cooldown+' วิ';
    $('.pet-star-progress').hidden=own.stars===5;$('.pet-star-progress>span').textContent='ตัวซ้ำสำหรับดาวถัดไป '+own.copies+' / '+(cost??0);
    const progress=$('.pet-star-progress progress');progress.max=cost??1;progress.value=Math.min(own.copies,cost??0);
    const equip=$('#pet-equip-new'),upgrade=$('#pet-upgrade-new');equip.disabled=busy||!connected;equip.classList.toggle('pet-primary',s.equipped!==chosen);equip.textContent=s.equipped===chosen?'พักคู่ขวัญ':'พาติดตาม';upgrade.disabled=busy||!connected||own.stars===5||own.copies<cost;upgrade.textContent=own.stars===5?'5 ดาวเต็ม':'อัปดาว · '+cost+' ตัวซ้ำ';
   }
   $('.pet-active-art').hidden=!active;if(active)$('.pet-active-art').src=active.art;
   $('.pet-live-skill strong').textContent=active?'คู่ขวัญ: '+active.name:'ยังไม่ได้เลือกคู่ขวัญ';
   $('#pet-auto-live').setAttribute('aria-pressed',String(s.auto));$('#pet-auto-live').disabled=busy||!connected;$('#pet-auto-live').textContent='สกิล AUTO '+(s.auto?'เปิด':'ปิด');
  }
  buildEditor.render({account:s,pet:chosen?petAtStars(chosen,s.collection[chosen].stars):null,baseStats:game.world.stats,connected,pending,status:game.world.petBuildStatus});
  const remain=Math.max(0,Math.ceil((s.readyAt-Date.now())/1000)),use=$('#pet-use-live');use.disabled=busy||!active||!connected||remain>0;use.textContent=remain?'พร้อมอีก '+remain+' วิ':'ใช้สกิลคู่ขวัญ';
 }
 return {root,render};
}

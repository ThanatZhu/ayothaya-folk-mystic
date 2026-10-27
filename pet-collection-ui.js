import {PREMIUM_PETS,petAtStars} from './premium-pets.js';
import {normalizePetAccount,activePremiumPet} from './pet-account.js';
import {PET_STAR_COST} from './pet-gacha.js';
export function createPremiumPetPanel({game,dialog,onSummon}){
 const root=document.createElement('section');root.id='pet-premium';root.className='premium-pet-panel';dialog.append(root);
 root.innerHTML=`<div class="pet-collection-heading"><div><small>AYOTHAYA · COMPANIONS</small><h3>คู่ขวัญร่วมผจญภัย <span id="pet-owned"></span></h3></div><button class="premium-art-button" id="pet-go-gacha">ไปหน้ากาชา</button></div>
 <section id="pet-collection" aria-label="คู่ขวัญที่มีแล้ว"><div class="pet-collection-layout"><div class="pet-roster"></div><article class="pet-inspect"></article></div><div class="pet-live-skill"></div></section><p class="pet-account-message" role="status"></p><button class="pet-retry" type="button" hidden>ตรวจสอบคำขอเดิม</button>`;
 const $=s=>root.querySelector(s);let chosen='',pending=null,message='',signature='';
 $('#pet-go-gacha').onclick=()=>onSummon?.();
 async function mutate(type,data){
  if(pending?.busy)return;
  const signature=JSON.stringify([type,data]);if(pending&&pending.signature!==signature){message='กรุณาตรวจสอบคำขอเดิมก่อนทำรายการใหม่';render(true);return;}
  if(!game.world.petCommand||game.online===false){message='เชื่อมต่อออนไลน์ก่อนจัดการคู่ขวัญ';render(true);return;}
  pending??={id:crypto.randomUUID(),type,data,signature};pending.busy=true;message='กำลังบันทึก…';render(true);
  try{const r=await game.world.petCommand(type,data,pending.id);game.world.petCollection=r.petCollection;pending=null;message='บันทึกเรียบร้อยแล้ว';}
  catch(e){message=({'pet-not-owned':'ยังไม่มีคู่ขวัญตัวนี้','not-enough-copies':'ตัวซ้ำยังไม่ครบ','server-busy':'เซิร์ฟเวอร์กำลังบันทึก ลองใหม่อีกครั้ง'})[e.message]??'ยังยืนยันผลไม่ได้ · กดตรวจสอบคำขอเดิม';if(['pet-not-owned','not-enough-copies','max-stars','server-busy','rate-limit','not-connected'].includes(e.message))pending=null;}
  finally{if(pending)pending.busy=false;render(true);}
 }
 $('.pet-retry').onclick=()=>pending&&mutate(pending.type,pending.data);
 function render(force=false){
  if(!dialog.open&&!force)return;
  const s=normalizePetAccount(game.world.petCollection),connected=game.online!==false&&!!game.world.petCommand,busy=!!pending?.busy,active=activePremiumPet(s),remain=Math.max(0,Math.ceil((s.readyAt-Date.now())/1000));
  const next=JSON.stringify([s,chosen,busy,connected,message]);
  if(force||next!==signature){signature=next;$('#pet-owned').textContent=Object.keys(s.collection).length+'/10';$('.pet-account-message').textContent=message;$('.pet-retry').hidden=!pending||busy;renderCollection(s,busy,connected,active);}
  const use=$('#pet-use-live');if(use){use.disabled=!active||!connected||remain>0;use.textContent=remain?'พร้อมอีก '+remain+' วิ':'ใช้สกิลคู่ขวัญ';}
 }
 function renderCollection(s,busy,connected,active){
  const owned=PREMIUM_PETS.filter(p=>Object.hasOwn(s.collection,p.id));
  if(!owned.length){$('.pet-roster').innerHTML='<div class="pet-empty"><h3>ยังไม่มีคู่ขวัญ</h3><p>เสียงปี่แห่งหิมพานต์กำลังรอคุณอยู่</p><button id="pet-find-companion">ไปอัญเชิญคู่ขวัญ</button></div>';$('.pet-inspect').replaceChildren();$('.pet-live-skill').replaceChildren();$('#pet-find-companion').onclick=()=>onSummon?.();return;}
  if(!s.collection[chosen])chosen=owned[0].id;
  const pet=petAtStars(chosen,s.collection[chosen].stars),own=s.collection[chosen];
  $('.pet-roster').innerHTML=owned.map(p=>{const x=s.collection[p.id];return `<button type="button" data-pet="${p.id}" aria-pressed="${chosen===p.id}"><small class="pet-rank">${p.tier}</small><img src="assets/pets125/${p.id}.webp" alt=""><b>${p.name}</b><small>${x?'★'.repeat(x.stars):'ยังไม่พบ'}${s.equipped===p.id?' · ติดตาม':''}</small></button>`;}).join('');
  $('.pet-inspect').innerHTML=`<img src="${pet.art}" alt="${pet.name}"><div class="pet-inspect-copy"><h3>${pet.tier} · ${pet.name}</h3><p>${own?'★'.repeat(own.stars)+' · ตัวซ้ำ '+own.copies+' ตัว':'ยังไม่มีในคอลเลกชัน'}</p><div class="pet-bonus">${Object.entries(pet.bonus).map(([k,v])=>`<span>${k.toUpperCase()} +${v}</span>`).join('')}</div><h4 class="pet-skill-title"><img class="pet-skill-art" src="assets/pets128/skills/${pet.id}.webp" alt="">${pet.skill.name}</h4><p class="pet-skill-tip">${pet.skill.tip} · คูลดาวน์ ${pet.skill.cooldown} วิ</p><div class="pet-manage-actions"><button id="pet-equip-new" ${busy||!connected||!own?'disabled':''}>${s.equipped===chosen?'พักคู่ขวัญ':'พาติดตาม'}</button><button id="pet-upgrade-new" ${busy||!connected||!own||own.stars===5||own.copies<PET_STAR_COST[own.stars]?'disabled':''}>${own?.stars===5?'5 ดาวเต็ม':'อัปดาว · ตัวซ้ำ '+PET_STAR_COST[own?.stars??1]+' ตัว'}</button></div></div>`;
  $('.pet-live-skill').innerHTML=`<strong>${active?'คู่ขวัญ: '+active.name:'ยังไม่ได้เลือกคู่ขวัญ'}</strong><button id="pet-use-live">ใช้สกิลคู่ขวัญ</button><button id="pet-auto-live" aria-pressed="${s.auto}" ${busy||!connected?'disabled':''}>สกิล AUTO ${s.auto?'เปิด':'ปิด'}</button>`;
  root.querySelectorAll('[data-pet]').forEach(b=>b.onclick=()=>{chosen=b.dataset.pet;render(true);});$('#pet-equip-new').onclick=()=>mutate('petEquip',{pet:s.equipped===chosen?null:chosen});$('#pet-upgrade-new').onclick=()=>mutate('petUpgrade',{pet:chosen});$('#pet-auto-live').onclick=()=>mutate('petAuto',{on:!s.auto});$('#pet-use-live').onclick=()=>game.world.market?.('petSkill');
 }
 return {root,render};
}

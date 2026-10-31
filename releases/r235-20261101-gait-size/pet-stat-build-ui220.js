import {PET_BUILD_STATS,PET_BUILD_ERRORS,normalizePetBuild,recommendPetBuild,petWithBuild} from './pet-stat-build220.js';
import {STAT_HINT} from './character-stats.js';
export function createPetBuildEditor({parent,onSave}){
 const root=document.createElement('details');root.className='pet-build-editor';
 root.innerHTML='<summary><strong>จัดสเตตัสคู่ขวัญ S</strong><span class="pet-build-summary"></span></summary><p>แตะช่องหลัก รอง หรือเสริม แล้วเลือกค่าสเตตัสด้านล่าง · ใช้ร่วมกับ S ทุกตัว</p><div class="pet-build-slots" role="group" aria-label="ลำดับสเตตัสสัตว์เลี้ยง"></div><div class="pet-build-grid" role="group" aria-label="เลือกสเตตัส"></div><p class="pet-build-budget"></p><p class="pet-build-state" role="status"></p><div class="pet-build-actions"><button type="button" data-build-recommend>แนะนำจากแต้มที่อัป</button><button type="button" data-build-cancel>ยกเลิก</button><button type="button" data-build-save class="pet-primary">บันทึกสเตตัส</button></div>';
 parent.querySelector('.pet-bonus').after(root);
 const $=s=>root.querySelector(s),slots=[],choices=new Map(),labels=['หลัก','รอง','เสริม'];let draft=null,savedKey,selected=0,latest=null,note='';
 for(let i=0;i<3;i++){const b=document.createElement('button');b.type='button';b.dataset.buildSlot=String(i);const label=document.createElement('small'),value=document.createElement('b');label.textContent=labels[i];b.append(label,value);b.onclick=()=>{selected=i;paint();};$('.pet-build-slots').append(b);slots.push(b);}
 for(const stat of PET_BUILD_STATS){const b=document.createElement('button');b.type='button';b.dataset.buildStat=stat;b.textContent=stat.toUpperCase();b.title=STAT_HINT[stat];b.onclick=()=>{
  const old=draft.stats[selected],other=draft.stats.indexOf(stat);if(other!==-1)draft.stats[other]=old;draft.stats[selected]=stat;note='ยังไม่ได้บันทึก';paint();
 };$('.pet-build-grid').append(b);choices.set(stat,b);}
 $('[data-build-recommend]').onclick=()=>{draft=recommendPetBuild(latest.baseStats);note='แนะนำจากแต้มที่อัปเอง · ยังไม่ได้บันทึก';paint();};
 $('[data-build-cancel]').onclick=()=>{draft=normalizePetBuild(latest.account.statBuild)??recommendPetBuild(latest.baseStats);note='';root.open=false;paint();root.querySelector('summary').focus();};
 $('[data-build-save]').onclick=()=>{if(!$('[data-build-save]').disabled)onSave([...draft.stats]);};
 function paint(){
  if(!latest||!draft)return;const {account,pet,pending,connected,status}=latest,profile=normalizePetBuild(account.statBuild);
  root.hidden=pet?.tier!=='S';if(root.hidden)return;
  const preview=petWithBuild(pet,draft),budget=Object.values(preview.bonus).reduce((n,v)=>n+v,0),locked=!!pending||!connected||!status||status.blocked;
  const same=JSON.stringify(profile?.stats)===JSON.stringify(draft.stats);
  $('.pet-build-summary').textContent=profile?profile.stats.map(k=>k.toUpperCase()).join(' / '):'เลือกได้ 3 ค่า';
  slots.forEach((b,i)=>{const stat=draft.stats[i];b.disabled=!!pending||!connected;b.setAttribute('aria-pressed',String(selected===i));b.classList.toggle('pet-primary',selected===i);b.querySelector('b').textContent=stat.toUpperCase()+' +'+preview.bonus[stat];});
  for(const [stat,b]of choices){b.disabled=!!pending||!connected;b.setAttribute('aria-pressed',String(draft.stats[selected]===stat));b.classList.toggle('pet-primary',draft.stats[selected]===stat);}
  $('.pet-build-budget').textContent='แต้มโบนัสรวม '+budget+' · ตามระดับดาวเดิม';
  $('.pet-build-state').textContent=!connected?'เชื่อมต่อออนไลน์ก่อนจัดสเตตัส':!status?'อัปเดตเซิร์ฟเวอร์ก่อนใช้การตั้งสเตตัส':status.blocked?(status.remaining?'รอพ้นการต่อสู้อีก '+status.remaining+' วิ':PET_BUILD_ERRORS[status.reason]??PET_BUILD_ERRORS['pet-build-combat']):(!same&&note)||'เปลี่ยนได้เมื่อพ้นการต่อสู้';
  $('[data-build-save]').disabled=locked||same;
  $('[data-build-recommend]').disabled=!!pending||!connected;
  $('[data-build-cancel]').disabled=!!pending;
 }
 return {root,render(state){
  latest=state;const key=JSON.stringify(state.account.statBuild);
  if(key!==savedKey){savedKey=key;draft=normalizePetBuild(state.account.statBuild)??recommendPetBuild(state.baseStats);note='';}
  if(!state.account.statBuild&&!root.open)draft=recommendPetBuild(state.baseStats);
  paint();
 }};
}

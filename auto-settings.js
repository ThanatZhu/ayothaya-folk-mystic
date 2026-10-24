import {applySkillArt} from './skill-art.js?v=icons117';
import {openHudPanel} from './hud-panels.js?v=34';
import {HOTBAR_KEYS,isMaster} from './skill-progress.js?v=role116';
import {swapSkillSlots,orderedAutoConfig} from './auto-settings-model.js';

export function createAutoSettings({game,classId}){
 if(!document.querySelector('link[data-auto-settings]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./auto-settings.css?v=role116';css.dataset.autoSettings='';document.head.append(css);}
 const toggle=document.getElementById('auto-attack');if(!toggle)return null;
 let control=document.getElementById('auto-control');if(!control){control=document.createElement('div');control.id='auto-control';toggle.before(control);control.append(toggle);}
 const gear=document.createElement('button');gear.id='auto-settings-open';gear.type='button';gear.setAttribute('aria-label','ตั้งค่าออโต้และตำแหน่งสกิล');gear.setAttribute('aria-haspopup','dialog');gear.setAttribute('aria-controls','auto-settings-window');gear.title='ตั้งค่าออโต้และตำแหน่งสกิล';
 gear.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 2-.7 3-2 .9L4.5 5 2 9.3l2.2 2.1v2.2L2 15.7 4.5 20l2.8-.9 2 .9.7 3h5l.7-3 2-.9 2.8.9 2.5-4.3-2.2-2.1v-2.2L23 9.3 20.5 5l-2.8.9-2-.9L15 2Z"/><circle cx="12.5" cy="12.5" r="3.5"/></svg>';
 gear.setAttribute('aria-expanded','false');control.append(gear);
 const dialog=document.createElement('dialog');dialog.id='auto-settings-window';dialog.setAttribute('aria-labelledby','auto-settings-title');
 dialog.innerHTML='<header><div><small>AUTO</small><h2 id="auto-settings-title">ออโต้และปุ่มลัด</h2></div><button type="button" id="auto-settings-close" aria-label="ปิดตั้งค่าออโต้">×</button></header><nav class="auto-tabs" aria-label="หน้าตั้งค่าออโต้"><button type="button" data-auto-tab="skills" aria-pressed="true">สกิลอัตโนมัติ</button><button type="button" data-auto-tab="positions" aria-pressed="false">จัดตำแหน่งสกิล</button><button type="button" data-auto-tab="potions" aria-pressed="false">น้ำยา</button></nav><div class="auto-settings-body"><section data-auto-page="skills"><h3>เลือกสกิลที่ให้ใช้เอง</h3><p>ใช้ตามลำดับปุ่มลัดเมื่อสกิลพร้อม ใช้ MP พอ และเข้าเงื่อนไขของสกิล</p><div id="auto-skill-choices"></div></section><section data-auto-page="positions" hidden><h3>จัดตำแหน่งปุ่มลัด</h3><p>แตะช่องต้นทาง แล้วแตะช่องปลายทางเพื่อสลับ หรือใช้เมาส์ลากสลับช่องได้</p><ol id="auto-hotbar"></ol><button type="button" id="auto-cancel-move" hidden>ยกเลิกการย้าย</button></section><section data-auto-page="potions" hidden><h3>ใช้น้ำยาอัตโนมัติ</h3><p>เลือกเกณฑ์ HP / MP ที่ให้ใช้น้ำยา 0% คือปิด ใช้ได้เมื่อเปิด AUTO</p><div class="auto-potion-settings"><label for="auto-hp">HP ต่ำกว่า</label><input type="range" id="auto-hp" min="0" max="90" step="5"><output id="auto-hp-out" for="auto-hp"></output><label for="auto-mp">MP ต่ำกว่า</label><input type="range" id="auto-mp" min="0" max="90" step="5"><output id="auto-mp-out" for="auto-mp"></output></div></section></div><footer><p id="auto-settings-note" role="status">บันทึกการตั้งค่าให้อัตโนมัติ</p><button type="button" id="auto-settings-done">เสร็จแล้ว</button></footer>';
 (document.getElementById('game-shell')??document.body).append(dialog);
 const $=id=>dialog.querySelector('#'+id),world=game.world;if(world.roleCombat&&!world.roleCombat.legacy){const aim=document.createElement('button');aim.type='button';aim.className='role-aim-button';aim.textContent='เล็งจุดวางสกิลบนพื้น';aim.onclick=()=>{dialog.close();dispatchEvent(new Event('role-aim-ground'));};dialog.querySelector('[data-auto-page=positions]').append(aim);}let carry=null,tab='skills',signature='',timer=0;
 const config=()=>world.autoConfig??{skills:[],hp:40,mp:0};
 const learned=k=>(world.skillLevels?.[k]??(isMaster(k)?0:1))>0;
 const note=text=>$('auto-settings-note').textContent=text;
 function output(){for(const id of ['hp','mp'])$('auto-'+id+'-out').textContent=+$('auto-'+id).value?$('auto-'+id).value+'%':'ปิด';}
 function persist(raw=config()){game.setAutoConfig(orderedAutoConfig(game.hotbar,raw));note('บันทึกการตั้งค่าออโต้แล้ว');}
 function move(from,to){const next=swapSkillSlots(game.hotbar,from,to);if(!next)return;game.setHotbar(next);carry=null;persist();draw();note('ย้ายสกิลลงปุ่มลัดแล้ว');}
 function setTab(next){tab=next;dialog.querySelectorAll('[data-auto-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.autoTab===tab)));dialog.querySelectorAll('[data-auto-page]').forEach(s=>s.hidden=s.dataset.autoPage!==tab);}
 function draw(){
  const bar=game.hotbar,cfg=config();signature=JSON.stringify([bar,world.skillLevels,cfg]);
  $('auto-hotbar').replaceChildren();$('auto-skill-choices').replaceChildren();
  bar.forEach((k,j)=>{
   const skill=world.skills[k];if(!skill)return;
   const li=document.createElement('li'),slot=document.createElement('button'),key=document.createElement('kbd'),art=document.createElement('strong'),label=document.createElement('span');slot.type='button';slot.dataset.slot=j;slot.className='auto-slot';slot.draggable=true;slot.setAttribute('aria-pressed',String(carry===j));slot.setAttribute('aria-label','ช่อง '+HOTBAR_KEYS[j]+' · '+skill.name);key.textContent=HOTBAR_KEYS[j];art.textContent=skill.icon;label.textContent=skill.name;slot.append(key,art,label);li.append(slot);li.hidden=!!skill.reserved||!!skill.passive;$('auto-hotbar').append(li);
   slot.onclick=()=>{if(carry===null){carry=j;draw();note('เลือกช่องปลายทางเพื่อสลับสกิล');}else if(carry===j){carry=null;draw();}else move(carry,j);};
   slot.ondragstart=e=>{e.dataTransfer.setData('application/x-ayothaya-slot',String(j));e.dataTransfer.effectAllowed='move';};slot.ondragover=e=>{e.preventDefault();slot.classList.add('over');};slot.ondragleave=()=>slot.classList.remove('over');slot.ondrop=e=>{e.preventDefault();const data=e.dataTransfer.getData('application/x-ayothaya-slot');if(/^\d+$/.test(data))move(Number(data),j);};
   const choice=document.createElement('label'),checkbox=document.createElement('input'),icon=document.createElement('strong'),text=document.createElement('span'),status=document.createElement('small');choice.className='auto-skill-choice';choice.hidden=!!skill.reserved||!!skill.passive;checkbox.type='checkbox';checkbox.dataset.auto=k;checkbox.checked=cfg.skills.includes(k);checkbox.disabled=!learned(k)||skill.reserved||skill.passive;icon.textContent=skill.icon;text.textContent=HOTBAR_KEYS[j]+' · '+skill.name;status.textContent=learned(k)?'Lv '+(world.skillLevels?.[k]??1):'ยังไม่ได้เรียน';text.append(status);choice.append(checkbox,icon,text);$('auto-skill-choices').append(choice);
   checkbox.onchange=()=>{const enabled=new Set(config().skills);checkbox.checked?enabled.add(k):enabled.delete(k);persist({...config(),skills:[...enabled]});signature=JSON.stringify([bar,world.skillLevels,config()]);};
  });
  if(classId){applySkillArt([...$('auto-hotbar').children],classId,bar,world.skills);applySkillArt([...$('auto-skill-choices').children],classId,bar,world.skills);}
  $('auto-cancel-move').hidden=carry===null;for(const id of ['hp','mp'])$('auto-'+id).value=cfg[id];output();setTab(tab);
 }
 function open(){game.clearInput?.();carry=null;draw();note('บันทึกการตั้งค่าให้อัตโนมัติ');openHudPanel(dialog);gear.setAttribute('aria-expanded','true');clearInterval(timer);timer=setInterval(()=>{if(signature!==JSON.stringify([game.hotbar,world.skillLevels,config()]))draw();},400);}
 gear.onclick=e=>{e.stopPropagation();if(dialog.open)dialog.close();else open();};
 dialog.querySelectorAll('[data-auto-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.autoTab));
 $('auto-cancel-move').onclick=()=>{carry=null;draw();note('ยกเลิกการย้ายแล้ว');};
 for(const id of ['hp','mp'])$('auto-'+id).oninput=()=>{output();persist({...config(),hp:+$('auto-hp').value,mp:+$('auto-mp').value});signature=JSON.stringify([game.hotbar,world.skillLevels,config()]);};
 $('auto-settings-close').onclick=$('auto-settings-done').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{clearInterval(timer);gear.setAttribute('aria-expanded','false');carry=null;});
 addEventListener('open-auto-settings',open);
 dispatchEvent(new Event('resize'));
 return {open,dialog};
}

import {drawCharacterFrame} from './character-size.js?v=41.2';
import {starterEquipment,equipItem,equipmentItem} from './equipment.js?v=41';
import {loadPaintedCharacter} from './painted-character.js?v=41.2';
import {motionFrame} from './animation-frames.js?v=37';
import {className} from './classes.js?v=18';
import {openHudPanel} from './hud-panels.js';
const make=(tag,css,text)=>{const el=document.createElement(tag);if(css)el.className=css;if(text)el.textContent=text;return el;};
export function equipmentIcon(item){
 const el=make('i','equipment-icon');el.setAttribute('aria-hidden','true');
 el.style.backgroundPosition=`${item.icon%6*20}% ${Math.floor(item.icon/6)/3*100}%`;
 if(item.dye&&item.dye!=='original'){const swatch=make('b');swatch.style.background={indigo:'#496ca9',crimson:'#a53b44',ivory:'#d7c89f'}[item.dye];el.append(swatch);}return el;
}
export function createEquipmentUI({account,game,hero,onArtwork}){
 const person=account.character,panel=make('dialog');panel.id='equipment-panel';panel.setAttribute('aria-labelledby','equipment-title');
 panel.innerHTML='<header><div><small>เครื่องแต่งกายและอาวุธ</small><h2 id="equipment-title">อุปกรณ์ของฉัน</h2></div><button id="equipment-close" aria-label="ปิดอุปกรณ์">×</button></header><div class="equipment-body"><section class="equipment-preview"><strong id="equipment-name"></strong><small id="equipment-profession"></small><canvas id="equipment-hero" width="320" height="320" aria-label="ตัวละครพร้อมอุปกรณ์ที่สวมใส่"></canvas><div class="equipment-motions" aria-label="ลองท่าทาง"></div><div id="equipment-slots"></div></section><section class="equipment-bag"><div class="equipment-tabs" aria-label="หมวดอุปกรณ์"></div><p class="equipment-hint">อุปกรณ์เริ่มต้นประจำสาย · เปลี่ยนรูปลักษณ์ได้โดยไม่เพิ่มค่าสถานะ</p><div id="equipment-items"></div><p id="equipment-status" role="status" aria-live="polite"></p></section></div>';
 document.getElementById('game-shell').append(panel);const $=id=>panel.querySelector('#'+id);
 $('equipment-name').textContent=person.name;$('equipment-profession').textContent=className(person.classId,person.gender);
 const trigger=make('button','equipment-open','อุปกรณ์ · เสื้อผ้าและอาวุธ');trigger.id='open-equipment';trigger.type='button';
 document.querySelector('#account-panel .account-card').insertBefore(trigger,document.getElementById('return-lobby'));
 const open=()=>{game.clearInput();openHudPanel(panel);render();$('equipment-close').focus();};trigger.onclick=open;
 $('equipment-close').onclick=()=>{panel.close();document.getElementById('open-account')?.focus();};
 addEventListener('keydown',e=>{if(e.code!=='KeyI'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable=true]')||document.querySelector('dialog:modal'))return;e.preventDefault();game.clearInput();if(panel.open)panel.close();else open();});
 for(const event of ['keydown','keyup','pointerdown','pointerup'])panel.addEventListener(event,e=>e.stopPropagation());
 panel.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();panel.close();document.getElementById('open-account')?.focus();}});
 let slot='weapon',mode='idle',frames=null,busy=false,applied='',requested='',retryAt=0,previewVersion=0;
 const modes=[['idle','ยืน'],['walk','เดิน'],['attack','โจมตี']];
 for(const [value,label]of modes){const b=make('button','',label);b.type='button';b.dataset.mode=value;b.onclick=()=>{mode=value;for(const item of b.parentNode.children)item.setAttribute('aria-pressed',String(item===b));};b.setAttribute('aria-pressed',String(value===mode));panel.querySelector('.equipment-motions').append(b);}
 for(const [value,label]of [['weapon','อาวุธ'],['outfit','เสื้อผ้า']]){const b=make('button','',label);b.type='button';b.dataset.slot=value;b.onclick=()=>{slot=value;render();};panel.querySelector('.equipment-tabs').append(b);}
 function render(){
  const gear=account.equipment;
  $('equipment-slots').replaceChildren(...['weapon','outfit'].map(s=>{const item=equipmentItem(gear[s]),row=make('div','equipment-slot');row.append(equipmentIcon(item),make('span','',item.name));return row;}));
  for(const b of panel.querySelectorAll('[data-slot]'))b.setAttribute('aria-pressed',String(b.dataset.slot===slot));
  $('equipment-items').replaceChildren(...starterEquipment(person.classId).filter(i=>i.slot===slot).map(item=>{
   const card=make('button','equipment-item'),text=make('span'),selected=gear[slot]===item.id;
   card.type='button';card.dataset.item=item.id;card.disabled=busy;card.setAttribute('aria-pressed',String(selected));
   text.append(make('strong','',item.name),make('small','',item.description),make('b','',selected?'สวมใส่อยู่':'สวมใส่'));
   card.append(equipmentIcon(item),text);card.onclick=()=>change(item);return card;
  }));
 }
 async function change(item){
  if(busy||account.equipment[item.slot]===item.id)return;busy=true;render();$('equipment-status').textContent='กำลังเตรียมอุปกรณ์…';
  try{
   // Preflight artwork so we cannot confirm a choice with missing frames.
   const next=equipItem(account.equipment,person.classId,item.id);
   await loadPaintedCharacter(person.classId,person.appearance,next);
   await account.equip(item.id);await sync();$('equipment-status').textContent='สวมใส่แล้ว · บันทึกอัตโนมัติ';
  }catch(e){$('equipment-status').textContent=['online-required','not-connected','disconnected','server-timeout'].includes(e.message)?'ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่เมื่อออนไลน์':e.message==='action-rate'?'รอสักครู่แล้วลองอีกครั้ง':'เปลี่ยนอุปกรณ์ไม่สำเร็จ กรุณาลองอีกครั้ง';}
  finally{busy=false;render();}
 }
 async function sync(){
  const gear=account.equipment,key=JSON.stringify(gear);if(key===applied||key===requested)return;
  requested=key;const token=++previewVersion;
  try{const art=await loadPaintedCharacter(person.classId,person.appearance,gear);if(token!==previewVersion)return;
   const changed=await hero.userData.setEquipment(gear);if(!changed||token!==previewVersion)return;
   frames=art[person.gender];applied=key;onArtwork?.(frames[0],gear);if(panel.open)render();
  }catch(e){retryAt=performance.now()+5000;throw e;}finally{if(requested===key)requested='';}
 }
 const context=$('equipment-hero').getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let last=0;
 function draw(ms){
  if(ms-last>500&&ms>retryAt){last=ms;sync().catch(()=>{if(panel.open)$('equipment-status').textContent='โหลดภาพอุปกรณ์ไม่สำเร็จ กำลังลองใหม่…';});}
  if(panel.open&&frames&&!document.hidden){const frame=motionFrame(mode,mode==='attack'?(ms/1000)%1.4:ms/1000,null,reduced.matches,person.classId);context.clearRect(0,0,320,320);context.imageSmoothingEnabled=false;drawCharacterFrame(context,frames[frame],32,12);}
  requestAnimationFrame(draw);
 }
 requestAnimationFrame(draw);return {open};
}

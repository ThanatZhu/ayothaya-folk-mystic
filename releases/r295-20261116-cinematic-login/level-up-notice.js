import {levelUpSummary} from './level-up-summary.js';
import {openHudPanel} from './hud-panels.js?v=34';

// Only a short, single notice appears automatically. The full equipment list
// belongs in a dialog the player explicitly opens, never over the battlefield.
export function createLevelUpNotice({clearInput=()=>{}}={}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./level-up-notice.css?v=1';document.head.append(css);
 const tip=document.createElement('button');tip.id='levelup-tip';tip.type='button';tip.hidden=true;tip.setAttribute('aria-haspopup','dialog');tip.setAttribute('aria-controls','levelup-details');tip.setAttribute('aria-live','polite');
 const label=document.createElement('span');tip.append(label);
 const dialog=document.createElement('dialog');dialog.id='levelup-details';dialog.setAttribute('aria-labelledby','levelup-details-title');
 const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.id='levelup-details-title';title.textContent='สิ่งที่ปลดล็อก';close.type='button';close.textContent='×';close.setAttribute('aria-label','ปิด');header.append(title,close);
 const intro=document.createElement('p'),list=document.createElement('ul');dialog.append(header,intro,list);document.body.append(tip,dialog);
 let current=null,timer=0;
 close.onclick=()=>dialog.close();
 const hide=()=>{clearTimeout(timer);tip.hidden=true;};
 const open=()=>{if(!current)return;clearInput();hide();title.textContent='Lv. '+current.level+' · สิ่งที่ปลดล็อก';intro.textContent=`+${current.points} แต้มสถานะ · ดูและอัปค่าได้ในหน้าสถานะ`;
  list.replaceChildren();if(!current.items.length){const li=document.createElement('li');li.textContent='ไม่มีอุปกรณ์ใหม่ในเลเวลนี้';list.append(li);}else for(const item of current.items){const li=document.createElement('li');li.textContent=item.name;list.append(li);}openHudPanel(dialog);};
 tip.onclick=open;
 for(const type of ['pointerdown','pointerup','click'])tip.addEventListener(type,e=>e.stopPropagation());
 function show(level,classId){current=levelUpSummary(level,classId);hide();if(!current)return;label.textContent=`Lv. ${current.level} · +${current.points} แต้ม`;
  tip.setAttribute('aria-label',`เลเวล ${current.level} · +${current.points} แต้ม · ดูสิ่งที่ปลดล็อก`);tip.title='แตะดูสิ่งที่ปลดล็อก';tip.hidden=false;timer=setTimeout(hide,4300);return current;}
 return {show,hide,open};
}

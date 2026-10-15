import {applySkillArt} from './skill-art.js?v=21';
import {openHudPanel} from './hud-panels.js?v=34';
// Skill window (menu "สกิล" or K): levels 1-10, skill points, next-level effect, upgrade button.
import {SKILL_MAX,OPEN_MAX,nextLevelText,scaledSkill} from './skill-progress.js?v=31';
const reasons={'no-skill-points':'แต้มสกิลไม่พอ · ได้เพิ่มเมื่อ Job Level ขึ้น','skill-trial-required':'ขั้น 5 ต้องผ่านบททดสอบวิชา · เปิดพร้อมระบบเควสต์','skill-max':'ขั้นสูงสุดแล้ว','skill-not-learned':'ยังไม่ได้เรียนสกิลนี้','online-required':'ต้องเชื่อมต่อออนไลน์เพื่ออัปสกิล','not-connected':'กำลังเชื่อมต่อ · ลองอีกครั้ง'};
export function createSkillWindow({game,classId}){
 const dialog=document.createElement('dialog');dialog.id='skill-window';dialog.setAttribute('aria-labelledby','skill-window-title');
 dialog.innerHTML='<header><div><small>SKILL MASTERY</small><h2 id="skill-window-title">สกิล</h2></div><b id="skill-points"></b><button class="mp-icon" id="skill-close" aria-label="ปิดหน้าสกิล">×</button></header><p class="skill-hint">ได้ 1 แต้มทุกครั้งที่ Job Level ขึ้น · ขั้น 1–4 อัปด้วยแต้ม · ขั้น 5 และ 10 ต้องผ่านเควสต์</p><ol id="skill-list"></ol><p id="skill-note" role="status"></p>';
 document.getElementById('game-shell').append(dialog);
 const $=id=>dialog.querySelector('#'+id),world=game.world;
 const rows=world.skills.map((s,i)=>{
  const li=document.createElement('li'),icon=document.createElement('strong'),text=document.createElement('div'),level=document.createElement('b'),button=document.createElement('button');
  icon.className='skill-icon';icon.textContent=s.icon;icon.style.setProperty('--skill-color',s.color);
  text.innerHTML='<strong></strong><small></small>';text.querySelector('strong').textContent=s.key+' · '+s.name;
  button.type='button';button.textContent='+';button.setAttribute('aria-label','อัปสกิล '+s.name);
  button.onclick=()=>{const r=game.upgradeSkill(i);$('skill-note').textContent=r===true?'อัปสกิล '+s.name+' แล้ว':(reasons[r]??'อัปสกิลไม่ได้');setTimeout(draw,250);};
  li.append(icon,text,level,button);$('skill-list').append(li);return {li,text,level,button};
 });
 if(classId)applySkillArt(rows.map(r=>r.li),classId);
 function draw(){
  const points=world.skillPoints??0;$('skill-points').textContent='แต้มสกิล '+points;
  world.skills.forEach((s,i)=>{
   const lv=world.skillLevels[i]??1,r=rows[i],now=scaledSkill(s,lv);
   r.level.textContent=lv?'Lv '+lv+'/'+SKILL_MAX:'ยังไม่เรียน';r.li.classList.toggle('locked',!lv);
   r.text.querySelector('small').textContent=(now?.damage?'พลัง '+now.damage+' · ':'')+(now?'MP '+now.cost+' · '+now.cd+' วิ · ':'')+nextLevelText(lv);
   r.button.disabled=!lv||lv>=OPEN_MAX||points<1;
  });
 }
 let timer=0;
 const open=()=>{draw();$('skill-note').textContent='';openHudPanel(dialog);clearInterval(timer);timer=setInterval(draw,500);};
 dialog.addEventListener('close',()=>clearInterval(timer));$('skill-close').onclick=()=>dialog.close();
 addEventListener('keydown',e=>{if(e.code!=='KeyK'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select'))return;if(dialog.open)dialog.close();else if(!document.querySelector('dialog:modal'))open();});
 addEventListener('open-skill-window',()=>{if(!dialog.open)open();});
 return {open,dialog};
}

// 0.83 owner layout: the portrait opens a character card (preview + status) and the game settings move to their
// own gear button. The settings panel is the old account panel (sync status, controls, sound, FPS / graphics,
// lobby, logout), so every module that adds to it keeps working; only its trigger changes.
import {STATS,STAT_LABEL,combatPower} from './character-stats.js?v=72';
import {baseProgress,jobProgress} from './experience.js?v=73';
import {className} from './classes.js?v=73';
import {jobFor} from './advancement.js?v=73';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
export function createProfileUI({game,account,statusUI,equipmentUI}){
 const link=document.createElement('link');link.rel='stylesheet';link.href='./profile-ui.css?v=85';document.head.append(link);
 const world=game.world,person=account.character;
 // Settings: keep the old toggle (cloud-save.js owns open/close and the blocking state) on a gear button.
 const toggleSettings=$('open-account').onclick;
 const card=document.querySelector('#account-panel .account-card');
 $('account-panel').addEventListener('click',e=>{if(e.target.id==='account-panel'&&$('account-panel').dataset.blocking!=='true')$('close-account').click();});card.querySelector('.brand').textContent='ตั้งค่าเกม';
 const gear=document.createElement('button');gear.type='button';gear.id='menu-settings';gear.title='ตั้งค่า';gear.setAttribute('aria-label','ตั้งค่าเกม');
 gear.innerHTML='<i aria-hidden="true"><b>⚙</b></i><span>ตั้งค่า</span>';gear.onclick=()=>{game.clearInput();toggleSettings?.();};
 // hud-63 re-orders the menu right after this runs, so the gear joins at the end on the next tick.
 setTimeout(()=>{const nav=$('game-menu'),drawer=$('menu-drawer');if(drawer)drawer.append(gear);else nav?.append(gear);});

 const dialog=document.createElement('dialog');dialog.id='profile-card';dialog.setAttribute('aria-labelledby','profile-title');
 dialog.innerHTML=`<header><div><small id="profile-class"></small><h2 id="profile-title"></h2></div><button class="mp-icon" id="profile-close" aria-label="ปิดโปรไฟล์">×</button></header>
 <div class="profile-body"><section class="profile-hero"><canvas id="profile-hero" width="320" height="320" aria-label="ตัวละครพร้อมชุดที่สวมใส่"></canvas><b id="profile-power"></b></section>
 <section class="profile-stats"><div id="profile-levels"></div><ol id="profile-base"></ol><dl id="profile-derived"></dl><div class="profile-actions"><button type="button" id="profile-raise"></button></div></section></div>`;
 ($('game-shell')??document.body).append(dialog);
 // The look / outfit button lives here now instead of in settings.
 const look=$('open-equipment');if(look){look.textContent='เปลี่ยนรูปลักษณ์ · ชุดและอาวุธ';dialog.querySelector('.profile-actions').append(look);}
 dialog.querySelector('#profile-close').onclick=()=>dialog.close();
 $('profile-raise').onclick=()=>{dialog.close();$('menu-status')?.click();};
 const open=()=>{game.clearInput();openHudPanel(dialog);render(true);};
 $('open-account').onclick=()=>dialog.open?dialog.close():open();

 const ctx=$('profile-hero').getContext('2d');let shown='';
 function render(force=false){
  if(!dialog.open)return;
  try{equipmentUI?.paint(ctx);}catch{} // a preview must never stop the game loop
  const v=statusUI.view(),d=v.derived,total=d.total??v.stats,base=baseProgress(world),job=jobProgress(world,world.profession.id,world.jobId);
  const sig=JSON.stringify([v,base.level,base.current,job.level,job.current]);if(!force&&sig===shown)return;shown=sig;
  $('profile-title').textContent=person.name;
  $('profile-class').textContent=(jobFor(person.classId,person.jobId)?.name??className(person.classId,person.gender));
  $('profile-power').innerHTML=`ค่าพลัง <span>${combatPower(d,base.level).toLocaleString('th-TH')}</span>`;
  const bar=(label,p)=>`<div class="profile-level"><b>${label} Lv.${p.level}${p.maxed?' · ตัน':''}</b><i style="--p:${Math.round(p.percent)}%"></i><small>${p.maxed?'สูงสุด':p.current+' / '+p.required}</small></div>`;
  $('profile-levels').innerHTML=bar('Base',base)+bar('Job',job);
  $('profile-base').innerHTML=STATS.map(k=>`<li><b>${STAT_LABEL[k]}</b><span>${total[k]??v.stats[k]}</span></li>`).join('');
  const pct=n=>Math.round(n*100)+'%';
  $('profile-derived').innerHTML=[['HP',`${Math.round(world.player.hp)} / ${d.maxHp}`],['MP',`${Math.round(world.player.mp)} / ${d.maxMp}`],[d.magic?'MATK':'ATK',d.magic?d.matk:d.atk],['DEF',d.def],['ความเร็วโจมตี',Math.round(100/d.delay)+'%'],['หลบหลีก',pct(d.flee)],['คริติคอล',pct(d.crit)]].map(([k,n])=>`<div><dt>${esc(k)}</dt><dd>${esc(n)}</dd></div>`).join('');
  $('profile-raise').textContent=v.points>0?`อัปแต้มสถานะ · เหลือ ${v.points} แต้ม`:'หน้าสถานะ · อัปแต้ม';$('profile-raise').classList.toggle('glow',v.points>0);
 }
 return {open,update(){render();}};
}

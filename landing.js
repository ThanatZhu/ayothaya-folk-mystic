// 0.98 landing page: live server status, weekly event clocks (the same rules the realm uses) and the class cards.
import {warWindow} from './guild-war.js?v=98';
import {arenaEnds} from './arena.js?v=98';
import {MULTIPLAYER_URL} from './multiplayer-config.js?v=28';

const $=id=>document.getElementById(id);
// Film playback is an explicit action; the hero uses clean artwork without the gameplay HUD.
const film=$('promo-dialog'),video=film?.querySelector('video');
$('open-film')?.addEventListener('click',()=>{film.showModal();video.play().catch(()=>{});});
$('close-film')?.addEventListener('click',()=>film.close());
film?.addEventListener('close',()=>video.pause());
film?.addEventListener('click',e=>{if(e.target===film){const r=film.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)film.close();}});
// Public server status. Keep connection failures distinct from an actual server restart.
async function status(){
 const box=$('status'),say=(state,text)=>{box.dataset.state=state;box.querySelector('span').textContent=text;};
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
  const health=await fetch(MULTIPLAYER_URL.replace(/^wss/,'https').replace(/\/realtime$/,'/health'),{cache:'no-store',signal:ctrl.signal}).then(r=>r.json());clearTimeout(timer);
  if(!health.ok||health.authority===false){say('wake','กำลังเตรียมโลกอโยธยา · กรุณารอสักครู่');setTimeout(status,10000);return;}
  say('on',health.players>0?`เซิร์ฟเวอร์เปิดอยู่ · ออนไลน์ ${health.players.toLocaleString('th-TH')} คน`:'เซิร์ฟเวอร์เปิดอยู่ · เข้ามาเป็นคนแรกได้เลย');
 }catch{say('wake','ออกเดินทางได้เลย · ตรวจสถานะอีกครั้งที่หน้าเข้าเกม');setTimeout(status,20000);}
}
status();

// Countdowns to the next guild war and the tournament rollover.
const left=ms=>{const m=Math.max(0,Math.floor(ms/6e4)),d=Math.floor(m/1440),h=Math.floor(m%1440/60),mm=m%60;return (d?d+' วัน ':'')+(d||h?h+' ชม. ':'')+mm+' นาที';};
function clocks(){
 const now=Date.now(),w=warWindow(now);
 $('war-clock').textContent=w.active?'กำลังรบอยู่ตอนนี้!':'อีก '+left(w.nextAt-now);$('war-clock').classList.toggle('live',w.active);
 $('arena-clock').textContent='อีก '+left(arenaEnds(now)-now);
}
clocks();setInterval(clocks,30000);

// Class cards: sprite frames cropped from the class sheets (male / female), tap to switch.
const CLASSES=[
 ['swordsman','นักดาบ','ดาบกับโล่ ยืนแนวหน้า รับดาเมจแทนเพื่อน'],
 ['lancer','นักทวน','ระยะกลาง แทงทะลุ คุมพื้นที่ได้ดี'],
 ['hunter','นายพราน','ศร กับดัก และไก่ชนคู่ใจ คอยช่วยคุมสนาม'],
 ['boxer','นักมวย','หมัดเร็ว คอมโบต่อเนื่อง ประชิดตัวสุดมัน'],
 ['rogue','จอมโจร','มีดคู่ หลบไว ลอบตีจุดอ่อน'],
 ['shaman','หมอผี','อาคมธาตุ ตีเป็นวง คุมฝูงมอน'],
 ['acolyte','พระ / แม่ชี','รักษา บัฟ และกันภัยให้ทั้งปาร์ตี้'],
];
$('class-list').innerHTML=CLASSES.map(([id,name,text],i)=>`<li><span class="class-index">0${i+1}</span><button type="button" data-id="${id}" data-g="m" aria-label="${name} · แตะเพื่อสลับชาย/หญิง"><img src="assets/landing98/class-${id}-m.webp" width="240" height="240" alt="" loading="lazy"></button><h3>${name}</h3><p>${text}</p></li>`).join('');
$('class-list').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;b.dataset.g=b.dataset.g==='m'?'f':'m';b.querySelector('img').src=`assets/landing98/class-${b.dataset.id}-${b.dataset.g}.webp`;});

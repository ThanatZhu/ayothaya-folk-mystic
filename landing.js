// 0.98 landing page: live server status, weekly event clocks (the same rules the realm uses) and the class cards.
import {warWindow} from './guild-war.js?v=98';
import {arenaEnds} from './arena.js?v=98';
import {MULTIPLAYER_URL} from './multiplayer-config.js?v=28';

const DISCORD_INVITE='https://discord.gg/Be9WwsX6'; // the Discord buttons and links show only when this is set
const $=id=>document.getElementById(id);
// 0.104.2 reduced motion: the promo stays on its poster frame
if(matchMedia('(prefers-reduced-motion:reduce)').matches)for(const v of document.querySelectorAll('.hero-video')){v.removeAttribute('autoplay');v.pause();}
// 0.105.1 sound toggle for the promo (autoplay has to start muted)
{const v=document.querySelector('.hero-video'),b=$('hero-sound');if(v&&b)b.onclick=()=>{v.muted=!v.muted;if(!v.muted){v.volume=.8;v.play().catch(()=>{});}b.setAttribute('aria-pressed',String(!v.muted));b.querySelector('i').textContent=v.muted?'🔇':'🔊';b.querySelector('span').textContent=v.muted?'เปิดเสียง':'ปิดเสียง';};}
if(DISCORD_INVITE)for(const a of document.querySelectorAll('[data-discord]')){a.href=DISCORD_INVITE;a.hidden=false;}

// Server status from the realm's /health (players across both channels). Render's free tier sleeps when idle;
// this request also wakes it, so the lobby is ready by the time the player gets there.
async function status(){
 const box=$('status'),say=(state,text)=>{box.dataset.state=state;box.querySelector('span').textContent=text;};
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
  const health=await fetch(MULTIPLAYER_URL.replace(/^wss/,'https').replace(/\/realtime$/,'/health'),{cache:'no-store',signal:ctrl.signal}).then(r=>r.json());clearTimeout(timer);
  if(!health.ok)throw new Error('down');
  say('on',health.players>0?`เซิร์ฟเวอร์เปิดอยู่ · ออนไลน์ ${health.players.toLocaleString('th-TH')} คน`:'เซิร์ฟเวอร์เปิดอยู่ · เข้ามาเป็นคนแรกได้เลย');
 }catch{say('wake','กำลังปลุกเซิร์ฟเวอร์ · กดเล่นได้เลย ใช้เวลาไม่เกิน 1 นาที');setTimeout(status,20000);}
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
 ['hunter','นายพราน','ยิงไกล คริแรง เก่งเรื่องเก็บมอนทีละตัว'],
 ['boxer','นักมวย','หมัดเร็ว คอมโบต่อเนื่อง ประชิดตัวสุดมัน'],
 ['rogue','จอมโจร','มีดคู่ หลบไว ลอบตีจุดอ่อน'],
 ['shaman','หมอผี','อาคมธาตุ ตีเป็นวง คุมฝูงมอน'],
 ['acolyte','พระ / แม่ชี','รักษา บัฟ และกันภัยให้ทั้งปาร์ตี้'],
];
$('class-list').innerHTML=CLASSES.map(([id,name,text])=>`<li><button type="button" data-id="${id}" data-g="m" aria-label="${name} · แตะเพื่อสลับชาย/หญิง"><img src="assets/landing98/class-${id}-m.webp" width="240" height="240" alt="" loading="lazy"></button><h3>${name}</h3><p>${text}</p></li>`).join('');
$('class-list').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;b.dataset.g=b.dataset.g==='m'?'f':'m';b.querySelector('img').src=`assets/landing98/class-${b.dataset.id}-${b.dataset.g}.webp`;});

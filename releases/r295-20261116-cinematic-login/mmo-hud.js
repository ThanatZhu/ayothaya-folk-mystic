import {mobileHudMedia} from './hud-mode204.js';
// 0.32 MMO HUD: radial skill wheel around the attack button, a status line (ping, FPS, server time, realm),
// notification dots on the menu, and coordinates under the minimap. Reuses the existing buttons and state.
const $=id=>document.getElementById(id);
const compactQuery=mobileHudMedia();
// Inner arc holds skills 1-4, outer arc 5-0, evenly spread from left of the attack button to above it.
// 0.101 a third arc outside both holds the Master slots (Alt+1-5), shown once a Master skill is learned.
// 0.103.7 the Master arc starts just above AUTO (which sits at ~185° on the same radius) and curves up to the top
// 0.103.8 learned Master skills fill that arc in order from its first spot, so a skill not learned yet leaves no gap
const INNER=[180,150,120,90],OUTER=[186,166.4,146.8,127.2,107.6,88],MASTER=[164,145,126,107,88];
function layoutWheel(){
 const box=document.querySelector('.combat-controls');if(!box)return;
 const compact=compactQuery.matches;
 // A 44px touch target needs at least 85px/130px radii to keep adjacent buttons apart.
 // 0.106.2 short landscape phones (≤440px tall): a smaller wheel keeps the Master arc clear of the quest card.
 const short=compact&&innerHeight<=440;
 const k=short?Math.max(.85,Math.min(1,(innerHeight-180)/230)):1,z=n=>Math.round(n*k); // under 410px tall it shrinks a little more
 const slot=short?z(38):compact?44:54,attack=short?z(58):compact?66:92,inner=short?z(76):compact?88:106,outer=short?z(118):compact?136:182;
 const cx=attack/2+6,cy=attack/2+6;
 box.style.setProperty('--wheel-slot',slot+'px');box.style.setProperty('--wheel-attack',attack+'px');
 box.style.width=Math.round(cx+outer+slot/2+4)+'px';box.style.height=Math.round(cy+outer+slot/2+4)+'px';
 // AUTO sits at the far left of the wheel's bottom row, clear of both arcs.
 const auto=$('auto-control')??$('auto-attack'),autoSize=short?z(60):compact?64:76;
 box.style.setProperty('--auto-size',autoSize+'px');
 if(auto){const gap=26;auto.style.right=Math.round(cx+outer+slot/2+gap)+'px';auto.style.bottom='4px';box.style.width=Math.round(cx+outer+slot/2+gap+autoSize+4)+'px';}
 document.documentElement.style.setProperty('--wheel-width',box.style.width);
 let m=0;
 [...document.querySelectorAll('#skills .skill')].forEach((b,i)=>{
  if(i>=10&&b.hidden)return;
  const a=(i<4?INNER[i]:i<10?OUTER[i-4]:MASTER[m++])*Math.PI/180,r=i<4?inner:i<10?outer:outer+slot+8;
  b.style.right=Math.round(cx-Math.cos(a)*r-slot/2)+'px';b.style.bottom=Math.round(cy+Math.sin(a)*r-slot/2)+'px';
 });
}
export function createMmoHud({game,account}){
 document.body.dataset.skillBank='all';document.body.classList.add('mmo-hud');
 document.querySelector('.combat-controls')?.classList.add('wheel');
 layoutWheel();addEventListener('resize',layoutWheel);compactQuery.addEventListener?.('change',layoutWheel);
 // The game loop re-sets each Master slot's hidden flag every frame; lay out again only when the shown set changes.
 let shown='';const skillsBox=$('skills');
 if(skillsBox)new MutationObserver(()=>{const now=[...skillsBox.querySelectorAll('.master-slot')].map(b=>b.hidden?0:1).join('');if(now!==shown){shown=now;layoutWheel();}}).observe(skillsBox,{subtree:true,attributes:true,attributeFilter:['hidden']});
 // Status line inside the online chip.
 const meta=document.createElement('span');meta.id='online-meta';$('online-button')?.append(meta);
 const getRealm=()=>'แนล '+(sessionStorage.getItem('ayothaya-channel-v1')||'1');
 let frames=0,fps=0,last=performance.now();
 const count=t=>{frames++;if(t-last>=1000){fps=Math.round(frames*1000/(t-last));frames=0;last=t;}requestAnimationFrame(count);};requestAnimationFrame(count);
 // Coordinates and realm under the minimap.
 const coords=document.createElement('small');coords.id='mini-meta';document.querySelector('.mini-panel')?.append(coords);
 const dot=id=>{const b=$(id);if(!b)return null;let d=b.querySelector('.menu-dot');if(!d){d=document.createElement('b');d.className='menu-dot';d.hidden=true;b.append(d);}return d;};
 function tick(){
  const realm=getRealm(),ping=Number($('online-button')?.dataset.ping),time=new Date().toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'});
  meta.textContent=[Number.isFinite(ping)&&ping>0?ping+' ms':null,'FPS '+fps,time,realm].filter(Boolean).join(' · ');
  const p=game.world.player;coords.textContent=`X ${Math.round(p.x)} · Y ${Math.round(-p.z)} · ${realm}`;
  const skills=dot('menu-skills'),players=dot('menu-players'),chat=dot('menu-chat');
  if(skills)skills.hidden=!(game.world.skillPoints>0&&(game.world.canSpendSkill?.()??true));
  if(players)players.hidden=!document.querySelector('#online-invites .mp-invite');
  if(chat)chat.hidden=$('dock-unread')?.hidden!==false;
 }
 tick();setInterval(tick,500);
 return {layout:layoutWheel};
}

// 0.32 MMO HUD: radial skill wheel around the attack button, a status line (ping, FPS, server time, realm),
// notification dots on the menu, and coordinates under the minimap. Reuses the existing buttons and state.
const $=id=>document.getElementById(id);
const compactQuery=matchMedia('(pointer:coarse),(max-width:900px),(max-height:600px)');
// Inner arc holds skills 1-4, outer arc 5-0, evenly spread from left of the attack button to above it.
const INNER=[180,150,120,90],OUTER=[186,166.4,146.8,127.2,107.6,88];
function layoutWheel(){
 const box=document.querySelector('.combat-controls');if(!box)return;
 const compact=compactQuery.matches;
 // A 44px touch target needs at least 85px/130px radii to keep adjacent buttons apart.
 const slot=compact?44:54,attack=compact?66:92,inner=compact?88:106,outer=compact?136:182;
 const cx=attack/2+6,cy=attack/2+6;
 box.style.setProperty('--wheel-slot',slot+'px');box.style.setProperty('--wheel-attack',attack+'px');
 box.style.width=Math.round(cx+outer+slot/2+4)+'px';box.style.height=Math.round(cy+outer+slot/2+4)+'px';
 // AUTO sits at the far left of the wheel's bottom row, clear of both arcs.
 const auto=$('auto-attack'),autoSize=compact?44:54;
 if(auto){auto.style.right=Math.round(cx+outer+slot/2+8)+'px';auto.style.bottom='4px';box.style.width=Math.round(cx+outer+slot/2+8+autoSize+4)+'px';}
 document.documentElement.style.setProperty('--wheel-width',box.style.width);
 [...document.querySelectorAll('#skills .skill')].forEach((b,i)=>{
  const a=(i<4?INNER[i]:OUTER[i-4])*Math.PI/180,r=i<4?inner:outer;
  b.style.right=Math.round(cx-Math.cos(a)*r-slot/2)+'px';b.style.bottom=Math.round(cy+Math.sin(a)*r-slot/2)+'px';
 });
}
export function createMmoHud({game,account}){
 document.body.dataset.skillBank='all';document.body.classList.add('mmo-hud');
 document.querySelector('.combat-controls')?.classList.add('wheel');
 layoutWheel();addEventListener('resize',layoutWheel);compactQuery.addEventListener?.('change',layoutWheel);
 // Status line inside the online chip.
 const meta=document.createElement('span');meta.id='online-meta';$('online-button')?.append(meta);
 const realm='เซิร์ฟ '+String(account.serverId||'').slice(-1);
 let frames=0,fps=0,last=performance.now();
 const count=t=>{frames++;if(t-last>=1000){fps=Math.round(frames*1000/(t-last));frames=0;last=t;}requestAnimationFrame(count);};requestAnimationFrame(count);
 // Coordinates and realm under the minimap.
 const coords=document.createElement('small');coords.id='mini-meta';document.querySelector('.mini-panel')?.append(coords);
 const dot=id=>{const b=$(id);if(!b)return null;let d=b.querySelector('.menu-dot');if(!d){d=document.createElement('b');d.className='menu-dot';d.hidden=true;b.append(d);}return d;};
 function tick(){
  const ping=Number($('online-button')?.dataset.ping),time=new Date().toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'});
  meta.textContent=[Number.isFinite(ping)&&ping>0?ping+' ms':null,'FPS '+fps,time,realm].filter(Boolean).join(' · ');
  const p=game.world.player;coords.textContent=`X ${Math.round(p.x)} · Y ${Math.round(-p.z)} · ${realm}`;
  const skills=dot('menu-skills'),players=dot('menu-players'),chat=dot('menu-chat');
  if(skills)skills.hidden=!(game.world.skillPoints>0);
  if(players)players.hidden=!document.querySelector('#online-invites .mp-invite');
  if(chat)chat.hidden=$('dock-unread')?.hidden!==false;
 }
 tick();setInterval(tick,500);
 return {layout:layoutWheel};
}

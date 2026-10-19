// 0.72 leaderboard: top 50 characters of this server by combat power (server-side ranking, offline players included).
import {className} from './classes.js?v=73';
import {openHudPanel} from './hud-panels.js?v=34';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
export function createLeaderboardUI({game}){
 const world=game.world,$=id=>document.getElementById(id);let data=null;
 const dialog=document.createElement('dialog');dialog.id='leaderboard';dialog.setAttribute('aria-labelledby','board-rank-title');
 dialog.innerHTML='<header><h2 id="board-rank-title">อันดับค่าพลัง</h2><button class="mp-icon" id="rank-close" aria-label="ปิดอันดับ">×</button></header><div id="rank-body"></div>';
 ($('game-shell')??document.body).append(dialog);dialog.querySelector('#rank-close').onclick=()=>dialog.close();
 function render(){
  const body=$('rank-body');if(!data){body.innerHTML='<p class="market-note">กำลังโหลด…</p>';return;}
  const row=r=>`<li class="${r.me?'me':''} r${Math.min(r.rank,4)}"><b>${r.rank}</b><div><strong>${esc(r.name)}</strong><small>${esc(className(r.classId,r.gender))} · Lv.${r.level}</small></div><span>${r.power.toLocaleString('th-TH')}</span></li>`;
  body.innerHTML=`<p class="market-note">ค่าพลังคิดจากพลังโจมตี ความเร็ว คริติคอล HP/MP DEF การหลบ และเลเวล · อัปเดตเมื่อสถานะเปลี่ยน</p>`+
   (data.me?`<p class="rank-me">อันดับของคุณ <b>#${data.me.rank}</b> · ค่าพลัง <b>${data.me.power.toLocaleString('th-TH')}</b></p>`:'')+
   `<ol class="rank-list">${data.rows.map(row).join('')||'<li class="empty">ยังไม่มีข้อมูล</li>'}</ol>`;
 }
 game.onEvent(e=>{if(e.type==='leaderboard'){data=e;render();}});
 function open(){if(!game.online)return world.notice('อันดับต้องเข้าโหมดออนไลน์');data=null;world.market?.('leaderboard');openHudPanel(dialog);render();}
 return {open};
}

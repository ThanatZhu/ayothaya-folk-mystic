// 0.72 leaderboard: top 50 characters of this server by combat power (server-side ranking, offline players included).
import {className} from './classes.js?v=73';
import {openHudPanel} from './hud-panels.js?v=34';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
export function createLeaderboardUI({game}){
 const world=game.world,$=id=>document.getElementById(id);let data=null,tab='power';
 const dialog=document.createElement('dialog');dialog.id='leaderboard';dialog.setAttribute('aria-labelledby','board-rank-title');
 dialog.innerHTML='<header><h2 id="board-rank-title">อันดับค่าพลัง</h2><button class="mp-icon" id="rank-close" aria-label="ปิดอันดับ">×</button></header><div class="craft-tabs" role="tablist"><button type="button" role="tab" data-tab="power">ค่าพลัง</button><button type="button" role="tab" data-tab="arena">ทัวร์นาเมนต์ประลอง</button></div><div id="rank-body"></div>';
 ($('game-shell')??document.body).append(dialog);dialog.querySelector('#rank-close').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
 function render(){
  dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  const body=$('rank-body');if(data&&tab==='arena'){body.innerHTML=arena(data.arena);return;}if(!data){body.innerHTML='<p class="market-note">กำลังโหลด…</p>';return;}
  const row=r=>`<li class="${r.me?'me':''} r${Math.min(r.rank,4)}"><b>${r.rank}</b><div><strong>${esc(r.name)}</strong><small>${esc(className(r.classId,r.gender))} · Lv.${r.level}</small></div><span>${r.power.toLocaleString('th-TH')}</span></li>`;
  body.innerHTML=`<p class="market-note">ค่าพลังคิดจากพลังโจมตี ความเร็ว คริติคอล HP/MP DEF การหลบ และเลเวล · อัปเดตเมื่อสถานะเปลี่ยน</p>`+
   (data.me?`<p class="rank-me">อันดับของคุณ <b>#${data.me.rank}</b> · ค่าพลัง <b>${data.me.power.toLocaleString('th-TH')}</b></p>`:'')+
   `<ol class="rank-list">${data.rows.map(row).join('')||'<li class="empty">ยังไม่มีข้อมูล</li>'}</ol>`;
 }
 // 0.96 weekly duel tournament: this week's points and last week's podium.
 function arena(a){
  if(!a)return '<p class="market-note">ยังไม่มีข้อมูล</p>';
  const ends=new Date(a.endsAt).toLocaleString('th-TH',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const row=r=>`<li class="${r.me?'me':''} r${Math.min(r.rank,4)}"><b>${r.rank}</b><div><strong>${esc(r.name)}</strong><small>${esc(className(r.classId))} · ชนะ ${r.wins} เสมอ ${r.draws} แพ้ ${r.losses}</small></div><span>${r.points} แต้ม</span></li>`;
  return `<p class="market-note">ท้าดวลผู้เล่นอื่นนอกเมือง · ชนะ +3 เสมอ +1 · คู่เดิมนับแต้มได้ 3 ครั้งต่อวัน · ปิดรอบ ${esc(ends)} · อันดับ 1–3 ได้เบี้ย ยันต์กันแตก และเหล็กไหล</p>`+
   (a.last?.length?`<p class="rank-me">สัปดาห์ก่อน: ${a.last.map(x=>['🥇','🥈','🥉'][x.place-1]+' '+esc(x.name)+' '+x.points).join(' · ')}</p>`:'')+
   (a.me?`<p class="rank-me">อันดับของคุณ <b>#${a.me.rank}</b> · <b>${a.me.points}</b> แต้ม</p>`:'')+
   `<ol class="rank-list">${a.rows.map(row).join('')||'<li class="empty">สัปดาห์นี้ยังไม่มีใครได้แต้ม · ไปท้าดวลกันเลย</li>'}</ol>`;
 }
 game.onEvent(e=>{if(e.type==='leaderboard'){data=e;render();}});
 function open(){if(!game.online)return world.notice('อันดับต้องเข้าโหมดออนไลน์');data=null;world.market?.('leaderboard');openHudPanel(dialog);render();}
 return {open};
}

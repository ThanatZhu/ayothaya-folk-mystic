// Public top-ten rankings. Character art uses the same saved look and calibrated sprites as the game.
import {className,isClass} from './classes.js?v=novice174';
import {jobFor} from './advancement.js';
import {loadPaintedStanding} from './painted-character.js?v=podium153';
import {FRAME_FOOT} from './character-size.js?v=41.2';
import {openHudPanel} from './hud-panels.js?v=34';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const number=n=>(Number.isFinite(n)?n:0).toLocaleString(globalThis.I18N?.locale??'th-TH');
const profession=r=>jobFor(r.classId,r.jobId??'')?.name??className(r.classId,r.gender);
export function createLeaderboardUI({game}){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./leaderboard-podium.css?v=153',import.meta.url).href;document.head.append(css);
 const world=game.world,$=id=>document.getElementById(id);let data=null,tab='power',generation=0;
 const artCache=new Map();
 const dialog=document.createElement('dialog');dialog.id='leaderboard';dialog.tabIndex=-1;dialog.setAttribute('aria-labelledby','board-rank-title');
 dialog.innerHTML='<header><h2 id="board-rank-title">อันดับค่าพลัง</h2><button type="button" class="mp-icon" id="rank-close" aria-label="ปิดอันดับ">×</button></header><div class="craft-tabs" role="tablist" aria-label="ประเภทอันดับ"><button type="button" role="tab" data-tab="power">ค่าพลัง</button><button type="button" role="tab" data-tab="arena">ทัวร์นาเมนต์ประลอง</button></div><div id="rank-body"></div>';
 ($('game-shell')??document.body).append(dialog);dialog.querySelector('#rank-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>generation++);
 dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
 const figure=r=>`<div class="rank-figure"><canvas width="320" height="320" data-rank-art="${r.rank}" aria-label="${esc(r.name)}"></canvas><small class="rank-art-error" hidden>ภาพตัวละครยังโหลดไม่สำเร็จ</small></div>`;
 function standings(rows,mode){
  const list=rows.slice(0,10),score=r=>mode==='arena'?`${number(r.points)} แต้ม`:number(r.power);
  const subtitle=r=>mode==='arena'?`ชนะ ${r.wins} เสมอ ${r.draws} แพ้ ${r.losses}`:`${profession(r)} · Lv.${r.level}`;
  const podium=[2,1,3].map(rank=>{
   const r=list.find(r=>r.rank===rank);
   if(!r)return `<article class="rank-podium-card place-${rank} vacant" aria-label="อันดับ ${rank}"><div class="rank-vacant">ยังไม่มีผู้ครองอันดับ</div><div class="rank-plinth"><b>${rank}</b></div></article>`;
   return `<article class="rank-podium-card place-${rank}${r.me?' is-me':''}" data-place="${rank}"><div class="rank-identity"><strong title="${esc(r.name)}">${esc(r.name)}</strong><small>${esc(profession(r))}${r.level?' · Lv.'+r.level:''}</small></div>${figure(r)}<div class="rank-plinth"><b>${rank}</b><span>${esc(score(r))}</span></div></article>`;
  }).join('');
  const row=r=>`<li class="rank-contender${r.me?' me':''}" data-place="${r.rank}"><b class="rank-number">${r.rank}</b>${figure(r)}<div class="rank-contender-copy"><strong>${esc(r.name)}</strong><small>${esc(subtitle(r))}</small></div><span class="rank-score">${esc(score(r))}</span></li>`;
  return `<section class="rank-podium" aria-label="สามอันดับแรก">${podium}</section><ol class="rank-list" start="4" aria-label="อันดับ 4 ถึง 10">${list.filter(r=>r.rank>=4).map(row).join('')}</ol>`;
 }
 async function paint(rows,version){
  await Promise.all(rows.slice(0,10).map(async r=>{
   const canvas=dialog.querySelector(`[data-rank-art="${r.rank}"]`);if(!canvas)return;
   try{
    const classId=isClass(r.classId)?r.classId:'novice',appearance=r.appearance??{},key=JSON.stringify([classId,r.gender,appearance,r.equipment]);
    if(!artCache.has(key)){const pending=loadPaintedStanding(classId,r.gender,appearance,r.equipment);artCache.set(key,pending);pending.catch(()=>artCache.delete(key));if(artCache.size>24)artCache.delete(artCache.keys().next().value);}
    const frame=await artCache.get(key);
    if(version!==generation||!dialog.open||!canvas.isConnected)return;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,320,320);ctx.imageSmoothingEnabled=false;
    // Align the calibrated soles precisely with the platform, retaining tall weapons and hair.
    ctx.drawImage(frame,0,320-FRAME_FOOT);canvas.dataset.artState='ready';
   }catch{
    if(version!==generation||!canvas.isConnected)return;canvas.dataset.artState='error';canvas.hidden=true;canvas.nextElementSibling.hidden=false;
   }
  }));
 }
 function render(){
  const version=++generation;
  dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  const body=$('rank-body');dialog.dataset.rankTab=tab;
  if(!data){body.innerHTML='<p class="market-note">กำลังโหลด…</p>';return;}
  const board=tab==='arena'?data.arena:data,rows=(board?.rows??[]).slice(0,10);
  let info='';
  if(tab==='arena'){
   const ends=board?.endsAt?new Date(board.endsAt).toLocaleString(globalThis.I18N?.locale??'th-TH',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
   info=`<p class="market-note">ท้าดวลผู้เล่นอื่นนอกเมือง · ชนะ +3 เสมอ +1 · คู่เดิมนับแต้มได้ 3 ครั้งต่อวัน · ปิดรอบ ${esc(ends)} · อันดับ 1–3 ได้เบี้ย ยันต์กันแตก และเหล็กไหล</p>`+
    (board?.last?.length?`<p class="rank-me">สัปดาห์ก่อน: ${board.last.map(x=>['🥇','🥈','🥉'][x.place-1]+' '+esc(x.name)+' '+x.points).join(' · ')}</p>`:'')+
    (board?.me?`<p class="rank-me">อันดับของคุณ <b>#${board.me.rank}</b> · <b>${board.me.points}</b> แต้ม</p>`:'');
  }else info='<p class="market-note">ค่าพลังคิดจากพลังโจมตี ความเร็ว คริติคอล HP/MP DEF การหลบ และเลเวล · อัปเดตเมื่อสถานะเปลี่ยน</p>'+
   (board?.me?`<p class="rank-me">อันดับของคุณ <b>#${board.me.rank}</b> · ค่าพลัง <b>${number(board.me.power)}</b></p>`:'');
  body.innerHTML=info+(rows.length?standings(rows,tab):'<p class="rank-empty">ยังไม่มีข้อมูล</p>');body.scrollTop=0;paint(rows,version);
 }
 game.onEvent(e=>{if(e.type==='leaderboard'){data=e;if(dialog.open)render();}});
 function open(){if(!game.online)return world.notice('อันดับต้องเข้าโหมดออนไลน์');data=null;game.clearInput();openHudPanel(dialog);dialog.focus({preventScroll:true});render();world.market?.('leaderboard');}
 return {open};
}

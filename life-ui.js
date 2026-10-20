// 0.48 everyday UI: ailment icons on the HUD, RO-style emote bubbles (picker + own bubble), daily login popup.
// Remote players' bubbles are drawn by multiplayer-ui.js; the server rewards the daily login online, this file offline.
import {emoteId,itemDef} from './items.js?v=94';
import {AILMENTS} from './ailments.js?v=01';
import {claimDaily,DAILY} from './daily.js?v=01';
import {activeEvent,expRate,surge} from './events.js?v=64';
import {iconStyle} from './bag-ui.js?v=98';
import {openHudPanel} from './hud-panels.js?v=34';
import * as THREE from 'three';

const $=id=>document.getElementById(id);
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
const POSES=[['idle','ลุก / ยืน'],['sit','นั่งพัก'],['sleep','นอนพัก'],['bow','ไหว้'],['celebrate','ดีใจ'],['guard','ตั้งท่า']];

export function createLifeUI({game,account,camera}){
 if(!document.querySelector('link[data-life-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='life-ui.css?v=64';css.dataset.lifeUi='';document.head.append(css);}
 const world=game.world;world.status??={};

 // Ailment row under the player frame.
 const row=document.createElement('div');row.id='ailment-row';row.setAttribute('aria-live','polite');document.body.append(row);let rowSig='';
 function drawAilments(){
  const st=world.status??{},sig=Object.entries(st).map(([k,t])=>k+Math.ceil(t)).join();if(sig===rowSig)return;rowSig=sig;
  row.innerHTML=Object.entries(st).filter(([k])=>AILMENTS[k]).map(([k,t])=>`<span title="${AILMENTS[k].name} · ${AILMENTS[k].text}">${icon(AILMENTS[k].icon)}<b>${Math.ceil(t)}</b></span>`).join('');
 }

 // Emote picker beside the quick slots; own bubble floats over the hero.
 const button=document.createElement('button');button.type='button';button.id='emote-open';button.title='อีโมต';button.setAttribute('aria-label','อีโมต');button.innerHTML=icon(emoteId(3));
 ($('quick-slots')??document.body).append(button);
 const runButton=document.createElement('button');runButton.id='run-toggle';runButton.type='button';runButton.textContent='วิ่ง';runButton.setAttribute('aria-label','เปิดโหมดวิ่ง');runButton.setAttribute('aria-pressed','false');($('quick-slots')??document.body).append(runButton);
 runButton.onclick=()=>{game.setRunning(!game.runningRequested);drawActions();};
 const picker=document.createElement('dialog');picker.id='emote-window';picker.setAttribute('aria-label','อีโมต');
 picker.innerHTML='<div class="emote-grid">'+Array.from({length:24},(_,i)=>`<button type="button" data-b="${i+1}" aria-label="อีโมต ${i+1}">${icon(emoteId(i+1))}</button>`).join('')+'</div><div class="emote-poses" style="flex-wrap:wrap">'+POSES.map(([k,n])=>`<button type="button" data-pose="${k}" style="flex:1 0 28%" aria-pressed="false">${n}</button>`).join('')+'</div><p class="animation-availability" aria-live="polite"></p>';
 ($('game-shell')??document.body).append(picker);
 button.onclick=()=>{if(picker.open)picker.close();else{game.clearInput();openHudPanel(picker);}};
 const bubble=document.createElement('span');bubble.className='emote-bubble';bubble.hidden=true;($('world-labels')??document.body).append(bubble);let bubbleUntil=0;
 const showBubble=id=>{bubble.innerHTML=icon(emoteId(id));bubbleUntil=performance.now()+3000;};
 picker.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const id=+b.dataset.b;picker.close();showBubble(id);if(game.online)world.market?.('bubble',{id});});
 picker.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{picker.close();game.requestEmote(b.dataset.pose);drawActions();});
 let actionSignature='';
 function drawActions(){
  const missing=['run','sit','sleep'].filter(k=>!game.supportsAction(k)),active=world.emote?.name??'idle',signature=missing.join(',')+'/'+active+'/'+game.runningRequested;
  if(signature===actionSignature)return;actionSignature=signature;
  for(const b of picker.querySelectorAll('[data-pose]')){b.disabled=!game.supportsAction(b.dataset.pose);b.title=b.disabled?'กำลังรอภาพแอนิเมชันของตัวละครชุดนี้':'';b.setAttribute('aria-pressed',String(active===b.dataset.pose));}
  runButton.disabled=!game.supportsAction('run');runButton.setAttribute('aria-pressed',String(game.runningRequested));runButton.setAttribute('aria-label',game.runningRequested?'เปลี่ยนกลับเป็นเดิน':'เปิดโหมดวิ่ง');runButton.textContent=game.runningRequested?'เดิน':'วิ่ง';runButton.title=runButton.disabled?'ท่าวิ่งกำลังรอภาพแอนิเมชันของตัวละครชุดนี้':'แตะสลับเดิน / วิ่ง · คีย์บอร์ดกด Shift ค้าง';
  picker.querySelector('.animation-availability').textContent=missing.length?'รอภาพของตัวละครชุดนี้: '+missing.map(k=>({run:'วิ่ง',sit:'นั่ง',sleep:'นอน'}[k])).join(' · '):'เดินหรือโจมตีเพื่อลุกจากท่านั่ง / นอน';
 }
 addEventListener('character-animation-capabilities',drawActions);drawActions();
 const at=new THREE.Vector3();
 function placeBubble(){
  if(performance.now()>bubbleUntil){bubble.hidden=true;return;}
  at.set(world.player.x,2.75,world.player.z).project(camera);
  bubble.hidden=Math.abs(at.x)>1.1||Math.abs(at.y)>1.1||at.z>=1;
  bubble.style.transform=`translate(-50%,-100%) translate(${(at.x*.5+.5)*innerWidth}px,${(-at.y*.5+.5)*innerHeight}px)`;
 }

 // Daily login: the server grants it online ('daily' event); offline guests claim here and get it through 'reward'.
 const daily=document.createElement('dialog');daily.id='daily-window';daily.setAttribute('aria-labelledby','daily-title');($('game-shell')??document.body).append(daily);
 const label=r=>[r.coins?icon('cowrie','item-icon small')+r.coins:'',...r.items.map(i=>icon(i.id,'item-icon small')+'×'+i.count)].filter(Boolean).join(' ');
 function showDaily(streak){
  daily.innerHTML=`<header><h2 id="daily-title">${icon('daily-gift','item-icon small')}ของขวัญเข้าเกมรายวัน</h2></header><p>เข้าเกมต่อเนื่องวันที่ <b>${streak}</b> · พรุ่งนี้มารับต่อ (ขาดหนึ่งวัน เริ่มวันที่ 1 ใหม่)</p>`+
   `<ol class="daily-track">${DAILY.map((r,i)=>`<li class="${i+1<streak?'got':i+1===streak?'today':''}" title="${r.items.map(x=>itemDef(x.id)?.name).join(', ')}"><small>วัน ${i+1}</small>${label(r)}</li>`).join('')}</ol><div class="daily-actions"><button type="button" id="daily-ok">รับแล้ว</button></div>`;
  daily.querySelector('#daily-ok').onclick=()=>daily.close();game.clearInput();openHudPanel(daily);
 }
 game.onEvent(e=>{
  if(e.type==='daily')setTimeout(()=>showDaily(e.streak),1500);
  if(e.type==='bubble'&&!game.online)showBubble(e.id);
 });
// Guests who stay offline (the realm server rewards anyone who is online a few seconds in).
 setTimeout(()=>{if(game.online||account?.cloud)return;
  const key='ayothaya-daily:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');let saved=null;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
  const r=claimDaily(saved,Date.now());
  if(r){try{localStorage.setItem(key,JSON.stringify(r.daily));}catch{}world.emit('reward',{coins:r.reward.coins,items:r.reward.items});showDaily(r.streak);}
 },4000);
 // 0.49 MVP timer chip (online) + MVP / dungeon-clear banners.
 const chips=document.createElement('div');chips.id='hud-chips';document.body.append(chips); // MVP + festival chips share one row under the minimap
 const chip=document.createElement('button');chip.type='button';chip.id='mvp-chip';chip.hidden=true;chips.append(chip);let chipSig='';
 chip.onclick=()=>world.notice(world.mvp?`MVP ${world.mvp.name} เกิดที่ ${world.mvp.map} ทุก 60 นาที · คนตีแรงสุดได้รางวัล MVP`:'');
 const clock=s=>s>=3600?Math.floor(s/3600)+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+' ชม.':Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
 function drawChip(){const m=game.online?world.mvp:null,sig=m?m.name+(m.in>0?clock(m.in):'up'):'';if(sig===chipSig)return;chipSig=sig;chip.hidden=!m;
  if(m)chip.innerHTML=`${icon(m.in>0?'boss-timer':'mvp-crown','item-icon small')}<span>MVP ${m.name}</span><b>${m.in>0?'อีก '+clock(m.in):'ปรากฏแล้ว!'}</b>`;chip.classList.toggle('up',!!m&&m.in<=0);}
 const banner=(html,cls)=>{const b=document.createElement('div');b.className='big-banner '+cls;b.innerHTML=html;document.body.append(b);setTimeout(()=>b.remove(),4200);};
 game.onEvent(e=>{
  if(e.type==='mvp')banner(`${icon('mvp-crown','item-icon big')}<strong>MVP!</strong><span>${e.name}</span>`,'mvp');
  if(e.type==='dungeonClear')banner(`${icon('dungeon-gate','item-icon big')}<strong>ล้างดันเจี้ยนสำเร็จ</strong><span>${e.map} · ${label(e.reward)}</span>`,'clear');
 });
 // 0.50 festival chip + the EXP rate the offline world uses (the server applies its own online).
 const fest=document.createElement('button');fest.type='button';fest.id='event-chip';fest.hidden=true;chips.append(fest);let festId=null,rateAt=0;
 // 0.64 field surge chip: where the next 5-minute EXP/drop x2 frenzy is, and a countdown. Clicking warps you there through the World map.
 const surgeChip=document.createElement('button');surgeChip.type='button';surgeChip.id='surge-chip';chips.append(surgeChip);let surgeText='';
 const mapName=id=>({'rice-fields':'ทุ่งขวัญข้าว','old-orchard':'สวนหมากคลองเก่า','moonlit-mill':'โรงสีใต้เงาจันทร์','lotus-marsh':'บึงบัวต้องมนตร์'})[id]??id;
 function drawSurge(){const now=Date.now(),s=surge(now),left=Math.max(0,Math.ceil(((s.active?s.endsAt:s.nextAt)-now)/1000)),mm=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
  const text=s.active?`🔥 ฝูงคลั่ง ${mapName(s.map)} · เหลือ ${mm}`:`🔥 ฝูงคลั่งถัดไป ${mapName(s.nextMap)} · อีก ${mm}`;
  if(text!==surgeText){surgeText=text;surgeChip.innerHTML=`<i aria-hidden="true">🔥</i><span>ฝูงคลั่ง${s.active?"":"ถัดไป"} ${mapName(s.active?s.map:s.nextMap)}</span><b>${s.active?"เหลือ ":"อีก "}${mm}</b>`;surgeChip.setAttribute("aria-label",text);surgeChip.classList.toggle("on",s.active);}}
 surgeChip.onclick=()=>{const s=surge(Date.now());world.notice(s.active?`ฝูงคลั่งที่ ${mapName(s.map)} · EXP ×2 และดรอป ×2 · กด M แล้วเลือก World เพื่อวาร์ป`:`ทุก 20 นาทีจะมีฝูงคลั่ง 5 นาทีในแผนที่นอกเมือง · ครั้งถัดไป ${mapName(s.nextMap)}`);};
 function drawEvent(){const e=activeEvent(Date.now());if(performance.now()>rateAt){rateAt=performance.now()+30000;world.expRate=expRate(Date.now(),document.body.dataset.map);}drawSurge();
  if((e?.id??null)===festId)return;festId=e?.id??null;fest.hidden=!e;if(!e)return;
  const end=new Date(e.end+'T00:00:00+07:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'});
  fest.innerHTML=`${icon('krathong','item-icon small')}<span>${e.name}</span><b>ถึง ${end}</b>`;fest.onclick=()=>world.notice(e.name+' · '+e.text);
  setTimeout(()=>world.notice('🏮 '+e.name+' · '+e.text),6000);}
 return {update(){drawAilments();placeBubble();drawChip();drawEvent();drawActions();}};
}

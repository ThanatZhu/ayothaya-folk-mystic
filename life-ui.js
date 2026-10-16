// 0.48 everyday UI: ailment icons on the HUD, RO-style emote bubbles (picker + own bubble), daily login popup.
// Remote players' bubbles are drawn by multiplayer-ui.js; the server rewards the daily login online, this file offline.
import {emoteId,itemDef} from './items.js?v=04';
import {AILMENTS} from './ailments.js?v=01';
import {claimDaily,DAILY} from './daily.js?v=01';
import {iconStyle} from './bag-ui.js?v=03';
import {openHudPanel} from './hud-panels.js?v=34';
import * as THREE from 'three';

const $=id=>document.getElementById(id);
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
const POSES=[['bow','ไหว้'],['celebrate','ดีใจ'],['rest','นั่งพัก'],['guard','ตั้งท่า']];

export function createLifeUI({game,account,camera}){
 if(!document.querySelector('link[data-life-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='life-ui.css?v=01';css.dataset.lifeUi='';document.head.append(css);}
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
 const picker=document.createElement('dialog');picker.id='emote-window';picker.setAttribute('aria-label','อีโมต');
 picker.innerHTML='<div class="emote-grid">'+Array.from({length:24},(_,i)=>`<button type="button" data-b="${i+1}" aria-label="อีโมต ${i+1}">${icon(emoteId(i+1))}</button>`).join('')+'</div><div class="emote-poses">'+POSES.map(([k,n])=>`<button type="button" data-pose="${k}">${n}</button>`).join('')+'</div>';
 ($('game-shell')??document.body).append(picker);
 button.onclick=()=>{if(picker.open)picker.close();else{game.clearInput();openHudPanel(picker);}};
 const bubble=document.createElement('span');bubble.className='emote-bubble';bubble.hidden=true;($('world-labels')??document.body).append(bubble);let bubbleUntil=0;
 const showBubble=id=>{bubble.innerHTML=icon(emoteId(id));bubbleUntil=performance.now()+3000;};
 picker.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const id=+b.dataset.b;picker.close();showBubble(id);if(game.online)world.market?.('bubble',{id});});
 picker.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{picker.close();dispatchEvent(new CustomEvent('hero-emote',{detail:b.dataset.pose}));});
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
 return {update(){drawAilments();placeBubble();}};
}

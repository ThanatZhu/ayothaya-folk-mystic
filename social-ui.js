// Friends and guild window (0.47). Online only: the realm server owns both lists.
// Whisper: "/w ชื่อ ข้อความ" in chat, or the กระซิบ button here (multiplayer-ui.js sends it).
import {emblemId} from './items.js?v=95';
import {GUILD_COST,EMBLEMS} from './social.js?v=01';
import {iconStyle} from './bag-ui.js?v=99';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
export const emblemIcon=(n,c='item-icon small')=>icon(emblemId(n),c);

export function createSocialUI({game,account}){
 if(!document.querySelector('link[data-social-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='social-ui.css?v=01';css.dataset.socialUi='';document.head.append(css);}
 const world=game.world,cmd=(type,data)=>world.market?.(type,data);
 let tab='friends',friends=[],guild=null,asks=[],pick=1,shown='';
 const menu=document.createElement('button');menu.id='menu-social';menu.type='button';menu.title='เพื่อน · กิลด์';menu.setAttribute('aria-label','เพื่อน และ กิลด์');
 menu.innerHTML='<i>'+icon('friend','item-icon menu-item-icon')+'</i><span>สังคม</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menu,$('menu-players')??null);
 const dialog=document.createElement('dialog');dialog.id='social-window';dialog.setAttribute('aria-labelledby','social-title');
 dialog.innerHTML='<header><h2 id="social-title">เพื่อน · กิลด์</h2><button class="mp-icon" id="social-close" aria-label="ปิด">×</button></header><div class="social-tabs" role="tablist"><button role="tab" data-tab="friends">เพื่อน</button><button role="tab" data-tab="guild">กิลด์</button></div><div id="social-asks"></div><div id="social-body"></div>';
 ($('game-shell')??document.body).append(dialog);
 const open=()=>{game.clearInput();openHudPanel(dialog);if(game.online){cmd('friendList');cmd('guildInfo');}render(true);};
 menu.onclick=()=>dialog.open?dialog.close():open();
 dialog.querySelector('#social-close').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render(true);});
 const whisper=name=>{dialog.close();const input=$('online-text');if(!input)return;input.value='/w '+name+' ';input.focus();};

 game.onEvent(e=>{
  if(e.type==='friends'){friends=e.list;render(true);}
  if(e.type==='guild'){guild=e.guild;render(true);}
  if(e.type==='friendAsk')asks.push({kind:'friend',from:e.from,text:`<b>${esc(e.name)}</b> ขอเป็นเพื่อน`});
  if(e.type==='guildAsk')asks.push({kind:'guild',guild:e.guild,text:`<b>${esc(e.from)}</b> ชวนเข้ากิลด์ ${emblemIcon(e.emblem)}<b>${esc(e.name)}</b>`});
  if(e.type==='friendAsk'||e.type==='guildAsk'){if(!dialog.open)open();else render(true);}
 });

 function render(force=false){
  if(!dialog.open)return;
  const sig=JSON.stringify([tab,friends,guild,asks.length,pick,game.online]);if(!force&&sig===shown)return;shown=sig;
  dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  $('social-asks').innerHTML=asks.map((a,i)=>`<p class="social-ask" data-i="${i}">${a.text}<button type="button" class="mp-primary" data-ok="1">ยอมรับ</button><button type="button" data-ok="">ปฏิเสธ</button></p>`).join('');
  $('social-asks').querySelectorAll('[data-ok]').forEach(b=>b.onclick=()=>{const i=+b.closest('[data-i]').dataset.i,a=asks[i],accept=!!b.dataset.ok;asks.splice(i,1);
   if(a.kind==='friend')cmd('friendAnswer',{from:a.from,accept});else cmd('guildAnswer',{guild:a.guild,accept});render(true);});
  const body=$('social-body');
  if(!game.online){body.innerHTML='<p class="social-note">เพื่อน กระซิบ และกิลด์ ต้องเข้าโหมดออนไลน์</p>';return;}
  if(tab==='friends'){
   body.innerHTML=`<form class="social-add" id="friend-form"><input id="friend-name" maxlength="24" placeholder="ชื่อตัวละครที่ออนไลน์อยู่" aria-label="ชื่อเพื่อน"><button type="submit">เพิ่มเพื่อน</button></form>`+
    `<ul class="social-list">${friends.map(f=>`<li class="${f.online?'on':''}" data-name="${esc(f.name)}"><i class="dot"></i><div><strong>${esc(f.name)}</strong><small>${f.online?esc(f.map):'ออฟไลน์'}</small></div><button type="button" data-a="whisper" ${f.online?'':'disabled'}>${icon('whisper','item-icon small')}กระซิบ</button><button type="button" data-a="remove" aria-label="ลบเพื่อน">ลบ</button></li>`).join('')||'<li class="empty">ยังไม่มีเพื่อน · พิมพ์ชื่อผู้เล่นที่ออนไลน์เพื่อส่งคำขอ</li>'}</ul>`;
   body.querySelector('#friend-form').onsubmit=e=>{e.preventDefault();const n=body.querySelector('#friend-name').value.trim();if(n)cmd('friendAdd',{name:n});};
   body.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const n=b.closest('li').dataset.name;if(b.dataset.a==='whisper')whisper(n);else cmd('friendRemove',{name:n});});
   return;
  }
  const emblems=Array.from({length:EMBLEMS},(_,i)=>`<button type="button" class="emblem${i+1===pick?' on':''}" data-e="${i+1}" aria-label="ตรากิลด์ ${i+1}">${emblemIcon(i+1,'item-icon')}</button>`).join('');
  if(!guild){
   body.innerHTML=`<p class="social-note">${icon('guild-flag','item-icon small')}ก่อตั้งกิลด์ใหม่ · ค่าธรรมเนียม ${GUILD_COST.toLocaleString('th-TH')} เบี้ย</p><form class="social-add" id="guild-form"><input id="guild-name" maxlength="16" placeholder="ชื่อกิลด์ (2–16 ตัว)" aria-label="ชื่อกิลด์"><button type="submit">ก่อตั้ง</button></form><p class="social-note">เลือกตรากิลด์</p><div class="emblem-grid">${emblems}</div>`;
   body.querySelector('#guild-form').onsubmit=e=>{e.preventDefault();cmd('guildCreate',{name:body.querySelector('#guild-name').value.trim(),emblem:pick});};
   body.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{pick=+b.dataset.e;body.querySelectorAll('[data-e]').forEach(x=>x.classList.toggle('on',x===b));});
   return;
  }
  const me=account?.character?.name??null,lead=guild.members.find(m=>m.leader)?.name,leader=!!me&&lead===me;
  body.innerHTML=`<div class="guild-head">${emblemIcon(guild.emblem,'item-icon big')}<div><strong>${esc(guild.name)}</strong><small>หัวหน้า ${esc(lead)} · สมาชิก ${guild.members.length}/30</small></div></div>`+(game.world.war?`<p class="social-note">🏯 ป้อมโรงสี · ผู้ครอง: ${esc(game.world.war.owner??'ยังไม่มี')} · กิลด์วอร์ ${esc(game.world.war.next)} ที่โรงสีใต้เงาจันทร์ · ทำลายศิลาราชสีห์เพื่อยึดป้อม</p>`:'')+
   (leader?`<form class="social-add" id="guild-invite"><input id="invite-name" maxlength="24" placeholder="ชื่อผู้เล่นที่จะชวน" aria-label="ชวนเข้ากิลด์"><button type="submit">ชวนเข้ากิลด์</button></form>`:'')+
   `<ul class="social-list">${guild.members.map(m=>`<li class="${m.online?'on':''}" data-name="${esc(m.name)}"><i class="dot"></i><div><strong>${m.leader?'♛ ':''}${esc(m.name)}</strong><small>${m.online?esc(m.map):'ออฟไลน์'}</small></div>${m.name!==me&&m.online?`<button type="button" data-a="whisper">กระซิบ</button>`:''}${leader&&m.name!==me?'<button type="button" data-a="kick">เชิญออก</button>':''}</li>`).join('')}</ul>`+
   (leader?`<details class="guild-emblem"><summary>เปลี่ยนตรากิลด์</summary><div class="emblem-grid">${emblems}</div></details>`:'')+
   `<div class="social-actions"><span>คุยในกิลด์: แท็บ <b>กิลด์</b> ในแชต</span><button type="button" id="guild-leave">ออกจากกิลด์</button></div>`;
  body.querySelector('#guild-invite')?.addEventListener('submit',e=>{e.preventDefault();const n=body.querySelector('#invite-name').value.trim();if(n)cmd('guildInvite',{name:n});});
  body.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const n=b.closest('li').dataset.name;if(b.dataset.a==='whisper')whisper(n);else if(confirm('เชิญ '+n+' ออกจากกิลด์?'))cmd('guildKick',{name:n});});
  body.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>cmd('guildEmblem',{emblem:+b.dataset.e}));
  body.querySelector('#guild-leave').onclick=()=>{if(confirm('ออกจากกิลด์ '+guild.name+'?'))cmd('guildLeave');};
 }
 return {update(){render();}};
}

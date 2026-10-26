import {announce} from './announcement-ui.js?v=149';
import {realmAnnouncement} from './announcement-state.js?v=149';
import {characterHead} from './character-label.js?v=149';
import {createPartyLayout} from './party-layout.js?v=overlay143';
import {createDesktopChat} from './desktop-chat-ui.js?v=channel144';
import {partyActions,partyRoster} from './party-ui-state.js?v=130';
import {createCombatPresentation,presentationDelta} from './combat-timing.js';
import {createRoleAnimation,roleAnimationActive,sampleRolePose,castFacing} from './combat-animation165.js?v=align169';
import {openHudPanel} from './hud-panels.js?v=34';
import {createInspectUI} from './inspect-ui.js?v=108.1';
import {iconStyle} from './bag-ui.js?v=107';
import {emblemId,emoteId} from './items.js?v=107';
import {createPetView} from './pet-ui.js?v=pets128';
import * as THREE from 'three';
import {CHARACTER_WORLD_SCALE} from './character-size.js?v=size1';
import {groundHeight} from './combat-core.js?v=novice174';
import {MultiplayerClient} from './multiplayer-client.js?v=death178';
import {CHANNELS,CHANNEL_KEY,normalizeChannel} from './realm-state.js?v=62';
import {multiplayerURL,wakeServer} from './multiplayer-config.js?v=28';
import {atlasPath,className} from './classes.js?v=novice174';
import {rebirthRank} from './character-stats.js?v=107';
import {customizeAtlas} from './character-appearance.js?v=41';
import {atlasCell} from './sprite-motion.js';
import {createPaintedAvatar} from './painted-avatar.js?v=novice174';
import {characterMotion,attackDuration,gaitStep,walkView} from './character-motion.js?v=novice174';
import {activeEmote,actionChoice,supportsCharacterAction} from './character-action-state.js?v=106.0';
import {skillPose,skillTrack} from './skill-choreography.js?v=novice174';
import {createSkillEffects} from './skill-effects.js?v=novice174';
const messages={'world-reset':'กำลังรีเซ็ตโลกก่อนเปิด CBT · กรุณากลับหน้าเลือกตัวละครหลังระบบพร้อม','invalid-auto-target':'เลือกเป้าหมายออโต้ใหม่อีกครั้ง','client-update-required':'เกมมีสกิลเวอร์ชันใหม่ กรุณารีเฟรชหน้าเกม','server-busy':'เซิร์ฟเวอร์กำลังบันทึกหรือสลับเครื่อง · ลองอีกครั้งในไม่กี่วินาที','stale-command':'คำสั่งซ้ำ/ล่าช้า · ลองกดใหม่อีกครั้ง','rate-limit':'กดเร็วเกินไป · รอสักครู่แล้วลองใหม่','duel-invalid':'ท้าดวลได้เฉพาะนอกเมือง กับผู้เล่นในแผนที่เดียวกัน','duel-busy':'มีคนกำลังประลองอยู่แล้ว','duel-far':'อยู่ห่างกันเกิน 20 ม. · เดินเข้าไปใกล้ก่อนท้าดวล','replaced':'บัญชีนี้เข้าเล่นจากอีกหน้าต่าง/อีกเครื่องแล้ว · หน้านี้ออฟไลน์','already-online':'บัญชีนี้กำลังเล่นอยู่อีกหน้าต่าง รอออกจากห้องเดิมก่อน','room-full':'ห้องเต็ม กรุณาลองอีกครั้ง','authentication-failed':'ยืนยันบัญชีไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่','save-failed':'เซิร์ฟเวอร์บันทึกไม่สำเร็จ การเล่นถูกหยุดเพื่อป้องกันข้อมูลหาย','chat-rate':'ส่งข้อความเร็วเกินไป กรุณารอสักครู่','no-party':'ต้องเข้าปาร์ตี้ก่อน','expired-invite':'คำเชิญหมดอายุแล้ว','party-full-or-leader':'ปาร์ตี้เต็ม หรือคุณไม่ใช่หัวหน้าปาร์ตี้','not-party-leader':'เฉพาะหัวหน้าปาร์ตี้ทำรายการนี้ได้','invalid-invite':'เชิญผู้เล่นนี้ไม่ได้','invite-rate':'รอก่อนส่งคำเชิญอีกครั้ง','inspect-gone':'ผู้เล่นคนนี้ไม่อยู่ในแผนที่นี้แล้ว','invalid-chat':'ข้อความยาวได้ไม่เกิน 240 ตัวอักษร','world-rate':'แชตโลกส่งได้ทุก 8 วินาที','no-skill-points':'แต้มสกิลไม่พอ','skill-trial-required':'ขั้น 5 ต้องผ่านบททดสอบวิชา','skill-max':'สกิลขั้นสูงสุดแล้ว','skill-not-learned':'ยังไม่ได้เรียนสกิลนี้','invalid-skill':'สกิลไม่ถูกต้อง'};
const chatErrors=new Set(['chat-rate','world-rate','no-party','invalid-chat']);
const statusText={connecting:'กำลังเข้าห้อง…',reconnecting:'กำลังเชื่อมต่อใหม่…',online:'เชื่อมต่อแล้ว · เซิร์ฟเวอร์บันทึกให้อัตโนมัติ',offline:'ออกจากห้องแล้ว',error:'เชื่อมต่อไม่ได้ · กรุณาโหลดหน้าใหม่หลังแก้ปัญหา'};
const editable=e=>e.target instanceof Element&&!!e.target.closest('input,textarea,select,button,a,[contenteditable=true]');
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
export function createMultiplayer({scene,camera,controls,game,account,frame}){
 const url=multiplayerURL(),local=['127.0.0.1','localhost'].includes(location.hostname),views=new Map(),fx=createSkillEffects(scene),projection=new THREE.Vector3(),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const presentation=createCombatPresentation();
 const partyStyle=document.createElement('link');partyStyle.rel='stylesheet';partyStyle.href='party-ui.css?v=130';document.head.append(partyStyle);let rosterMode='all';
 const shell=document.getElementById('game-shell'),labels=document.getElementById('world-labels'),compact=matchMedia('(pointer:coarse),(max-width:900px)');
 let client=null,active=false,clock=0,party=null,roster=[],loadingGeneration=0,players=new Map(),self=null,unread=0,currentChannel=normalizeChannel(new URLSearchParams(location.search).get('channel')||(typeof sessionStorage!=='undefined'?sessionStorage.getItem(CHANNEL_KEY):1)),channelCounts=[];const seenMessages=new Set(),bubbles=new Map();
 // HUD chip: connection state dot + label. Opens the room/party roster.
 const button=el('button');button.id='online-button';button.dataset.state='offline';button.innerHTML='<i class="mp-dot" aria-hidden="true"></i><span id="online-label">ผู้เล่นออนไลน์</span>';shell.append(button);
 const chButton=el('button','mp-hud-channel');chButton.id='channel-button';chButton.type='button';chButton.innerHTML='<span class="ch-ico">🌐</span> <b id="channel-btn-label" class="ch-name">แนล 1</b><b id="channel-btn-mob" class="ch-name-mobile">CH 1</b> <span class="ch-detail">สลับแนล ▾</span>';shell.append(chButton);
 const chPop=el('div','mp-channel-popover');chPop.id='channel-popover';chPop.hidden=true;chPop.innerHTML='<div class="mp-pop-head"><strong>เลือกแนล (ย้ายแนลได้ทันที)</strong><button type="button" id="channel-pop-close" aria-label="ปิด">×</button></div><div id="channel-pop-list" class="mp-pop-list"></div>';shell.append(chPop);
 chButton.onclick=e=>{e.stopPropagation();game.clearInput();chPop.hidden=!chPop.hidden;if(!chPop.hidden)drawChannels();};
 chPop.querySelector('#channel-pop-close').onclick=()=>{chPop.hidden=true;};
 const bindMiniMeta=()=>{const mm=document.getElementById('mini-meta');if(mm&&!mm.dataset.chBound){mm.dataset.chBound='1';mm.style.cursor='pointer';mm.title='คลิกเพื่อเลือกแนล (Channel 1–5)';mm.onclick=e=>{e.stopPropagation();chButton.click();};}};
 setTimeout(bindMiniMeta,500);setInterval(bindMiniMeta,2000);
 addEventListener('pointerdown',e=>{if(!chPop.hidden&&!chPop.contains(e.target)&&!chButton.contains(e.target))chPop.hidden=true;},true);
 const chip=text=>{button.querySelector('#online-label').textContent=text;};
 // Nonmodal roster window for joining, inviting and party management.
 const dialog=el('dialog');dialog.id='online-panel';dialog.dataset.state='offline';dialog.setAttribute('aria-labelledby','online-title');
 dialog.innerHTML='<header><div><small>AYOTHAYA · MAIN SERVER</small><h2 id="online-title">เพื่อนร่วมอโยธยา</h2></div><button id="online-close" class="mp-icon" aria-label="ปิดหน้าผู้เล่นออนไลน์">×</button></header><p id="online-status" class="mp-status" role="status"><i class="mp-dot" aria-hidden="true"></i><span></span></p><div class="online-actions"><button id="online-reload" class="mp-primary" hidden>เชื่อมต่อใหม่</button><button id="online-party-leave" hidden>ออกจากปาร์ตี้</button></div><section class="party-roster-tools" id="party-roster-tools" hidden><p id="party-role-note"></p><button id="party-roster-invite" class="mp-primary">เพิ่มคน</button><button id="party-show-all">ผู้เล่นทั้งหมด</button></section><section class="mp-channels"><h3>เลือกแนล (ย้ายแนลได้ทันที)</h3><div id="online-channels" class="mp-channel-bar"></div></section><section class="mp-roster"><h3><span id="party-roster-title">ผู้เล่นในแนล</span> <small id="online-count"></small></h3><input type="search" id="party-search" aria-label="ค้นหาชื่อผู้เล่น" placeholder="ค้นหาชื่อผู้เล่น" autocomplete="off"><ul id="online-players"></ul></section><p class="online-note">ปาร์ตี้สูงสุด 5 คน · อยู่เซิร์ฟเวอร์และแมพเดียวกันจึงพบกัน · เมืองเป็นเขตปลอดภัย · กด Enter เพื่อแชตระหว่างเล่น</p>';
 shell.append(dialog);const $=id=>shell.querySelector('#'+id),status=text=>{$('online-status').lastChild.textContent=text;};
 // Chat dock: always visible while online and never pauses the game.
 const dock=el('section');dock.id='online-dock';dock.hidden=true;dock.dataset.channel='room';dock.setAttribute('aria-label','แชตออนไลน์');
 dock.innerHTML='<header><div class="mp-tabs" role="tablist" aria-label="ช่องสนทนา"><button role="tab" data-channel="world" aria-selected="false">โลก</button><button role="tab" data-channel="room" aria-selected="true">ห้องนี้</button><button role="tab" data-channel="whisper" aria-selected="false">กระซิบ</button><button role="tab" data-channel="party" aria-selected="false" disabled>ปาร์ตี้</button><button role="tab" data-channel="guild" aria-selected="false" disabled>กิลด์</button><button role="tab" data-channel="system" aria-selected="false">ระบบ</button></div><button id="dock-toggle" class="mp-dock-bar" aria-expanded="true"><span id="dock-preview"></span><b id="dock-unread" hidden></b><i aria-hidden="true">▾</i></button></header><div id="online-messages" role="log" aria-label="ข้อความสนทนา" aria-live="polite"></div><p id="dock-note" role="status"></p><form id="online-chat"><input id="online-whisper-to" aria-label="ชื่อผู้รับข้อความกระซิบ" placeholder="ชื่อผู้รับ" maxlength="40" autocomplete="off" hidden><input id="online-text" aria-label="ข้อความแชต" maxlength="240" autocomplete="off" enterkeyhint="send" placeholder=""><button type="submit">ส่ง</button></form>';
 shell.append(dock);
 const partyFrame=el('section');partyFrame.id='party-frame';partyFrame.hidden=true;partyFrame.setAttribute('aria-label','สมาชิกปาร์ตี้');partyFrame.innerHTML='<h3 class="party-heading"><button type="button" id="party-manage" aria-label="เปิดหน้าจัดการปาร์ตี้"><span>ปาร์ตี้ <small id="party-count"></small></span><span class="party-open-mark" aria-hidden="true">›</span></button></h3><ol id="party-members"></ol><div class="party-actions"><button type="button" id="party-add">+ เพิ่มคน</button><button type="button" id="party-leave">ออกจากปาร์ตี้</button></div>';shell.append(partyFrame);
 const partyMenu=el('button');partyMenu.id='menu-party';partyMenu.type='button';partyMenu.hidden=true;partyMenu.innerHTML='<i aria-hidden="true"></i><span>ปาร์ตี้</span>';requestAnimationFrame(()=>{(document.getElementById('menu-drawer')??document.getElementById('game-menu'))?.append(partyMenu);});
 const partyLayout=createPartyLayout({frame:partyFrame,getCount:()=>party?.members.length??0});partyStyle.addEventListener('load',partyLayout.request);
 const openRoster=mode=>{rosterMode=mode;$('party-search').value='';drawRoster();game.clearInput();openHudPanel(dialog);if(mode==='invite')requestAnimationFrame(()=>$('party-search').focus({preventScroll:true}));};
 $('party-manage').onclick=partyMenu.onclick=()=>openRoster('party');$('party-add').onclick=$('party-roster-invite').onclick=()=>{if(partyActions(party,client?.id,client?.status==='online').canInvite)openRoster('invite');};
 $('party-show-all').onclick=()=>openRoster('all');$('party-search').oninput=()=>drawRoster();$('party-leave').onclick=()=>{game.clearInput();if(partyActions(party,client?.id,client?.status==='online').canLeave)client.command('leaveParty');};
 for(const name of ['pointerdown','pointerup','click'])partyFrame.addEventListener(name,e=>e.stopPropagation());
 const invites=el('div');invites.id='online-invites';invites.setAttribute('aria-live','assertive');shell.append(invites);
 // Online is automatic: whenever a backend exists and the account can authenticate, entering the game joins the shared world.
 const canJoin=!!url&&(account.cloud||local);
 if(canJoin)game.expectNetwork?.();
 if(!url){status('กำลังเตรียมเซิร์ฟเวอร์ออนไลน์ · ขณะนี้ยังเป็นโหมดเล่นคนเดียว');button.dataset.state=dialog.dataset.state='unavailable';}else if(!canJoin)status('เข้าเกมด้วย Google เพื่อเล่นออนไลน์');else{status('กำลังเข้าห้อง…');chip('กำลังเข้าห้อง…');}
 button.onclick=()=>openRoster('all');$('online-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>button.focus());
 $('online-reload').onclick=()=>location.reload();
 // Chat dock behaviour.
 function setCollapsed(value){dock.classList.toggle('collapsed',value);$('dock-toggle').setAttribute('aria-expanded',String(!value));$('dock-toggle').setAttribute('aria-label',value?'เปิดแชต':'ย่อแชต');if(!value){unread=0;$('dock-unread').hidden=true;$('online-messages').scrollTop=$('online-messages').scrollHeight;}}
 setCollapsed(compact.matches);
 $('dock-toggle').onclick=()=>setCollapsed(!dock.classList.contains('collapsed'));
 function setChannel(channel){dock.dataset.channel=channel;$('online-whisper-to').hidden=channel!=='whisper';for(const tab of dock.querySelectorAll('[role=tab]'))tab.setAttribute('aria-selected',String(tab.dataset.channel===channel));$('online-text').placeholder=(compact.matches?'':'Enter · ')+(channel==='whisper'?'พิมพ์ข้อความกระซิบ…':channel==='party'?'พิมพ์ถึงปาร์ตี้…':channel==='guild'?'พิมพ์ถึงกิลด์…':channel==='world'?'พิมพ์ถึงทุกคนในเซิร์ฟ…':'พิมพ์ถึงทุกคนในห้อง… (/w ชื่อ ข้อความ = กระซิบ)');$('online-messages').scrollTop=$('online-messages').scrollHeight;}
 for(const tab of dock.querySelectorAll('[role=tab]'))tab.onclick=()=>setChannel(tab.dataset.channel);
 setChannel('room');
 let noteTimer;const dockNote=text=>{$('dock-note').textContent=text;clearTimeout(noteTimer);noteTimer=setTimeout(()=>{$('dock-note').textContent='';},3500);};
 $('online-text').addEventListener('focus',()=>{game.clearInput();setCollapsed(false);});
 $('online-text').addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();if(desktopChat.desktop())desktopChat.close();else e.target.blur();}});
 addEventListener('keydown',e=>{if(e.code!=='Enter'||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||!active||dock.hidden||editable(e)||document.querySelector('dialog[open]'))return;e.preventDefault();if(desktopChat.desktop())desktopChat.open();else{setCollapsed(false);$('online-text').focus();}});
 const desktopChat=createDesktopChat({shell,dock,game,setCollapsed});
 function log(m,live=false){
  if(seenMessages.has(m.id))return;seenMessages.add(m.id);if(seenMessages.size>160)seenMessages.delete(seenMessages.values().next().value);
  const mine=m.actor===client?.id,p=el('p',['party','system','guild','whisper','world'].includes(m.channel)?m.channel:''),name=el('b','',m.channel==='whisper'&&mine?'ถึง '+m.to:m.name),time=el('time','',new Date(m.time).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}));
  const mark=el('span','chat-author-mark',Array.from(m.name??'?')[0]);mark.setAttribute('aria-hidden','true');mark.dataset.i18nSkip='';p.append(mark);
  if(m.channel==='party')p.append(el('span','mp-tag','ปาร์ตี้'));if(m.channel==='guild')p.append(el('span','mp-tag','กิลด์'));if(m.channel==='whisper')p.append(el('span','mp-tag','กระซิบ'));if(m.channel==='world')p.append(el('span','mp-tag','โลก'));if(mine)p.classList.add('mine');name.dataset.initial=Array.from(m.name??'?')[0];const said=el('span','chat-message-text',' '+m.text);if(m.channel!=='system'){name.dataset.i18nSkip='';said.dataset.i18nSkip='';}p.append(name,said,time);
  const box=$('online-messages'),atEnd=box.scrollHeight-box.scrollTop-box.clientHeight<40;box.append(p);while(box.children.length>80)box.firstChild.remove();if(atEnd)box.scrollTop=box.scrollHeight;
  $('dock-preview').toggleAttribute('data-i18n-skip',m.channel!=='system');$('dock-preview').textContent=m.name+': '+m.text;
  if(live){if(dock.classList.contains('collapsed')){unread++;$('dock-unread').textContent=unread>9?'9+':String(unread);$('dock-unread').hidden=false;}if(m.channel==='room'||m.channel==='party')bubble(m);}
 }
 // Speech bubbles over the speaker; positioned every frame in update().
 function bubble(m){let b=bubbles.get(m.actor);if(!b){b={node:el('span','chat-bubble')};labels.append(b.node);bubbles.set(m.actor,b);}b.node.textContent=m.text.length>70?m.text.slice(0,69)+'…':m.text;b.node.classList.toggle('party',m.channel==='party');b.until=performance.now()+5500;}
 function place(node,x,y,z){projection.set(x,y,z).project(camera);node.style.transform=`translate(-50%,-100%) translate(${(projection.x*.5+.5)*innerWidth}px,${(-projection.y*.5+.5)*innerHeight}px)`;return Math.abs(projection.x)<=1.1&&Math.abs(projection.y)<=1.1&&projection.z<1;}
 function pickChannel(id){
  const next=normalizeChannel(id);chPop.hidden=true;if(next===currentChannel)return;
  const ch=CHANNELS.find(c=>c.id===next)||CHANNELS[0];
  currentChannel=next;try{sessionStorage.setItem(CHANNEL_KEY,String(currentChannel));}catch{}
  drawChannels();
  if(client?.status==='online')client.command('switchChannel',{channel:next});
  else game.world?.notice?.('ย้ายเข้าสู่ '+ch.name+' แล้ว');
 }
 function drawChannels(){
  const cur=CHANNELS.find(c=>c.id===currentChannel)||CHANNELS[0];
  const lbl=$('channel-btn-label')||document.getElementById('channel-btn-label');if(lbl)lbl.textContent=cur.name;
  const mob=$('channel-btn-mob')||document.getElementById('channel-btn-mob');if(mob)mob.textContent='CH '+cur.id;
  const popList=$('channel-pop-list');
  if(popList){
   popList.replaceChildren();
   for(const ch of CHANNELS){
    const info=channelCounts.find(c=>c.channel===ch.id),count=info?info.players:(ch.id===currentChannel?roster.length:0);
    const row=el('button',ch.id===currentChannel?'mp-pop-item active':'mp-pop-item');row.type='button';
    row.innerHTML=`<div><b>${ch.name}</b><small>${ch.subtitle}</small></div><span>${count} คน</span>`;
    row.onclick=()=>pickChannel(ch.id);
    popList.append(row);
   }
  }
  const box=$('online-channels');if(!box)return;box.replaceChildren();
  for(const ch of CHANNELS){
   const info=channelCounts.find(c=>c.channel===ch.id),count=info?info.players:(ch.id===currentChannel?roster.length:0);
   const b=el('button',ch.id===currentChannel?'mp-channel active':'mp-channel');
   b.setAttribute('aria-pressed',String(ch.id===currentChannel));
   b.innerHTML=`<b>${ch.name}</b><small>${count} คน</small>`;
   b.onclick=()=>pickChannel(ch.id);
   box.append(b);
  }
 }
 drawChannels();
 function drawRoster(){
  drawChannels();
  if(rosterMode==='party'&&!party)rosterMode='all';dialog.dataset.rosterMode=rosterMode;
  const controls=partyActions(party,client?.id,client?.status==='online'),list=partyRoster(roster,{mode:rosterMode,party,selfId:client?.id,query:$('party-search').value});
  $('party-roster-title').textContent=rosterMode==='invite'?'เลือกผู้เล่นเพื่อเชิญ':rosterMode==='party'?'สมาชิกปาร์ตี้':'ผู้เล่นในแนล';
  $('party-roster-tools').hidden=rosterMode==='all';$('party-roster-invite').hidden=rosterMode==='invite';$('party-roster-invite').disabled=!controls.canInvite;
  $('party-role-note').textContent=controls.reason==='full'?'ปาร์ตี้เต็ม 5 คน':controls.reason==='leader-only'?'หัวหน้าปาร์ตี้เท่านั้นที่เพิ่มสมาชิกได้':rosterMode==='invite'?'เชิญผู้เล่นที่ยังไม่มีปาร์ตี้ในแนลเดียวกัน':'เลือกสมาชิกเพื่อจัดการปาร์ตี้';
  $('online-players').replaceChildren();$('online-count').textContent=list.length+' คน';
  for(const p of list){
   const li=el('li',p.id===client?.id?'me':''),who=el('div','mp-who'),name=el('b','',p.name);name.dataset.i18nSkip='';li.dataset.playerId=p.id;who.append(name,el('small','',className(p.classId)+(p.id===client?.id?' · คุณ':'')+(p.partyId&&p.partyId===party?.id?' · ปาร์ตี้เรา':p.partyId?' · มีปาร์ตี้':'')+(p.here===false?' · '+p.map:'')));
   if(party?.leader===p.id)name.prepend(el('span','mp-crown','♛ '));li.append(el('span','mp-avatar',(globalThis.I18N?.t(className(p.classId))??className(p.classId)).slice(0,1)),who);
   const action=(text,type,data,primary)=>{const b=el('button',primary?'mp-primary':'',text);b.dataset.command=type;b.type='button';b.disabled=client?.status!=='online'||type==='invite'&&party&&!controls.canInvite;b.onclick=()=>client?.command(type,data);li.append(b);};
   if(p.id!==client?.id&&!p.partyId&&(!party||party.leader===client.id))action('เชิญ','invite',{target:p.id},true);
   if(rosterMode==='all'&&p.id!==client?.id&&game.world.myGuild)action('ชวนกิลด์','guildInvite',{name:p.name});
   if(rosterMode==='all'&&p.id!==client?.id&&p.here!==false)action('ท้าดวล','duel',{target:p.id});
   if(p.id!==client?.id&&party?.leader===client?.id&&party.members.includes(p.id)){action('หัวหน้า','leader',{target:p.id});action('นำออก','kick',{target:p.id});}
   $('online-players').append(li);
  }
  if(!list.length)$('online-players').append(el('li','party-empty',rosterMode==='invite'?'ยังไม่มีผู้เล่นที่เชิญได้ในแนลนี้':'ไม่พบผู้เล่นที่ค้นหา'));
  $('online-party-leave').hidden=!party;$('online-party-leave').disabled=!controls.canLeave;
  const partyTab=dock.querySelector('[data-channel=party]');partyTab.disabled=!party;if(!party&&dock.dataset.channel==='party')setChannel('room');
  drawParty();
 }
 function drawParty(){
  const controls=partyActions(party,client?.id,client?.status==='online');partyFrame.hidden=!party;partyMenu.hidden=!party;if(!party)return;$('party-count').textContent=party.members.length+'/5';
  $('party-add').disabled=!controls.canInvite;$('party-leave').disabled=!controls.canLeave;$('party-add').title=controls.reason==='full'?'ปาร์ตี้เต็ม 5 คน':controls.reason==='leader-only'?'หัวหน้าปาร์ตี้เท่านั้นที่เพิ่มสมาชิกได้':'เพิ่มสมาชิกปาร์ตี้';
  $('party-members').replaceChildren(...party.members.map(id=>{
   const info=roster.find(p=>p.id===id),li=el('li',id===client?.id?'me':'');li.dataset.id=id;li.setAttribute('role','button');li.tabIndex=0;li.onclick=()=>{game.selectAlly?.(id);updateParty();};li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();li.click();}};
   const name=el('b','',(party.leader===id?'♛ ':'')+(info?.name??'…')+(id===client?.id?' (คุณ)':''));
   name.dataset.i18nSkip='';const bar=el('span','mp-hp');bar.append(el('i'));li.append(name,el('small','mp-state'),bar);return li;
  }));updateParty();partyLayout.refresh();
 }
 function updateParty(){
  if(!party)return;
  for(const li of $('party-members').children){
   const state=li.dataset.id===client?.id?self:players.get(li.dataset.id),hp=state?.hp??0,max=state?.maxHp??140,away=!state,offline=state&&state.connected===false;
   li.querySelector('.mp-hp i').style.width=Math.max(0,Math.min(100,hp/max*100))+'%';
   li.setAttribute('aria-pressed',String(game.world.supportTargetId===li.dataset.id));li.classList.toggle('low',!away&&hp/max<.3);li.classList.toggle('away',away||!!offline);li.querySelector('.mp-state').textContent=offline?'หลุด':away?'ไกล':hp<=0?'หมดแรง':'';
  }
 }
 async function identity(){
  if(account.cloud)return {token:await account.token(),serverId:account.serverId,slotId:account.slotId,channel:currentChannel};
  const key='ayothaya-local-network:'+account.slotId;let data;try{data=JSON.parse(sessionStorage.getItem(key));}catch{}
  if(!data){const endpoint=new URL(url.replace(/^ws/,'http'));endpoint.pathname='/dev/session';const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:account.character.name,gender:account.character.gender})});if(!response.ok)throw new Error('local-server-unavailable');data=await response.json();sessionStorage.setItem(key,JSON.stringify(data));}
  return {token:data.token,serverId:data.serverId,slotId:data.slotId,channel:currentChannel};
 }
 function remove(view){view.emoteBubble?.remove();view.pet?.dispose();scene.remove(view.sprite);view.sprite.userData.dispose();for(const t of view.frames)t.dispose();view.label.remove();}
 async function addRemote(state){
  const id=state.id,generation=loadingGeneration,placeholder={loading:true,state};views.set(id,placeholder);
  try{const image=new Image();image.src=atlasPath(state.character.classId);await image.decode();if(generation!==loadingGeneration||views.get(id)!==placeholder)return;
   const art=customizeAtlas(image,state.character.appearance,state.character.classId),frames=Array.from({length:4},(_,i)=>frame(art,atlasCell(state.character.gender,i))),sprite=createPaintedAvatar(frames[0],{directional:false,classId:state.character.classId,gender:state.character.gender,appearance:state.character.appearance,equipment:state.equipment});sprite.scale.set(CHARACTER_WORLD_SCALE,CHARACTER_WORLD_SCALE,1);sprite.position.set(state.player.x,.06,state.player.z);scene.add(sprite);
   const label=el('span','remote-player-label');label.append(el('small','rank-title'),el('b','',state.character.name));label.querySelector('b').dataset.i18nSkip='';label.querySelector('.rank-title').hidden=true;labels.append(label);
   views.set(id,{...placeholder,loading:false,sprite,frames,label,gait:0,action:null,emote:null,equipmentKey:JSON.stringify(state.equipment)});
  }catch{if(views.get(id)===placeholder)placeholder.retryAt=performance.now()+5000;}
 }
 function acceptSnapshot(s){presentation.push({type:'presentationSnapshot',snapshot:s,at:s.time},s.time);for(const e of s.events??[])presentation.push(e,s.time);}
 function applySnapshot(s){
  clock=s.time;game.applyNetworkSnapshot(s);self={...s.self.player,connected:true};players=new Map(s.players.map(p=>[p.id,p.player&&{...p.player,connected:p.connected}]));
  const ids=new Set(s.players.map(p=>p.id));for(const [id,v] of views)if(!ids.has(id)){if(!v.loading)remove(v);views.delete(id);}
  for(const p of s.players){const v=views.get(p.id);if(v){v.state={...v.state,...p};if(v.retryAt&&performance.now()>v.retryAt)addRemote(v.state);}else if(p.character)addRemote(p);}
  updateParty();
 }
 function presentEvent(e){
   if(e.type==='presentationSnapshot'){applySnapshot(e.snapshot);return;}
   if(e.type==='bossResult'||e.type==='bossDirectory'){game.world.events.push(e);return;}
   if(e.actor===client.id){game.world.events.push({...e,presentationQueuedAt:performance.now()/1000});return;}
   const v=views.get(e.actor);if(!v||v.loading)return;
   if(e.type==='petSkill'){v.pet?.attack(e.to,e.lag??0);const ids={fireBurst:'sky-spear',lotusCleanse:'cleanse',moonBarrier:'sanctuary',roarGuard:'guard',trueSight:'mark',flowerBind:'vine-trap',riceHeal:'heal',jadeShell:'sanctuary',waterMana:'regen',echoSlow:'hamstring'};game.roleEffects?.spawn({roleSkillId:ids[e.kind],from:{x:e.x,z:e.z},to:e.to??{x:e.x+.5,z:e.z},lag:e.lag??0});}
   if(e.type==='damage'&&Number.isInteger(e.id))game.world.events.push(e); // 0.99.3 everyone's numbers float over the monster they hit
   if(e.type==='miss'&&Number.isInteger(e.id))game.world.events.push(e);
   if(e.type==='playerHit')game.popup?.({...e,hurt:true},{key:'r'+e.actor,pos:()=>({x:v.state.player.x,y:2.2+v.sprite.position.y,z:v.state.player.z})});
   if(e.roleSkillId&&['cast','rolePassive'].includes(e.type)){game.roleEffects?.spawn({...e,lag:e.lag??0});if(e.type==='cast'){v.roleAction=createRoleAnimation(e,clock);v.action=null;v.emote=null;v.state.emote=null;}return;}
   if(e.type==='castCancel'){if(v.roleAction?.castId===e.castId)v.roleAction=null;if(v.action?.castId===e.castId)v.action=null;game.roleEffects?.cancel(e.castId,e.actor);fx.cancel(e.castId,e.actor);return;}
   if(e.type==='cast'){
    if(!roleAnimationActive(v.roleAction,clock))v.roleAction=null;
    const id=v.state.character.classId,skill=skillTrack(id,e.skillIndex),current=skillTrack(id,v.action?.index);
    if(skill||!current||clock-v.action.start>=current.duration)v.action={index:e.skillIndex??null,start:clock-(e.lag??0),timing:e.timing,castId:e.castId,facing:castFacing(e,v.state.player.face)};
    const track=skill&&e.timing?{...skill,duration:e.timing.duration,strikes:e.timing.impacts.map(at=>at/e.timing.duration)}:skill??{...skillTrack(id,0),duration:e.timing?.duration??attackDuration(id),strikes:[.42]},from=e.from??v.state.player,to=e.to??from;
    const effect=fx.create(track,{...e,skillIndex:skill?e.skillIndex:null,synced:!!e.timing,from,to:{...to,y:groundHeight(game.world.nav,to.x,to.z)},direction:v.state.player.face,groundY:groundHeight(game.world.nav,from.x,from.z),reduced:reduced.matches,quality:compact.matches?'low':'high'});effect.age=e.lag??0;
   }
   if(e.type==='emote'&&!Object.hasOwn(v.state,'emote'))v.emote=activeEmote({name:e.name,time:e.time??clock},clock);
   if(e.type==='playerHit'){v.hitUntil=clock+.28;v.emote=null;v.state.emote=null;}
   if(e.type==='bubble'){v.emoteBubble??=el('span','emote-bubble');labels.append(v.emoteBubble);v.emoteBubble.innerHTML=`<i class="item-icon" style="${iconStyle(emoteId(e.id))}"></i>`;v.emoteUntil=performance.now()+3000;}
 }
 // 0.93 a duel challenge reuses the invite card; accepting challenges back, declining just lets it expire.
 function showInvite(m,duel=false){
  const row=el('div','mp-invite'),text=el('p'),remaining=Math.max(0,m.expires-Date.now()),timer=el('i','mp-timer');
  text.append(el('b','',m.name),document.createTextNode(duel?' ท้าคุณประลอง!':' ชวนคุณเข้าปาร์ตี้'));timer.style.animationDuration=remaining+'ms';row.append(el('span','mp-invite-icon',duel?'⚔':'♛'),text);
  const actions=el('div','mp-invite-actions');for(const [label,accept] of duel?[['รับคำท้า',true],['ไม่รับ',false]]:[['รับคำเชิญ',true],['ปฏิเสธ',false]]){const b=el('button',accept?'mp-primary':'',label);b.onclick=()=>{if(duel){if(accept)client.command('duel',{target:m.from});}else client.command('answer',{invite:m.id,accept});row.remove();};actions.append(b);}
  row.append(actions,timer);invites.append(row);setTimeout(()=>row.remove(),remaining);
 }
 async function join(){
  if(active)return;wakeServer();
  try{await account.beginOnline();active=true;client=new MultiplayerClient({url,identity});game.setNetwork(client);account.setOnline(client);
   client.addEventListener('status',({detail})=>{button.dataset.state=dialog.dataset.state=detail;chip(detail==='online'?'ออนไลน์ · '+roster.length+' คน':detail==='reconnecting'?'กำลังเชื่อมต่อใหม่…':detail==='connecting'?'กำลังเข้าห้อง…':detail==='error'?'เชื่อมต่อไม่ได้':'ผู้เล่นออนไลน์');status(detail==='connecting'?'กำลังเข้าห้อง…':detail==='reconnecting'?'กำลังเชื่อมต่อใหม่…':statusText[detail]);dock.hidden=!['online','reconnecting'].includes(detail);$('online-reload').hidden=!['error','reconnecting'].includes(detail);if(dock.hidden)partyFrame.hidden=true;else drawParty();if(detail==='error'&&!dialog.open){game.clearInput();openHudPanel(dialog);}});
   client.addEventListener('channelSwitched',({detail})=>{if(detail.channel){currentChannel=normalizeChannel(detail.channel);try{sessionStorage.setItem(CHANNEL_KEY,String(currentChannel));}catch{}}for(const [id,v] of views){if(!v.loading)remove(v);views.delete(id);}presentation.clear();if(detail.snapshot)acceptSnapshot(detail.snapshot);drawChannels();});
   client.addEventListener('welcome',({detail})=>{if(detail.channel){currentChannel=normalizeChannel(detail.channel);try{sessionStorage.setItem(CHANNEL_KEY,String(currentChannel));}catch{}drawChannels();}for(const m of detail.history)log(m);
    // 1.01 the server decides the map (someone no longer in a guild wakes up in the capital, not the hall): follow it.
    const parts=String(detail.room??'').split(':'),mapId=detail.snapshot?.self?.mapId??(parts[1]?.startsWith('ch')?parts[2]:parts[1]);if(mapId&&document.body.dataset.map&&mapId!==document.body.dataset.map){const go=()=>location.assign('?server='+account.serverId+'&channel='+currentChannel+'&map='+encodeURIComponent(mapId));
     // the page opens the saved map first, so save the server's choice before reloading (else it would loop)
     account.applyMap?.(mapId);Promise.resolve(account.data&&account.save?.({...account.data,mapId,position:null})).catch(()=>{}).finally(go);}});
   client.addEventListener('snapshot',({detail})=>acceptSnapshot(detail));
   client.addEventListener('events',({detail})=>game.world.events.push(...detail.events));
   client.addEventListener('chat',({detail})=>{log(detail,true);if(realmAnnouncement(detail))announce(detail.text,{id:detail.id});});
   client.addEventListener('social',({detail})=>{roster=detail.players;party=detail.party;if(detail.channel)currentChannel=normalizeChannel(detail.channel);if(detail.channels)channelCounts=detail.channels;drawRoster();chip('ออนไลน์ · '+roster.length+' คน');});
   client.addEventListener('error',({detail})=>{const text=messages[detail.code]??(client.status==='error'?'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · กดเชื่อมต่อใหม่อีกครั้ง':'ไม่สามารถทำรายการนี้ได้ · '+detail.code);status(text);if(chatErrors.has(detail.code)||!dialog.open)dockNote(text);if(!chatErrors.has(detail.code))game.world.notice(text);});
   client.addEventListener('invite',({detail})=>showInvite(detail));
   client.addEventListener('duelAsk',({detail})=>showInvite(detail,true));
   // Round-trip time for the status line.
   client.addEventListener('pong',({detail})=>{if(Number.isFinite(detail.stamp))button.dataset.ping=String(Math.round(performance.now()-detail.stamp));});
   setInterval(()=>{if(client.status==='online')client.command('ping',{stamp:performance.now()});},4000);
   await client.connect();
  }catch{active=false;button.dataset.state=dialog.dataset.state='error';chip('เชื่อมต่อไม่ได้');status('เปิดออนไลน์ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อ');$('online-reload').hidden=false;if(!dialog.open)openHudPanel(dialog);}
 }
 if(canJoin)join();
 $('online-party-leave').onclick=()=>client?.command('leaveParty');
 $('online-chat').onsubmit=e=>{
  e.preventDefault();const input=$('online-text'),text=input.value.trim();if(!text){input.blur();return;}
  // '/w ชื่อ ข้อความ' (or /ก) whispers; the prefix stays in the box so a conversation can continue.
  const w=/^\/(?:w|ก)\s+(\S+)\s+([\s\S]+)$/.exec(text),channel=dock.dataset.channel;
  if(channel==='whisper'&&!w&&!$('online-whisper-to').value.trim()){dockNote('กรอกชื่อผู้รับก่อนส่งกระซิบ');$('online-whisper-to').focus();return;}
  if(!client?.command('chat',w?{channel:'whisper',to:w[1],text:w[2]}:channel==='whisper'?{channel:'whisper',to:$('online-whisper-to').value.trim(),text}:{channel:['party','guild','world'].includes(channel)?channel:'room',text})){dockNote('ต้องเชื่อมต่อออนไลน์ก่อนส่งข้อความ');return;}
  input.value=w?'/w '+w[1]+' ':'';if(desktopChat.desktop())input.focus({preventScroll:true});else if(!compact.matches)input.blur();
 };
 // System lines (EXP, level ups, notices) appear only in this player's chat, never sent to others.
 addEventListener('game-notice',({detail})=>{if(!active||typeof detail!=='string')return;log({id:'sys-'+performance.now()+Math.random(),channel:'system',name:'ระบบ',text:detail,time:Date.now()});});
 addEventListener('pagehide',()=>client?.stop());
 addEventListener('pageshow',e=>{if(e.persisted&&active&&client?.status!=='online')client?.connect();});
 // 0.99.15 tap another player's character: a small menu with party, trade, friend, whisper and duel
 const tapRay=new THREE.Raycaster(),tapPoint=new THREE.Vector2(),playerMenu=el('div');playerMenu.id='player-menu';playerMenu.hidden=true;shell.append(playerMenu);
 const closeMenu=()=>{playerMenu.hidden=true;};
 addEventListener('pointerdown',e=>{if(!playerMenu.hidden&&!playerMenu.contains(e.target))closeMenu();},true);
 addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 const inspect=createInspectUI({game});
 function openPlayerMenu(s,x,y){
  const name=s.character?.name??'ผู้เล่น',info=roster.find(p=>p.id===s.id),title=el('b','',name);title.dataset.i18nSkip='';playerMenu.replaceChildren(title);
  const add=(text,fn)=>{const b=el('button','',text);b.type='button';b.onclick=()=>{closeMenu();fn();};playerMenu.append(b);};
  add('ดูอุปกรณ์',()=>inspect.open(s.id));
  if(!(info?.partyId??s.partyId)&&(!party||party.leader===client.id))add('ชวนเข้าปาร์ตี้',()=>client.command('invite',{target:s.id}));
  // guild invites go by name; the server checks that we lead a guild with room and that they have none
  if(game.world.myGuild&&!s.guild)add('ชวนเข้ากิลด์',()=>game.world.market?.('guildInvite',{name}));
  add('แลกเปลี่ยนของ',()=>game.world.market?.('tradeRequest',{target:s.id}));
  add('เพิ่มเพื่อน',()=>game.world.market?.('friendAdd',{name}));
  if(!/\s/.test(name))add('กระซิบ',()=>{dock.hidden=false;setCollapsed(false);const input=$('online-text');input.value='/w '+name+' ';input.focus();});
  if(document.body.dataset.safe!=='true')add('ท้าดวล',()=>client.command('duel',{target:s.id}));
  playerMenu.hidden=false;const r=playerMenu.getBoundingClientRect();
  playerMenu.style.left=Math.max(8,Math.min(x+10,innerWidth-r.width-8))+'px';playerMenu.style.top=Math.max(8,Math.min(y+10,innerHeight-r.height-8))+'px';
 }
 game.playerTap=(x,y)=>{
  if(!client)return false;
  tapPoint.set(x/innerWidth*2-1,-y/innerHeight*2+1);tapRay.setFromCamera(tapPoint,camera);
  const list=[...views.values()].filter(v=>!v.loading&&v.sprite),hit=tapRay.intersectObjects(list.map(v=>v.sprite))[0];if(!hit)return false;
  const v=list.find(v=>{for(let o=hit.object;o;o=o.parent)if(o===v.sprite)return true;return false;});if(!v)return false;
  openPlayerMenu(v.state,x,y);return true;
 };
 return {openParty:openRoster,get partyState(){return {party,online:client?.status==='online'};},get paused(){return false;},update(dt){
  if(!active)return;clock+=presentationDelta(dt);presentation.flush(presentEvent);fx.update(presentationDelta(dt),camera);
  const guildTab=dock.querySelector('[data-channel=guild]');guildTab.disabled=!game.world.myGuild;if(guildTab.disabled&&dock.dataset.channel==='guild')setChannel('room');
  for(const v of views.values()){
   if(v.loading)continue;const state=v.state,p=state.player,old=v.sprite.position.clone(),f=1-Math.exp(-Math.min(.05,dt)*14);v.sprite.position.x+=(p.x-v.sprite.position.x)*f;v.sprite.position.z+=(p.z-v.sprite.position.z)*f;v.gait+=gaitStep(Math.hypot(v.sprite.position.x-old.x,v.sprite.position.z-old.z),Math.min(.05,dt),state.character.classId,p.running?'run':'walk');
   const equipmentKey=JSON.stringify(state.equipment);
   if(equipmentKey!==v.equipmentKey&&!v.equipmentLoading&&performance.now()>(v.equipmentRetryAt??0)){
    v.equipmentLoading=true;v.sprite.userData.setEquipment(state.equipment).then(changed=>{if(changed)v.equipmentKey=equipmentKey;}).catch(()=>{v.equipmentRetryAt=performance.now()+5000;}).finally(()=>{v.equipmentLoading=false;});
   }
   const elapsed=clock-(v.action?.start??-100),track=skillTrack(state.character.classId,v.action?.index),emote=activeEmote(Object.hasOwn(state,'emote')?state.emote:v.emote,clock);
   const skillActive=track&&elapsed<(v.action.timing?.duration??track.duration),basicActive=v.action&&v.action.index===null&&elapsed<(v.action.timing?.duration??attackDuration(state.character.classId));
   const roleActive=roleAnimationActive(v.roleAction,clock);
   const chosen=actionChoice({time:clock,hit:clock<(v.hitUntil??0)&&!skillActive&&!basicActive&&!roleActive,cast:roleActive||skillActive,attack:basicActive,emote,moving:p.moving||Math.hypot(v.sprite.position.x-old.x,v.sprite.position.z-old.z)>.001,running:p.running,dead:p.hp<=0}),supported=supportsCharacterAction(chosen,v.sprite.userData.supportsAction?.bind(v.sprite.userData));
   const mode=['sit','sleep','run'].includes(chosen)&&!supported?(chosen==='run'?'walk':'idle'):chosen,locomotion=mode==='walk'||mode==='run',poseTime=mode==='hit'?clock-v.hitUntil+.28:skillActive||basicActive?elapsed:emote?.name===mode?clock-emote.time:clock;
   v.label.dataset.animationPending=['sit','sleep','run'].includes(chosen)&&!supported?chosen:'';
   const rolePose=p.hp>0?sampleRolePose(v.roleAction,clock,{reduced:reduced.matches}):null;
   const pose=rolePose??(skillActive&&mode!=='hit'?skillPose(state.character.classId,v.action.index,elapsed*(v.action.timing?track.duration/v.action.timing.duration:1),{reduced:reduced.matches}):characterMotion({classId:state.character.classId,mode,time:basicActive&&mode==='attack'?elapsed*attackDuration(state.character.classId)/(v.action.timing?.duration??attackDuration(state.character.classId)):poseTime,phase:locomotion?v.gait:null,reduced:reduced.matches,view:v.view=walkView(p.face,controls.getAzimuthalAngle(),v.view)}));
   v.sprite.material.map=v.frames[0];v.sprite.position.y=groundHeight(game.world.nav,p.x,p.z)+.06+(v.sprite.userData.directionalActive&&mode==='walk'?0:pose.y);const angle=controls.getAzimuthalAngle(),poseFace=rolePose?(v.roleAction.facing??p.face):skillActive||basicActive?(v.action.facing??p.face):p.face;{const side=poseFace.x*Math.cos(angle)-poseFace.z*Math.sin(angle);if(rolePose||skillActive||basicActive?Math.abs(side)>1e-6:Math.abs(side)/(Math.hypot(p.face.x,p.face.z)||1)>.3)v.flip=side<0;}
   if(basicActive&&mode==='attack')pose.actionPhase=Math.max(0,Math.min(1,elapsed/(v.action.timing?.duration??attackDuration(state.character.classId))));
   v.sprite.userData.setFacing?.(poseFace,angle,{mode,time:poseTime,phase:locomotion?v.gait:null,reduced:reduced.matches});v.sprite.userData.pose(pose,!!v.flip);v.sprite.visible=p.hp>0||(p.down??0)>0;game.xray?.(v.sprite,groundHeight(game.world.nav,p.x,p.z));
   if((state.rebirth??0)!==v.rankShown){v.rankShown=state.rebirth??0;const t=v.label.querySelector('.rank-title');if(t){t.hidden=!v.rankShown;t.textContent=v.rankShown?'✦ '+rebirthRank(v.rankShown)+' ✦':'';}}
   const ally=!!party&&party.members.includes(state.id);v.label.classList.toggle('party',ally);v.label.classList.toggle('offline',state.connected===false);v.label.dataset.stall=state.stall??'';
   if(v.label.querySelector('b').textContent!==state.character.name)v.label.querySelector('b').textContent=state.character.name;
   const tag=state.guild?state.guild.emblem+':'+(state.guild.castle?'👑 ':'')+state.guild.name:'';if(v.guildShown!==tag){v.guildShown=tag;v.label.querySelector('.mp-guild')?.remove();if(tag){const g=el('small','mp-guild');g.innerHTML=`<i class="item-icon small" style="${iconStyle(emblemId(state.guild.emblem))}"></i>`;g.append((state.guild.castle?'👑 ':'')+state.guild.name);v.label.append(g);}}
   const head=characterHead(v.sprite,camera);
   v.label.hidden=p.hp<=0||!place(v.label,head.x,head.y,head.z);
   if((state.pet??null)!==(v.pet?.id??null)){v.pet?.dispose();v.pet=state.pet?createPetView(scene,state.pet):null;}v.pet?.follow(v.sprite.position,Math.min(.05,dt));
   if(v.emoteBubble)v.emoteBubble.hidden=performance.now()>v.emoteUntil||!v.sprite.visible||!place(v.emoteBubble,v.sprite.position.x,v.sprite.position.y+2.9,v.sprite.position.z);
  }
  const now=performance.now();
  for(const [id,b] of bubbles){
   if(now>b.until){b.node.remove();bubbles.delete(id);continue;}
   const v=views.get(id),hero=game.world.player;
   if(id===client?.id)b.node.hidden=!place(b.node,hero.x,2.75+groundHeight(game.world.nav,hero.x,hero.z),hero.z);
   else b.node.hidden=!v||v.loading||!v.sprite.visible||!place(b.node,v.sprite.position.x,v.sprite.position.y+2.6,v.sprite.position.z);
  }
 }};
}

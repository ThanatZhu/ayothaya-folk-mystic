import {openHudPanel} from './hud-panels.js?v=34';
import {iconStyle} from './bag-ui.js?v=99';
import {emblemId,emoteId} from './items.js?v=95';
import {createPetView} from './pet-ui.js?v=98';
import * as THREE from 'three';
import {CHARACTER_WORLD_SCALE,WORLD_BODY_HEIGHT} from './character-size.js?v=size1';
import {groundHeight} from './combat-core.js?v=102.2';
import {MultiplayerClient} from './multiplayer-client.js?v=life1';
import {multiplayerURL,wakeServer} from './multiplayer-config.js?v=27';
import {atlasPath,className} from './classes.js?v=101';
import {customizeAtlas} from './character-appearance.js?v=41';
import {atlasCell} from './sprite-motion.js';
import {createPaintedAvatar} from './painted-avatar.js?v=life1';
import {characterMotion,attackDuration,gaitStep,walkView} from './character-motion.js?v=life1';
import {activeEmote,actionChoice,supportsCharacterAction} from './character-action-state.js?v=life1';
import {skillPose,skillTrack} from './skill-choreography.js?v=life1';
import {createSkillEffects} from './skill-effects.js?v=74';
const messages={'server-busy':'เซิร์ฟเวอร์กำลังบันทึกหรือสลับเครื่อง · ลองอีกครั้งในไม่กี่วินาที','stale-command':'คำสั่งซ้ำ/ล่าช้า · ลองกดใหม่อีกครั้ง','rate-limit':'กดเร็วเกินไป · รอสักครู่แล้วลองใหม่','duel-invalid':'ท้าดวลได้เฉพาะนอกเมือง กับผู้เล่นในแผนที่เดียวกัน','duel-busy':'มีคนกำลังประลองอยู่แล้ว','duel-far':'อยู่ห่างกันเกิน 20 ม. · เดินเข้าไปใกล้ก่อนท้าดวล','replaced':'บัญชีนี้เข้าเล่นจากอีกหน้าต่าง/อีกเครื่องแล้ว · หน้านี้ออฟไลน์','already-online':'บัญชีนี้กำลังเล่นอยู่อีกหน้าต่าง รอออกจากห้องเดิมก่อน','room-full':'ห้องเต็ม กรุณาลองอีกครั้ง','authentication-failed':'ยืนยันบัญชีไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่','save-failed':'เซิร์ฟเวอร์บันทึกไม่สำเร็จ การเล่นถูกหยุดเพื่อป้องกันข้อมูลหาย','chat-rate':'ส่งข้อความเร็วเกินไป กรุณารอสักครู่','no-party':'ต้องเข้าปาร์ตี้ก่อน','expired-invite':'คำเชิญหมดอายุแล้ว','party-full-or-leader':'ปาร์ตี้เต็ม หรือคุณไม่ใช่หัวหน้าปาร์ตี้','not-party-leader':'เฉพาะหัวหน้าปาร์ตี้ทำรายการนี้ได้','invalid-invite':'เชิญผู้เล่นนี้ไม่ได้','invite-rate':'รอก่อนส่งคำเชิญอีกครั้ง','invalid-chat':'ข้อความยาวได้ไม่เกิน 240 ตัวอักษร','world-rate':'แชตโลกส่งได้ทุก 8 วินาที','no-skill-points':'แต้มสกิลไม่พอ','skill-trial-required':'ขั้น 5 ต้องผ่านบททดสอบวิชา','skill-max':'สกิลขั้นสูงสุดแล้ว','skill-not-learned':'ยังไม่ได้เรียนสกิลนี้','invalid-skill':'สกิลไม่ถูกต้อง'};
const chatErrors=new Set(['chat-rate','world-rate','no-party','invalid-chat']);
const statusText={connecting:'กำลังเข้าห้อง… (ถ้าเซิร์ฟเวอร์ฟรีหลับอยู่ อาจรอราว 1 นาที)',reconnecting:'เน็ตหลุด · หยุดตัวละครและกำลังเชื่อมต่อใหม่',online:'เชื่อมต่อแล้ว · เซิร์ฟเวอร์บันทึกให้อัตโนมัติ',offline:'ออกจากห้องแล้ว',error:'เชื่อมต่อไม่ได้ · กรุณาโหลดหน้าใหม่หลังแก้ปัญหา'};
const editable=e=>e.target instanceof Element&&!!e.target.closest('input,textarea,select,button,a,[contenteditable=true]');
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
export function createMultiplayer({scene,camera,controls,game,account,frame}){
 const url=multiplayerURL(),local=['127.0.0.1','localhost'].includes(location.hostname),views=new Map(),fx=createSkillEffects(scene),projection=new THREE.Vector3(),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const shell=document.getElementById('game-shell'),labels=document.getElementById('world-labels'),compact=matchMedia('(pointer:coarse),(max-width:900px)');
 let client=null,active=false,clock=0,party=null,roster=[],loadingGeneration=0,players=new Map(),self=null,unread=0;const seenMessages=new Set(),bubbles=new Map();
 // HUD chip: connection state dot + label. Opens the room/party roster.
 const button=el('button');button.id='online-button';button.dataset.state='offline';button.innerHTML='<i class="mp-dot" aria-hidden="true"></i><span id="online-label">ผู้เล่นออนไลน์</span>';shell.append(button);
 const chip=text=>{button.querySelector('#online-label').textContent=text;};
 // Nonmodal roster window for joining, inviting and party management.
 const dialog=el('dialog');dialog.id='online-panel';dialog.dataset.state='offline';dialog.setAttribute('aria-labelledby','online-title');
 dialog.innerHTML='<header><div><small>AYOTHAYA ONLINE</small><h2 id="online-title">เพื่อนร่วมอโยธยา</h2></div><button id="online-close" class="mp-icon" aria-label="ปิดหน้าผู้เล่นออนไลน์">×</button></header><p id="online-status" class="mp-status" role="status"><i class="mp-dot" aria-hidden="true"></i><span></span></p><div class="online-actions"><button id="online-reload" class="mp-primary" hidden>เชื่อมต่อใหม่</button><button id="online-party-leave" hidden>ออกจากปาร์ตี้</button></div><section class="mp-roster"><h3>ผู้เล่นในห้อง <small id="online-count"></small></h3><ul id="online-players"></ul></section><p class="online-note">ปาร์ตี้สูงสุด 5 คน · อยู่เซิร์ฟเวอร์และแมพเดียวกันจึงพบกัน · เมืองเป็นเขตปลอดภัย · กด Enter เพื่อแชตระหว่างเล่น</p>';
 shell.append(dialog);const $=id=>shell.querySelector('#'+id),status=text=>{$('online-status').lastChild.textContent=text;};
 // Chat dock: always visible while online and never pauses the game.
 const dock=el('section');dock.id='online-dock';dock.hidden=true;dock.dataset.channel='room';dock.setAttribute('aria-label','แชตออนไลน์');
 dock.innerHTML='<header><div class="mp-tabs" role="tablist" aria-label="ช่องสนทนา"><button role="tab" data-channel="room" aria-selected="true">ห้องนี้</button><button role="tab" data-channel="party" aria-selected="false" disabled>ปาร์ตี้</button><button role="tab" data-channel="guild" aria-selected="false" disabled>กิลด์</button><button role="tab" data-channel="world" aria-selected="false">โลก</button><button role="tab" data-channel="system" aria-selected="false">ระบบ</button></div><button id="dock-toggle" class="mp-dock-bar" aria-expanded="true"><span id="dock-preview"></span><b id="dock-unread" hidden></b><i aria-hidden="true">▾</i></button></header><div id="online-messages" role="log" aria-label="ข้อความสนทนา" aria-live="polite"></div><p id="dock-note" role="status"></p><form id="online-chat"><input id="online-text" aria-label="ข้อความแชต" maxlength="240" autocomplete="off" enterkeyhint="send" placeholder=""><button type="submit">ส่ง</button></form>';
 shell.append(dock);
 const partyFrame=el('section');partyFrame.id='party-frame';partyFrame.hidden=true;partyFrame.setAttribute('aria-label','สมาชิกปาร์ตี้');partyFrame.innerHTML='<h3>ปาร์ตี้ <small id="party-count"></small></h3><ol id="party-members"></ol>';shell.append(partyFrame);
 const invites=el('div');invites.id='online-invites';invites.setAttribute('aria-live','assertive');shell.append(invites);
 // Online is automatic: whenever a backend exists and the account can authenticate, entering the game joins the shared world.
 const canJoin=!!url&&(account.cloud||local);
 if(!url){status('กำลังเตรียมเซิร์ฟเวอร์ออนไลน์ · ขณะนี้ยังเป็นโหมดเล่นคนเดียว');button.dataset.state=dialog.dataset.state='unavailable';}else if(!canJoin)status('เข้าเกมด้วย Google เพื่อเล่นออนไลน์');else{status('กำลังเข้าห้อง…');chip('กำลังเข้าห้อง…');}
 button.onclick=()=>{game.clearInput();openHudPanel(dialog);};$('online-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>button.focus());
 $('online-reload').onclick=()=>location.reload();
 // Chat dock behaviour.
 function setCollapsed(value){dock.classList.toggle('collapsed',value);$('dock-toggle').setAttribute('aria-expanded',String(!value));$('dock-toggle').setAttribute('aria-label',value?'เปิดแชต':'ย่อแชต');if(!value){unread=0;$('dock-unread').hidden=true;$('online-messages').scrollTop=$('online-messages').scrollHeight;}}
 setCollapsed(compact.matches);
 $('dock-toggle').onclick=()=>setCollapsed(!dock.classList.contains('collapsed'));
 function setChannel(channel){dock.dataset.channel=channel;for(const tab of dock.querySelectorAll('[role=tab]'))tab.setAttribute('aria-selected',String(tab.dataset.channel===channel));$('online-text').placeholder=(compact.matches?'':'Enter · ')+(channel==='party'?'พิมพ์ถึงปาร์ตี้…':channel==='guild'?'พิมพ์ถึงกิลด์…':channel==='world'?'พิมพ์ถึงทุกคนในเซิร์ฟ…':'พิมพ์ถึงทุกคนในห้อง… (/w ชื่อ ข้อความ = กระซิบ)');$('online-messages').scrollTop=$('online-messages').scrollHeight;}
 for(const tab of dock.querySelectorAll('[role=tab]'))tab.onclick=()=>setChannel(tab.dataset.channel);
 setChannel('room');
 let noteTimer;const dockNote=text=>{$('dock-note').textContent=text;clearTimeout(noteTimer);noteTimer=setTimeout(()=>{$('dock-note').textContent='';},3500);};
 $('online-text').addEventListener('focus',()=>{game.clearInput();setCollapsed(false);});
 $('online-text').addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();e.target.blur();}});
 addEventListener('keydown',e=>{if(e.code!=='Enter'||e.repeat||!active||dock.hidden||editable(e)||document.querySelector('dialog[open]'))return;e.preventDefault();setCollapsed(false);$('online-text').focus();});
 function log(m,live=false){
  if(seenMessages.has(m.id))return;seenMessages.add(m.id);if(seenMessages.size>160)seenMessages.delete(seenMessages.values().next().value);
  const mine=m.actor===client?.id,p=el('p',['party','system','guild','whisper','world'].includes(m.channel)?m.channel:''),name=el('b','',m.channel==='whisper'&&mine?'ถึง '+m.to:m.name),time=el('time','',new Date(m.time).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}));
  if(m.channel==='party')p.append(el('span','mp-tag','ปาร์ตี้'));if(m.channel==='guild')p.append(el('span','mp-tag','กิลด์'));if(m.channel==='whisper')p.append(el('span','mp-tag','กระซิบ'));if(m.channel==='world')p.append(el('span','mp-tag','โลก'));if(mine)p.classList.add('mine');const said=el('span','',' '+m.text);if(m.channel!=='system'){name.dataset.i18nSkip='';said.dataset.i18nSkip='';}p.append(name,said,time);
  const box=$('online-messages'),atEnd=box.scrollHeight-box.scrollTop-box.clientHeight<40;box.append(p);while(box.children.length>80)box.firstChild.remove();if(atEnd)box.scrollTop=box.scrollHeight;
  $('dock-preview').toggleAttribute('data-i18n-skip',m.channel!=='system');$('dock-preview').textContent=m.name+': '+m.text;
  if(live){if(dock.classList.contains('collapsed')){unread++;$('dock-unread').textContent=unread>9?'9+':String(unread);$('dock-unread').hidden=false;}if(m.channel==='room'||m.channel==='party')bubble(m);}
 }
 // Speech bubbles over the speaker; positioned every frame in update().
 function bubble(m){let b=bubbles.get(m.actor);if(!b){b={node:el('span','chat-bubble')};labels.append(b.node);bubbles.set(m.actor,b);}b.node.textContent=m.text.length>70?m.text.slice(0,69)+'…':m.text;b.node.classList.toggle('party',m.channel==='party');b.until=performance.now()+5500;}
 function place(node,x,y,z){projection.set(x,y,z).project(camera);node.style.transform=`translate(-50%,-100%) translate(${(projection.x*.5+.5)*innerWidth}px,${(-projection.y*.5+.5)*innerHeight}px)`;return Math.abs(projection.x)<=1.1&&Math.abs(projection.y)<=1.1&&projection.z<1;}
 function drawRoster(){
  $('online-players').replaceChildren();$('online-count').textContent=roster.length+' คน';
  for(const p of roster){
   const li=el('li',p.id===client?.id?'me':''),who=el('div','mp-who'),name=el('b','',p.name);who.append(name,el('small','',className(p.classId)+(p.id===client?.id?' · คุณ':'')+(p.partyId&&p.partyId===party?.id?' · ปาร์ตี้เรา':p.partyId?' · มีปาร์ตี้':'')+(p.here===false?' · '+p.map:'')));
   if(party?.leader===p.id)name.prepend(el('span','mp-crown','♛ '));li.append(el('span','mp-avatar',(globalThis.I18N?.t(className(p.classId))??className(p.classId)).slice(0,1)),who);
   const action=(text,type,data,primary)=>{const b=el('button',primary?'mp-primary':'',text);b.onclick=()=>client?.command(type,data);li.append(b);};
   if(p.id!==client?.id&&!p.partyId&&(!party||party.leader===client.id))action('เชิญ','invite',{target:p.id},true);
   if(p.id!==client?.id&&game.world.myGuild)action('ชวนกิลด์','guildInvite',{name:p.name});
   if(p.id!==client?.id&&p.here!==false)action('ท้าดวล','duel',{target:p.id});
   if(p.id!==client?.id&&party?.leader===client?.id&&party.members.includes(p.id)){action('หัวหน้า','leader',{target:p.id});action('นำออก','kick',{target:p.id});}
   $('online-players').append(li);
  }
  $('online-party-leave').hidden=!party;
  const partyTab=dock.querySelector('[data-channel=party]');partyTab.disabled=!party;if(!party&&dock.dataset.channel==='party')setChannel('room');
  drawParty();
 }
 function drawParty(){
  partyFrame.hidden=!party;if(!party)return;$('party-count').textContent=party.members.length+'/5';
  $('party-members').replaceChildren(...party.members.map(id=>{
   const info=roster.find(p=>p.id===id),li=el('li',id===client?.id?'me':'');li.dataset.id=id;
   const name=el('b','',(party.leader===id?'♛ ':'')+(info?.name??'…')+(id===client?.id?' (คุณ)':''));
   const bar=el('span','mp-hp');bar.append(el('i'));li.append(name,el('small','mp-state'),bar);return li;
  }));updateParty();
 }
 function updateParty(){
  if(!party)return;
  for(const li of $('party-members').children){
   const state=li.dataset.id===client?.id?self:players.get(li.dataset.id),hp=state?.hp??0,max=state?.maxHp??140,away=!state,offline=state&&state.connected===false;
   li.querySelector('.mp-hp i').style.width=Math.max(0,Math.min(100,hp/max*100))+'%';
   li.classList.toggle('low',!away&&hp/max<.3);li.classList.toggle('away',away||!!offline);li.querySelector('.mp-state').textContent=offline?'หลุด':away?'ไกล':hp<=0?'หมดแรง':'';
  }
 }
 async function identity(){
  if(account.cloud)return {token:await account.token(),serverId:account.serverId,slotId:account.slotId};
  const key='ayothaya-local-network:'+account.slotId;let data;try{data=JSON.parse(sessionStorage.getItem(key));}catch{}
  if(!data){const endpoint=new URL(url.replace(/^ws/,'http'));endpoint.pathname='/dev/session';const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:account.character.name,gender:account.character.gender})});if(!response.ok)throw new Error('local-server-unavailable');data=await response.json();sessionStorage.setItem(key,JSON.stringify(data));}
  return {token:data.token,serverId:data.serverId,slotId:data.slotId};
 }
 function remove(view){view.emoteBubble?.remove();view.pet?.dispose();scene.remove(view.sprite);view.sprite.userData.dispose();for(const t of view.frames)t.dispose();view.label.remove();}
 async function addRemote(state){
  const id=state.id,generation=loadingGeneration,placeholder={loading:true,state};views.set(id,placeholder);
  try{const image=new Image();image.src=atlasPath(state.character.classId);await image.decode();if(generation!==loadingGeneration||views.get(id)!==placeholder)return;
   const art=customizeAtlas(image,state.character.appearance,state.character.classId),frames=Array.from({length:4},(_,i)=>frame(art,atlasCell(state.character.gender,i))),sprite=createPaintedAvatar(frames[0],{directional:false,classId:state.character.classId,gender:state.character.gender,appearance:state.character.appearance,equipment:state.equipment});sprite.scale.set(CHARACTER_WORLD_SCALE,CHARACTER_WORLD_SCALE,1);sprite.position.set(state.player.x,.06,state.player.z);scene.add(sprite);
   const label=el('span','remote-player-label',state.character.name);labels.append(label);
   views.set(id,{...placeholder,loading:false,sprite,frames,label,gait:0,action:null,emote:null,equipmentKey:JSON.stringify(state.equipment)});
  }catch{if(views.get(id)===placeholder)placeholder.retryAt=performance.now()+5000;}
 }
 function acceptSnapshot(s){
  clock=s.time;game.applyNetworkSnapshot(s);self={...s.self.player,connected:true};players=new Map(s.players.map(p=>[p.id,p.player&&{...p.player,connected:p.connected}]));
  const ids=new Set(s.players.map(p=>p.id));for(const [id,v] of views)if(!ids.has(id)){if(!v.loading)remove(v);views.delete(id);}
  for(const p of s.players){const v=views.get(p.id);if(v){v.state={...v.state,...p};if(v.retryAt&&performance.now()>v.retryAt)addRemote(v.state);}else if(p.character)addRemote(p);}
  for(const e of s.events??[]){if(e.actor===client.id){game.world.events.push(e);continue;}
   const v=views.get(e.actor);if(!v||v.loading)continue;
   if(e.type==='damage'&&Number.isInteger(e.id))game.popup?.(e); // 0.99.3 everyone's numbers float over the monster they hit
   if(e.type==='playerHit')game.popup?.({...e,color:'#ff987e'},{key:'r'+e.actor,pos:()=>({x:v.state.player.x,y:2.2+v.sprite.position.y,z:v.state.player.z})});
   if(e.type==='cast'){
    const id=v.state.character.classId,skill=skillTrack(id,e.skillIndex),current=skillTrack(id,v.action?.index);
    if(skill||!current||clock-v.action.start>=current.duration)v.action={index:e.skillIndex??null,start:clock};
    const track=skill??{...skillTrack(id,0),duration:attackDuration(id),strikes:[.42]},from=e.from??v.state.player,to=e.to??from;
    fx.create(track,{...e,skillIndex:skill?e.skillIndex:null,from,to:{...to,y:groundHeight(game.world.nav,to.x,to.z)},direction:v.state.player.face,groundY:groundHeight(game.world.nav,from.x,from.z),reduced:reduced.matches,quality:compact.matches?'low':'high'});
   }
   if(e.type==='emote'&&!Object.hasOwn(v.state,'emote'))v.emote=activeEmote({name:e.name,time:e.time??clock},clock);
   if(e.type==='playerHit'){v.hitUntil=clock+.28;v.emote=null;v.state.emote=null;}
   if(e.type==='bubble'){v.emoteBubble??=el('span','emote-bubble');labels.append(v.emoteBubble);v.emoteBubble.innerHTML=`<i class="item-icon" style="${iconStyle(emoteId(e.id))}"></i>`;v.emoteUntil=performance.now()+3000;}
  }
  updateParty();
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
   client.addEventListener('status',({detail})=>{button.dataset.state=dialog.dataset.state=detail;const waking=detail==='reconnecting'&&!client.everOnline;chip(detail==='online'?'ออนไลน์ · '+roster.length+' คน':waking?'กำลังปลุกเซิร์ฟเวอร์…':detail==='reconnecting'?'กำลังเชื่อมต่อใหม่…':detail==='connecting'?'กำลังเข้าห้อง…':detail==='error'?'เชื่อมต่อไม่ได้':'ผู้เล่นออนไลน์');status(waking?'เซิร์ฟเวอร์ฟรีหลับอยู่ · กำลังปลุก อาจใช้ถึง 1–2 นาที':statusText[detail]);dock.hidden=!['online','reconnecting'].includes(detail);$('online-reload').hidden=!['error','reconnecting'].includes(detail);if(dock.hidden)partyFrame.hidden=true;else drawParty();if(detail==='error'&&!dialog.open){game.clearInput();openHudPanel(dialog);}});
   client.addEventListener('welcome',({detail})=>{for(const m of detail.history)log(m);});
   client.addEventListener('snapshot',({detail})=>acceptSnapshot(detail));
   client.addEventListener('events',({detail})=>game.world.events.push(...detail.events));
   client.addEventListener('chat',({detail})=>log(detail,true));
   client.addEventListener('social',({detail})=>{roster=detail.players;party=detail.party;drawRoster();chip('ออนไลน์ · '+roster.length+' คน');});
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
  if(!client?.command('chat',w?{channel:'whisper',to:w[1],text:w[2]}:{channel:['party','guild','world'].includes(channel)?channel:'room',text})){dockNote('ต้องเชื่อมต่อออนไลน์ก่อนส่งข้อความ');return;}
  input.value=w?'/w '+w[1]+' ':'';if(!compact.matches)input.blur();
 };
 // System lines (EXP, level ups, notices) appear only in this player's chat, never sent to others.
 addEventListener('game-notice',({detail})=>{if(!active||typeof detail!=='string')return;log({id:'sys-'+performance.now()+Math.random(),channel:'system',name:'ระบบ',text:detail,time:Date.now()});});
 addEventListener('pagehide',()=>client?.stop());
 // 0.99.15 tap another player's character: a small menu with party, trade, friend, whisper and duel
 const tapRay=new THREE.Raycaster(),tapPoint=new THREE.Vector2(),playerMenu=el('div');playerMenu.id='player-menu';playerMenu.hidden=true;shell.append(playerMenu);
 const closeMenu=()=>{playerMenu.hidden=true;};
 addEventListener('pointerdown',e=>{if(!playerMenu.hidden&&!playerMenu.contains(e.target))closeMenu();},true);
 addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 function openPlayerMenu(s,x,y){
  const name=s.character?.name??'ผู้เล่น',info=roster.find(p=>p.id===s.id),title=el('b','',name);title.dataset.i18nSkip='';playerMenu.replaceChildren(title);
  const add=(text,fn)=>{const b=el('button','',text);b.type='button';b.onclick=()=>{closeMenu();fn();};playerMenu.append(b);};
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
 return {get paused(){return false;},update(dt){
  if(!active)return;clock+=Math.min(.05,dt);fx.update(Math.min(.05,dt),camera);
  const guildTab=dock.querySelector('[data-channel=guild]');guildTab.disabled=!game.world.myGuild;if(guildTab.disabled&&dock.dataset.channel==='guild')setChannel('room');
  for(const v of views.values()){
   if(v.loading)continue;const state=v.state,p=state.player,old=v.sprite.position.clone(),f=1-Math.exp(-Math.min(.05,dt)*14);v.sprite.position.x+=(p.x-v.sprite.position.x)*f;v.sprite.position.z+=(p.z-v.sprite.position.z)*f;v.gait+=gaitStep(Math.hypot(v.sprite.position.x-old.x,v.sprite.position.z-old.z),Math.min(.05,dt),state.character.classId,p.running?'run':'walk');
   const equipmentKey=JSON.stringify(state.equipment);
   if(equipmentKey!==v.equipmentKey&&!v.equipmentLoading&&performance.now()>(v.equipmentRetryAt??0)){
    v.equipmentLoading=true;v.sprite.userData.setEquipment(state.equipment).then(changed=>{if(changed)v.equipmentKey=equipmentKey;}).catch(()=>{v.equipmentRetryAt=performance.now()+5000;}).finally(()=>{v.equipmentLoading=false;});
   }
   const elapsed=clock-(v.action?.start??-100),track=skillTrack(state.character.classId,v.action?.index),emote=activeEmote(Object.hasOwn(state,'emote')?state.emote:v.emote,clock);
   const skillActive=track&&elapsed<track.duration,basicActive=v.action&&v.action.index===null&&elapsed<attackDuration(state.character.classId);
   const chosen=actionChoice({time:clock,hit:clock<(v.hitUntil??0),cast:skillActive,attack:basicActive,emote,moving:p.moving||Math.hypot(v.sprite.position.x-old.x,v.sprite.position.z-old.z)>.001,running:p.running,dead:p.hp<=0}),supported=supportsCharacterAction(chosen,v.sprite.userData.supportsAction?.bind(v.sprite.userData));
   const mode=['sit','sleep','run'].includes(chosen)&&!supported?(chosen==='run'?'walk':'idle'):chosen,locomotion=mode==='walk'||mode==='run',poseTime=mode==='hit'?clock-v.hitUntil+.28:skillActive||basicActive?elapsed:emote?.name===mode?clock-emote.time:clock;
   v.label.dataset.animationPending=['sit','sleep','run'].includes(chosen)&&!supported?chosen:'';
   const pose=skillActive&&mode!=='hit'?skillPose(state.character.classId,v.action.index,elapsed,{reduced:reduced.matches}):characterMotion({classId:state.character.classId,mode,time:poseTime,phase:locomotion?v.gait:null,reduced:reduced.matches,view:v.view=walkView(p.face,controls.getAzimuthalAngle(),v.view)});
   v.sprite.material.map=v.frames[0];v.sprite.position.y=groundHeight(game.world.nav,p.x,p.z)+.06+(v.sprite.userData.directionalActive&&mode==='walk'?0:pose.y);const angle=controls.getAzimuthalAngle();{const side=p.face.x*Math.cos(angle)-p.face.z*Math.sin(angle);if(Math.abs(side)/(Math.hypot(p.face.x,p.face.z)||1)>.3)v.flip=side<0;}
   v.sprite.userData.setFacing?.(p.face,angle,{mode,time:poseTime,phase:locomotion?v.gait:null,reduced:reduced.matches});v.sprite.userData.pose(pose,!!v.flip);v.sprite.visible=p.hp>0;game.xray?.(v.sprite,groundHeight(game.world.nav,p.x,p.z));
   const ally=!!party&&party.members.includes(state.id);v.label.classList.toggle('party',ally);v.label.classList.toggle('offline',state.connected===false);v.label.dataset.stall=state.stall??'';
   const tag=state.guild?state.guild.emblem+':'+(state.guild.castle?'👑 ':'')+state.guild.name:'';if(v.guildShown!==tag){v.guildShown=tag;v.label.querySelector('.mp-guild')?.remove();if(tag){const g=el('small','mp-guild');g.innerHTML=`<i class="item-icon small" style="${iconStyle(emblemId(state.guild.emblem))}"></i>`;g.append((state.guild.castle?'👑 ':'')+state.guild.name);v.label.append(g);}}
   const up=camera.matrixWorld.elements,labelHeight=WORLD_BODY_HEIGHT+.14;
   v.label.hidden=p.hp<=0||!place(v.label,v.sprite.position.x+up[4]*labelHeight,v.sprite.position.y+up[5]*labelHeight,v.sprite.position.z+up[6]*labelHeight);
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

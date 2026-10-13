import * as THREE from 'three';
import {MultiplayerClient} from './multiplayer-client.js?v=24';
import {multiplayerURL} from './multiplayer-config.js?v=24';
import {atlasPath,className} from './classes.js?v=18';
import {customizeAtlas} from './character-appearance.js?v=18';
import {atlasCell} from './sprite-motion.js';
import {createRiggedSprite} from './rigged-sprite.js?v=23';
import {characterMotion,attackDuration} from './character-motion.js?v=23';
import {skillPose,skillTrack} from './skill-choreography.js?v=23';
import {createSkillEffects} from './skill-effects.js?v=23';
const messages={'already-online':'บัญชีนี้กำลังเล่นอยู่อีกหน้าต่าง รอออกจากห้องเดิมก่อน','room-full':'ห้องเต็ม กรุณาลองอีกครั้ง','authentication-failed':'ยืนยันบัญชีไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่','save-failed':'เซิร์ฟเวอร์บันทึกไม่สำเร็จ การเล่นถูกหยุดเพื่อป้องกันข้อมูลหาย','chat-rate':'ส่งข้อความเร็วเกินไป กรุณารอสักครู่','no-party':'ต้องเข้าปาร์ตี้ก่อน','expired-invite':'คำเชิญหมดอายุแล้ว','party-full-or-leader':'ปาร์ตี้เต็ม หรือคุณไม่ใช่หัวหน้าปาร์ตี้','not-party-leader':'เฉพาะหัวหน้าปาร์ตี้ทำรายการนี้ได้','invalid-invite':'เชิญผู้เล่นนี้ไม่ได้','invite-rate':'รอก่อนส่งคำเชิญอีกครั้ง','invalid-chat':'ข้อความยาวได้ไม่เกิน 240 ตัวอักษร'};
export function createMultiplayer({scene,camera,controls,game,account,frame}){
 const url=multiplayerURL(),local=['127.0.0.1','localhost'].includes(location.hostname),views=new Map(),fx=createSkillEffects(scene),projection=new THREE.Vector3(),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let client=null,active=false,clock=0,party=null,roster=[],loadingGeneration=0;const seenMessages=new Set();
 const button=document.createElement('button');button.id='online-button';button.textContent='ผู้เล่นออนไลน์';document.getElementById('game-shell').append(button);
 const dialog=document.createElement('dialog');dialog.id='online-panel';dialog.setAttribute('aria-labelledby','online-title');
 dialog.innerHTML='<header><h2 id="online-title">เพื่อนร่วมอโยธยา</h2><button id="online-close" aria-label="ปิดหน้าผู้เล่นออนไลน์">×</button></header><p id="online-status" role="status"></p><div class="online-actions"><button id="online-join">เข้าร่วมโลกออนไลน์</button><button id="online-leave" hidden>ออกจากออนไลน์</button><button id="online-reload" hidden>โหลดเกมใหม่</button><button id="online-party-leave" hidden>ออกจากปาร์ตี้</button></div><div id="online-invites"></div><div class="online-columns"><section><b>ผู้เล่นในห้อง</b><ul id="online-players"></ul></section><section><b>สนทนา</b><div id="online-messages" role="log" aria-label="ข้อความสนทนา" aria-live="polite"></div><form id="online-chat"><input id="online-text" aria-label="ข้อความแชต" maxlength="240" autocomplete="off" placeholder="พิมพ์ข้อความ…"><select id="online-channel" aria-label="ช่องสนทนา"><option value="room">ห้องนี้</option><option value="party">ปาร์ตี้</option></select><button type="submit">ส่ง</button></form></section></div><p class="online-note">ปาร์ตี้สูงสุด 5 คน · อยู่เซิร์ฟเวอร์และแมพเดียวกันจึงพบกัน · เมืองเป็นเขตปลอดภัย</p>';
 document.getElementById('game-shell').append(dialog);const $=id=>dialog.querySelector('#'+id),status=text=>{$('online-status').textContent=text;};
 if(!url){status('กำลังเตรียมเซิร์ฟเวอร์ออนไลน์ · ขณะนี้ยังเป็นโหมดเล่นคนเดียว');$('online-join').disabled=true;}else if(!account.cloud&&!local){status('เข้าเกมด้วย Google เพื่อเล่นออนไลน์');$('online-join').disabled=true;}else status(local?'เซิร์ฟเวอร์ทดสอบบนเครื่อง · ข้อมูลแยกจากเซฟจริง':'พร้อมเชื่อมต่อเซิร์ฟเวอร์');
 button.onclick=()=>{game.clearInput();dialog.showModal();};$('online-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>button.focus());
 $('online-reload').onclick=()=>location.reload();
 const log=m=>{if(seenMessages.has(m.id))return;seenMessages.add(m.id);if(seenMessages.size>160)seenMessages.delete(seenMessages.values().next().value);const p=document.createElement('p'),name=document.createElement('b');name.textContent=(m.channel==='party'?'[ปาร์ตี้] ':'')+m.name+': ';p.append(name,document.createTextNode(m.text));$('online-messages').append(p);while($('online-messages').children.length>80)$('online-messages').firstChild.remove();$('online-messages').scrollTop=$('online-messages').scrollHeight;};
 function drawRoster(){
  $('online-players').replaceChildren();for(const p of roster){const li=document.createElement('li'),name=document.createElement('span');name.textContent=p.name+(p.id===client?.id?' (คุณ)':'')+(p.partyId?' · ปาร์ตี้':'');li.append(name);
   const action=(text,type,data)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>client?.command(type,data);li.append(b);};
   if(p.id!==client?.id&&!p.partyId&&(!party||party.leader===client.id))action('เชิญ','invite',{target:p.id});
   if(p.id!==client?.id&&party?.leader===client?.id&&party.members.includes(p.id)){action('หัวหน้า','leader',{target:p.id});action('นำออก','kick',{target:p.id});}
   $('online-players').append(li);
  }$('online-party-leave').hidden=!party;
 }
 async function identity(){
  if(account.cloud)return {token:await account.token(),serverId:account.serverId,slotId:account.slotId};
  const key='ayothaya-local-network:'+account.slotId;let data;try{data=JSON.parse(sessionStorage.getItem(key));}catch{}
  if(!data){const endpoint=new URL(url.replace(/^ws/,'http'));endpoint.pathname='/dev/session';const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:account.character.name,gender:account.character.gender})});if(!response.ok)throw new Error('local-server-unavailable');data=await response.json();sessionStorage.setItem(key,JSON.stringify(data));}
  return {token:data.token,serverId:data.serverId,slotId:data.slotId};
 }
 function remove(view){scene.remove(view.sprite);view.sprite.geometry.dispose();view.sprite.material.dispose();for(const t of view.frames)t.dispose();view.label.remove();}
 async function addRemote(state){
  const id=state.id,generation=loadingGeneration,placeholder={loading:true,state};views.set(id,placeholder);
  try{const image=new Image();image.src=atlasPath(state.character.classId);await image.decode();if(generation!==loadingGeneration||views.get(id)!==placeholder)return;
   const art=customizeAtlas(image,state.character.appearance,state.character.classId),frames=Array.from({length:4},(_,i)=>frame(art,atlasCell(state.character.gender,i))),sprite=createRiggedSprite(frames[0]);sprite.scale.set(2.1,2.1,1);sprite.position.set(state.player.x,.06,state.player.z);scene.add(sprite);
   const label=document.createElement('span');label.className='remote-player-label';label.textContent=state.character.name;document.getElementById('world-labels').append(label);
   views.set(id,{...placeholder,loading:false,sprite,frames,label,gait:0,action:null,emote:null});
  }catch{if(views.get(id)===placeholder)placeholder.retryAt=performance.now()+5000;}
 }
 function acceptSnapshot(s){
  clock=s.time;game.applyNetworkSnapshot(s);
  const ids=new Set(s.players.map(p=>p.id));for(const [id,v] of views)if(!ids.has(id)){if(!v.loading)remove(v);views.delete(id);}
  for(const p of s.players){const v=views.get(p.id);if(v){v.state={...v.state,...p};if(v.retryAt&&performance.now()>v.retryAt)addRemote(v.state);}else if(p.character)addRemote(p);}
  for(const e of s.events??[]){if(e.actor===client.id){game.world.events.push(e);continue;}
   const v=views.get(e.actor);if(!v||v.loading)continue;
   if(e.type==='cast'){v.action={index:e.skillIndex,start:clock};const track=skillTrack(v.state.character.classId,e.skillIndex);if(track)fx.create(track,{...e,reduced:reduced.matches});}
   if(e.type==='emote')v.emote={name:e.name,start:clock};
  }
 }
 $('online-join').onclick=async()=>{
  if(active)return;$('online-join').disabled=true;
  try{await account.beginOnline();active=true;client=new MultiplayerClient({url,identity});game.setNetwork(client);account.setOnline(client);
   client.addEventListener('status',({detail})=>{button.dataset.connected=String(detail==='online');button.textContent=detail==='online'?'ออนไลน์ · '+roster.length+' คน':detail==='reconnecting'?'กำลังเชื่อมต่อใหม่…':'ผู้เล่นออนไลน์';status(({connecting:'กำลังเข้าห้อง…',reconnecting:'เน็ตหลุด · หยุดตัวละครและกำลังเชื่อมต่อใหม่',online:'เชื่อมต่อแล้ว · เซิร์ฟเวอร์บันทึกให้อัตโนมัติ',offline:'ออกจากห้องแล้ว',error:'เชื่อมต่อไม่ได้ · กรุณาโหลดหน้าใหม่หลังแก้ปัญหา'})[detail]);$('online-leave').hidden=detail!=='online';$('online-reload').hidden=!['error','reconnecting'].includes(detail);});
   client.addEventListener('welcome',({detail})=>{for(const m of detail.history)log(m);});
   client.addEventListener('snapshot',({detail})=>acceptSnapshot(detail));
   client.addEventListener('events',({detail})=>game.world.events.push(...detail.events));
   client.addEventListener('chat',({detail})=>log(detail));
   client.addEventListener('social',({detail})=>{roster=detail.players;party=detail.party;drawRoster();button.textContent='ออนไลน์ · '+roster.length+' คน';});
   client.addEventListener('error',({detail})=>status(messages[detail.code]??'ไม่สามารถทำรายการนี้ได้ · '+detail.code));
   client.addEventListener('invite',({detail:m})=>{const row=document.createElement('div'),text=document.createElement('span');text.textContent=m.name+' ชวนเข้าปาร์ตี้';row.append(text);for(const [label,accept] of [['รับคำเชิญ',true],['ปฏิเสธ',false]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{client.command('answer',{invite:m.id,accept});row.remove();};row.append(b);}$('online-invites').append(row);setTimeout(()=>row.remove(),Math.max(0,m.expires-Date.now()));});
   await client.connect();
  }catch{active=false;$('online-join').disabled=false;status('เปิดออนไลน์ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อ');}
 };
 $('online-leave').onclick=async()=>{try{await client.leave();location.reload();}catch{status('ยังยืนยันการบันทึกไม่ได้ กรุณารอเชื่อมต่อใหม่');}};
 $('online-party-leave').onclick=()=>client?.command('leaveParty');
 $('online-chat').onsubmit=e=>{e.preventDefault();if(!client?.command('chat',{channel:$('online-channel').value,text:$('online-text').value})){status('ต้องเชื่อมต่อออนไลน์ก่อนส่งข้อความ');return;}$('online-text').value='';};
 addEventListener('pagehide',()=>client?.stop());
 return {get paused(){return dialog.open;},update(dt){
  if(!active)return;clock+=Math.min(.05,dt);fx.update(Math.min(.05,dt),camera);
  for(const v of views.values()){
   if(v.loading)continue;const state=v.state,p=state.player,old=v.sprite.position.clone(),f=1-Math.exp(-Math.min(.05,dt)*14);v.sprite.position.x+=(p.x-v.sprite.position.x)*f;v.sprite.position.z+=(p.z-v.sprite.position.z)*f;v.gait+=Math.hypot(v.sprite.position.x-old.x,v.sprite.position.z-old.z)/2.1;
   const elapsed=clock-(v.action?.start??-100),track=skillTrack(state.character.classId,v.action?.index),emote=clock-(v.emote?.start??-100)<4;
   const pose=track&&elapsed<track.duration?skillPose(state.character.classId,v.action.index,elapsed,{reduced:reduced.matches}):characterMotion({classId:state.character.classId,mode:v.action&&v.action.index===null&&elapsed<attackDuration(state.character.classId)?'attack':emote?v.emote.name:p.moving?'walk':'idle',time:v.action&&v.action.index===null&&elapsed<attackDuration(state.character.classId)?elapsed:emote?clock-v.emote.start:clock,phase:v.gait,reduced:reduced.matches});
   v.sprite.material.map=v.frames[pose.frame];v.sprite.position.y=(p.z>4.25?.41:.06)+pose.y;const angle=controls.getAzimuthalAngle();v.sprite.userData.pose(pose,p.face.x*Math.cos(angle)-p.face.z*Math.sin(angle)<0);v.sprite.visible=p.hp>0;
   projection.set(v.sprite.position.x,v.sprite.position.y+2.1,v.sprite.position.z).project(camera);v.label.style.transform=`translate(-50%,-100%) translate(${(projection.x*.5+.5)*innerWidth}px,${(-projection.y*.5+.5)*innerHeight}px)`;v.label.hidden=p.hp<=0||Math.abs(projection.x)>1.1||Math.abs(projection.y)>1.1;
  }
 }};
}

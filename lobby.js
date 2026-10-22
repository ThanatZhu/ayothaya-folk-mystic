import {getLoadingScreen} from './loading-screen.js?v=39';
import {createMotionPreview} from './motion-preview.js?v=41.2';
import {characterMotion} from './character-motion.js?v=37';
import {validateAppearance} from './appearance-state.js';
import {customizeAtlas} from './character-appearance.js?v=41';
import {progression,jobFor,CLASS_LEVEL,advanceReady} from './advancement.js?v=73';
import {CLASSES,getClass,className,atlasPath} from './classes.js?v=112.1';
import {previewPose} from './sprite-motion.js';
import {createLandscapeGuard} from './mobile-layout.js?v=66';
import {connectFirebase,deadline} from './firebase-client.js';
import {SERVERS,CHANNELS,CHANNEL_KEY,normalizeChannel,ENTRY_KEY,CHARACTER_SLOTS} from './realm-state.js?v=62';
import {createRealmStore} from './realm-store.js?v=114';
import {wakeServer} from './multiplayer-config.js?v=27';
wakeServer();
const $=id=>document.getElementById(id);
createLandscapeGuard();
let connection=null,catalog=null,owner=null,store=null,selected=null,record=null,busy=false,screen='login',selectedClass='novice',previewGender='male',poseMode='cycle',previewTime=0;
let roster=[],selectedChannel=normalizeChannel(typeof sessionStorage!=='undefined'?sessionStorage.getItem(CHANNEL_KEY):1);
const say=text=>$('lobby-status').textContent=text;
const lobbyMotion=createMotionPreview($('hero-preview'));
// 0.113 the dressing room is off for now: new characters take the default look, saved looks still show in the preview
const atlases=new Map();let atlasToken=0;
async function drawAtlas(){
 const token=++atlasToken,id=selectedClass,src=atlasPath(id);
 if(!atlases.has(src))atlases.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;}));
 try{const img=await atlases.get(src);if(token===atlasToken)lobbyMotion.setSource(customizeAtlas(img,validateAppearance(record?.character.appearance),id),previewGender,id,record?.equipment);}catch{atlases.delete(src);}
}
function show(next){screen=next;document.body.dataset.screen=next;for(const s of ['login','servers','character'])$(s+'-screen').hidden=s!==next;document.querySelectorAll('[data-step]').forEach(el=>next===el.dataset.step?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current'));$(next+'-screen').querySelector('h2').focus();say('');}
function lock(value){busy=value;document.querySelectorAll('#profession-options input,[name=gender],.server,#create-character,#enter-world,#back-servers,#back-login,#login-guest,#login-quick,#link-google,#identity-link,#switch-account,#continue-account,#change-class,#delete-character,.character-slot').forEach(b=>b.disabled=value);}
function report(error){
 const code=error.code||error.message;
 const messages={'slots-full':'ครบ 5 ตัวละครแล้ว','class-locked':'ต้องให้ Job ผู้ฝึกตนตัน (Job 10) ก่อนเลือกอาชีพ','class-final':'เลือกอาชีพแล้ว ไม่สามารถเปลี่ยนสายได้','job-locked':'ต้องให้ Job อาชีพตัน (Job 40) ก่อนเป็น Master','job-final':'เลือกสาย Master แล้ว','save-conflict':'มีข้อมูลใหม่จากอีกหน้าต่าง กรุณาโหลดหน้าใหม่','player-online':'ตัวละครในบัญชีนี้ยังอยู่ในเกม ออกจากเกมแล้วรอสักครู่ค่อยลบ','character-not-found':'ไม่พบตัวละครนี้แล้ว ลองโหลดหน้าใหม่','bad-token':'การล็อกอินหมดอายุ กรุณาโหลดหน้าใหม่'};if(messages[code]){say(messages[code]);return;}
 say(code==='character-exists'?'มีตัวละครในเซิร์ฟเวอร์นี้แล้ว กดเปลี่ยนเซิร์ฟเวอร์แล้วเลือกอีกครั้ง':code==='auth/popup-blocked'?'กรุณาอนุญาตป๊อปอัป แล้วกด Google อีกครั้ง':code==='auth/popup-closed-by-user'?'ยังไม่ได้ล็อกอิน ลองใหม่ได้ครับ':code==='permission-denied'?'ยังเข้าถึงเซฟไม่ได้ กรุณาลองอีกครั้ง':String(code).startsWith('ชื่อ')||String(code).startsWith('กรุณา')?code:'เชื่อมต่อไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง');
}
const catalogReady=fetch('./maps/world.json?v=108.3').then(r=>{if(!r.ok)throw new Error('catalog');return r.json();}).then(v=>catalog=v);
catalogReady.catch(()=>say('โหลดข้อมูลโลกไม่ได้ กรุณาโหลดหน้าใหม่'));
// 0.112.7 quick play: a Firebase anonymous account plays online like a Google one (same saves, same server). Linking
// Google later keeps the same uid, so every character stays. Signing out of an unlinked account loses it for good.
const anon=()=>!!connection?.auth.currentUser?.isAnonymous;
function showIdentity(){
 const u=connection?.auth.currentUser;
 $('identity').textContent=owner==='guest'?'โหมดออฟไลน์ · เซฟบนเครื่องนี้':anon()?'ผู้เล่นใหม่ · ยังไม่ผูก Google':u?.displayName||'นักเดินทาง';
 $('identity-link').hidden=!(owner&&owner!=='guest'&&anon());
}
async function linkGoogle(){
 if(!connection||busy||!anon())return;const provider=new connection.sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});lock(true);
 try{const r=await connection.sdk.linkWithPopup(connection.auth.currentUser,provider);say('ผูกบัญชี Google แล้ว · '+(r.user.displayName||r.user.email||'')+' · ตัวละครทั้งหมดอยู่ครบ');showIdentity();setButtons();}
 catch(e){if(e.code==='auth/credential-already-in-use'||e.code==='auth/email-already-in-use')say('บัญชี Google นี้มีข้อมูลเกมของตัวเองอยู่แล้ว · เลือกบัญชี Google อื่นที่ยังไม่เคยเล่น');else report(e);}
 finally{lock(false);}
}
function setButtons(){
 const u=connection?.auth.currentUser;$('continue-account').hidden=!u;$('switch-account').hidden=!u;$('login-google').hidden=!!u;
 $('login-quick').hidden=!!u;$('link-google').hidden=!(u&&u.isAnonymous);
}
async function selectIdentity(id){
 lock(true);say('กำลังเตรียมรายชื่อเซิร์ฟเวอร์…');
 try{await catalogReady;owner=id;store=createRealmStore({connection,owner,catalog});showIdentity();show('servers');}
 catch(e){report(e);}finally{lock(false);}
}
async function setup(){
 try{
  connection=await deadline(connectFirebase());$('login-google').disabled=false;$('retry-connection').hidden=true;
  const user=connection.auth.currentUser;$('login-quick').disabled=false;setButtons();
  if(screen==='login')say(user?(user.isAnonymous?'ยินดีต้อนรับกลับ · บัญชีนี้ยังไม่ผูก Google':'ยินดีต้อนรับกลับ '+(user.displayName||'นักเดินทาง')):'');
  connection.sdk.onAuthStateChanged(connection.auth,u=>{if(owner&&owner!=='guest'&&u?.uid!==owner)location.replace('./play.html');});
 }catch(e){if(screen==='login'){report(e);$('retry-connection').hidden=false;}}
}
$('retry-connection').onclick=()=>location.reload();setup();
$('login-google').onclick=async()=>{
 if(!connection||busy)return;const provider=new connection.sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});lock(true);$('login-google').disabled=true;
 try{const result=await connection.sdk.signInWithPopup(connection.auth,provider);$('switch-account').hidden=false;await selectIdentity(result.user.uid);}catch(e){report(e);}finally{lock(false);$('login-google').disabled=false;}
};
$('continue-account').onclick=()=>selectIdentity(connection.auth.currentUser.uid);
$('login-guest').onclick=()=>selectIdentity('guest');
$('login-quick').onclick=async()=>{
 if(!connection||busy)return;lock(true);
 try{const r=await connection.sdk.signInAnonymously(connection.auth);setButtons();await selectIdentity(r.user.uid);}
 catch(e){if(e.code==='auth/operation-not-allowed'||e.code==='auth/admin-restricted-operation')say('ยังเปิดโหมดเล่นทันทีไม่ได้ · ใช้ Google หรือเล่นออฟไลน์ไปก่อน');else report(e);}
 finally{lock(false);}
};
$('link-google').onclick=linkGoogle;$('identity-link').onclick=linkGoogle;
$('switch-account').onclick=async()=>{if(busy)return;if(anon()&&!confirm('บัญชีนี้ยังไม่ได้ผูก Google · ถ้าออกตอนนี้ ตัวละครทั้งหมดในบัญชีนี้จะหายถาวร · กด ยกเลิก แล้วผูก Google ก่อน หรือกด ตกลง เพื่อออกเลย'))return;lock(true);try{await connection.sdk.signOut(connection.auth);sessionStorage.removeItem(ENTRY_KEY);location.replace('./play.html');}catch(e){report(e);lock(false);}};
$('back-login').onclick=()=>{if(!busy){owner=null;show('login');setup();}};
$('back-servers').onclick=()=>{if(!busy)show('servers');};
function preview(gender=previewGender){
 previewGender=gender;const c=getClass(selectedClass),art=$('hero-preview');
 art.className='hero-art rig-preview '+gender;art.style.backgroundImage='url("'+atlasPath(c.id)+'")';art.style.setProperty('--row',gender==='female'?'100%':'0%');art.setAttribute('aria-label',className(c.id,gender)+' · '+(gender==='female'?'หญิง':'ชาย'));
 $('class-name').textContent=c.icon+' '+className(c.id,gender);$('class-description').textContent=c.description;$('class-badge').textContent=c.role;
 const canChoose=false; // Class changes now belong to the teachers' in-world trials.
 $('profession-options').hidden=!canChoose;
 $('change-class').hidden=!canChoose||selectedClass===record.character.classId;$('enter-world').hidden=!!record&&selectedClass!==record.character.classId;
 document.querySelectorAll('[name=profession]').forEach(el=>el.checked=el.value===selectedClass);
 drawAtlas();previewTime=0;
}
for(const c of CLASSES){const label=document.createElement('label');label.className='class-option';const radio=document.createElement('input');radio.type='radio';radio.name='profession';radio.value=c.id;radio.checked=c.id===selectedClass;radio.addEventListener('change',()=>{selectedClass=c.id;preview();});const text=document.createElement('span');text.textContent=c.name;const icon=document.createElement('b');icon.textContent=c.icon;label.append(radio,icon,text);$('class-options').append(label);}
document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{poseMode=b.dataset.pose;previewTime=0;document.querySelectorAll('[data-pose]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
let previewLast=0;const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let lastRigDraw=0;
function animatePreview(ms){const dt=Math.min(.05,(ms-previewLast)/1000);previewLast=ms;
 if(!document.hidden&&screen==='character'){
 const stopped=document.body.classList.contains('motion-off')||reduced.matches;if(!stopped)previewTime+=dt;
 const state=previewPose(previewTime,poseMode,stopped);
 if(ms-lastRigDraw>=1000/30){lastRigDraw=ms;const mode=poseMode==='attack'?'attack':state.casting?'attack':state.moving?'walk':'idle';lobbyMotion.draw(characterMotion({time:mode==='attack'?previewTime%.95:previewTime,mode,classId:selectedClass,reduced:stopped}));}
 $('hero-preview').dataset.pose=stopped?'idle':state.casting?'attack':state.moving?'walk':'idle';
 }requestAnimationFrame(animatePreview);
}requestAnimationFrame(animatePreview);
preview();
document.querySelectorAll('[name=gender]').forEach(input=>input.addEventListener('change',()=>preview(input.value)));
function drawRoster(){
 $('slot-count').textContent=roster.length+' / 5';$('character-slots').replaceChildren();
 for(const id of CHARACTER_SLOTS){
  const row=roster.find(r=>r.slotId===id),button=document.createElement('button');button.type='button';button.className='character-slot';button.setAttribute('aria-pressed',String(row?.slotId===record?.slotId&&!!row));
  if(row){const image=document.createElement('span');image.className='slot-portrait';image.style.backgroundImage='url('+atlasPath(row.character.classId)+')';image.style.backgroundPosition='0 '+(row.character.gender==='female'?'100%':'0%');const name=document.createElement('strong');name.textContent=row.character.name;const detail=document.createElement('small');detail.textContent='Lv. '+progression(row.state.traveler).level+' · '+className(row.character.classId,row.character.gender);button.append(image,name,detail);button.setAttribute('aria-label','เลือก '+row.character.name+' '+detail.textContent);}
  else{button.textContent='+ สร้างตัวละคร';button.setAttribute('aria-label','สร้างตัวละครช่อง '+id.slice(-1));}
  button.onclick=()=>{if(busy)return;record=row??null;selected=row?row.serverId:'server-1';displayCharacter();};$('character-slots').append(button);
 }
}
function displayCharacter(){
 const srv=SERVERS[0];$('realm-caption').textContent=srv.name+' · '+srv.subtitle;
 $('character-form').hidden=!!record;$('existing-character').hidden=!record;$('character-title').textContent=record?'เลือกตัวละคร':'สร้างผู้ฝึกตน';drawRoster();
 $('character-form').hidden=!!record||roster.length>=5;
 $('progression-hint').textContent=!record?'เริ่มเป็นผู้ฝึกตน Lv. 1 · Job 10 ตันแล้วเปลี่ยนอาชีพ · Job 40 ตันรับ Master · Base สูงสุด 99':record.character.jobId?'Master · '+jobFor(record.character.classId,record.character.jobId).name:record.character.classId==='novice'?(advanceReady(record.state.traveler,'novice').ok?'พร้อมรับบททดสอบอาชีพที่ลานครูแห่งอโยธยา':'ฝึก Job ผู้ฝึกตนให้ตัน (Job 10) เพื่อเปลี่ยนอาชีพ'):'อาชีพ '+className(record.character.classId,record.character.gender)+'ฝึก Job ให้ตัน (Job 40) เพื่อรับ Master';
 if(record){selectedClass=record.character.classId;preview(record.character.gender);$('existing-name').textContent=record.character.name+' · Lv. '+progression(record.state.traveler).level;$('existing-detail').textContent=(jobFor(record.character.classId,record.character.jobId)?.name??className(record.character.classId,record.character.gender))+' · '+(record.character.gender==='female'?'หญิง':'ชาย')+' · '+(catalog.maps.find(m=>m.id===record.state.mapId)??catalog.maps.find(m=>m.id===catalog.capital)).name;}
 else{$('character-form').reset();selectedClass='novice';preview('male');}
 $('stage-name').textContent=record?.character.name??'';
 show('character');
}
$('hero-name').addEventListener('input',()=>{if(!record)$('stage-name').textContent=$('hero-name').value.trim();});
document.querySelectorAll('[data-server]').forEach(button=>button.onclick=async()=>{
 if(busy)return;lock(true);selected=button.dataset.server||'server-1';selectedChannel=normalizeChannel(button.dataset.channel);try{sessionStorage.setItem(CHANNEL_KEY,String(selectedChannel));}catch{}say('กำลังโหลดตัวละคร…');
 try{roster=await store.list();record=roster[0]??null;if(record)selected=record.serverId;displayCharacter();}catch(e){record=null;report(e);}finally{lock(false);}
});
$('character-form').onsubmit=async event=>{
 event.preventDefault();if(busy)return;lock(true);say('กำลังสร้างตัวละคร…');
 try{record=await store.create(selected,{name:$('hero-name').value,gender:document.querySelector('[name=gender]:checked').value,classId:'novice',appearance:validateAppearance(),jobId:''});roster=await store.list();displayCharacter();say('สร้างตัวละครแล้ว พร้อมออกเดินทาง');}catch(e){report(e);}finally{lock(false);}
};
$('change-class').onclick=async()=>{
 if(!record||busy||selectedClass===record.character.classId)return;lock(true);say('กำลังบันทึกอาชีพ…');
 try{record=await store.changeClass(selected,record,selectedClass);roster=await store.list();displayCharacter();say('เปลี่ยนอาชีพแล้ว · ความคืบหน้าเดิมยังอยู่');}catch(e){report(e);}finally{lock(false);}
};
$('delete-character').onclick=()=>{if(!record||busy)return;$('delete-name').textContent=record.character.name;$('delete-confirm').value='';$('delete-go').disabled=true;$('delete-dialog').showModal();$('delete-confirm').focus();};
$('delete-confirm').oninput=()=>{$('delete-go').disabled=$('delete-confirm').value.trim()!==record?.character.name;};
$('delete-dialog').addEventListener('close',async()=>{
 if($('delete-dialog').returnValue!=='ok'||!record||busy)return;lock(true);say('กำลังลบตัวละคร…');
 try{const name=record.character.name;await store.remove(record);record=null;roster=await store.list();displayCharacter();say('ลบ '+name+' แล้ว');}catch(e){report(e);}finally{lock(false);}
});
$('enter-world').onclick=()=>{
 if(!record||busy)return;
 try{const srv=record.serverId||selected||'server-1';sessionStorage.setItem(CHANNEL_KEY,String(selectedChannel));sessionStorage.setItem(ENTRY_KEY,JSON.stringify({owner,serverId:srv,slotId:record.slotId,channel:selectedChannel}));getLoadingScreen().show(record.state.mapId,{travel:true,message:'กำลังเข้าสู่โลกอโยธยา…'});requestAnimationFrame(()=>location.assign('./game.html?server='+srv+'&channel='+selectedChannel+'&map='+record.state.mapId));}catch{say('กรุณาเปิดอนุญาตพื้นที่เก็บข้อมูลของเบราว์เซอร์เพื่อเข้าเกม');}
};
$('ambient-toggle').onclick=()=>{const off=document.body.classList.toggle('motion-off');$('ambient-toggle').textContent=off?'เปิดโมชั่น':'หยุดโมชั่น';$('ambient-toggle').setAttribute('aria-pressed',String(off));};
for(let i=0;i<25;i++){const p=document.createElement('i');p.className='ember';p.style.left=((i*37)%100)+'%';p.style.top=(25+(i*23)%75)+'%';p.style.animationDelay=(-i*.71)+'s';p.style.animationDuration=(7+i%8)+'s';$('embers').append(p);}

addEventListener('pageshow',e=>{if(e.persisted)getLoadingScreen().hide();});

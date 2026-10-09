import {createLandscapeGuard} from './mobile-layout.js';
import {connectFirebase,deadline} from './firebase-client.js';
import {SERVERS,ENTRY_KEY} from './realm-state.js';
import {createRealmStore} from './realm-store.js';
const $=id=>document.getElementById(id);
createLandscapeGuard();
let connection=null,catalog=null,owner=null,store=null,selected=null,record=null,busy=false,screen='login';
const say=text=>$('lobby-status').textContent=text;
function show(next){screen=next;document.body.dataset.screen=next;for(const s of ['login','servers','character'])$(s+'-screen').hidden=s!==next;document.querySelectorAll('[data-step]').forEach(el=>next===el.dataset.step?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current'));$(next+'-screen').querySelector('h2').focus();say('');}
function lock(value){busy=value;document.querySelectorAll('.server,#create-character,#enter-world,#back-servers,#back-login,#login-guest,#switch-account,#continue-account').forEach(b=>b.disabled=value);}
function report(error){
 const code=error.code||error.message;
 say(code==='character-exists'?'มีตัวละครในเซิร์ฟเวอร์นี้แล้ว กดเปลี่ยนเซิร์ฟเวอร์แล้วเลือกอีกครั้ง':code==='auth/popup-blocked'?'กรุณาอนุญาตป๊อปอัป แล้วกด Google อีกครั้ง':code==='auth/popup-closed-by-user'?'ยังไม่ได้ล็อกอิน ลองใหม่ได้ครับ':code==='permission-denied'?'ยังเข้าถึงเซฟไม่ได้ กรุณาลองอีกครั้ง':String(code).startsWith('ชื่อ')||String(code).startsWith('กรุณา')?code:'เชื่อมต่อไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง');
}
const catalogReady=fetch('./maps/world.json').then(r=>{if(!r.ok)throw new Error('catalog');return r.json();}).then(v=>catalog=v);
catalogReady.catch(()=>say('โหลดข้อมูลโลกไม่ได้ กรุณาโหลดหน้าใหม่'));
async function selectIdentity(id){
 lock(true);say('กำลังเตรียมรายชื่อเซิร์ฟเวอร์…');
 try{await catalogReady;owner=id;store=createRealmStore({connection,owner,catalog});$('identity').textContent=owner==='guest'?'โหมดทดลอง · เซฟบนเครื่องนี้':connection.auth.currentUser.displayName||'นักเดินทาง';show('servers');}
 catch(e){report(e);}finally{lock(false);}
}
async function setup(){
 try{
  connection=await deadline(connectFirebase());$('login-google').disabled=false;$('retry-connection').hidden=true;
  const user=connection.auth.currentUser;$('continue-account').hidden=!user;$('switch-account').hidden=!user;$('login-google').hidden=!!user;
  if(screen==='login')say(user?'ยินดีต้อนรับกลับ '+(user.displayName||'นักเดินทาง'):'');
  connection.sdk.onAuthStateChanged(connection.auth,u=>{if(owner&&owner!=='guest'&&u?.uid!==owner)location.replace('./');});
 }catch(e){if(screen==='login'){report(e);$('retry-connection').hidden=false;}}
}
$('retry-connection').onclick=()=>location.reload();setup();
$('login-google').onclick=async()=>{
 if(!connection||busy)return;const provider=new connection.sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});lock(true);$('login-google').disabled=true;
 try{const result=await connection.sdk.signInWithPopup(connection.auth,provider);$('switch-account').hidden=false;await selectIdentity(result.user.uid);}catch(e){report(e);}finally{lock(false);$('login-google').disabled=false;}
};
$('continue-account').onclick=()=>selectIdentity(connection.auth.currentUser.uid);
$('login-guest').onclick=()=>selectIdentity('guest');
$('switch-account').onclick=async()=>{if(busy)return;lock(true);try{await connection.sdk.signOut(connection.auth);sessionStorage.removeItem(ENTRY_KEY);location.replace('./');}catch(e){report(e);lock(false);}};
$('back-login').onclick=()=>{if(!busy){owner=null;show('login');setup();}};
$('back-servers').onclick=()=>{if(!busy)show('servers');};
function preview(gender){$('hero-preview').className='hero-art '+gender;$('hero-preview').setAttribute('aria-label',gender==='female'?'หมอผีหญิง':'หมอผีชาย');}
document.querySelectorAll('[name=gender]').forEach(input=>input.addEventListener('change',()=>preview(input.value)));
function displayCharacter(){
 const realm=SERVERS.find(s=>s.id===selected);$('realm-caption').textContent=realm.name+' · '+realm.subtitle;
 $('character-form').hidden=!!record;$('existing-character').hidden=!record;$('character-title').textContent=record?'เลือกตัวละคร':'สร้างตัวละคร';
 if(record){preview(record.character.gender);$('existing-name').textContent=record.character.name;$('existing-detail').textContent='หมอผี · '+(record.character.gender==='female'?'หญิง':'ชาย')+' · '+catalog.maps.find(m=>m.id===record.state.mapId).name;}
 else{$('character-form').reset();preview('male');}
 show('character');
}
document.querySelectorAll('[data-server]').forEach(button=>button.onclick=async()=>{
 if(busy)return;lock(true);selected=button.dataset.server;say('กำลังโหลดตัวละคร…');
 try{record=await store.load(selected);displayCharacter();}catch(e){record=null;report(e);}finally{lock(false);}
});
$('character-form').onsubmit=async event=>{
 event.preventDefault();if(busy)return;lock(true);say('กำลังสร้างตัวละคร…');
 try{record=await store.create(selected,{name:$('hero-name').value,gender:document.querySelector('[name=gender]:checked').value,classId:'shaman'});displayCharacter();say('สร้างตัวละครแล้ว พร้อมออกเดินทาง');}catch(e){report(e);}finally{lock(false);}
};
$('enter-world').onclick=()=>{
 if(!record||busy)return;
 try{sessionStorage.setItem(ENTRY_KEY,JSON.stringify({owner,serverId:selected}));location.assign('./game.html?server='+selected+'&map='+record.state.mapId);}catch{say('กรุณาเปิดอนุญาตพื้นที่เก็บข้อมูลของเบราว์เซอร์เพื่อเข้าเกม');}
};
$('ambient-toggle').onclick=()=>{const off=document.body.classList.toggle('motion-off');$('ambient-toggle').textContent=off?'เปิดโมชั่น':'หยุดโมชั่น';$('ambient-toggle').setAttribute('aria-pressed',String(off));};
for(let i=0;i<25;i++){const p=document.createElement('i');p.className='ember';p.style.left=((i*37)%100)+'%';p.style.top=(25+(i*23)%75)+'%';p.style.animationDelay=(-i*.71)+'s';p.style.animationDuration=(7+i%8)+'s';$('embers').append(p);}

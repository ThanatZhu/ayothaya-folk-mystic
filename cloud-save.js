import {firebaseConfig} from './firebase-config.js';
import {validateSave,nextRevision} from './save-state.js';

const $=id=>document.getElementById(id),guestKey='ayothaya-guest-v1';
function errorText(error){
 const code=error?.code||error?.message;
 if(code==='save-conflict')return 'มีเซฟใหม่จากอีกหน้าต่างหรืออีกเครื่อง กรุณาโหลดเซฟล่าสุด';
 if(String(code).startsWith('save-'))return 'เซฟนี้เปิดกับเกมเวอร์ชันนี้ไม่ได้ กรุณาโหลดหน้าใหม่';
 if(code==='auth/popup-closed-by-user')return 'ปิดหน้าล็อกอินแล้ว ลองใหม่ได้ครับ';
 if(code==='auth/popup-blocked')return 'กรุณาอนุญาตป๊อปอัป แล้วกดล็อกอินอีกครั้ง';
 if(code==='auth/unauthorized-domain')return 'โดเมนนี้ยังไม่ได้เปิด Google Login กรุณาใช้ลิงก์เกมออนไลน์';
 return 'เชื่อมต่อเซฟไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง';
}

export async function prepareCloud(catalog){
 let sdk=null,auth=null,db=null,user=null,data=null,revision=0,bound=null;
 let loading=true,blocked=false,busy=false,queue=Promise.resolve(),lastJSON='',mode='guest',traveling=false;
 const panel=$('account-panel'),status=$('save-status'),message=$('account-message');
 const say=text=>{status.textContent=text;message.textContent=text;};
 const inert=active=>{for(const element of $('game-shell').children)if(element!==panel)element.inert=active;};
 const open=()=>{panel.hidden=false;inert(true);bound?.clearInput();$('close-account').focus();};
 const close=()=>{if(!loading&&!blocked){panel.hidden=true;inert(false);$('open-account').focus();}};
 $('open-account').onclick=()=>panel.hidden?open():close();$('close-account').onclick=close;
 $('reload-save').onclick=()=>location.reload();
 addEventListener('keydown',e=>{if(!panel.hidden){if(e.code==='Escape')close();if(!e.target.closest('button,input'))e.preventDefault();e.stopImmediatePropagation();}},true);
 function readGuest(){try{const raw=JSON.parse(localStorage.getItem(guestKey));return raw?validateSave(raw,catalog):null;}catch{return null;}}
 const sdkReady=(async()=>{
  const [app,a,f]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')]);
  sdk={...a,...f};const instance=app.initializeApp(firebaseConfig);
  auth=a.getAuth(instance);db=f.getFirestore(instance);auth.languageCode='th';
  await a.setPersistence(auth,a.browserLocalPersistence);await auth.authStateReady();
 })();
 try{
  await Promise.race([sdkReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),12000))]);
  user=auth.currentUser;
  if(user){
   mode='cloud';say('กำลังโหลดเซฟจากบัญชี Google…');
   const snap=await Promise.race([sdk.getDocFromServer(sdk.doc(db,'players',user.uid,'saves','main')),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),12000))]);
   if(snap.exists()){
    const saved=snap.data();data=validateSave(saved.state,catalog);revision=saved.revision;
    if(!Number.isSafeInteger(revision)||revision<1)throw new Error('save-data');
   }
   $('account-name').textContent=user.displayName||'ผู้เล่น Google';
   say(data?'โหลดเซฟจากคลาวด์แล้ว':'บัญชีใหม่ · พร้อมเริ่มผจญภัย');
  }else{data=readGuest();say('เล่นบนเครื่องนี้ · ล็อกอินเพื่อเซฟข้ามเครื่อง');}
 }catch(error){
  // A failed cloud read must never be treated as a new character.
  if(!user)data=readGuest();
  blocked=true;say(errorText(error));open();$('reload-save').hidden=false;
 }
 loading=false;
 $('google-login').disabled=!sdk||!auth;$('google-login').hidden=!!user;
 $('logout-account').hidden=!user;$('save-now').hidden=!user;
 $('guest-play').hidden=!!user;
 if(!user&&!blocked){$('account-name').textContent='ยินดีต้อนรับสู่อโยธยา';try{if(!sessionStorage.getItem('ayothaya-guest-chosen'))open();}catch{open();}}
 $('guest-play').onclick=()=>{mode='guest';blocked=false;data=readGuest();try{sessionStorage.setItem('ayothaya-guest-chosen','1');}catch{}close();};
 $('google-login').onclick=async()=>{
  if(busy||!auth)return;busy=true;$('google-login').disabled=true;
  // Open the popup directly in the tap handler (Safari loses activation across awaits).
  try{if(bound)localStorage.setItem(guestKey,JSON.stringify(bound.capture()));}catch{}
  try{const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await sdk.signInWithPopup(auth,provider);location.reload();}
  catch(error){say(errorText(error));}finally{busy=false;$('google-login').disabled=false;}
 };
 if(auth)sdk.onAuthStateChanged(auth,current=>{
  if((current?.uid||null)!==(user?.uid||null)){blocked=true;bound?.clearInput();location.reload();}
 });
 function save(override){
  const operation=queue.catch(()=>{}).then(async()=>{
   if(!bound)return true;
   if(blocked)throw new Error('save-blocked');
   const state=override||bound.capture(),json=JSON.stringify(state);
   if(json===lastJSON)return true;
   if(mode==='guest'){
    localStorage.setItem(guestKey,json);lastJSON=json;say('เซฟบนเครื่องนี้แล้ว · ยังไม่ได้ล็อกอิน');return true;
   }
   if(!navigator.onLine)throw new Error('offline');
   say('กำลังเซฟ…');
   const ref=sdk.doc(db,'players',user.uid,'saves','main'),expected=revision;
   const next=await sdk.runTransaction(db,async tx=>{
    const snap=await tx.get(ref),actual=snap.exists()?snap.data().revision:0;
    const rev=nextRevision(actual,expected);
    tx.set(ref,{state,revision:rev,updatedAt:sdk.serverTimestamp()});return rev;
   });
   revision=next;lastJSON=json;say('เซฟคลาวด์แล้ว · '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));return true;
  });
  queue=operation;
  return operation.catch(error=>{
   say(errorText(error));
   if(error.message==='save-conflict'){blocked=true;bound?.clearInput();$('reload-save').hidden=false;open();}
   throw error;
  });
 }
 $('save-now').onclick=()=>save().catch(()=>open());
 $('logout-account').onclick=async()=>{
  if(busy)return;busy=true;
  try{await save();await sdk.signOut(auth);location.reload();}catch{open();}finally{busy=false;}
 };
 const tick=()=>{if(bound&&!blocked&&!traveling&&!document.hidden)save().catch(()=>{});};
 setInterval(tick,30000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&bound&&!blocked&&!traveling)save().catch(()=>{});});
 addEventListener('online',tick);
 return {data,get paused(){return loading||blocked||!panel.hidden;},get cloud(){return mode==='cloud';},save,
  bind(value){bound=value;inert(!panel.hidden);},
  async travel(destination){
   traveling=true;const state=bound.capture();state.mapId=destination.id;state.position={...destination.spawn};
   try{await save(state);return true;}catch{traveling=false;return false;}
  }};
}

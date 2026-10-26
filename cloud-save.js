import {connectFirebase,deadline} from './firebase-client.js';
import {ENTRY_KEY,validEntry} from './realm-state.js?v=62';
import {createRealmStore} from './realm-store.js?v=101.5';
import {normalizeEquipment,equipItem} from './equipment.js?v=41';
const $=id=>document.getElementById(id);
function toLobby(){location.replace('./play.html');return new Promise(()=>{});}
export async function prepareCloud(catalog){
 let entry;try{entry=JSON.parse(sessionStorage.getItem(ENTRY_KEY));}catch{}
 const serverId=new URLSearchParams(location.search).get('server');
 if(!entry||!validEntry(entry,entry.owner,serverId))return toLobby();
 let online=null,onlineStarting=false;
 let connection=null,store=null,record=null,bound=null,blocked=false,busy=false,traveling=false,lastJSON='',queue=Promise.resolve();
 const panel=$('account-panel'),say=text=>{$('account-message').textContent=text;};
 const inert=active=>{for(const el of $('game-shell').children)if(el!==panel)el.inert=active;};
 const open=()=>{dispatchEvent(new CustomEvent('hud-panel-opening',{detail:'account-panel'}));for(const d of document.querySelectorAll('dialog[data-hud-panel][open]'))d.close();panel.hidden=false;panel.dataset.blocking=String(blocked);panel.setAttribute('aria-modal',String(blocked));inert(blocked);bound?.clearInput();$('close-account').focus();};
 addEventListener('hud-panel-opening',e=>{if(e.detail!=='account-panel'&&!blocked&&!panel.hidden)close();});
 addEventListener('keydown',e=>{if(e.code==='Escape'&&!blocked&&!panel.hidden){e.preventDefault();close();}});
 const close=()=>{if(!blocked){panel.hidden=true;inert(false);$('open-account').focus();}};
 function report(error){const conflict=error.message==='save-conflict';say(conflict?'พบเซฟใหม่จากอีกหน้าต่าง กรุณาโหลดเซฟล่าสุด':'เชื่อมต่อเซฟไม่สำเร็จ กรุณาลองอีกครั้ง');$('open-account').classList.add('sync-error');$('retry-sync').hidden=conflict;if(conflict){blocked=true;$('reload-save').hidden=false;open();}} // 0.97 a passing save failure (entering, warping) only marks the settings button; the 10 s auto-save retries
 $('open-account').onclick=()=>panel.hidden?open():close();$('close-account').onclick=close;$('reload-save').onclick=()=>location.reload();
 $('logout-account').hidden=entry.owner==='guest';

 addEventListener('keydown',e=>{if(!panel.hidden&&blocked){if(e.code==='Escape'){e.preventDefault();close();}if(e.code==='Tab'){const buttons=[...panel.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}if(!e.target.closest('button,input'))e.preventDefault();e.stopImmediatePropagation();}},true);
 try{
  if(entry.owner!=='guest'){
   connection=await deadline(connectFirebase());
   if(!validEntry(entry,connection.auth.currentUser?.uid,serverId))return toLobby();
  }
  store=createRealmStore({connection,owner:entry.owner,catalog});record=await store.load(serverId,entry.slotId);
  if(!record)return toLobby();
  lastJSON=JSON.stringify(record.state);$('account-name').textContent=record.character.name+' · เซิร์ฟ '+serverId.slice(-1);
  const anon=()=>!!connection?.auth.currentUser?.isAnonymous;
  const status=()=>say(!store.cloud?'บันทึกอัตโนมัติ · เฉพาะเบราว์เซอร์นี้':anon()?'บันทึกออนไลน์ · ยังไม่ผูก Google (ผูกเพื่อเก็บตัวละครถาวร)':'บันทึกอัตโนมัติ · บัญชี Google');status();
  // 0.112.7 a quick-play (anonymous) account links Google here too; the uid stays, so nothing moves
  $('link-account').hidden=!anon();
  $('link-account').onclick=async()=>{if(!anon())return;const p=new connection.sdk.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
   try{await connection.sdk.linkWithPopup(connection.auth.currentUser,p);$('link-account').hidden=true;$('logout-account').hidden=false;status();}
   catch(e){say(e.code==='auth/credential-already-in-use'||e.code==='auth/email-already-in-use'?'บัญชี Google นี้มีข้อมูลเกมของตัวเองอยู่แล้ว · เลือกบัญชีอื่น':'ผูกบัญชีไม่สำเร็จ · ลองอีกครั้ง');}};
  if(anon())$('logout-account').hidden=true; // signing out of an unlinked account would lose it
 }catch(e){blocked=true;report(e);$('retry-sync').hidden=true;$('reload-save').hidden=false;open();}
 if(connection)connection.sdk.onAuthStateChanged(connection.auth,u=>{if(u?.uid!==entry.owner){blocked=true;location.replace('./play.html');}});
 function save(override){
  if(online)return online.flush(bound?.capture().settings);
  if(onlineStarting)return Promise.resolve(true);
  const operation=queue.catch(()=>{}).then(async()=>{
   if(blocked||!record)throw new Error('save-blocked');if(!bound)return true;
   const state=override||bound.capture(),json=JSON.stringify(state);if(lastJSON===json)return true;
   say('กำลังบันทึกอัตโนมัติ…');record=await store.save(serverId,record,state);lastJSON=json;$('retry-sync').hidden=true;$('open-account').classList.remove('sync-error');
   say((store.cloud?'บันทึกคลาวด์แล้ว':'บันทึกบนเครื่องแล้ว')+' · '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}));return true;
  });queue=operation;return operation.catch(e=>{report(e);throw e;});
 }
 $('retry-sync').onclick=()=>save().then(()=>{$('retry-sync').hidden=true;$('open-account').classList.remove('sync-error');}).catch(()=>{});
 $('return-lobby').onclick=async()=>{if(busy)return;busy=true;try{if(!blocked)await save();sessionStorage.removeItem(ENTRY_KEY);location.assign('./play.html');}catch{open();}finally{busy=false;}};
 $('logout-account').onclick=async()=>{if(busy)return;busy=true;try{await save();await connection.sdk.signOut(connection.auth);sessionStorage.removeItem(ENTRY_KEY);location.assign('./play.html');}catch{open();}finally{busy=false;}};
 const tick=()=>{if(bound&&!blocked&&!busy&&!traveling&&!document.hidden)save().catch(()=>{});};setInterval(tick,10000);addEventListener('online',tick);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&bound&&!blocked&&!busy&&!traveling)save().catch(()=>{});});
 return {skills:record?.skills,setSkills(skills){record={...record,skills};lastJSON='';return save().catch(()=>false);},slotId:entry.slotId??record?.slotId,async token(){if(!connection?.auth.currentUser||connection.auth.currentUser.uid!==entry.owner)throw new Error('account-changed');return connection.auth.currentUser.getIdToken();},async beginOnline(){await save().catch(()=>{});await queue.catch(()=>{});onlineStarting=true;}/* the realm server loads its own private copy, so a rejected browser save must not block going online */,applyMap(mapId){if(!catalog.maps.some(m=>m.id===mapId))return;record.state.mapId=mapId;record.state.position=null;if(!store.cloud){try{const key='ayothaya-character-v2:'+record.slotId,local=JSON.parse(localStorage.getItem(key));if(local?.serverId===record.serverId){local.state.mapId=mapId;local.state.position=null;localStorage.setItem(key,JSON.stringify(local));}}catch{}}},applyIdentity(hero){Object.assign(record.character,hero);if(!store.cloud){const key='ayothaya-character-v2:'+record.slotId;try{const local=JSON.parse(localStorage.getItem(key));if(local?.serverId===record.serverId){local.character={...local.character,...hero};localStorage.setItem(key,JSON.stringify(local));}}catch{}}lastJSON='';},setOnline(value){online=value;onlineStarting=false;say('บันทึกอัตโนมัติโดยเซิร์ฟเวอร์ออนไลน์');$('open-account').classList.remove('sync-error');$('retry-sync').hidden=true;},data:record?.state,character:record?.character,serverId,get paused(){return blocked||busy;},get cloud(){return store?.cloud;},save,
  get training(){return online?online.training??null:record?.training??null;},
  get equipment(){return normalizeEquipment(online?.equipment??record?.equipment,record.character.classId);},
  async equip(id){
   if(busy||blocked||onlineStarting)throw new Error('not-connected');busy=true;
   try{
    if(online){const result=await online.equip(id);return result.equipment;}
    if(store.cloud)throw new Error('online-required');
    await save();const equipment=equipItem(record.equipment,record.character.classId,id);
    const operation=queue.catch(()=>{}).then(async()=>{record=await store.save(serverId,{...record,equipment},bound.capture());lastJSON=JSON.stringify(record.state);return equipment;});
    queue=operation;return await operation;
   }finally{busy=false;}
  },
  async train(mentor,action,jobId){
   if(busy||blocked||onlineStarting)throw new Error('not-connected');busy=true;
   try{
    if(online){const result=await online.train(mentor,action,jobId);if(!store.cloud&&result.advanced){record=await store.save(serverId,record,bound.capture());record=await store.save(serverId,{...record,character:result.character,training:null},record.state);}return result;}
    if(store.cloud)throw new Error('online-required');await save();const result=await store.train(serverId,record,mentor,action,jobId);record=result.record;lastJSON=JSON.stringify(record.state);return result;
   }finally{busy=false;}
  },
  bind(value){bound=value;inert(blocked&&!panel.hidden);},
  async travel(destination,{warp=false,respawn=false}={}){traveling=true;if(online){try{await online.travel(destination.id,warp,respawn);if(!store.cloud){const state=bound.capture();state.mapId=destination.id;state.position={...destination.spawn};record=await store.save(serverId,record,state);lastJSON=JSON.stringify(state);}return true;}catch{traveling=false;return false;}}if(onlineStarting){traveling=false;return false;}const state=bound.capture();state.mapId=destination.id;state.position={...destination.spawn};try{await save(state);return true;}catch{traveling=false;return false;}}
 };
}

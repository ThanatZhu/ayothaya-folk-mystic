import {openHudPanel} from './hud-panels.js?v=34';
import {connectFirebase,deadline} from './firebase-client.js';
import {ENTRY_KEY,validEntry} from './realm-state.js?v=21';
import {createRealmStore} from './realm-store.js?v=21';
const $=id=>document.getElementById(id);
function toLobby(){location.replace('./');return new Promise(()=>{});}
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
 function report(error){const conflict=error.message==='save-conflict';say(conflict?'พบเซฟใหม่จากอีกหน้าต่าง กรุณาโหลดเซฟล่าสุด':'เชื่อมต่อเซฟไม่สำเร็จ กรุณาลองอีกครั้ง');$('open-account').classList.add('sync-error');$('retry-sync').hidden=conflict;if(conflict){blocked=true;$('reload-save').hidden=false;}open();}
 $('open-account').onclick=()=>panel.hidden?open():close();$('close-account').onclick=close;$('reload-save').onclick=()=>location.reload();
 $('logout-account').hidden=entry.owner==='guest';
 $('open-settings').onclick=()=>{if(blocked)return;close();openHudPanel($('settings-panel'));};
 addEventListener('keydown',e=>{if(!panel.hidden&&blocked){if(e.code==='Escape'){e.preventDefault();close();}if(e.code==='Tab'){const buttons=[...panel.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}if(!e.target.closest('button,input'))e.preventDefault();e.stopImmediatePropagation();}},true);
 try{
  if(entry.owner!=='guest'){
   connection=await deadline(connectFirebase());
   if(!validEntry(entry,connection.auth.currentUser?.uid,serverId))return toLobby();
  }
  store=createRealmStore({connection,owner:entry.owner,catalog});record=await store.load(serverId,entry.slotId);
  if(!record)return toLobby();
  lastJSON=JSON.stringify(record.state);$('account-name').textContent=record.character.name+' · เซิร์ฟ '+serverId.slice(-1);
  say(store.cloud?'บันทึกอัตโนมัติ · บัญชี Google':'บันทึกอัตโนมัติ · เฉพาะเบราว์เซอร์นี้');
 }catch(e){blocked=true;report(e);$('retry-sync').hidden=true;$('reload-save').hidden=false;open();}
 if(connection)connection.sdk.onAuthStateChanged(connection.auth,u=>{if(u?.uid!==entry.owner){blocked=true;location.replace('./');}});
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
 $('return-lobby').onclick=async()=>{if(busy)return;busy=true;try{if(!blocked)await save();sessionStorage.removeItem(ENTRY_KEY);location.assign('./');}catch{open();}finally{busy=false;}};
 $('logout-account').onclick=async()=>{if(busy)return;busy=true;try{await save();await connection.sdk.signOut(connection.auth);sessionStorage.removeItem(ENTRY_KEY);location.assign('./');}catch{open();}finally{busy=false;}};
 const tick=()=>{if(bound&&!blocked&&!busy&&!traveling&&!document.hidden)save().catch(()=>{});};setInterval(tick,10000);addEventListener('online',tick);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&bound&&!blocked&&!busy&&!traveling)save().catch(()=>{});});
 return {skills:record?.skills,setSkills(skills){record={...record,skills};lastJSON='';return save().catch(()=>false);},slotId:entry.slotId??record?.slotId,async token(){if(!connection?.auth.currentUser||connection.auth.currentUser.uid!==entry.owner)throw new Error('account-changed');return connection.auth.currentUser.getIdToken();},async beginOnline(){await save();await queue;onlineStarting=true;},setOnline(value){online=value;onlineStarting=false;say('บันทึกอัตโนมัติโดยเซิร์ฟเวอร์ออนไลน์');},data:record?.state,character:record?.character,serverId,get paused(){return blocked||busy;},get cloud(){return store?.cloud;},save,
  bind(value){bound=value;inert(blocked&&!panel.hidden);},
  async travel(destination){traveling=true;const state=bound.capture();state.mapId=destination.id;state.position={...destination.spawn};try{await save(state);return true;}catch{traveling=false;return false;}}
 };
}

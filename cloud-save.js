import {connectFirebase,deadline} from './firebase-client.js';
import {ENTRY_KEY,validEntry} from './realm-state.js?v=09';
import {createRealmStore} from './realm-store.js?v=09';
const $=id=>document.getElementById(id);
function toLobby(){location.replace('./');return new Promise(()=>{});}
export async function prepareCloud(catalog){
 let entry;try{entry=JSON.parse(sessionStorage.getItem(ENTRY_KEY));}catch{}
 const serverId=new URLSearchParams(location.search).get('server');
 if(!entry||!validEntry(entry,entry.owner,serverId))return toLobby();
 let connection=null,store=null,record=null,bound=null,blocked=false,busy=false,traveling=false,lastJSON='',queue=Promise.resolve();
 const panel=$('account-panel'),say=text=>{$('save-status').textContent=text;$('account-message').textContent=text;};
 const inert=active=>{for(const el of $('game-shell').children)if(el!==panel)el.inert=active;};
 const open=()=>{panel.hidden=false;inert(true);bound?.clearInput();$('close-account').focus();};
 const close=()=>{if(!blocked){panel.hidden=true;inert(false);$('open-account').focus();}};
 function report(error){const conflict=error.message==='save-conflict';say(conflict?'พบเซฟใหม่จากอีกหน้าต่าง กรุณาโหลดเซฟล่าสุด':'เชื่อมต่อเซฟไม่สำเร็จ กรุณาลองอีกครั้ง');if(conflict){blocked=true;open();$('reload-save').hidden=false;}}
 $('open-account').onclick=()=>panel.hidden?open():close();$('close-account').onclick=close;$('reload-save').onclick=()=>location.reload();
 for(const id of ['google-login','guest-play'])$(id).hidden=true;
 $('logout-account').hidden=entry.owner==='guest';$('save-now').hidden=false;
 addEventListener('keydown',e=>{if(!panel.hidden){if(e.code==='Escape')close();if(!e.target.closest('button,input'))e.preventDefault();e.stopImmediatePropagation();}},true);
 try{
  if(entry.owner!=='guest'){
   connection=await deadline(connectFirebase());
   if(!validEntry(entry,connection.auth.currentUser?.uid,serverId))return toLobby();
  }
  store=createRealmStore({connection,owner:entry.owner,catalog});record=await store.load(serverId);
  if(!record)return toLobby();
  lastJSON=JSON.stringify(record.state);$('account-name').textContent=record.character.name+' · เซิร์ฟ '+serverId.slice(-1);
  say(store.cloud?'โหลดเซฟคลาวด์แล้ว':'โหมดทดลอง · เซฟบนเครื่องนี้');
 }catch(e){blocked=true;report(e);$('reload-save').hidden=false;open();}
 if(connection)connection.sdk.onAuthStateChanged(connection.auth,u=>{if(u?.uid!==entry.owner){blocked=true;location.replace('./');}});
 function save(override){
  const operation=queue.catch(()=>{}).then(async()=>{
   if(blocked||!record)throw new Error('save-blocked');if(!bound)return true;
   const state=override||bound.capture(),json=JSON.stringify(state);if(lastJSON===json)return true;
   say('กำลังเซฟ…');record=await store.save(serverId,record,state);lastJSON=json;
   say((store.cloud?'เซฟคลาวด์แล้ว':'เซฟบนเครื่องแล้ว')+' · '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}));return true;
  });queue=operation;return operation.catch(e=>{report(e);throw e;});
 }
 $('save-now').onclick=()=>save().catch(open);
 $('return-lobby').onclick=async()=>{if(busy)return;busy=true;try{if(!blocked)await save();sessionStorage.removeItem(ENTRY_KEY);location.assign('./');}catch{open();}finally{busy=false;}};
 $('logout-account').onclick=async()=>{if(busy)return;busy=true;try{await save();await connection.sdk.signOut(connection.auth);sessionStorage.removeItem(ENTRY_KEY);location.assign('./');}catch{open();}finally{busy=false;}};
 const tick=()=>{if(bound&&!blocked&&!busy&&!traveling&&!document.hidden)save().catch(()=>{});};setInterval(tick,30000);addEventListener('online',tick);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&bound&&!blocked&&!busy&&!traveling)save().catch(()=>{});});
 return {data:record?.state,character:record?.character,serverId,get paused(){return blocked||busy||!panel.hidden;},get cloud(){return store?.cloud;},save,
  bind(value){bound=value;inert(!panel.hidden);},
  async travel(destination){traveling=true;const state=bound.capture();state.mapId=destination.id;state.position={...destination.spawn};try{await save(state);return true;}catch{traveling=false;return false;}}
 };
}

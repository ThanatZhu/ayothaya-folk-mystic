import {guestKey,isServer,character,initialSave,validateRecord} from './realm-state.js?v=09';
import {validateSave,nextRevision} from './save-state.js';
import {deadline} from './firebase-client.js';
export function createRealmStore({connection=null,owner='guest',catalog,storage}){
 const cloud=owner!=='guest';
 if(!cloud)storage??=localStorage;
 if(cloud&&(!connection||connection.auth.currentUser?.uid!==owner))throw new Error('account-changed');
 const check=record=>validateRecord(record,s=>validateSave(s,catalog));
 const ref=server=>{if(!isServer(server))throw new Error('invalid-server');return connection.sdk.doc(connection.db,'players',owner,'saves',server);};
 function readLocal(server){const raw=storage.getItem(guestKey(server));return raw?check(JSON.parse(raw)):null;}
 async function load(server){
  if(!cloud)return readLocal(server);
  const snap=await deadline(connection.sdk.getDocFromServer(ref(server)));
  return snap.exists()?check(snap.data()):null;
 }
 async function create(server,input){
  const hero=character(input);let state=initialSave();
  // Preserve the earlier single-character prototype as the first realm's starting progress.
  if(server==='server-1'){
   if(cloud){const {sdk,db}=connection;const old=await deadline(sdk.getDocFromServer(sdk.doc(db,'players',owner,'saves','main')));if(old.exists())state=validateSave(old.data().state,catalog);}
   else {const raw=storage.getItem('ayothaya-guest-v1');if(raw)state=validateSave(JSON.parse(raw),catalog);}
  }
  const record={character:hero,state,revision:1};
  if(!cloud){if(readLocal(server))throw new Error('character-exists');storage.setItem(guestKey(server),JSON.stringify(record));return record;}
  const {sdk,db}=connection,r=ref(server);
  await sdk.runTransaction(db,async tx=>{const old=await tx.get(r);if(old.exists())throw new Error('character-exists');tx.set(r,{...record,updatedAt:sdk.serverTimestamp()});});
  return record;
 }
 async function save(server,record,state){
  validateSave(state,catalog);
  if(!cloud){const current=readLocal(server),revision=nextRevision(current?.revision??0,record.revision),next={character:record.character,state,revision};storage.setItem(guestKey(server),JSON.stringify(next));return next;}
  const {sdk,db}=connection,r=ref(server);
  const revision=await sdk.runTransaction(db,async tx=>{const old=await tx.get(r);const revision=nextRevision(old.exists()?old.data().revision:0,record.revision);tx.set(r,{character:record.character,state,revision,updatedAt:sdk.serverTimestamp()});return revision;});
  return {character:record.character,state,revision};
 }
 async function changeClass(server,record,classId){
  const updated=character({...record.character,classId});
  // Preserve identity, map and progress. Existing cooldowns carry over to prevent reset exploits.
  return save(server,{...record,character:updated},record.state);
 }
 return {load,create,save,changeClass,cloud,owner};
}

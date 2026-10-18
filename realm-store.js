import {experienceOf} from './experience.js?v=64';
import {normalizeEquipment} from './equipment.js?v=41';
import {trainingAction} from './city-life-data.js?v=62';
import {CLASS_LEVEL,progression,validateJob} from './advancement.js?v=21';
import {CHARACTER_SLOTS,isSlot,guestKey,isServer,character,initialSave,validateRecord} from './realm-state.js?v=62';
import {validateSave,nextRevision} from './save-state.js?v=21';

export function validateCharacterChange(before,after,state){
 if(before.name!==after.name||before.gender!==after.gender)throw new Error('character-identity');
 if(before.classId!==after.classId){
  if(before.classId!=='novice'||after.classId==='novice')throw new Error('class-final');
  if(progression(state.traveler).level<CLASS_LEVEL)throw new Error('class-locked');
  if(after.jobId)throw new Error('job-locked');
 }
 if((before.jobId??'')!==(after.jobId??'')){
  if(before.jobId)throw new Error('job-final');
  validateJob(after.classId,after.jobId,state.traveler);
 }
}
export function createRealmStore({connection=null,owner='guest',catalog,storage}){
 const cloud=owner!=='guest';if(!cloud)storage??=localStorage;
 const guard=()=>{if(cloud&&(!connection||connection.auth.currentUser?.uid!==owner))throw new Error('account-changed');};guard();
 const check=record=>validateRecord(record,s=>validateSave(s,catalog));
 const serverCheck=server=>{if(!isServer(server))throw new Error('invalid-server');};
 const slotCheck=slot=>{if(!isSlot(slot))throw new Error('invalid-slot');};
 const localKey=slot=>'ayothaya-character-v2:'+slot;
 const ref=slot=>{guard();slotCheck(slot);return connection.sdk.doc(connection.db,'players',owner,'characters',slot);};
 const oldRef=server=>connection.sdk.doc(connection.db,'players',owner,'saves',server);
 const pack=(record,slotId)=>{check(record);serverCheck(record.serverId);return {...record,slotId};};
 // Guest saves also keep skill levels; cloud documents keep the rule-checked shape (the realm server owns skills online).
 const payload=record=>({character:record.character,state:record.state,serverId:record.serverId,revision:record.revision,...(!cloud?{equipment:normalizeEquipment(record.equipment,record.character.classId),training:record.training??null,...(record.skills?{skills:record.skills}:{})}:{})});
 function localList(){
  // Validate every old/new record before making any migration writes. Old keys are retained.
  const rows=CHARACTER_SLOTS.map(id=>{const raw=storage.getItem(localKey(id));return raw?pack(JSON.parse(raw),id):null;});
  const migrations=[];
  for(let i=0;i<2;i++)if(!rows[i]){
   const serverId='server-'+(i+1),raw=storage.getItem(guestKey(serverId));
   if(raw){const old=check(JSON.parse(raw));rows[i]=pack({...old,serverId},CHARACTER_SLOTS[i]);migrations.push(rows[i]);}
  }
  for(const row of migrations)storage.setItem(localKey(row.slotId),JSON.stringify(payload(row)));
  return rows.filter(Boolean);
 }
 async function cloudList(tx){
  guard();const snapshots=await Promise.all([...CHARACTER_SLOTS.map(id=>tx.get(ref(id))),...['server-1','server-2'].map(s=>tx.get(oldRef(s)))]);guard();
  const rows=CHARACTER_SLOTS.map((id,i)=>snapshots[i].exists()?pack(snapshots[i].data(),id):null);
  for(let i=0;i<2;i++)if(!rows[i]&&snapshots[5+i].exists()){
   const old=check(snapshots[5+i].data());rows[i]=pack({...old,serverId:'server-'+(i+1)},CHARACTER_SLOTS[i]);
   tx.set(ref(CHARACTER_SLOTS[i]),{...payload(rows[i]),updatedAt:connection.sdk.serverTimestamp()});
  }
  return rows.filter(Boolean);
 }
 async function list(){
  if(!cloud)return localList();guard();return connection.sdk.runTransaction(connection.db,cloudList);
 }
 async function load(server,slotId){
  serverCheck(server);if(slotId)slotCheck(slotId);
  return (await list()).find(r=>r.serverId===server&&(!slotId||r.slotId===slotId))??null;
 }
 async function create(server,input){
  serverCheck(server);const hero=character({...input,classId:'novice',jobId:''});
  const build=rows=>{const slotId=CHARACTER_SLOTS.find(id=>!rows.some(r=>r.slotId===id));if(!slotId)throw new Error('slots-full');return {slotId,serverId:server,character:hero,state:initialSave(),revision:1};};
  if(!cloud){const row=build(localList());storage.setItem(localKey(row.slotId),JSON.stringify(payload(row)));return row;}
  guard();const {sdk,db}=connection;
  return sdk.runTransaction(db,async tx=>{const rows=await cloudList(tx),row=build(rows);guard();tx.set(ref(row.slotId),{...payload(row),updatedAt:sdk.serverTimestamp()});return row;});
 }
 async function save(server,record,state){
  serverCheck(server);slotCheck(record.slotId);validateSave(state,catalog);const hero=character(record.character);
  const next=current=>{
   if(!current||current.serverId!==server||record.serverId!==server)throw new Error('character-scope');
   const revision=nextRevision(current.revision,record.revision);
   // Eligibility uses saved progress, so a class change cannot also invent its own XP.
   validateCharacterChange(current.character,hero,current.state);
   const changed=current.character.classId!==hero.classId||(current.character.jobId??'')!==(hero.jobId??'');
   const xp=experienceOf(state.traveler),previous=experienceOf(current.state.traveler);
   if(xp.baseXp<previous.baseXp||(!changed&&xp.jobXp<previous.jobXp))throw new Error('experience-regression');
   const nextState={...state,traveler:{...state.traveler,...xp,jobXp:changed?0:xp.jobXp}};
   return {slotId:record.slotId,serverId:server,character:hero,state:nextState,revision,...(!cloud?{equipment:normalizeEquipment(record.equipment??current.equipment,hero.classId),training:record.training===undefined?current.training??null:record.training,...((record.skills??current.skills)?{skills:record.skills??current.skills}:{})}:{})};
  };
  if(!cloud){const row=next(localList().find(r=>r.slotId===record.slotId));storage.setItem(localKey(row.slotId),JSON.stringify(payload(row)));return row;}
  guard();const {sdk,db}=connection,r=ref(record.slotId);
  return sdk.runTransaction(db,async tx=>{const snap=await tx.get(r);guard();const row=next(snap.exists()?pack(snap.data(),record.slotId):null);tx.set(r,{...payload(row),updatedAt:sdk.serverTimestamp()});return row;});
 }
 async function changeClass(server,record,classId){
  const updated=character({...record.character,classId,jobId:''});
  return save(server,{...record,character:updated},record.state);
 }
 async function customize(server,record,appearance,jobId=record.character.jobId??''){
  const updated=character({...record.character,appearance,jobId});
  return save(server,{...record,character:updated},record.state);
 }
 async function train(server,record,mentor,action,jobId){
  if(cloud)throw new Error('online-required');
  const result=trainingAction(record,mentor,action,jobId);
  const updated=await save(server,{...record,...result},record.state);return {...result,record:updated};
 }
 return {list,load,create,save,changeClass,customize,train,cloud,owner};
}

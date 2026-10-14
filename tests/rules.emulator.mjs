// Firestore security rules against the emulator. Run with `npm run test:rules`; excluded from `npm test` (tests/*.test.mjs) because it needs Java + emulator.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,serverTimestamp,setLogLevel} from 'firebase/firestore';
import {character,initialSave} from '../realm-state.js';
import {serializeTraveler} from '../world-state.js';
import {CombatWorld} from '../combat-core.js';
const emulator=process.env.FIRESTORE_EMULATOR_HOST;
if(!emulator)throw new Error('FIRESTORE_EMULATOR_HOST is not set; use npm run test:rules');
setLogLevel('error');
const [host,port]=emulator.split(':');
const env=await initializeTestEnvironment({projectId:'demo-ayothaya',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8'),host,port:Number(port)}});
const owner='google-owner',other='google-other',slot=`players/${owner}/characters/slot-1`,lease=`multiplayerLeases/${owner}`;
const hero=character({name:'ผู้ทดสอบ',gender:'female',classId:'novice'});
// Same shape realm-store.js writes: payload(row) + updatedAt serverTimestamp.
const row=(over={})=>({serverId:'server-1',revision:1,character:hero,state:initialSave(),...over});
const traveler=(over={})=>({...initialSave().traveler,...over});
const stamped=d=>({...d,updatedAt:serverTimestamp()});
const as=uid=>uid?env.authenticatedContext(uid).firestore():env.unauthenticatedContext().firestore();
const admin=fn=>env.withSecurityRulesDisabled(ctx=>fn(ctx.firestore()));
const seed=(path,data)=>admin(db=>setDoc(doc(db,path),data));
test.beforeEach(()=>env.clearFirestore());
test.after(()=>env.cleanup());

test('owner reads own character; strangers and anonymous users cannot',async()=>{
 await seed(slot,row());
 await assertSucceeds(getDoc(doc(as(owner),slot)));
 await assertFails(getDoc(doc(as(other),slot)));
 await assertFails(getDoc(doc(as(null),slot)));
});
test('new characters must be fresh Novices at revision 1',async()=>{
 await assertSucceeds(setDoc(doc(as(owner),slot),stamped(row())));
 await assertFails(setDoc(doc(as(owner),`players/${owner}/characters/slot-2`),stamped(row({revision:2}))));
 await assertFails(setDoc(doc(as(owner),`players/${owner}/characters/slot-3`),stamped(row({character:{...hero,classId:'swordsman'}}))));
 await assertFails(setDoc(doc(as(owner),`players/${owner}/characters/slot-4`),stamped(row({state:{...initialSave(),traveler:traveler({baseXp:500,jobXp:0})}}))));
 await assertFails(setDoc(doc(as(owner),`players/${owner}/characters/slot-9`),stamped(row())));
 await assertFails(setDoc(doc(as(other),slot),stamped(row())));
});
test('offline progress saves need the next revision and never lose XP',async()=>{
 await seed(slot,row());
 const next=row({revision:2,state:{...initialSave(),traveler:traveler({kills:3,baseXp:30,jobXp:18})}});
 await assertSucceeds(setDoc(doc(as(owner),slot),stamped(next)));
 await assertFails(setDoc(doc(as(owner),slot),stamped(next)));// same revision
 await assertFails(setDoc(doc(as(owner),slot),stamped(row({revision:3,state:{...initialSave(),traveler:traveler({kills:3,baseXp:10,jobXp:18})}}))));
 await assertFails(setDoc(doc(as(owner),slot),row({revision:3})));// no server timestamp
 await assertFails(setDoc(doc(as(owner),slot),stamped(row({revision:3,serverId:'server-2'}))));
 await assertFails(setDoc(doc(as(other),slot),stamped(row({revision:3}))));
});
test('client writes are locked while the multiplayer lease is live and reopen after it expires',async()=>{
 const w=new CombatWorld({id:'ayutthaya',safe:true,nav:{zones:[{x:-5,z:-5,w:10,d:10}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]});w.baseXp=120;w.jobXp=40;w.kills=4;
 // Mirror written by server/storage.js checkpoint: record + updatedAt Date.
 await seed(slot,{...row({revision:7,state:{...initialSave(),traveler:serializeTraveler(w)}}),updatedAt:new Date()});
 const next=stamped(row({revision:8,state:{...initialSave(),traveler:serializeTraveler(w)}}));
 await seed(lease,{leaseId:'lease',slotId:'slot-1',expires:Date.now()+30000});
 await assertFails(setDoc(doc(as(owner),slot),next));
 await seed(lease,{leaseId:'lease',slotId:'slot-1',expires:Date.now()-1000});
 await assertSucceeds(setDoc(doc(as(owner),slot),next));
});
test('class and job changes follow server thresholds and reset Job EXP',async()=>{
 const at=(baseXp,jobXp=99)=>({...initialSave(),traveler:traveler({kills:1,baseXp,jobXp})});
 await seed(slot,row({state:at(2300)}));
 await assertFails(setDoc(doc(as(owner),slot),stamped(row({revision:2,character:{...hero,classId:'swordsman'},state:at(2300,0)}))));
 await seed(slot,row({state:at(2400)}));
 await assertFails(setDoc(doc(as(owner),slot),stamped(row({revision:2,character:{...hero,classId:'swordsman'},state:at(2400,99)}))));// job XP must reset
 await assertSucceeds(setDoc(doc(as(owner),slot),stamped(row({revision:2,character:{...hero,classId:'swordsman'},state:at(2400,0)}))));
 await assertFails(setDoc(doc(as(owner),slot),stamped(row({revision:3,character:{...hero,classId:'swordsman',jobId:'guardian'},state:at(2400,0)}))));
 await seed(slot,row({character:{...hero,classId:'swordsman'},state:at(5900)}));
 await assertSucceeds(setDoc(doc(as(owner),slot),stamped(row({revision:2,character:{...hero,classId:'swordsman',jobId:'guardian'},state:at(5900,0)}))));
 await assertFails(setDoc(doc(as(owner),slot),stamped(row({revision:3,character:{...hero,classId:'swordsman',jobId:'duelist'},state:at(5900,0)}))));
 await assertFails(setDoc(doc(as(owner),slot),stamped(row({revision:3,character:{...hero,classId:'swordsman',jobId:'guardian',name:'คนอื่น'},state:at(5900,0)}))));
});
test('multiplayer collections stay private even for the owner',async()=>{
 await seed(`multiplayerProfiles/${owner}/characters/slot-1`,{record:row()});
 await seed(lease,{leaseId:'lease',expires:Date.now()+30000});
 await seed('multiplayerRuntime/authority',{id:'runtime',expires:Date.now()+30000});
 for(const path of [`multiplayerProfiles/${owner}/characters/slot-1`,lease,'multiplayerRuntime/authority']){
  await assertFails(getDoc(doc(as(owner),path)));
  await assertFails(setDoc(doc(as(owner),path),{expires:0}));
 }
 await assertFails(setDoc(doc(as(owner),lease),{leaseId:'x',expires:Date.now()-1}));// cannot clear own lock
});
test('legacy saves are read-only once migrated and cannot be created',async()=>{
 const legacy=`players/${owner}/saves/server-1`;
 await assertFails(setDoc(doc(as(owner),legacy),stamped(row())));
 await seed(legacy,row());
 await assertSucceeds(setDoc(doc(as(owner),legacy),stamped(row({revision:2}))));
 await seed(slot,row());
 await assertFails(setDoc(doc(as(owner),legacy),stamped(row({revision:3}))));
});

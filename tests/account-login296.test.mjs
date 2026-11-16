import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGoogleSwitch,signInExistingGoogle} from '../account-login296.js';

function fixture({anonymous=true,characters=[],readError=false,popupError=false}={}){
 const original={uid:'temporary-account',isAnonymous:anonymous};
 const google={uid:'original-google-account',isAnonymous:false};
 const saved=new Map([['players/original-google-account/characters/slot-1',{name:'OriginalHero',level:77}]]);
 for(const suffix of characters)saved.set('players/temporary-account/'+suffix,{name:'GuestHero',level:18});
 const before=structuredClone(saved),calls=[];
 const connection={auth:{currentUser:original},db:{},sdk:{
  doc:(_db,...parts)=>parts.join('/'),
  getDocFromServer:async ref=>{calls.push(['read',ref]);if(readError)throw Error('offline');return{exists:()=>saved.has(ref)};},
  GoogleAuthProvider:class{setCustomParameters(value){calls.push(['provider',value]);}},
  signInWithPopup:async()=>{calls.push(['sign-in']);if(popupError)throw Object.assign(Error('cancelled'),{code:'auth/popup-closed-by-user'});connection.auth.currentUser=google;return{user:google};},
  signOut:()=>assert.fail('Must not sign out before successful Google login'),
  linkWithPopup:()=>assert.fail('Existing-account login must not link accounts'),
  deleteUser:()=>assert.fail('Must not delete an account'),
  setDoc:()=>assert.fail('Must not write character records'),
  deleteDoc:()=>assert.fail('Must not delete character records')
 }};
 return {connection,original,google,saved,before,calls};
}
test('existing Google login preserves both account records and uses sign-in, not linking',async()=>{
 const f=fixture(),approval=await inspectGoogleSwitch(f.connection);
 assert.equal(approval.allowed,true);assert.equal(f.calls.filter(c=>c[0]==='read').length,7);
 const result=await signInExistingGoogle(f.connection,approval);
 assert.equal(result.user.uid,f.google.uid);assert.deepEqual(f.saved,f.before);
 assert.deepEqual(f.calls.filter(c=>c[0]==='provider'),[['provider',{prompt:'select_account'}]]);
});
for(const slot of ['characters/slot-1','characters/slot-5','saves/server-1','saves/server-2'])test('keeps anonymous access when a character exists at '+slot,async()=>{
 const f=fixture({characters:[slot]}),approval=await inspectGoogleSwitch(f.connection);
 assert.equal(approval.allowed,false);
 await assert.rejects(signInExistingGoogle(f.connection,approval),/temporary-characters/);
 assert.equal(f.connection.auth.currentUser,f.original);assert.deepEqual(f.saved,f.before);assert.ok(!f.calls.some(c=>c[0]==='sign-in'));
});
test('an unreadable roster stops the switch and leaves the current account intact',async()=>{
 const f=fixture({readError:true});await assert.rejects(inspectGoogleSwitch(f.connection),/offline/);
 assert.equal(f.connection.auth.currentUser,f.original);assert.deepEqual(f.saved,f.before);
});
test('closing the popup keeps the anonymous session and every saved character',async()=>{
 const f=fixture({popupError:true});const approval=await inspectGoogleSwitch(f.connection);
 await assert.rejects(signInExistingGoogle(f.connection,approval),{code:'auth/popup-closed-by-user'});
 assert.equal(f.connection.auth.currentUser,f.original);assert.deepEqual(f.saved,f.before);
});
test('a stale or different-user approval cannot replace an anonymous session',async()=>{
 const f=fixture();await assert.rejects(signInExistingGoogle(f.connection,{allowed:true,uid:'different',checkedAt:Date.now()}),/account-changed/);
 await assert.rejects(signInExistingGoogle(f.connection,{allowed:true,uid:f.original.uid,checkedAt:0}),/check-expired/);
 assert.equal(f.connection.auth.currentUser,f.original);
});
test('a signed-out player goes directly to Google without requiring a guest account',async()=>{
 const f=fixture();f.connection.auth.currentUser=null;
 await signInExistingGoogle(f.connection);
 assert.equal(f.connection.auth.currentUser.uid,f.google.uid);assert.ok(!f.calls.some(c=>c[0]==='read'));assert.deepEqual(f.saved,f.before);
});

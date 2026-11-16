import {CHARACTER_SLOTS} from './realm-state.js?v=62';

// Read-only preflight: never migrate, link, delete or write either account's saves.
export async function inspectGoogleSwitch(connection){
 const user=connection.auth.currentUser;
 if(!user?.isAnonymous)return {uid:user?.uid??null,allowed:true,checkedAt:Date.now()};
 const {sdk,db}=connection;
 const paths=[...CHARACTER_SLOTS.map(slot=>['characters',slot]),...['main','server-1','server-2'].map(slot=>['saves',slot])];
 const snapshots=await Promise.all(paths.map(parts=>sdk.getDocFromServer(sdk.doc(db,'players',user.uid,...parts))));
 if(connection.auth.currentUser?.uid!==user.uid)throw Error('account-changed');
 return {uid:user.uid,allowed:!snapshots.some(snapshot=>snapshot.exists()),checkedAt:Date.now()};
}

// Called directly by the confirmation click, retaining the browser popup gesture.
// Firebase keeps the old session on popup cancellation; no signOut runs first.
export async function signInExistingGoogle(connection,approval){
 const user=connection.auth.currentUser;
 if(approval&&approval.uid!==(user?.uid??null))throw Error('account-changed');
 if(user?.isAnonymous){
  if(!approval||approval.uid!==user.uid)throw Error('account-changed');
  if(!approval.allowed)throw Error('temporary-characters');
  if(!Number.isFinite(approval.checkedAt)||Date.now()-approval.checkedAt>60000)throw Error('check-expired');
 }
 const provider=new connection.sdk.GoogleAuthProvider();
 provider.setCustomParameters({prompt:'select_account'});
 return connection.sdk.signInWithPopup(connection.auth,provider);
}

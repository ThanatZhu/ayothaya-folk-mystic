// Set only after the authenticated backend and its Firestore permissions are verified.
export const MULTIPLAYER_URL='';
export function multiplayerURL(location=globalThis.location){
 if(MULTIPLAYER_URL)return MULTIPLAYER_URL;
 return ['127.0.0.1','localhost'].includes(location.hostname)?'ws://127.0.0.1:8787/realtime':'';
}

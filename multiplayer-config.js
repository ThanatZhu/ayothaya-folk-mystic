// Public realtime backend (Render free tier test, owner-approved 2026-10-14). Loopback dev pages keep using the local server.
export const MULTIPLAYER_URL='wss://hammerhead-app-nhswh.ondigitalocean.app/realtime';
export function multiplayerURL(location=globalThis.location){
 if(['127.0.0.1','localhost'].includes(location.hostname))return 'ws://127.0.0.1:8787/realtime';
 return MULTIPLAYER_URL;
}
// Render's free tier sleeps after ~15 idle minutes and takes ~1 min to wake: poke /health as early as possible
// (login page) so the realm is up by the time the player enters the world. Fire-and-forget; the reply is opaque.
export function wakeServer(location=globalThis.location){
 try{const u=new URL(multiplayerURL(location).replace(/^ws/,'http'));u.pathname='/health';fetch(u,{mode:'no-cors',cache:'no-store'}).catch(()=>{});}catch{}
}

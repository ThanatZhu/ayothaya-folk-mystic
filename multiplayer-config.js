// Public realtime backend (Render free tier test, owner-approved 2026-10-14). Loopback dev pages keep using the local server.
export const MULTIPLAYER_URL='wss://ayothaya-folk-mystic.onrender.com/realtime';
export function multiplayerURL(location=globalThis.location){
 if(['127.0.0.1','localhost'].includes(location.hostname))return 'ws://127.0.0.1:8787/realtime';
 return MULTIPLAYER_URL;
}

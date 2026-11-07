import {realmAnnouncement} from './announcement-state.js';
const CHANNELS=new Set(['room','world','party','guild','whisper','system']);
export function chatStream(message){
 return realmAnnouncement(message)?'announcement':CHANNELS.has(message?.channel)?message.channel:'system';
}
export function chatVisible(channel,stream){
 return channel===stream||(stream==='announcement'&&['room','world','system'].includes(channel));
}

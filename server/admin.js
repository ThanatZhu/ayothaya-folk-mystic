// 0.99.16 back-office: list the players who are online and give them items or cowries.
// Who may use it: in production a Google sign-in whose verified email is listed in ADMIN_EMAILS (Render env);
// the local development server allows its own origin only. Offline characters are not touched here.
import {ITEMS} from '../items.js';
import {baseProgress} from '../experience.js';

const MAX_COINS=10_000_000,MAX_COUNT=999,MAX_LINES=20;
// icons and reserved entries in ITEMS are not things a player can hold
export const giftable=id=>!!ITEMS[id]&&!['ui','reserved'].includes(ITEMS[id].kind);

// commas, semicolons or spaces between addresses; stray quotes from the dashboard are ignored
export function adminEmails(env=process.env){return new Set((env.ADMIN_EMAILS??'').replace(/["']/g,'').split(/[\s,;]+/).map(s=>s.trim().toLowerCase()).filter(Boolean));}
export function isAdmin(decoded,emails=adminEmails()){return !!decoded?.email&&decoded.email_verified===true&&emails.has(decoded.email.toLowerCase());}

export function adminPlayers(realm){
 return [...realm.peers.values()].map(p=>({id:p.id,name:p.character.name,classId:p.character.classId,jobId:p.character.jobId??'',level:baseProgress(p.world).level,server:p.serverId,map:p.room?.map?.name??'',online:!p.suspended,coins:p.bag?.coins??0,items:{...(p.bag?.items??{})}}))
  .sort((a,b)=>a.server.localeCompare(b.server)||a.name.localeCompare(b.name));
}

export function adminGive(realm,{peer,coins=0,items=[]}={}){
 const p=realm.peers.get(peer);if(!p||p.suspended)throw new Error('player-offline');
 if(!Number.isInteger(coins)||coins<0||coins>MAX_COINS)throw new Error('bad-coins');
 if(!Array.isArray(items)||items.length>MAX_LINES)throw new Error('bad-items');
 const clean=items.map(({id,count})=>{if(!giftable(id))throw new Error('bad-item');if(!Number.isInteger(count)||count<1||count>MAX_COUNT)throw new Error('bad-count');return {id,count};});
 if(!coins&&!clean.length)throw new Error('nothing');
 realm.grantLoot(p,{coins,items:clean});p.world.notice('ได้รับของจากทีมงานอโยธยา');p.saveNow=true;
 return {ok:true,name:p.character.name,coins:p.bag.coins,items:{...p.bag.items}};
}

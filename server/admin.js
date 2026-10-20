// 0.99.16 back-office: list the players who are online and give them items or cowries.
// Who may use it: in production a Google sign-in whose verified email is listed in ADMIN_EMAILS (Render env);
// the local development server allows its own origin only.
// 0.103 offline characters too: listed from the saves, and a gift to one is written into its save in one store
// transaction that refuses while the character holds a session lease (so it never races a game in progress).
import {ITEMS,addLoot} from '../items.js';
import {baseProgress} from '../experience.js';
import {isSlot} from '../realm-state.js';

const MAX_COINS=10_000_000,MAX_COUNT=999,MAX_LINES=20;
// icons and reserved entries in ITEMS are not things a player can hold
export const giftable=id=>!!ITEMS[id]&&!['ui','reserved'].includes(ITEMS[id].kind);

// commas, semicolons or spaces between addresses; stray quotes from the dashboard are ignored
// the key is matched loosely (ADMIN_EMAILS, admin_email, "ADMIN EMAILS "...) since it is typed by hand in the Render dashboard
export const adminKey=env=>Object.keys(env).find(k=>/^admin[\s_-]*emails?$/i.test(k.trim()))??null;
export const configKeys=env=>Object.keys(env).filter(k=>/admin|github/i.test(k));
// the owner (asked for by name, 2026-10-20) is always an admin; ADMIN_EMAILS on Render adds more
export const OWNER_EMAILS=['chokkungfn@gmail.com'];
export function adminEmails(env=process.env){return new Set([...OWNER_EMAILS,...(env[adminKey(env)]??'').replace(/["']/g,'').split(/[\s,;]+/).map(s=>s.trim().toLowerCase()).filter(Boolean)]);}
export function isAdmin(decoded,emails=adminEmails()){return !!decoded?.email&&decoded.email_verified===true&&emails.has(decoded.email.toLowerCase());}

// saved: [{uid,slotId,record,savedAt}] from the store; characters in the realm right now are shown from the realm instead
export function adminPlayers(realm,saved=[]){
 const here=new Set([...realm.peers.values()].map(p=>p.uid+'/'+p.slotId));
 const online=[...realm.peers.values()].map(p=>({id:p.id,name:p.character.name,classId:p.character.classId,gender:p.character.gender,jobId:p.character.jobId??'',level:baseProgress(p.world).level,server:p.serverId,map:p.room?.map?.name??'',online:!p.suspended,coins:p.bag?.coins??0,items:{...(p.bag?.items??{})}}));
 const offline=saved.filter(s=>s.record?.character&&!here.has(s.uid+'/'+s.slotId)).map(({uid,slotId,record:r,savedAt})=>({id:'off:'+uid+':'+slotId,offline:true,lastSeen:savedAt??null,name:r.character.name,classId:r.character.classId,gender:r.character.gender,jobId:r.character.jobId??'',level:baseProgress(r.state?.traveler??{}).level,server:r.serverId??'',map:realm.catalog?.maps?.find(m=>m.id===r.state?.mapId)?.name??r.state?.mapId??'',online:false,coins:r.bag?.coins??0,items:{...(r.bag?.items??{})}}));
 return [...online,...offline].sort((a,b)=>a.server.localeCompare(b.server)||a.name.localeCompare(b.name));
}

function cleanGift({coins=0,items=[]}={}){
 if(!Number.isInteger(coins)||coins<0||coins>MAX_COINS)throw new Error('bad-coins');
 if(!Array.isArray(items)||items.length>MAX_LINES)throw new Error('bad-items');
 const clean=items.map(({id,count})=>{if(!giftable(id))throw new Error('bad-item');if(!Number.isInteger(count)||count<1||count>MAX_COUNT)throw new Error('bad-count');return {id,count};});
 if(!coins&&!clean.length)throw new Error('nothing');
 return {coins,items:clean};
}

export function adminGive(realm,{peer,...gift}={}){
 const p=realm.peers.get(peer);if(!p||p.suspended)throw new Error('player-offline');
 const {coins,items:clean}=cleanGift(gift);
 realm.grantLoot(p,{coins,items:clean});p.world.notice('ได้รับของจากทีมงานอโยธยา');p.saveNow=true;
 return {ok:true,name:p.character.name,coins:p.bag.coins,items:{...p.bag.items}};
}

// id 'off:<uid>:<slotId>' from adminPlayers. A full bag refuses the whole gift instead of dropping part of it.
export async function adminGiveOffline(realm,store,{peer,...gift}={}){
 const m=/^off:([^:]{1,128}):([^:]+)$/.exec(String(peer??''));if(!m||!isSlot(m[2]))throw new Error('player-offline');
 const [,uid,slotId]=m,loot=cleanGift(gift);
 if([...realm.peers.values()].some(p=>p.uid===uid))throw new Error('player-online');
 if(!store?.giveOffline)throw new Error('player-offline');
 const record=await store.giveOffline({uid,slotId},r=>{const x=addLoot(r.bag,loot);if(x.lost.length)throw new Error('bag-full');r.bag=x.bag;return r;});
 return {ok:true,name:record.character?.name??'',coins:record.bag.coins,items:{...record.bag.items}};
}

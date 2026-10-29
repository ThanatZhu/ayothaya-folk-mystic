import{queueView,cleanMatchQueue,matchQueue}from'./arena-queue223.js';
import {randomUUID} from 'node:crypto';
export const ARENA_MAP='duel-arena';
export function arenaReservation(realm,key){return [...(realm.arenaRooms?.values()??[])].find(r=>r.members.some(m=>m.key===key));}
const peerFor=(realm,key)=>[...realm.peers.values()].find(p=>p.key===key);
export function arenaView(realm,p){
 const room=arenaReservation(realm,p.key);
 const view=r=>({id:r.id,title:r.title,state:r.state,ranked:!!r.ranked,result:r.result??null,members:r.members.map(m=>({name:peerFor(realm,m.key)?.character.name??m.name,ready:!!m.ready,here:peerFor(realm,m.key)?.room.map.id===ARENA_MAP&&!peerFor(realm,m.key)?.suspended}))});
 return {queue:queueView(realm,p),mine:room?view(room):null,rooms:[...(realm.arenaRooms?.values()??[])].filter(r=>r.serverId===p.serverId).slice(0,40).map(view)};
}
export function cleanArenaRooms(realm){
 cleanMatchQueue(realm);
 for(const room of realm.arenaRooms?.values()??[]){
  room.members=room.members.filter(m=>{const p=peerFor(realm,m.key);return p?.room.map.id===ARENA_MAP||m.until>realm.now();});
  if(!room.members.length)realm.arenaRooms.delete(room.id);
 }
}
export function arenaCommand(realm,p,m){
 realm.arenaRooms??=new Map();cleanArenaRooms(realm);
 let mine=arenaReservation(realm,p.key);const action=m.action??'list';
 if(action==='queue'||action==='unqueue'){matchQueue(realm,p,action);mine=arenaReservation(realm,p.key);return {...arenaView(realm,p),enter:!!mine?.ranked&&p.room.map.id!==ARENA_MAP};}
 if(action==='create'||action==='join'){
  realm.arenaQueue?.delete(p.key);
  if(p.duel||p.trade||p.world.player.hp<=0||p.room.map.instance||p.room.map.guildHall||p.room.map.id===ARENA_MAP)throw Error('arena-busy');
  if(mine)throw Error('arena-already-joined');
  if(action==='create'){
   if([...realm.arenaRooms.values()].filter(r=>r.serverId===p.serverId).length>=40)throw Error('arena-full');
   mine={id:randomUUID(),serverId:p.serverId,channel:p.channel??1,title:'ลานประลองของ '+p.character.name,state:'waiting',members:[]};realm.arenaRooms.set(mine.id,mine);
  }else{mine=realm.arenaRooms.get(m.room);if(!mine||mine.serverId!==p.serverId||mine.state!=='waiting'||mine.members.length>=2)throw Error('arena-full');}
  mine.members.push({key:p.key,name:p.character.name,ready:false,until:realm.now()+120000});
 }else if(action==='ready'){
  if(!mine||p.room.map.id!==ARENA_MAP||(mine.state==='fighting'||mine.state==='finished')||mine.members.length!==2)throw Error('arena-not-ready');
  const peers=mine.members.map(m=>peerFor(realm,m.key));if(peers.some(q=>!q||q.suspended||q.room!==p.room))throw Error('arena-not-ready');
  mine.members.find(m=>m.key===p.key).ready=true;mine.result=null;
  if(mine.members.every(m=>m.ready)){mine.state='fighting';mine.roundId=randomUUID();mine.scored=false;peers.forEach((q,i)=>{q.world.player.x=i?5:-5;q.world.player.z=0;if(q.world.roleCombat)Object.assign(q.world.roleCombat.state,{fields:[],pets:[],combo:0,shield:0,pending:null,meta:{},passiveAt:{}});q.world.status={};q.world.roleDebuffs={};q.world.pvpControl=null;q.world.basicPending=null;q.world.legacyPending=null;q.world.cooldowns.fill(0);q.input={x:0,z:0,attack:false};});realm.startDuel(...peers);}
 }else if(action==='cancel'){
  if(p.room.map.id===ARENA_MAP)throw Error('arena-use-exit');if(mine){mine.members=mine.members.filter(m=>m.key!==p.key);if(!mine.members.length)realm.arenaRooms.delete(mine.id);}
 }else if(action!=='list')throw Error('invalid-action');
 return {...arenaView(realm,p),enter:action==='create'||action==='join'||!!mine?.ranked&&p.room.map.id!==ARENA_MAP};
}
export function leaveArena(realm,p){
 const room=arenaReservation(realm,p.key);if(!room||p.room.map.id!==ARENA_MAP)return;
 if(p.duel){const other=realm.peers.get(p.duel.foe);realm.endDuel(other,p,'ออกจากสนาม');}
 room.members=room.members.filter(m=>m.key!==p.key);room.state='waiting';room.members.forEach(m=>m.ready=false);
 if(!room.members.length)realm.arenaRooms.delete(room.id);
}
export function finishArena(realm,a,b,draw,reason){
 const room=arenaReservation(realm,(a??b)?.key);if(!room||a?.room.map.id!==ARENA_MAP)return;
 for(const p of [a,b])if(p){p.world.status={};p.world.roleDebuffs={};p.world.basicPending=null;p.world.legacyPending=null;if(p.world.roleCombat)Object.assign(p.world.roleCombat.state,{fields:[],pets:[],combo:0,shield:0,pending:null,meta:{},passiveAt:{}});}
 room.state=room.ranked?'finished':'waiting';room.result=draw?'เสมอ · '+reason:(a?.character.name??'อีกฝ่าย')+' ชนะ · '+reason;room.members.forEach(m=>m.ready=false);
}

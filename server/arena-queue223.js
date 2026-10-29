import{randomUUID}from'node:crypto';import{baseProgress}from'../experience.js';
export const MATCH_QUEUE={timeout:180000,levelGap:10,rebirthGap:1};
const player=(r,key)=>[...r.peers.values()].find(p=>p.key===key);
const valid=p=>p&&!p.suspended&&!p.observer&&p.world.player.hp>0&&!p.duel&&!p.trade&&p.room.map.safe&&!p.room.map.guildHall;
export function queueView(r,p){const e=r.arenaQueue?.get(p.key);return e?{waiting:true,seconds:Math.floor((r.now()-e.at)/1000),expires:e.at+MATCH_QUEUE.timeout}:null;}
export function cleanMatchQueue(r){for(const[key,e]of r.arenaQueue??[]){const p=player(r,key);if(!valid(p)||r.now()-e.at>=MATCH_QUEUE.timeout)r.arenaQueue.delete(key);}}
export function matchQueue(r,p,action){
 r.arenaQueue??=new Map();cleanMatchQueue(r);if(action==='unqueue'){r.arenaQueue.delete(p.key);return;}
 if(action!=='queue')return;if(!valid(p))throw Error('arena-queue-town');if([...r.arenaRooms.values()].some(room=>room.members.some(m=>m.key===p.key)))throw Error('arena-already-joined');
 if(!r.arenaQueue.has(p.key))r.arenaQueue.set(p.key,{at:r.now()});
 const a=r.arenaQueue.get(p.key);for(const[key,e]of r.arenaQueue){const other=player(r,key);if(key===p.key||!valid(other)||other.uid===p.uid||other.serverId!==p.serverId)continue;
 const waiting=Math.min(r.now()-a.at,r.now()-e.at),gap=waiting>=60000?20:MATCH_QUEUE.levelGap,rebirth=waiting>=90000?2:MATCH_QUEUE.rebirthGap;
 if(Math.abs(baseProgress(p.world).level-baseProgress(other.world).level)>gap||Math.abs((p.rebirth??0)-(other.rebirth??0))>rebirth)continue;
 const room={id:randomUUID(),serverId:p.serverId,channel:other.channel??1,title:'ประลองจัดอันดับ · ค้นหาคู่',ranked:true,state:'waiting',members:[other,p].map(q=>({key:q.key,name:q.character.name,ready:false,until:r.now()+120000}))};r.arenaRooms.set(room.id,room);r.arenaQueue.delete(key);r.arenaQueue.delete(p.key);return room;
 }
}

import {bossEntries} from '../boss-directory.js';
// Read only; asking for the directory never creates or wakes a combat room.
export function publicBossDirectory(realm,peer,types){
 const channel=peer.channel??1,now=realm.now();
 const rows=bossEntries(realm.catalog,types).map(entry=>{
  const type=types[entry.typeIndex],rooms=[...realm.rooms.values()].filter(r=>r.serverId===peer.serverId&&(r.channel??1)===channel&&r.map.id===entry.mapId&&(!entry.instance||r===peer.room));
  const mob=rooms.flatMap(r=>r.mobs).find(m=>m.type===entry.typeIndex&&!m.summoned);
  let remaining=null;
  if(!entry.instance){
   if(type.mvp)remaining=Math.max(0,(realm.mvpState(peer.serverId).nextAt-now)/1000);
   else if(type.worldBoss)remaining=realm.mapBosses.remaining({serverId:peer.serverId,channel,map:{id:entry.mapId}});
   else if(mob)remaining=mob.hp>0?0:Math.max(0,mob.dead??0);
  }else if(mob)remaining=mob.hp>0?0:null;
  return {id:entry.id,in:remaining===null?null:Math.ceil(remaining),alive:mob?mob.hp>0:remaining===null?null:remaining<=0,hp:mob?.hp??null};
 });
 return {type:'bossDirectory',serverId:peer.serverId,channel,rows};
}

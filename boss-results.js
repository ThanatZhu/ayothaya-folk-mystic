// Encounter-local, effective HP damage only. Private character keys never leave the authority.
export function recordBossDamage(room,mob,peer,amount,time){
 if(!Number.isFinite(amount)||amount<=0)return;
 const ledgers=room.damageEncounters??=new Map();let fight=ledgers.get(mob.id);
 if(!fight){fight={started:time,rows:new Map()};ledgers.set(mob.id,fight);}
 const key=peer.key??peer.id,old=fight.rows.get(key),row=old??{damage:0,order:fight.rows.size};
 Object.assign(row,{id:peer.id,name:peer.character.name,classId:peer.character.classId,jobId:peer.character.jobId??'',damage:row.damage+amount});fight.rows.set(key,row);
}
export function finishBossDamage(room,mob,type,time){
 const fight=room.damageEncounters?.get(mob.id);room.damageEncounters?.delete(mob.id);if(!fight)return null;
 const duration=Math.max(.05,time-fight.started),total=[...fight.rows.values()].reduce((n,r)=>n+r.damage,0);
 const rows=[...fight.rows.values()].sort((a,b)=>b.damage-a.damage||a.order-b.order).map((r,i)=>({rank:i+1,id:r.id,name:r.name,classId:r.classId,jobId:r.jobId,damage:r.damage,share:total?r.damage/total:0,dps:Math.round(r.damage/duration),connected:room.peers.has(r.id)}));
 return {type:'bossResult',encounterId:room.id+':'+mob.id+':'+fight.started,bossId:type.id,bossName:type.name,mapId:room.map.id,mapName:room.map.name,channel:room.channel??1,duration,total,rows};
}

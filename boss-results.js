// Encounter-local, effective HP damage only. Private character keys never leave the authority.
const identity=peer=>({id:peer.id,name:peer.character.name,classId:peer.character.classId,jobId:peer.character.jobId??''});
export function recordBossDamage(room,mob,peer,amount,time,party=null){
 if(!Number.isFinite(amount)||amount<=0)return;
 const ledgers=room.damageEncounters??=new Map();let fight=ledgers.get(mob.id);
 if(!fight){fight={started:time,rows:new Map(),groups:new Map(),people:new Map()};ledgers.set(mob.id,fight);}
 const key=peer.key??peer.id,old=fight.rows.get(key),row=old??{damage:0,order:fight.rows.size};
 fight.people.set(key,identity(peer));Object.assign(row,identity(peer),{damage:row.damage+amount});fight.rows.set(key,row);
 // Attribute each hit to its actual party, never move earlier damage when a player changes teams.
 const partyId=peer.partyId??null,groupKey=partyId?'party:'+partyId:'solo:'+key;
 let group=fight.groups.get(groupKey);
 if(!group){group={partyId,leaderName:party?.leaderName??peer.character.name,members:new Map(),order:fight.groups.size};fight.groups.set(groupKey,group);}
 const roster=partyId&&party?.id===partyId?party.members??[]:[];
 for(const member of [...roster,peer]){
  const memberKey=member.key??member.id;fight.people.set(memberKey,identity(member));
  if(!group.members.has(memberKey))group.members.set(memberKey,{damage:0,order:group.members.size});
 }
 group.members.get(key).damage+=amount;
}
export function finishBossDamage(room,mob,type,time){
 const fight=room.damageEncounters?.get(mob.id);room.damageEncounters?.delete(mob.id);if(!fight)return null;
 const duration=Math.max(.05,time-fight.started),total=[...fight.rows.values()].reduce((n,r)=>n+r.damage,0);
 const publicRows=entries=>[...entries].sort((a,b)=>b[1].damage-a[1].damage||a[1].order-b[1].order).map(([key,r],i)=>{
  const who=fight.people.get(key);return {rank:i+1,...who,damage:r.damage,share:total?r.damage/total:0,dps:Math.round(r.damage/duration),connected:room.peers.has(who.id)};
 });
 const rows=publicRows(fight.rows),groups=[...fight.groups.values()].map(g=>{
  const members=publicRows(g.members),damage=members.reduce((n,r)=>n+r.damage,0);
  return {id:'group-'+g.order,kind:g.partyId?'party':'solo',partyId:g.partyId,leaderName:g.partyId?g.leaderName:null,name:g.partyId?'ปาร์ตี้ของ '+g.leaderName:members[0].name,damage,share:total?damage/total:0,dps:Math.round(damage/duration),members,order:g.order};
 }).sort((a,b)=>b.damage-a.damage||a.order-b.order).map(({order,...g},i)=>({...g,rank:i+1}));
 return {type:'bossResult',groupSchema:1,encounterId:room.id+':'+mob.id+':'+fight.started,bossId:type.id,bossName:type.name,mapId:room.map.id,mapName:room.map.name,channel:room.channel??1,duration,total,rows,groups};
}

// Old reports remain readable while the frontend/backend versions roll over.
export function bossResultGroups(result){
 if(Array.isArray(result.groups))return result.groups;
 return (result.rows??[]).map(row=>({id:'solo-'+row.id,kind:'solo',partyId:null,name:row.name,rank:row.rank,damage:row.damage,share:row.share,dps:row.dps,members:[row]}));
}

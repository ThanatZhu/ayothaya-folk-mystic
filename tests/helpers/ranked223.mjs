import{arenaCommand,ARENA_MAP}from'../../server/arena-rooms166.js';import{initialSave}from'../../realm-state.js';
export function rankedRound(realm,a,b,{winner='a',draw=false}={}){
 const move=(p,destination)=>{realm.travelDestination(p,destination);const record=realm.record(p,{state:initialSave(),character:p.character});realm.leave(p.id,{travel:true});record.state.mapId=destination;delete record.state.position;return realm.join({uid:p.uid,serverId:p.serverId,slotId:p.slotId,channel:p.channel,record,send:p.send});};
 arenaCommand(realm,a,{action:'queue'});arenaCommand(realm,b,{action:'queue'});a=move(a,ARENA_MAP);b=move(b,ARENA_MAP);arenaCommand(realm,a,{action:'ready'});arenaCommand(realm,b,{action:'ready'});realm.endDuel(winner==='a'?a:b,winner==='a'?b:a,'test',draw);a=move(a,realm.catalog.capital);b=move(b,realm.catalog.capital);return{a,b};
}

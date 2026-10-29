import {randomUUID} from 'node:crypto';
import {GROUND_LOOT,makeGroundDrop,groundEligible,groundDropView,groundPetView,stepGroundPet} from '../ground-loot.js';
import {activePremiumPet} from '../pet-account.js';
import {bossLootRows} from '../boss-results.js';
import {walkLineClear} from '../combat-core.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function spawnMonsterLoot(realm,p,loot,at,receipt=null){
 const drops=p.room.groundLoot??=new Map(),grantId=receipt?p.id+':ground:'+randomUUID():null;
 const priorityKeys=[...(realm.parties.get(p.partyId)?.members??[])].map(id=>realm.peers.get(id)).filter(a=>a?.room===p.room).map(a=>a.key);
 const angle=drops.size*2.3999632297,spread={x:at.x+Math.cos(angle)*.65,z:at.z+Math.sin(angle)*.65};
 const drop=makeGroundDrop({id:randomUUID(),loot,at:spread,owner:p,priorityKeys,time:realm.clock,nav:p.room.map.nav,receipt:receipt?{encounterId:receipt.encounterId,grantId}:null});
 if(!drop)return;
 while(drops.size>=GROUND_LOOT.maxDrops)expireDrop(realm,p.room,drops.values().next().value);
 drops.set(drop.id,drop);
 receipt?.rows?.push(...bossLootRows(p,loot.items,'ground',grantId));
}
function expireDrop(realm,room,drop){
 room.groundLoot.delete(drop.id);
 if(drop.receipt)room.events.push({type:'bossLoot',...drop.receipt,rows:bossLootRows({id:drop.ownerId,character:{name:drop.ownerName}},drop.loot.items,'expired',drop.receipt.grantId),actor:drop.ownerId,at:realm.clock});
}
export function pickGroundLoot(realm,p,id,byPet=false){
 if(typeof id!=='string'||id.length>80)return 'gone';
 const drop=p.room.groundLoot?.get(id);
 if(!drop||realm.clock>=drop.expiresAt)return 'gone';
 if(p.suspended||p.observer||p.world.player.hp<=0)return 'unavailable';
 if(p.mailMutationBusy||p.petMutationBusy||p.levelMutationBusy||p.trade?.locked)return 'busy';
 if(!groundEligible(drop,p.key,realm.clock))return 'reserved';
 const position=byPet?p.groundPet:p.world.player,range=byPet?GROUND_LOOT.petReach:GROUND_LOOT.manualReach;
 if(byPet&&(activePremiumPet(p.petCollection)?.id!==p.groundPet?.id||distance(p.world.player,drop)>GROUND_LOOT.petRange))return 'unavailable';
 if(!position||distance(position,drop)>range+.001||!walkLineClear(position,drop,p.room.map.nav))return 'far';
 // Consume before granting; repeated commands and two pets can never collect this bundle twice.
 p.room.groundLoot.delete(drop.id);
 realm.grantLoot(p,drop.loot,drop,drop.receipt);
 return null;
}
export function stepGroundLoot(realm,room,dt){
 for(const drop of room.groundLoot?.values()??[])if(realm.clock>=drop.expiresAt)expireDrop(realm,room,drop);
 for(const id of room.peers){
  const p=realm.peers.get(id);if(!p)continue;
  const petId=!p.suspended&&!p.observer?activePremiumPet(p.petCollection)?.id:null;
  const result=stepGroundPet({state:p.groundPet,petId,player:p.world.player,nav:room.map.nav,drops:room.groundLoot??new Map(),key:p.key,time:realm.clock,dt,
   enabled:p.world.player.hp>0&&!p.mailMutationBusy&&!p.petMutationBusy&&!p.levelMutationBusy&&!p.trade?.locked});
  p.groundPet=result.state;
  if(result.pickup)pickGroundLoot(realm,p,result.pickup,true);
 }
}
export function groundSnapshot(realm,p,delta){
 const reset=!delta||p.groundRoom!==p.room.id;if(reset){p.groundRoom=p.room.id;p.groundSent=new Map();}
 const previous=p.groundSent??=new Map(),seen=new Set(),upserts=[];
 const near=[...(p.room.groundLoot?.values()??[])].filter(d=>realm.clock<d.expiresAt&&distance(d,p.world.player)<=GROUND_LOOT.viewRange).sort((a,b)=>distance(a,p.world.player)-distance(b,p.world.player)).slice(0,96);
 for(const drop of near){const view=groundDropView(drop,p.key,realm.clock),sig=JSON.stringify(view);seen.add(drop.id);if(previous.get(drop.id)!==sig){upserts.push(view);previous.set(drop.id,sig);}}
 const removed=[];for(const id of previous.keys())if(!seen.has(id)){removed.push(id);previous.delete(id);}
 return {schema:1,reset,upserts,removed};
}
export {groundPetView};

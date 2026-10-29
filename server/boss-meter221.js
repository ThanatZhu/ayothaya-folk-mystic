import {MONSTER_TYPES} from '../combat-core.js';
import {snapshotBossDamage} from '../boss-results.js';
// Only share room-local public combat identity. Cache at 2 Hz and delta by encounter/bucket.
export function liveBossMeter(peer,time){
 const room=peer.room,p=peer.world.player;
 const candidates=room.mobs.filter(m=>m.hp>0&&MONSTER_TYPES[m.type]?.boss&&room.damageEncounters?.has(m.id)&&Math.hypot(m.x-p.x,m.z-p.z)<=40);
 candidates.sort((a,b)=>(b.id===peer.world.targetId)-(a.id===peer.world.targetId)||Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
 const mob=candidates[0];if(!mob)return {key:null,view:null};
 const fight=room.damageEncounters.get(mob.id),bucket=Math.floor(time*2);
 if(fight.meterCache?.bucket!==bucket){const view=snapshotBossDamage(room,mob,MONSTER_TYPES[mob.type],time);fight.meterCache={bucket,view:{...view,type:'bossDamage',mobId:mob.id,live:true}};}
 return {key:room.id+':'+mob.id+':'+fight.started+':'+bucket,view:fight.meterCache.view};
}

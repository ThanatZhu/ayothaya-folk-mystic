// Ground rewards are transient room state. Inventory changes happen only after an authority-owned pickup.
import {nearestWalkable,planRoute} from './route-walk.js?v=surfaces222';
import {walkLineClear} from './combat-core.js?v=surfaces222';
export const GROUND_LOOT=Object.freeze({priority:8,lifetime:90,manualReach:1.8,petRange:12,petSpeed:6,petReach:.55,maxDrops:512,viewRange:40});
export const GROUND_PICKUP_ERRORS={gone:'ของชิ้นนี้ถูกเก็บหรือหายไปแล้ว',unavailable:'ยังเก็บของตอนนี้ไม่ได้',busy:'กำลังทำรายการ · ลองเก็บอีกครั้ง',reserved:'ผู้ฆ่าและปาร์ตี้มีสิทธิ์เก็บก่อน',far:'เดินเข้าใกล้ของก่อนเก็บ'};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function groundEligible(drop,key,time){return time<drop.expiresAt&&(time>=drop.publicAt||drop.priorityKeys.includes(key));}
export function makeGroundDrop({id,loot,at,owner,priorityKeys,time,nav,receipt=null}){
 if(!loot.coins&&!loot.items.length)return null;
 const point=nearestWalkable(at,nav)??nearestWalkable(owner.world.player,nav);if(!point)return null;
 return {id,loot:structuredClone(loot),x:point.x,z:point.z,ownerName:owner.character.name,ownerId:owner.id,ownerKey:owner.key,
  priorityKeys:[...new Set([owner.key,...priorityKeys])],publicAt:time+GROUND_LOOT.priority,expiresAt:time+GROUND_LOOT.lifetime,receipt};
}
export function groundDropView(drop,key,time){return {id:drop.id,x:drop.x,z:drop.z,items:drop.loot.items,coins:drop.loot.coins,ownerName:drop.ownerName,
 canPick:groundEligible(drop,key,time),publicAt:drop.publicAt,expiresAt:drop.expiresAt};}
export function groundPetView(pet){return pet?{id:pet.id,x:pet.x,z:pet.z,moving:pet.moving,targetId:pet.targetId??null,mode:pet.targetId?'collect':pet.returning?'return':'follow'}:null;}
// Shared by offline play and the realm. The renderer follows this position; it never decides a reward.
export function stepGroundPet({state,petId,player,nav,drops,key,time,dt,enabled}){
 if(!petId)return {state:null,pickup:null};
 let s=state;if(!s||s.id!==petId)s={id:petId,x:player.x,z:player.z,route:null,targetId:null,nextSearch:0,blocked:new Map(),moving:false,returning:false};
 dt=Math.min(.1,Math.max(0,dt));s.moving=false;
 if(distance(s,player)>24){s.x=player.x;s.z=player.z;s.route=null;s.targetId=null;s.returning=false;}
 let drop=s.targetId?drops.get(s.targetId):null;
 if(!enabled||!drop||!groundEligible(drop,key,time)||distance(player,drop)>GROUND_LOOT.petRange){
  if(s.targetId){s.targetId=null;s.route=null;s.returning=true;}drop=null;
 }
 if(enabled&&!drop&&!s.returning&&time>=s.nextSearch){
  s.nextSearch=time+.35;
  for(const [id,until] of s.blocked)if(until<=time||!drops.has(id))s.blocked.delete(id);
  const candidates=[...drops.values()].filter(d=>groundEligible(d,key,time)&&!s.blocked.has(d.id)&&!(d.retryAt>time)&&distance(player,d)<=GROUND_LOOT.petRange).sort((a,b)=>distance(s,a)-distance(s,b)).slice(0,8);
  for(const d of candidates){const route=planRoute(s,d,nav);if(route){drop=d;s.targetId=d.id;s.route=route;break;}s.blocked.set(d.id,time+3);}
 }
 let pickup=null;
 if(drop&&distance(s,drop)<=GROUND_LOOT.petReach&&walkLineClear(s,drop,nav)){
  pickup=drop.id;s.targetId=null;s.route=null;s.returning=true;drop=null;
 }
 if(pickup)return {state:s,pickup};
 const follow=nearestWalkable({x:player.x-.9,z:player.z+.7},nav,1)??player,goal=drop??follow;
 if(!drop&&distance(s,goal)<.45){s.returning=false;s.route=null;return {state:s,pickup};}
 if(!s.route?.length||!s.routeGoal||distance(s.routeGoal,goal)>.7){s.route=planRoute(s,goal,nav);s.routeGoal={x:goal.x,z:goal.z};}
 let budget=GROUND_LOOT.petSpeed*dt;
 while(s.route?.length&&budget>0){const next=s.route[0],d=distance(s,next);if(!walkLineClear(s,next,nav)){s.route=null;break;}if(d<=budget){s.x=next.x;s.z=next.z;budget-=d;s.route.shift();s.moving||=d>0;}else{s.x+=(next.x-s.x)/d*budget;s.z+=(next.z-s.z)/d*budget;s.moving=true;budget=0;}}
 return {state:s,pickup};
}

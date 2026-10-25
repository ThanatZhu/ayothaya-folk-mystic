import {trainingMapPaths} from './training-targets164.js';
import {nearestWalkable,planRoute} from './route-walk.js?v=run153';

// Use ordinary, server-authoritative walking and free map gates. A scoped, short-lived
// continuation carries only the objective across a map load, never coordinates or rewards.
export function createTrainingWalk({game,map,catalog,scope,signature,resolve,travel,talkTo,storage=globalThis.sessionStorage,now=Date.now}){
 const key='ayothaya-training-walk164:'+scope,world=game.world;let pending=null,generation=0;
 const forget=()=>{pending=null;try{storage?.removeItem(key);}catch{}};
 try{const saved=JSON.parse(storage?.getItem(key)??'null');if(saved?.v===1&&now()-saved.at>=0&&now()-saved.at<600000)pending=saved;else forget();}catch{forget();}
 const fail=text=>{forget();world.notice(text);return false;};
 const reachable=p=>{if(!world.nav)return true;const stand=nearestWalkable(p,world.nav);return !!stand&&!!planRoute(world.player,stand,world.nav);};
 function go(goal){
  const token=++generation,questSignature=signature();forget();
  const target=resolve(goal);if(!target)return fail('เป้าหมายนี้ครบแล้ว หรือยังไม่พบแหล่งวัตถุดิบในแผนที่ที่เดินทางได้');
  if(world.player.hp<=0)return fail('ฟื้นตัวก่อน แล้วกดเดินไปหาเป้าหมายอีกครั้ง');
  game.clearInput();
  if(target.mapId!==map.id){
   const hop=trainingMapPaths(catalog,map.id).get(target.mapId)?.[0],portal=map.portals?.find(p=>p.to===hop);
   if(!portal)return fail('ยังไม่มีเส้นทางเดินไปหาเป้าหมายนี้');
   world.notice('กำลังเดินไป '+target.mapName+' · '+target.name);
   const ok=game.walkTo({x:portal.x,z:portal.z},{kind:'quest',radius:1.2,onArrive:async()=>{
    if(token!==generation)return;
    // Recheck the objective: it may have completed or been cancelled during the walk.
    if(signature()!==questSignature||!resolve(goal))return;
    try{storage?.setItem(key,JSON.stringify({v:1,goal,signature:questSignature,online:!!game.online,at:now()}));}catch{return fail('บันทึกเส้นทางไม่สำเร็จ กรุณากดเดินอีกครั้งหลังเปลี่ยนแผนที่');}
    try{if(await travel(hop)===false)fail('เดินทางไม่สำเร็จ กรุณาลองอีกครั้ง');}catch{fail('เดินทางไม่สำเร็จ กรุณาลองอีกครั้ง');}
   },onFail:()=>{if(token===generation)fail('เดินไปทางออกไม่ได้ ลองขยับออกจากสิ่งกีดขวางแล้วกดอีกครั้ง');}});
   return ok===false?fail('เริ่มเดินไม่ได้ กรุณาลองอีกครั้ง'):true;
  }
  if(target.npc){
   const ok=game.walkTo({x:target.x,z:target.z},{kind:'quest',npc:target.npc,radius:2.2,onArrive:()=>{if(token===generation)talkTo(target.npc);},onFail:()=>{if(token===generation)fail('เดินไปหาครูไม่ได้ กรุณาลองอีกครั้ง');}});
   return ok!==false;
  }
  const candidates=(world.mobs??[]).filter(m=>m.type===target.typeIndex&&m.hp>0).sort((a,b)=>Math.hypot(a.x-world.player.x,a.z-world.player.z)-Math.hypot(b.x-world.player.x,b.z-world.player.z));
  const mob=candidates.find(reachable);
  if(!mob){
   if(candidates.length)return fail('ยังเดินเข้าถึงมอนสเตอร์ไม่ได้ ลองขยับออกจากสิ่งกีดขวางแล้วกดอีกครั้ง');
   world.notice(target.name+' ยังไม่เกิด · เดินไปบริเวณที่เกิดเพื่อรอ');
   return game.walkTo({x:target.x,z:target.z},{kind:'quest',radius:2.4,onArrive:()=>{if(token===generation)world.notice('ถึงบริเวณที่เกิดของ '+target.name+' แล้ว · รอเกิดใหม่แล้วกดเดินอีกครั้ง');},onFail:()=>{if(token===generation)fail('เดินไปบริเวณที่เกิดไม่ได้ กรุณาลองอีกครั้ง');}})!==false;
  }
  world.notice('กำลังเดินไปหา '+target.name+' · '+target.mapName);
  return game.walkTo(()=>{const live=world.mobs.find(m=>m.id===mob.id&&m.hp>0);return live&&{x:live.x,z:live.z};},{kind:'quest',radius:2.4,mobId:mob.id,onArrive:()=>{
   if(token!==generation)return;const live=world.mobs.find(m=>m.id===mob.id&&m.hp>0);
   if(live){world.select(live.id);world.notice('ถึง '+target.name+' แล้ว · โจมตีเพื่อเก็บของบททดสอบ');}
  },onFail:reason=>{if(token!==generation)return;if(reason==='gone')go(goal);else fail('เดินไปหามอนสเตอร์ไม่ได้ กรุณาลองอีกครั้ง');}})!==false;
 }
 return {go,get resuming(){return !!pending;},update(ready=true){
  if(!pending||!ready||pending.online&&!game.online)return;
  const saved=pending;forget();
  if(saved.signature!==signature()||now()-saved.at>=600000||game.walking)return;
  if(!saved.goal||!['item','boss','hunt','coins','mentor'].includes(saved.goal.kind))return;
  go(saved.goal);
 },cancelResume:forget};
}

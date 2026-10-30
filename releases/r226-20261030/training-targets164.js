// Resolve training objectives from the same drops and spawn catalogue used by combat.
import {DROPS} from './items.js?v=107';
import {MONSTER_TYPES} from './combat-core.js?v=surfaces222';

export function trainingMapPaths(catalog,from){
 const paths=new Map([[from,[]]]),queue=[from],maps=catalog?.maps??[];
 for(let i=0;i<queue.length;i++){
  const id=queue[i];
  for(const portal of maps.find(m=>m.id===id)?.portals??[]){
   const next=maps.find(m=>m.id===portal.to);
   if(!next||next.instance||next.guildHall||paths.has(next.id))continue;
   paths.set(next.id,[...paths.get(id),next.id]);queue.push(next.id);
  }
 }
 return paths;
}

export function trainingMonsterSources(catalog,from,goal,player={x:0,z:0}){
 const paths=trainingMapPaths(catalog,from),rows=[];
 for(const map of catalog?.maps??[]){
  if(map.safe||map.instance||map.guildHall||!paths.has(map.id))continue;
  const seen=new Set();
  for(const [x,z,typeIndex]of map.mobs??[]){
   const type=MONSTER_TYPES[typeIndex],drop=type&&DROPS[type.id];if(!type)continue;
   const item=goal.kind==='item'?drop?.items.find(([id,chance])=>id===goal.id&&chance>0):null;
   if(goal.kind==='item'&&!item||goal.kind==='boss'&&type.id!==goal.id||goal.kind==='coins'&&!(drop?.coins?.[1]>0))continue;
   if(goal.kind==='hunt'&&(type.boss||type.elite))continue;
   if(!['item','boss','coins','hunt'].includes(goal.kind))continue;
   const row={mapId:map.id,mapName:map.name,typeIndex,monster:type.id,name:type.name,x,z,boss:!!(type.boss||type.elite),level:type.level??1,hops:paths.get(map.id).length,yield:item?item[1]*(item[2]??1):0,distance:map.id===from?Math.hypot(x-player.x,z-player.z):0};
   const old=rows.find(r=>r.mapId===map.id&&r.typeIndex===typeIndex);
   if(seen.has(typeIndex)){if(old&&row.distance<old.distance)Object.assign(old,row);continue;}
   seen.add(typeIndex);rows.push(row);
  }
 }
 // Materials should lead to farmable monsters, then favour nearby maps and better drops.
 return rows.sort((a,b)=>(goal.kind==='boss'?0:Number(a.boss)-Number(b.boss))||a.hops-b.hops||b.yield-a.yield||a.level-b.level||a.distance-b.distance||a.name.localeCompare(b.name));
}

export function trainingGoalKey(goal){return goal.kind+':'+(goal.id??'');}

export function trainingNextGoal(status,bag,online){
 if(online){
  const missing=status.trial.items.find(([id,n])=>(bag?.items?.[id]??0)<n);
  if(missing)return {kind:'item',id:missing[0]};
  if(!status.bossDone)return {kind:'boss',id:status.trial.boss};
 }
 if(status.progress<status.target)return {kind:'hunt'};
 if(online&&(bag?.coins??0)<status.trial.coins)return {kind:'coins'};
 return {kind:'mentor'};
}

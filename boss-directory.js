// Public boss locations are authored in the map catalog, never guessed from a timer.
export function bossEntries(catalog,types){
 return catalog.maps.filter(m=>!m.safe&&!m.guildHall).flatMap(map=>{
  const seen=new Set();return (map.mobs??[]).flatMap(([x,z,index])=>{const type=types[index];if(!type?.id||!(type.boss||type.elite)||seen.has(type.id))return [];seen.add(type.id);
   return [{id:map.id+':'+type.id,bossId:type.id,mapId:map.id,mapName:map.name,x,z,instance:!!map.instance,group:type.mvp||type.worldBoss?'mvp':'mini',typeIndex:index}];
  });
 });
}
export function bossCountdown(row,receivedAt,now){
 if(!row||!Number.isFinite(row.in))return null;
 return Math.max(0,Math.ceil(row.in-Math.max(0,now-receivedAt)/1000));
}
export function bossClock(seconds){if(seconds===null)return 'รอตรวจสอบ';if(seconds<=0)return 'ปรากฏตัวแล้ว';const s=Math.ceil(seconds);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');}

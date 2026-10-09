// Only transient player resources cross map boundaries; positions and targets never do.
export function resolveMap(catalog,id){return catalog.maps.find(m=>m.id===id)??catalog.maps.find(m=>m.id===catalog.capital);}
export function destinations(catalog,map){return new Set(map.portals.map(p=>p.to));}
const bounded=(v,max,fallback)=>Number.isFinite(v)?Math.max(0,Math.min(max,v)):fallback;
export function restoreTraveler(world,saved){
 if(!saved||saved.version!==5)return;
 world.player.hp=bounded(saved.hp,world.player.maxHp,world.player.maxHp)||world.player.maxHp;
 world.player.mp=bounded(saved.mp,world.player.maxMp,world.player.maxMp);
 world.kills=Math.floor(bounded(saved.kills,1e7,0));
 if(Array.isArray(saved.cooldowns)&&saved.cooldowns.length===world.cooldowns.length)world.cooldowns=saved.cooldowns.map(v=>bounded(v,60,0));
}
export function serializeTraveler(world){return {version:5,hp:world.player.hp,mp:world.player.mp,kills:world.kills,cooldowns:[...world.cooldowns]};}

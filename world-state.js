import {experienceOf} from './experience.js?v=73';
// Only transient player resources cross map boundaries; positions and targets never do.
export function resolveMap(catalog,id){return catalog.maps.find(m=>m.id===id)??catalog.maps.find(m=>m.id===catalog.capital);}
export function destinations(catalog,map){return new Set(map.portals.map(p=>p.to));}
// 0.59 warp from the world map: 30 coins to the capital, 50 per portal hop elsewhere; party instances only on foot.
export function hops(maps,from,to){
 const seen=new Set([from]);let frontier=[from];
 for(let d=1;frontier.length;d++){const next=[];for(const id of frontier)for(const p of maps.find(m=>m.id===id)?.portals??[]){if(p.to===to)return d;if(!seen.has(p.to)){seen.add(p.to);next.push(p.to);}}frontier=next;}
 return null;
}
export function warpCost(catalog,from,to){
 const dest=catalog.maps.find(m=>m.id===to);if(!dest||dest.instance||from===to)return null;
 const h=hops(catalog.maps,from,to);return h===null?null:to===catalog.capital?30:50*h;
}
const bounded=(v,max,fallback)=>Number.isFinite(v)?Math.max(0,Math.min(max,v)):fallback;
export function restoreTraveler(world,saved){
 if(!saved||saved.version!==5)return;
 world.player.hp=bounded(saved.hp,world.player.maxHp,world.player.maxHp)||world.player.maxHp;
 world.player.mp=bounded(saved.mp,world.player.maxMp,world.player.maxMp);
 world.kills=Math.floor(bounded(saved.kills,1e7,0));
 Object.assign(world,experienceOf(saved));
 if(Array.isArray(saved.cooldowns)&&saved.cooldowns.length===world.cooldowns.length)world.cooldowns=saved.cooldowns.map(v=>bounded(v,60,0));
}
export function serializeTraveler(world){return {version:5,hp:world.player.hp,mp:world.player.mp,kills:world.kills,...experienceOf(world),cooldowns:[...world.cooldowns]};}

import {readFile,writeFile} from 'node:fs/promises';
import {MONSTER_TYPES,walkable,findPath,CombatWorld} from '../combat-core.js';
import {CHAPTER2_MONSTERS,WORLD_MAP_BOSSES} from '../chapter2-monsters.js';
const file=new URL('../maps/world.json',import.meta.url),world=JSON.parse(await readFile(file,'utf8'));
const type=id=>{const n=MONSTER_TYPES.findIndex(t=>t.id===id);if(n<0)throw new Error('Unknown monster '+id);return n;};
const stats=[];
for(const b of WORLD_MAP_BOSSES){
 const map=world.maps.find(m=>m.id===b.mapId);if(!map||map.safe||map.instance)throw new Error('Not a field '+b.mapId);
 const used=[];
 function spot(cx,cz,radius=.5){
  for(let ring=0;ring<=28;ring+=2)for(let angle=0;angle<(ring?24:1);angle++){
   const x=Math.round((cx+Math.cos(angle*Math.PI/12)*ring)*2)/2,z=Math.round((cz+Math.sin(angle*Math.PI/12)*ring)*2)/2;
   if(!walkable(x,z,radius,map.nav)||Math.hypot(x-map.spawn.x,z-map.spawn.z)<14)continue;
   if([...(map.portals??[]),...(map.npcs??[])].some(p=>Math.hypot(x-p.x,z-p.z)<10))continue;
   if(used.some(p=>Math.hypot(x-p.x,z-p.z)<9))continue;
   if(!findPath(map.spawn,{x,z},map.nav).length)continue;
   used.push({x,z});return [x,z];
  }
  throw new Error('No reachable spawn in '+map.id);
 }
 map.levelBand=[b.minLevel,b.level];
 map.worldBoss={id:b.id,order:b.order,hp:b.hp,respawn:b.respawn};
 // Preserve the old camps, quest bosses, awakened targets and dungeon behavior.
 const newTypes=new Set(CHAPTER2_MONSTERS.map(m=>m.id));
 map.mobs=map.mobs.filter(([,,i])=>!newTypes.has(MONSTER_TYPES[i]?.id));
 if(b.order>=5){
  map.exploration=false;map.packs=true;
  const normal=CHAPTER2_MONSTERS.filter(m=>m.mapId===map.id&&!m.boss&&!m.elite),elite=CHAPTER2_MONSTERS.find(m=>m.mapId===map.id&&m.elite);
  const centers=[[-35,-25],[30,-25],[-32,0],[34,0],[-30,25],[0,35]];
  centers.forEach(([x,z],i)=>map.mobs.push([...spot(x,z),type(normal[i%normal.length].id)]));
  map.mobs.push([...spot(-40,45,.8),type(elite.id)]);
 }
 const [x,z]=spot(35,map.spawn.z>0?-40:38,1.2);map.mobs.push([x,z,type(b.id)]);
 const simulation=new CombatWorld(map);
 for(const m of simulation.mobs)if(!walkable(m.x,m.z,.32,map.nav))throw new Error('Blocked camp member '+map.id);
 stats.push({map:map.id,level:map.levelBand,camps:map.mobs.length,liveMonsters:simulation.mobs.length,boss:b.id,hp:b.hp,x,z});
}
world.version=125;
await writeFile(file,JSON.stringify(world,null,2)+'\n');
await writeFile(new URL('../outputs/monster-chapter2/live-spawns.json',import.meta.url),JSON.stringify(stats,null,2)+'\n');
console.log(JSON.stringify(stats));

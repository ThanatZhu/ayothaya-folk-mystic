// Shared identities, patrols and prices. Clients never choose a price, power or duration.
import {MONSTER_TYPES,walkable} from './combat-core.js?v=surfaces222';
const NAMES=['นายแก่น','แม่จันทร์','ทิดคำ','อ้ายพรม','นางแก้ว','ขุนทอง','อีแป้น','ตาผล'];
const CLASSES=['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
export const ADVENTURER_TIME=1200;
const cache=new WeakMap();
export function adventurerOffer(map){
 if(!map||map.safe||map.instance||map.prologue||map.pvpArena||map.id==='duel-arena'||map.guildHall)return null;
 const types=[...new Set((map.mobs??[]).map(([,,n])=>n))].map(n=>MONSTER_TYPES[n]).filter(Boolean),regular=types.filter(t=>!t.boss&&!t.mvp&&!t.worldBoss&&!t.elite);
 if(!regular.length)return null;
 const level=Math.max(...regular.map(t=>t.level||1)),cost=level<=10?200:level<=20?400:level<=35?800:level<=50?1500:level<=70?2500:4000;
 return {level,cost,seconds:ADVENTURER_TIME,power:10+2*level,interval:1.4,mapId:map.id};
}
export function fieldAdventurers(map){
 if(cache.has(map))return cache.get(map);const offer=adventurerOffer(map);if(!offer)return [];
 let seed=[...map.id].reduce((h,c)=>h*31+c.charCodeAt(0)>>>0,9);const rand=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 const spot=()=>{for(let i=0;i<80;i++){const x=map.spawn.x+(rand()-.5)*50,z=map.spawn.z-rand()*45;if(walkable(x,z,.4,map.nav))return {x,z};}return {...map.spawn};};
 const rows=Array.from({length:3},(_,i)=>{
  const classId=CLASSES[Math.floor(rand()*7)],gender=rand()<.5?'male':'female',name=NAMES[Math.floor(rand()*NAMES.length)],start=spot();let end=start;
  for(let n=0;n<30;n++){const next={x:start.x+(rand()-.5)*8,z:start.z+(rand()-.5)*8};if(Array.from({length:161},(_,k)=>walkable(start.x+(next.x-start.x)*k/160,start.z+(next.z-start.z)*k/160,.4,map.nav)).every(Boolean)){end=next;break;}}
  return {id:map.id+':adventurer:'+i,name,classId,gender,start,end,phase:rand()*20,...offer};
 });cache.set(map,rows);return rows;
}
export function adventurerAt(n,seconds){
 const dx=n.end.x-n.start.x,dz=n.end.z-n.start.z,travel=Math.hypot(dx,dz)/2.6,period=16+2*travel,t=((seconds+n.phase)%period+period)%period;
 const moving=travel>0&&((t>=8&&t<8+travel)||t>=16+travel),out=t<8?0:t<8+travel?(t-8)/travel:t<16+travel?1:1-(t-16-travel)/travel;
 return {...n,x:n.start.x+dx*out,z:n.start.z+dz*out,moving,rest:!moving};
}
export function adventurerViews(map,seconds){return fieldAdventurers(map).map(n=>{const {id,x,z,moving,rest}=adventurerAt(n,seconds);return {id,x,z,moving,rest};});}
export function adventurerContract(n){return {id:n.id,name:n.name,classId:n.classId,gender:n.gender,level:n.level,power:n.power,interval:n.interval,mapId:n.mapId};}

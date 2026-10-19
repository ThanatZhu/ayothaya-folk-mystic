// 0.60 daily bounty board and card album, shared by the offline game and the realm server.
// Bounties: three per Thai day (easy · middle · hard), the same for everyone, paid out in a town.
// Album: every card ever obtained is recorded once; milestones pay out automatically.
import {ITEMS} from './items.js?v=70';
import {MONSTER_TYPES} from './combat-core.js?v=68';
import {thaiDay} from './daily.js?v=01';
export const BOUNTY_POOL=[
 [{monster:'straw',count:15},{monster:'rat',count:15},{monster:'hopper',count:12}],
 [{monster:'monkey',count:12},{monster:'vine',count:10},{monster:'lantern',count:10},{monster:'rat-chief',count:2},{monster:'monkey-chief',count:2}],
 [{monster:'marsh-rat',count:15},{monster:'bog-hopper',count:12},{monster:'lotus-vine',count:10},{monster:'bog-lantern',count:8},{monster:'marsh-ape',count:1}],
 [{leader:true,count:3},{leader:true,count:4},{leader:true,count:5}], // 0.64 camp leaders of any field
];
const SLOTS=BOUNTY_POOL.map((_,i)=>i);
const seedOf=s=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,17);
export function dailyBounties(now){
 const day=thaiDay(now),seed=seedOf(day);
 return BOUNTY_POOL.map((pool,tier)=>{const b=pool[(seed>>>(tier*5))%pool.length],t=MONSTER_TYPES.find(m=>m.id===b.monster);
  if(b.leader)return {...b,tier,name:'หัวหน้าฝูง (แผนที่ใดก็ได้)',reward:{baseXp:150*b.count,jobXp:90*b.count,coins:180*b.count+200}};
  return {...b,tier,name:t.name,reward:{baseXp:Math.round(t.baseXp*b.count*1.5),jobXp:Math.round(t.jobXp*b.count*1.5),coins:Math.round(t.baseXp*b.count*.6)+50*(tier+1)}};});
}
export function normalizeBounty(state,now){
 const day=thaiDay(now);
 if(state?.day!==day)return {day,progress:SLOTS.map(()=>0),claimed:SLOTS.map(()=>false)};
 const n=(v,i)=>Number.isInteger(v?.[i])&&v[i]>=0?Math.min(v[i],999):0;
 return {day,progress:SLOTS.map(i=>n(state.progress,i)),claimed:SLOTS.map(i=>state.claimed?.[i]===true)};
}
export function bountyDefeat(state,now,monsterId,leader=false){
 const s=normalizeBounty(state,now),list=dailyBounties(now);let changed=false;
 list.forEach((b,i)=>{if((b.leader?leader:b.monster===monsterId)&&!s.claimed[i]&&s.progress[i]<b.count){s.progress[i]++;changed=true;}});
 return {state:s,changed};
}
export function bountyClaim(state,now,index){
 const s=normalizeBounty(state,now),b=dailyBounties(now)[index];
 if(!b)throw new Error('bounty-none');if(s.claimed[index])throw new Error('bounty-claimed');if(s.progress[index]<b.count)throw new Error('bounty-unfinished');
 s.claimed[index]=true;return {state:s,reward:b.reward};
}
// ---- card album
export const ALBUM_CARDS=Object.keys(ITEMS).filter(id=>ITEMS[id].kind==='card');
export const ALBUM_MILESTONES=[{count:3,reward:{coins:500,items:[{id:'hp-large',count:5}]}},{count:6,reward:{coins:1500,items:[{id:'lek-lai',count:1}]}},
 {count:10,reward:{coins:4000,items:[{id:'lek-lai',count:2}]}},{count:16,reward:{coins:10000,items:[{id:'bia-gae',count:1}]}}];
export const normalizeAlbum=a=>[...new Set((Array.isArray(a)?a:[]).filter(id=>ALBUM_CARDS.includes(id)))];
// Returns {album, milestone (reward to pay) | null} after obtaining `ids`.
export function albumAdd(album,ids){
 const before=normalizeAlbum(album),after=normalizeAlbum([...before,...ids.map(i=>i.split(/[+~!]/)[0])]);
 const hit=ALBUM_MILESTONES.filter(m=>before.length<m.count&&after.length>=m.count);
 return {album:after,added:after.length-before.length,milestones:hit};
}

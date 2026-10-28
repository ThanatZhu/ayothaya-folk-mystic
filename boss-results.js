// Encounter-local, effective HP damage only. Private character keys never leave the authority.
import {itemDef} from './items.js';
const identity=peer=>({id:peer.id,name:peer.character.name,classId:peer.character.classId,jobId:peer.character.jobId??'',gender:peer.character.gender==='female'?'female':'male'});
export function recordBossDamage(room,mob,peer,amount,time,party=null){
 if(!Number.isFinite(amount)||amount<=0)return;
 const ledgers=room.damageEncounters??=new Map();let fight=ledgers.get(mob.id);
 if(!fight){fight={started:time,rows:new Map(),groups:new Map(),people:new Map()};ledgers.set(mob.id,fight);}
 const key=peer.key??peer.id,old=fight.rows.get(key),row=old??{damage:0,order:fight.rows.size};
 fight.people.set(key,identity(peer));Object.assign(row,identity(peer),{damage:row.damage+amount});fight.rows.set(key,row);
 // Attribute each hit to its actual party, never move earlier damage when a player changes teams.
 const partyId=peer.partyId??null,groupKey=partyId?'party:'+partyId:'solo:'+key;
 let group=fight.groups.get(groupKey);
 if(!group){group={partyId,leaderName:party?.leaderName??peer.character.name,members:new Map(),order:fight.groups.size};fight.groups.set(groupKey,group);}
 const roster=partyId&&party?.id===partyId?party.members??[]:[];
 for(const member of [...roster,peer]){
  const memberKey=member.key??member.id;fight.people.set(memberKey,identity(member));
  if(!group.members.has(memberKey))group.members.set(memberKey,{damage:0,order:group.members.size});
 }
 group.members.get(key).damage+=amount;
}
export function finishBossDamage(room,mob,type,time){
 const fight=room.damageEncounters?.get(mob.id);room.damageEncounters?.delete(mob.id);if(!fight)return null;
 const duration=Math.max(.05,time-fight.started),total=[...fight.rows.values()].reduce((n,r)=>n+r.damage,0);
 const publicRows=entries=>[...entries].sort((a,b)=>b[1].damage-a[1].damage||a[1].order-b[1].order).map(([key,r],i)=>{
  const who=fight.people.get(key);return {rank:i+1,...who,damage:r.damage,share:total?r.damage/total:0,dps:Math.round(r.damage/duration),connected:room.peers.has(who.id)};
 });
 const rows=publicRows(fight.rows),groups=[...fight.groups.values()].map(g=>{
  const members=publicRows(g.members),damage=members.reduce((n,r)=>n+r.damage,0);
  return {id:'group-'+g.order,kind:g.partyId?'party':'solo',partyId:g.partyId,leaderName:g.partyId?g.leaderName:null,name:g.partyId?'ปาร์ตี้ของ '+g.leaderName:members[0].name,damage,share:total?damage/total:0,dps:Math.round(damage/duration),members,order:g.order};
 }).sort((a,b)=>b.damage-a.damage||a.order-b.order).map(({order,...g},i)=>({...g,rank:i+1}));
 return {type:'bossResult',groupSchema:1,encounterId:room.id+':'+mob.id+':'+fight.started,bossId:type.id,bossName:type.name,mapId:room.map.id,mapName:room.map.name,channel:room.channel??1,duration,total,rows,groups};
}

// Old reports remain readable while the frontend/backend versions roll over.
export function bossResultGroups(result){
 if(Array.isArray(result.groups))return result.groups;
 return (result.rows??[]).map(row=>({id:'solo-'+row.id,kind:'solo',partyId:null,name:row.name,rank:row.rank,damage:row.damage,share:row.share,dps:row.dps,members:[row]}));
}

// 0.122 Victory screen: rare drops (rarity 2+: cards, MVP embers, shards) as the authority actually handed them out.
// status: received (in the bag) · mailed (bag full, waiting in the "bag full" mail) · lost (mailbox full too) · pending (queued behind a mail action; a later
// bossLoot event confirms it). Public peer id and name only; never uid, key or slot.
export const VICTORY_RARITY=2;
export const rareDrop=id=>(itemDef(id)?.rarity??0)>=VICTORY_RARITY;
export function bossLootRows(peer,items,status,grantId){
 return (items??[]).filter(i=>i&&rareDrop(i.id)&&i.count>0).map(i=>({grantId,playerId:peer.id,name:peer.character.name,itemId:i.id,count:i.count,status}));
}
// A later bossLoot update (one queued grant) replaces exactly that grant's pending rows in a stored report.
export function mergeBossLoot(result,update){
 if(!result||!update||result.encounterId!==update.encounterId||!Array.isArray(update.rows))return result;
 const kept=(result.rewards??[]).filter(r=>!(r.status==='pending'&&r.grantId===update.grantId));
 return {...result,rewards:[...kept,...update.rows]};
}
// Boss cards by id: the 6 painted for this screen, the 9 world-boss monster cards, then the in-game sprite. Awakened
// forms use their normal card with an aura.
const VICTORY_CARDS=new Set(['mill-keeper','lantern-lord','straw-king','rat-chief','monkey-chief','marsh-ape']);
const MONSTER_CARDS=new Set(['pop-grove-lord','abandoned-bell-curse','woodland-elephant','underwater-naga-guardian','cloud-peak-yaksha','rice-world-guardian','orchard-world-guardian','mill-world-guardian','marsh-world-guardian']);
export function bossCard(bossId){
 const base=String(bossId??'').replace(/-awakened$/,''),awakened=base!==bossId;
 const src=VICTORY_CARDS.has(base)?`assets/victory/card-${base}.webp`:MONSTER_CARDS.has(base)?`assets/cards147/${base}.webp`:null;
 return {base,awakened,src};
}
// Who gets the pop-up: anyone in the damage report (party members at zero included) or anyone who received a drop.
export function involves(result,selfId){
 if(!selfId)return false;
 return bossResultGroups(result).some(g=>g.members.some(m=>m.id===selfId))||(result.rewards??[]).some(r=>r.playerId===selfId);
}

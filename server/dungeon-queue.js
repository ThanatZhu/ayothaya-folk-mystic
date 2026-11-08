// Party dungeon "find players" queue (owner 8 Nov 2026): solos and whole parties wait per dungeon + difficulty; groups are
// added oldest first while the total stays at most 5. Five makes a party and a ready check; after 90 s the oldest group is
// offered to go in with whoever is waiting. The checks and timeout pattern follow arena-queue223.js.
import {randomUUID} from 'node:crypto';
import {dungeonById,DIFFICULTY,MAX_PARTY} from '../dungeons.js';
import {checkEntry,startReadyCheck} from './dungeon-runs.js';

export const QUEUE_OFFER_MS=90e3;
const queue=realm=>realm.dungeonQueue??=new Map();
const peerByKey=(realm,key)=>{for(const p of realm.peers.values())if(p.key===key)return p;return null;};
const groupOf=(realm,key)=>[...queue(realm).values()].find(g=>g.keys.includes(key));
function tell(realm,g,state,extra={}){for(const key of g.keys)peerByKey(realm,key)?.world.emit('dungeonQueue',{state,dungeon:g.dungeon,difficulty:g.difficulty,size:g.keys.length,since:g.since,...extra});}

export function queueFor(realm,p,{dungeon:id,difficulty}){
 const dungeon=dungeonById(id);if(!DIFFICULTY[difficulty])throw Error('dungeon-difficulty');
 const party=p.partyId?realm.parties.get(p.partyId):null;if(party&&party.leader!==p.id)throw Error('dungeon-not-leader');
 if(groupOf(realm,p.key))throw Error('dungeon-queued');
 const members=party?[...party.members].map(id=>realm.peers.get(id)).filter(a=>a&&a.serverId===p.serverId&&!a.suspended):[p];
 if(members.length>=MAX_PARTY)throw Error('dungeon-party-full');
 for(const a of members)checkEntry(realm,a,dungeon);
 const g={id:party?.id??p.key,keys:members.map(a=>a.key),leader:p.key,serverId:p.serverId,dungeon:dungeon.id,difficulty,since:realm.now(),offered:false};
 queue(realm).set(g.id,g);tell(realm,g,'waiting');return g;
}
export function unqueue(realm,p,why='idle'){
 const g=groupOf(realm,p.key);if(!g)return;queue(realm).delete(g.id);tell(realm,g,why);
}
// Merge the groups into the oldest group's party and start its leader's ready check.
function match(realm,groups){
 for(const g of groups)queue(realm).delete(g.id);
 const leader=peerByKey(realm,groups[0].leader);let party=realm.parties.get(leader.partyId);
 if(!party){party={id:randomUUID(),leader:leader.id,members:new Set([leader.id])};realm.parties.set(party.id,party);leader.partyId=party.id;}
 for(const g of groups.slice(1))for(const key of g.keys){const a=peerByKey(realm,key);if(!a||a.partyId===party.id)continue;realm.leaveParty(a);a.partyId=party.id;party.members.add(a.id);}
 realm.social(leader.room);
 try{startReadyCheck(realm,leader,{dungeon:groups[0].dungeon,difficulty:groups[0].difficulty});}
 catch(e){leader.world.emit('dungeonError',{reason:e.message});}
 for(const g of groups)tell(realm,g,'matched');
}
const pick=list=>{const out=[];let total=0;for(const g of list)if(total+g.keys.length<=MAX_PARTY){out.push(g);total+=g.keys.length;}return {out,total};};
const bucket=(realm,g)=>[...queue(realm).values()].filter(x=>x.serverId===g.serverId&&x.dungeon===g.dungeon&&x.difficulty===g.difficulty).sort((a,b)=>a.since-b.since);
export function acceptOffer(realm,p){
 const g=groupOf(realm,p.key);if(!g||!g.offered||g.leader!==p.key)throw Error('dungeon-no-offer');
 const {out,total}=pick(bucket(realm,g));if(total<2||out[0]!==g)throw Error('dungeon-no-offer');
 match(realm,out);
}
export function tickDungeonQueue(realm){
 const now=realm.now();if(!queue(realm).size)return;
 for(const g of [...queue(realm).values()]){
  const gone=g.keys.some(key=>{const a=peerByKey(realm,key);if(!a||a.suspended)return true;try{checkEntry(realm,a,dungeonById(g.dungeon));return false;}catch{return true;}});
  if(gone){queue(realm).delete(g.id);tell(realm,g,'idle');}
 }
 const done=new Set();
 for(const g of [...queue(realm).values()].sort((a,b)=>a.since-b.since)){
  const slot=g.serverId+':'+g.dungeon+':'+g.difficulty;if(done.has(slot)||!queue(realm).has(g.id))continue;done.add(slot);
  const {out,total}=pick(bucket(realm,g));
  if(total===MAX_PARTY){match(realm,out);continue;}
  const oldest=out[0];if(total>=2&&!oldest.offered&&now-oldest.since>=QUEUE_OFFER_MS){oldest.offered=true;tell(realm,oldest,'offer',{size:total});}
 }
}

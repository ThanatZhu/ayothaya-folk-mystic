// Party dungeon runs (owner 8–9 Nov 2026; design docs/superpowers/specs/2026-11-08-party-dungeons-design.md).
// A run reserves one private room per team, like the arena (arena-rooms166.js). Players reach it through the normal
// travel → join flow; the run remembers where each player stood before and sends them back there afterwards.
import {randomUUID} from 'node:crypto';
import {dungeonById,DIFFICULTY,canEnter,READY_SECONDS,MAX_PARTY,PIECE_CHANCE,CHESTS_PER_DAY,partyIndex,rollGradeFor,CLEAR_COINS_PER_LEVEL,CLEAR_STONES} from '../dungeons.js';
import {dungeonPieceId,DUNGEON_SLOTS,withGrade} from '../gear-sets.js';
import {thaiDay} from '../daily.js';
import {queueFor,unqueue,acceptOffer} from './dungeon-queue.js';
import {dungeonRunView,lightLantern} from './dungeon-script.js';

const RUN_IDLE_MS=10*60e3;
const runs=realm=>realm.dungeonRuns??=new Map();
const checks=realm=>realm.dungeonChecks??=new Map();
const peerByKey=(realm,key)=>{for(const p of realm.peers.values())if(p.key===key)return p;return null;};
export function dungeonReservation(realm,key){for(const run of runs(realm).values())if(run.keys.has(key)&&!run.left.has(key))return run;return null;}
export const keepDungeonRoom=(realm,room)=>!!room.map.dungeon&&!!room.dungeonRun&&runs(realm).has(room.dungeonRun);

function busy(realm,p){
 return !!(p.duel||p.trade||p.world.player.hp<=0||p.suspended||p.room.map.instance||p.room.map.guildHall||p.room.map.prologue||
  dungeonReservation(realm,p.key)||realm.arenaRooms&&[...realm.arenaRooms.values()].some(r=>r.members.some(m=>m.key===p.key)));
}
export function checkEntry(realm,p,dungeon){
 if(!dungeon)throw Error('dungeon-unknown');
 if(!canEnter(dungeon,realm.who(p).level))throw Error('dungeon-level');
 if(busy(realm,p))throw Error('dungeon-busy');
}
// Starts the run for these peers: each gets dungeonEnter and travels in by itself.
export function startRun(realm,dungeon,difficulty,peers){
 const run={id:randomUUID(),dungeon:dungeon.id,difficulty,size:peers.length,keys:new Set(peers.map(p=>p.key)),left:new Set(),serverId:peers[0].serverId,
  roomId:null,roomIndex:0,state:{},startedAt:realm.now(),seenAt:realm.now()};
 runs(realm).set(run.id,run);
 for(const p of peers){p.dungeonReturn={mapId:p.room.map.id,position:{x:+p.world.player.x.toFixed(2),z:+p.world.player.z.toFixed(2)}};p.saveNow=true;
  p.world.emit('dungeonEnter',{run:run.id,dungeon:dungeon.id,map:dungeon.map,difficulty});}
 return run;
}
export function startReadyCheck(realm,p,{dungeon:id,difficulty}){
 const dungeon=dungeonById(id);if(!DIFFICULTY[difficulty])throw Error('dungeon-difficulty');
 const party=p.partyId?realm.parties.get(p.partyId):null;
 if(party&&party.leader!==p.id)throw Error('dungeon-not-leader');
 for(const c of checks(realm).values())if(c.leader===p.key)throw Error('dungeon-checking');
 checkEntry(realm,p,dungeon);
 if(!party)return startRun(realm,dungeon,difficulty,[p]);
 const members=[...party.members].map(id=>realm.peers.get(id)).filter(a=>a&&a.serverId===p.serverId&&!a.suspended).slice(0,MAX_PARTY);
 const c={id:randomUUID(),dungeon:dungeon.id,difficulty,leader:p.key,answers:new Map(members.map(a=>[a.key,a===p?true:null])),deadline:realm.now()+READY_SECONDS*1000};
 checks(realm).set(c.id,c);
 for(const a of members)a.world.emit('dungeonReady',{check:c.id,dungeon:dungeon.id,difficulty,leader:p.character.name,deadline:c.deadline,seconds:READY_SECONDS});
 return c;
}
function settle(realm,c){
 checks(realm).delete(c.id);const dungeon=dungeonById(c.dungeon);
 const go=[...c.answers].filter(([,yes])=>yes).map(([key])=>peerByKey(realm,key)).filter(a=>{if(!a)return false;try{checkEntry(realm,a,dungeon);return true;}catch(e){a.world.emit('dungeonError',{reason:e.message});return false;}});
 const leader=peerByKey(realm,c.leader);
 if(!go.length||!go.includes(leader)){for(const [key] of c.answers)peerByKey(realm,key)?.world.emit('dungeonError',{reason:'dungeon-cancelled'});return null;}
 return startRun(realm,dungeon,c.difficulty,go);
}
export function answerReady(realm,p,yes){
 const c=[...checks(realm).values()].find(c=>c.answers.has(p.key));if(!c)throw Error('dungeon-no-check');
 c.answers.set(p.key,yes===true);
 if(p.key===c.leader&&yes!==true){for(const k of c.answers.keys())c.answers.set(k,false);return settle(realm,c);}   // the leader backing out cancels it
 if([...c.answers.values()].every(v=>v!==null))return settle(realm,c);
 return c;
}
// Leaving is final for this run; the client then travels home (dungeonExit). An empty run ends.
export function leaveRun(realm,p){
 const run=dungeonReservation(realm,p.key);
 if(run){run.left.add(p.key);if([...run.keys].every(k=>run.left.has(k)))endRun(realm,run,{cleared:false});}
 p.world.emit('dungeonExit',{mapId:p.dungeonReturn?.mapId??realm.catalog.capital});
}
export function endRun(realm,run,{cleared=false}={}){
 runs(realm).delete(run.id);run.ended=true;run.cleared=cleared;
 // an abandoned run frees its room
 const room=realm.rooms.get(run.roomId);if(room&&!room.peers.size)realm.rooms.delete(room.id);
 for(const key of run.keys){const a=peerByKey(realm,key);if(a&&a.room.id===run.roomId&&!run.left.has(key))a.world.emit('dungeonEnded',{cleared,mapId:a.dungeonReturn?.mapId??realm.catalog.capital});}
}
// The boss fell: everyone still in the run is paid, then the run ends.
export function finishRun(realm,run,room,boss=null){run.cleared=true;grantRunRewards(realm,run,boss?.encounterId?{encounterId:boss.encounterId}:null);endRun(realm,run,{cleared:true});}
// Shards every clear; the chest (one set piece, by party size and difficulty) only 3 times per dungeon per Thai day.
// receipt (the boss kill's encounter) puts the payout in the boss result panel as well.
export function grantRunRewards(realm,run,receipt=null){
 const d=dungeonById(run.dungeon),diff=DIFFICULTY[run.difficulty],rand=realm.dungeonRandom??Math.random,today=thaiDay(realm.now());
 for(const key of run.keys){if(run.left.has(key))continue;const p=peerByKey(realm,key);if(!p||p.room.id!==run.roomId)continue;
  if(p.dungeonChests?.day!==today)p.dungeonChests={day:today,counts:{}};
  const used=p.dungeonChests.counts[d.id]??0,chest=used<CHESTS_PER_DAY,items=[{id:d.shard,count:diff.shards}];let piece=null;
  if(chest){p.dungeonChests.counts[d.id]=used+1;
   if(rand()<PIECE_CHANCE[partyIndex(run.size)]){const slot=DUNGEON_SLOTS[Math.floor(rand()*DUNGEON_SLOTS.length)%DUNGEON_SLOTS.length];piece=withGrade(dungeonPieceId(d.set,slot),rollGradeFor(run.difficulty,rand));items.push({id:piece,count:1});}}
  const stone=CLEAR_STONES[Math.min(CLEAR_STONES.length-1,Math.floor(rand()*CLEAR_STONES.length))],stones=1+Math.min(diff.shards,Math.floor(rand()*(diff.shards+1)));items.push({id:stone,count:stones});
  const coins=Math.round(d.level*CLEAR_COINS_PER_LEVEL*diff.mul);realm.grantLoot(p,{coins,items},null,receipt?{encounterId:receipt.encounterId}:null,'dungeon');p.saveNow=true;
  p.world.emit('dungeonReward',{dungeon:d.id,shard:d.shard,shards:diff.shards,piece,coins,stone,stones,chest,chestsLeft:CHESTS_PER_DAY-(p.dungeonChests.counts[d.id]??0)});}
}
// The way back: from a dungeon map, only to the remembered map, standing where you were.
export function dungeonReturnDestination(realm,p,id){
 if(!p.room.map.dungeon||!p.dungeonReturn||p.dungeonReturn.mapId!==id)return null;
 const map=realm.catalog.maps.find(m=>m.id===id);if(!map)return null;
 const at=p.dungeonReturn.position;const run=dungeonReservation(realm,p.key);if(run){run.left.add(p.key);if([...run.keys].every(k=>run.left.has(k)))endRun(realm,run,{cleared:!!run.cleared});}
 return {...map,spawn:{...at}};
}
export function dungeonEntryDestination(realm,p,map){
 const run=dungeonReservation(realm,p.key);
 if(!run||dungeonById(run.dungeon)?.map!==map.id||p.duel||p.trade||p.world.player.hp<=0)throw Error('dungeon-not-ready');
 return map;
}
export function tickDungeonRuns(realm){
 const now=realm.now();
 for(const c of [...checks(realm).values()])if(now>=c.deadline)settle(realm,c);
 if(!runs(realm).size)return;
 const online=new Set();for(const p of realm.peers.values())online.add(p.key);
 for(const run of [...runs(realm).values()]){
  if([...run.keys].some(k=>!run.left.has(k)&&online.has(k)))run.seenAt=now;
  else if(now-run.seenAt>RUN_IDLE_MS)endRun(realm,run,{cleared:false});
 }
}
export function dungeonCommand(realm,p,m){
 const action=m.action;
 if(action==='enter')return startReadyCheck(realm,p,{dungeon:m.dungeon,difficulty:m.difficulty});
 if(action==='ready')return answerReady(realm,p,m.yes);
 if(action==='leave')return leaveRun(realm,p);
 if(action==='lantern')return lightLantern(realm,p,m.index);
 if(action==='info'){const today=thaiDay(realm.now()),used=p.dungeonChests?.day===today?p.dungeonChests.counts:{},run=dungeonReservation(realm,p.key);p.world.emit('dungeonInfo',{used:{...used},chestsPerDay:CHESTS_PER_DAY,inRun:!!run});if(run?.state?.text)p.world.emit('dungeonRun',dungeonRunView(run));return null;}
 if(action==='queue')return queueFor(realm,p,{dungeon:m.dungeon,difficulty:m.difficulty});
 if(action==='unqueue')return unqueue(realm,p);
 if(action==='accept')return acceptOffer(realm,p);
 throw Error('dungeon-action');
}

// Shared realm setup for the party dungeon tests: real world.json, real travel order, events captured per player.
import fs from 'node:fs';
import {RealmServer} from '../../server/realm.js';
import {initialSave} from '../../realm-state.js';
import {levelStart} from '../../experience.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../../maps/world.json',import.meta.url)));
export function dungeonWorld(){
 let time=Date.UTC(2026,10,9,5);const realm=new RealmServer({catalog,now:()=>time});const boxes=new Map();
 const sender=uid=>m=>{if(m.type==='events')(boxes.get(uid)??boxes.set(uid,[]).get(uid)).push(...m.events);};
 const daily={day:'2026-11-09',streak:1};
 const join=(name,{mapId='rice-fields',level=40,classId='swordsman'}={})=>{const state=initialSave();state.mapId=mapId;state.position={x:3,z:4};
  const p=realm.join({uid:'u-'+name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId},state,daily},send:sender('u-'+name)});p.world.baseXp=levelStart(level);return p;};
 const move=(p,to)=>{const dest=realm.travelDestination(p,to);const record=realm.record(p,{state:initialSave(),character:p.character,daily});
  realm.leave(p.id,{travel:true});record.state.mapId=dest.id;record.state.position={...dest.spawn};return realm.join({uid:p.uid,serverId:p.serverId,slotId:p.slotId,record,send:sender(p.uid)});};
 const relog=(p,ms)=>{const record=realm.record(p,{state:initialSave(),character:p.character,daily});realm.suspend(p.id);time+=ms;realm.step(.05);
  return realm.join({uid:p.uid,serverId:p.serverId,slotId:p.slotId,record,send:sender(p.uid)});};
 const party=(...ps)=>{const id='party-'+ps[0].character.name;realm.parties.set(id,{id,leader:ps[0].id,members:new Set(ps.map(p=>p.id))});ps.forEach(p=>p.partyId=id);};
 const events=(p,type)=>[...(boxes.get(p.uid)??[]),...p.world.events].filter(e=>e.type===type);
 const cmd=(p,m)=>realm.receive(p.id,{type:'dungeon',seq:++p.seq+1000,...m});
 // run the realm for `seconds` in 50 ms steps
 const run=seconds=>{for(let t=0;t<seconds;t+=.05){time+=50;realm.step(.05);}};
 // enter solo or as a ready party, travel everyone in, return the peers inside
 const enter=(ps,difficulty='normal')=>{const [lead,...rest]=ps;if(rest.length)party(...ps);cmd(lead,{action:'enter',dungeon:'krasue',difficulty});for(const q of rest)cmd(q,{action:'ready',yes:true});return ps.map(q=>move(q,'dg-krasue'));};
 return {realm,join,move,relog,party,events,cmd,run,enter,tick:ms=>{time+=ms;realm.step(.05);},now:()=>time};
}

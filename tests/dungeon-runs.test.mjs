import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {levelStart} from '../experience.js';
import {dungeonReservation} from '../server/dungeon-runs.js';
import {dungeonById} from '../dungeons.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
const D=dungeonById('krasue');
function world(){
 let time=Date.UTC(2026,10,9,5);const realm=new RealmServer({catalog,now:()=>time});const boxes=new Map(),sender=uid=>m=>{if(m.type==='events')(boxes.get(uid)??boxes.set(uid,[]).get(uid)).push(...m.events);};
 const join=(name,{mapId='rice-fields',level=40,record}={})=>{const state=initialSave();state.mapId=mapId;state.position={x:3,z:4};
  const p=realm.join({uid:'u-'+name,serverId:'server-1',slotId:'slot-1',record:record??{character:{name,gender:'male',classId:'swordsman'},state,daily:{day:'2026-11-09',streak:1}},send:sender('u-'+name)});
  if(!record)p.world.baseXp=levelStart(level);return p;};
 // the real travel order: validate, save the record, leave, join the new map at its spawn
 const move=(p,to)=>{const dest=realm.travelDestination(p,to);const record=realm.record(p,{state:initialSave(),character:p.character,daily:{day:'2026-11-09',streak:1}});
  realm.leave(p.id,{travel:true});record.state.mapId=dest.id;record.state.position={...dest.spawn};const q=realm.join({uid:p.uid,serverId:p.serverId,slotId:p.slotId,record,send:sender(p.uid)});return q;};
 // a dropped connection: suspend, time out, then log back in from the saved record
 const relog=(p,ms)=>{const record=realm.record(p,{state:initialSave(),character:p.character,daily:{day:'2026-11-09',streak:1}});realm.suspend(p.id);time+=ms;realm.step(.05);
  return realm.join({uid:p.uid,serverId:p.serverId,slotId:p.slotId,record,send:sender(p.uid)});};
 const party=(...ps)=>{const id='party-'+ps[0].character.name;realm.parties.set(id,{id,leader:ps[0].id,members:new Set(ps.map(p=>p.id))});ps.forEach(p=>p.partyId=id);};
 const events=(p,type)=>[...(boxes.get(p.uid)??[]),...p.world.events].filter(e=>e.type===type);
 const cmd=(p,m)=>realm.receive(p.id,{type:'dungeon',seq:++p.seq+1000,...m});
 return {realm,join,move,relog,party,events,cmd,tick:ms=>{time+=ms;realm.step(.05);}};
}

test('solo entry: a private room at the first room start, and the old spot is remembered',()=>{
 const {realm,join,move,events,cmd}=world(),a=join('เอ');
 cmd(a,{action:'enter',dungeon:'krasue',difficulty:'normal'});
 assert.equal(events(a,'dungeonEnter').length,1);
 const a2=move(a,D.map);assert.match(a2.room.id,/:dg:dg-krasue:/);
 assert.deepEqual({x:a2.world.player.x,z:a2.world.player.z},catalog.maps.find(m=>m.id===D.map).spawn,'arrives at the pier');
 assert.deepEqual(a2.dungeonReturn,{mapId:'rice-fields',position:{x:3,z:4}});
 const b=join('บี');cmd(b,{action:'enter',dungeon:'krasue',difficulty:'normal'});const b2=move(b,D.map);
 assert.notEqual(a2.room.id,b2.room.id,'two solo players get two rooms');
});
test('level and busy checks',()=>{
 const {join,events,cmd}=world(),low=join('ต่ำ',{level:34});
 cmd(low,{action:'enter',dungeon:'krasue',difficulty:'normal'});
 assert.equal(events(low,'dungeonError')[0]?.reason,'dungeon-level');assert.equal(events(low,'dungeonEnter').length,0);
});
test('party ready check: only members who say yes in 20 s go in',()=>{
 const {realm,join,party,events,cmd,tick,move}=world(),a=join('เอ'),b=join('บี'),c=join('ซี');party(a,b,c);
 cmd(b,{action:'enter',dungeon:'krasue',difficulty:'hard'});assert.equal(events(b,'dungeonError')[0]?.reason,'dungeon-not-leader');
 cmd(a,{action:'enter',dungeon:'krasue',difficulty:'hard'});
 assert.equal(events(b,'dungeonReady').length,1);assert.equal(events(c,'dungeonReady').length,1);
 cmd(b,{action:'ready',yes:true});
 tick(19000);assert.equal(events(a,'dungeonEnter').length,0,'still waiting for ซี');
 tick(2000);
 assert.equal(events(a,'dungeonEnter').length,1);assert.equal(events(b,'dungeonEnter').length,1);assert.equal(events(c,'dungeonEnter').length,0);
 assert.ok(dungeonReservation(realm,a.key));assert.equal(dungeonReservation(realm,c.key),null);
 const run=dungeonReservation(realm,a.key);assert.equal(run.size,2);assert.equal(run.difficulty,'hard');
 const a2=move(a,D.map),b2=move(b,D.map);assert.equal(a2.room,b2.room);
 assert.throws(()=>realm.travelDestination(c,D.map),/dungeon-not-ready/);
});
test('a dropped player keeps the seat for the whole run; leaving is final and sends you home',()=>{
 const {realm,join,move,relog,events,cmd}=world(),a=join('เอ');
 cmd(a,{action:'enter',dungeon:'krasue',difficulty:'normal'});const a2=move(a,D.map),room=a2.room;
 const a3=relog(a2,5*60e3);assert.equal(a3.room.id,room.id,'back in the same run after 5 minutes');
 cmd(a3,{action:'leave'});assert.equal(events(a3,'dungeonExit')[0]?.mapId,'rice-fields');
 assert.equal(dungeonReservation(realm,a3.key),null);
 const home=move(a3,'rice-fields');assert.equal(home.room.map.id,'rice-fields');assert.deepEqual({x:home.world.player.x,z:home.world.player.z},{x:3,z:4});
});
test('a member who logs back in after the run ended wakes at the remembered spot',()=>{
 const {realm,join,move,relog,cmd}=world(),a=join('เอ');
 cmd(a,{action:'enter',dungeon:'krasue',difficulty:'normal'});const a2=move(a,D.map);
 realm.dungeonRuns.clear();
 const back=relog(a2,30e3);assert.equal(back.room.map.id,'rice-fields');assert.deepEqual({x:back.world.player.x,z:back.world.player.z},{x:3,z:4});
});
test('the last monster of a dungeon room never pays the old mill-cellar clear',()=>{
 const {join,move,cmd,realm}=world(),a=join('เอ');
 cmd(a,{action:'enter',dungeon:'krasue',difficulty:'normal'});const a2=move(a,D.map);
 a2.world.events.length=0;
 const m={id:999,type:a2.room.mobs[0]?.type??1,x:a2.world.player.x+1,z:a2.world.player.z,hp:5,maxHp:5};a2.room.mobs.push(m);
 realm.hurt(a2,m,50);
 assert.equal(a2.world.events.filter(e=>e.type==='dungeonClear').length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {activeEmote,actionChoice,canonicalAction,supportsCharacterAction,RUN_MULTIPLIER} from '../character-action-state.js';
import {CombatWorld,predictMove} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MultiplayerClient} from '../multiplayer-client.js';

const nav={zones:[{x:-90,z:-90,w:180,d:180}],obstacles:[],props:[]};
const map={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[{to:'field',x:0,z:0}]};
function fixture(safe=true,{runEnabled=false}={}){
 let time=10000;const realm=new RealmServer({catalog:{capital:map.id,maps:[{...map,safe},{...map,id:'field',safe:false}]},now:()=>time,runEnabled});
 const add=name=>realm.join({uid:name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state:initialSave()},send(){}});
 const send=(p,type,data={})=>{time+=100;return realm.receive(p.id,{type,seq:p.seq+1,...data});};
 const step=(n=1)=>{for(let i=0;i<n;i++){time+=50;realm.step(.05);}};
 return {realm,add,send,step};
}

test('sit and cosmetic sleep persist, legacy rest maps to sit, one-shot emotes expire',()=>{
 assert.equal(canonicalAction('rest'),'sit');
 for(const name of ['sit','sleep'])assert.equal(activeEmote({name,time:0},3600).name,name);
 assert.equal(activeEmote({name:'bow',time:0},4),null);
 assert.equal(activeEmote({name:'sleep',time:NaN},0),null);
 assert.equal(actionChoice({emote:{name:'sleep',time:0},time:20}),'sleep');
 assert.equal(actionChoice({emote:{name:'sleep',time:0},moving:true,running:true}),'run');
 assert.equal(actionChoice({emote:{name:'sit',time:0},cast:true,moving:true}),'cast');
 assert.equal(actionChoice({emote:{name:'sit',time:0},cast:true,hit:true}),'hit');
 assert.equal(actionChoice({emote:{name:'sit',time:0},dead:true}),'idle');
});

test('missing authored poses stay unavailable; an explicit renderer capability enables each one',()=>{
 for(const mode of ['run','sit','sleep','rest'])assert.equal(supportsCharacterAction(mode),false,mode);
 for(const mode of ['idle','walk','bow','guard'])assert.equal(supportsCharacterAction(mode),true,mode);
 assert.equal(supportsCharacterAction('rest',mode=>mode==='sit'),true);
 assert.equal(supportsCharacterAction('sleep',()=>false),false);
});

test('postures stop auto/path movement and cancel on move intent even against a wall, attacks, casts, hits and death',()=>{
 const w=new CombatWorld({...map,safe:false});w.auto=true;w.path=[{x:3,z:0}];w.player.running=true;
 assert.equal(w.setEmote('rest'),true);assert.equal(w.emote.name,'sit');assert.equal(w.auto,false);assert.deepEqual(w.path,[]);assert.equal(w.player.running,false);
 for(let i=0;i<200;i++)w.update(.05,{x:0,z:0},{monsters:false});assert.equal(w.emote.name,'sit');
 w.nav={...nav,obstacles:[{x:-.3,z:-1,w:2,d:2}]};w.update(.05,{x:1,z:0},{monsters:false});assert.equal(w.emote,null);assert.equal(w.player.moving,false);
 w.setEmote('sleep');w.basicAttack();assert.equal(w.emote,null);
 w.setEmote('sleep');w.skill(4);assert.equal(w.emote,null);
 w.setEmote('sit');w.emit('playerHit',{amount:1});assert.equal(w.emote,null);
 w.setEmote('sleep');w.player.hp=0;w.player.down=3;w.update(.05,{x:0,z:0},{monsters:false});assert.equal(w.emote,null);assert.equal(w.player.running,false);
 assert.equal(w.setEmote('sit'),false);
});

test('run is an explicit modifier; prediction and authority keep identical class, town and curse speed',()=>{
 for(const safe of [false,true])for(const curse of [false,true]){
  const server=new CombatWorld({...map,safe}),client=new CombatWorld({...map,safe});
  if(curse){server.status.curse=30;client.status.curse=30;}
  const base=server.walkSpeed();assert.equal(server.walkSpeed(true),base*RUN_MULTIPLIER);
  server.update(.05,{x:1,z:1,run:true},{monsters:false});predictMove(client,{x:0,z:0,moving:false},.05,{x:1,z:1,run:true});
  assert.ok(Math.abs(Math.hypot(server.player.x,server.player.z)-base*RUN_MULTIPLIER*.05)<1e-9);
  assert.deepEqual([client.player.x,client.player.z],[server.player.x,server.player.z]);assert.equal(client.player.running,true);assert.equal(server.player.running,true);
  server.update(.05,{x:0,z:0,run:true},{monsters:false});assert.equal(server.player.running,false);
  server.status.stun=10;const before=[server.player.x,server.player.z];server.update(.05,{x:1,z:0,run:true},{monsters:false});assert.deepEqual([server.player.x,server.player.z],before);assert.equal(server.player.running,false);
 }
});

test('remote snapshots restore sustained postures on late join and AOI reentry, with cancellation snapshots',()=>{
 const {realm,add,send,step}=fixture(true,{runEnabled:true}),a=add('travelerA');
 send(a,'emote',{name:'rest'});step(180);const b=add('travelerB');
 let remote=realm.snapshot(b).players.find(p=>p.id===a.id);assert.equal(remote.emote.name,'sit');assert.equal(remote.emote.time,0);
 b.world.player.x=70;assert.equal(realm.snapshot(b).players.length,0);b.world.player.x=0;
 remote=realm.snapshot(b).players[0];assert.equal(remote.emote.name,'sit');assert.equal(remote.character.name,'travelerA');
 send(a,'emote',{name:'sleep'});step(120);assert.equal(realm.snapshot(b).players[0].emote.name,'sleep');
 send(a,'input',{x:1,z:0,attack:false,run:true});step();remote=realm.snapshot(b).players[0];assert.equal(remote.emote,null);assert.equal(remote.player.running,true);
 send(a,'emote',{name:'sit'});assert.equal(a.input.x,0);assert.equal(a.world.player.running,false);
 a.world.emit('playerHit',{amount:1});assert.equal(realm.snapshot(b).players[0].emote,null);
 send(a,'emote',{name:'sleep'});send(a,'skill',{index:4});assert.equal(realm.snapshot(b).players[0].emote,null);
 send(a,'emote',{name:'sleep'});realm.suspend(a.id);assert.equal(realm.snapshot(b).players[0].emote,null);assert.equal(a.world.player.running,false);a.suspended=false;
 send(a,'emote',{name:'sleep'});assert.equal(realm.travelDestination(a,'field').id,'field');assert.equal(a.world.emote,null);
});

test('server rejects forged run values, preserves legacy walking, and stops stale sprint inputs',()=>{
 const {realm,add,send,step}=fixture(true,{runEnabled:true}),p=add('travelerA');const base=p.world.walkSpeed();
 for(const run of [2,'true',{},null])assert.equal(send(p,'input',{x:1,z:0,attack:false,run}),false);
 const initialX=p.world.player.x;send(p,'input',{x:1,z:0,attack:false});step();assert.ok(Math.abs(p.world.player.x-initialX-base*.05)<1e-9);assert.equal(p.world.player.running,false);
 const start=p.world.player.x;send(p,'input',{x:1,z:0,attack:false,run:true});step();assert.ok(Math.abs(p.world.player.x-start-base*RUN_MULTIPLIER*.05)<1e-9);
 step(20);const stopped=p.world.player.x;step(4);assert.equal(p.world.player.x,stopped);assert.equal(p.world.player.running,false);
 assert.equal(send(p,'emote',{name:'unknown-pose'}),false);
});

test('unreleased sprint stays disabled by server policy despite client input or claimed capabilities',()=>{
 for(const safe of [false,true]){
  const {realm,add,send,step}=fixture(safe),p=add('travelerA'),observer=add('travelerB');
  assert.equal(realm.runEnabled,false);
  const base=p.world.walkSpeed(),start={x:p.world.player.x,z:p.world.player.z};
  assert.equal(send(p,'input',{x:1,z:1,attack:false,run:true,runEnabled:true,capabilities:{run:true}}),true);
  assert.equal(p.input.run,false);step();
  assert.ok(Math.abs(Math.hypot(p.world.player.x-start.x,p.world.player.z-start.z)-base*.05)<1e-9);
  assert.equal(p.world.player.running,false);assert.equal(realm.snapshot(p).self.player.running,false);
  assert.equal(realm.snapshot(observer).players.find(a=>a.id===p.id).player.running,false);
 }
});

test('run toggles and releasing movement are sent immediately despite steering throttle',()=>{
 const sent=[],client=new MultiplayerClient({url:'ws://unused',identity:async()=>({})});client.status='online';client.lastInput=-1e6;client.socket={readyState:1,send:m=>sent.push(JSON.parse(m))};
 client.setInput({x:1,z:0,run:false});client.setInput({x:1,z:0,run:true});client.setInput({x:1,z:0,run:false});client.setInput({x:0,z:0,run:true});
 assert.equal(sent.length,4);assert.deepEqual(sent.map(m=>m.run),[false,true,false,false]);assert.equal(sent.at(-1).x,0);
});

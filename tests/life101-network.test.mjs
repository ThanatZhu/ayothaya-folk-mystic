import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

const map={id:'ayutthaya',safe:true,nav:{zones:[{x:-90,z:-90,w:180,d:180}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
function fixture({runEnabled=false}={}){
 let time=10000;
 const realm=new RealmServer({catalog:{capital:map.id,maps:[map]},now:()=>time,runEnabled});
 const add=name=>{
  const messages=[];
  const peer=realm.join({uid:name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state:initialSave()},
   // Capture the wire representation, not shared references to the server cache.
   send:message=>messages.push(JSON.parse(JSON.stringify(message)))});
  return {peer,messages};
 };
 const send=(peer,type,data={})=>{time+=100;assert.equal(realm.receive(peer.id,{type,seq:peer.seq+1,...data}),true);};
 const step=(n=2)=>{for(let i=0;i<n;i++){time+=50;realm.step(.05);}};
 const latest=viewer=>viewer.messages.findLast(message=>message.type==='snapshot');
 const remote=(viewer,actor)=>latest(viewer)?.players.find(player=>player.id===actor.peer.id);
 return {realm,add,send,step,latest,remote};
}

test('broadcast deltas keep posture and cancellation current for every observer without replaying emote events',()=>{
 const {add,send,step,latest,remote}=fixture({runEnabled:true});
 const actor=add('travelerA'),viewers=[add('travelerB'),add('travelerC')];
 step();
 const states=new Map();
 const check=(name,running=false)=>{
  for(const viewer of viewers){
   const delta=remote(viewer,actor);
   assert.ok(Object.hasOwn(delta,'emote'),'posture cancellation must be explicit');
   assert.equal(delta.emote?.name??null,name);
   assert.equal(delta.player.running,running);
   assert.equal(Object.hasOwn(delta,'character'),false,'known avatars do not repeat identity');
   assert.equal(Object.hasOwn(delta,'equipment'),false,'unchanged equipment stays omitted');
   // A renderer merges remote entries; it must recover using snapshots alone.
   const state={...states.get(viewer),...delta};
   states.set(viewer,state);
   assert.equal(state.emote?.name??null,name);
  }
 };
 check(null);
 send(actor.peer,'emote',{name:'rest'});step();check('sit');
 const firstSit=remote(viewers[0],actor);
 step(102);check('sit');
 assert.ok(latest(viewers[0]).time>5);
 assert.equal(latest(viewers[0]).events.some(event=>event.type==='emote'),false);
 assert.ok(Math.abs(remote(viewers[0],actor).emote.time-firstSit.emote.time)<1e-9,'persistent poses keep their original start');
 send(actor.peer,'emote',{name:'sleep'});step();check('sleep');
 send(actor.peer,'emote',{name:'idle'});step();check(null);
 send(actor.peer,'emote',{name:'sit'});step();check('sit');
 send(actor.peer,'input',{x:1,z:0,attack:false,run:true});step();check(null,true);
 send(actor.peer,'input',{x:0,z:0,attack:false,run:false});step();check(null);
 assert.equal(firstSit.emote.name,'sit','later broadcasts cannot mutate a packet already received');
});

test('cached broadcasts retain cosmetic deltas and restore full current postures after AOI reentry',()=>{
 const {realm,add,send,step,remote,latest}=fixture();
 const actor=add('travelerA'),near=add('travelerB'),far=add('travelerC');
 step();
 send(actor.peer,'emote',{name:'sleep'});step();
 actor.peer.equipment={...actor.peer.equipment,outfit:'novice-outfit-indigo'};
 step();
 for(const viewer of [near,far]){
  const delta=remote(viewer,actor);
  assert.equal(delta.equipment.outfit,'novice-outfit-indigo');
  assert.equal(delta.emote.name,'sleep');
 }
 step();
 assert.equal(Object.hasOwn(remote(near,actor),'equipment'),false);
 far.peer.world.player.x=70;step();
 assert.equal(remote(far,actor),undefined);
 far.peer.world.player.x=0;step();
 const restored=remote(far,actor);
 assert.equal(restored.character.name,'travelerA');
 assert.equal(restored.equipment.outfit,'novice-outfit-indigo');
 assert.equal(restored.emote.name,'sleep');
 assert.equal(restored.player.running,false);
 const late=add('travelerD'),welcome=late.messages.find(message=>message.type==='welcome');
 assert.equal(welcome.snapshot.players.find(player=>player.id===actor.peer.id).emote.name,'sleep');
 // Disconnection clears posture for everyone, including clients that missed the event.
 realm.suspend(actor.peer.id);step();
 for(const viewer of [near,far,late]){
  assert.equal(remote(viewer,actor).emote,null);
  assert.equal(remote(viewer,actor).connected,false);
  assert.equal(remote(viewer,actor).player.running,false);
  assert.equal(latest(viewer).events.some(event=>event.type==='emote'),false);
 }
});

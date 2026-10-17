import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld,predictMove,TOWN_PACE} from '../combat-core.js';
const map={id:'field',safe:true,nav:{zones:[{x:-50,z:-50,w:100,d:100}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
// Client renders at 60 fps; server steps at 20 Hz, snapshots at 10 Hz, 50 ms each way.
function simulate(heldSeconds,totalSeconds){
 const client=new CombatWorld(map),server=new CombatWorld(map),frame=1/60,speed=client.profession.speed*(map.safe?TOWN_PACE:1),latency=.05;
 const inbound=[],outbound=[],steps=[];let snapshot=null,serverClock=0,tick=0;
 for(let t=0;t<totalSeconds;t+=frame){
  const dir=t<heldSeconds?{x:0,z:-1}:{x:0,z:0};
  inbound.push({at:t+latency,dir});
  while(serverClock+.05<=t){serverClock+=.05;tick++;const input=inbound.filter(i=>i.at<=serverClock).at(-1)?.dir??{x:0,z:0};server.update(.05,{...input,attack:false},{monsters:false});
   if(tick%2===0){const p=server.player;outbound.push({at:serverClock+latency,state:{x:p.x,z:p.z,moving:p.moving,face:{...p.face}}});}}
  while(outbound.length&&outbound[0].at<=t)snapshot=outbound.shift().state;
  const before={x:client.player.x,z:client.player.z};predictMove(client,snapshot,frame,dir);
  steps.push({t,held:t<heldSeconds,step:Math.hypot(client.player.x-before.x,client.player.z-before.z)});
 }
 return {client,server,steps,speed,frame};
}
test('own character moves every frame while steering, at no more than class speed',()=>{
 const {steps,speed,frame}=simulate(2,2);
 const steering=steps.filter(s=>s.held&&s.t>.2);
 assert.ok(steering.every(s=>s.step>0),'no frozen frames while holding a direction');
 assert.ok(steering.every(s=>s.step<=speed*frame+1e-9),'never faster than the server allows');
});
test('after letting go the character settles on the server position without a visible jump',()=>{
 const {client,server,steps,speed,frame}=simulate(2,3.5);
 assert.ok(Math.hypot(client.player.x-server.player.x,client.player.z-server.player.z)<.05);
 assert.ok(steps.filter(s=>!s.held).every(s=>s.step<=speed*frame*1.5),'correction eases instead of snapping');
});
test('large server corrections (dash, respawn) snap immediately; no snapshot means no movement',()=>{
 const world=new CombatWorld(map);predictMove(world,{x:6,z:0,moving:false,face:{x:1,z:0}},1/60,{x:0,z:0});
 assert.deepEqual([world.player.x,world.player.z],[6,0]);
 const fresh=new CombatWorld(map);predictMove(fresh,null,1/60,{x:1,z:0});assert.deepEqual([fresh.player.x,fresh.player.z],[0,0]);
});
import {MultiplayerClient} from '../multiplayer-client.js';
test('steering is throttled but letting go is sent to the server immediately',()=>{
 const sent=[],client=new MultiplayerClient({url:'ws://unused',identity:async()=>({})});client.status='online';client.lastInput=-1e6;client.socket={readyState:1,send:m=>sent.push(JSON.parse(m))};
 client.setInput({x:1,z:0});client.setInput({x:1,z:.2});assert.equal(sent.length,1,'second steering update within 65 ms is throttled');
 client.setInput({x:0,z:0});assert.equal(sent.length,2);assert.deepEqual([sent[1].x,sent[1].z],[0,0]);
 client.setInput({x:0,z:0});assert.equal(sent.length,2,'idle input is not re-sent every frame');
});

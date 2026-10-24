import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld,predictMove} from '../combat-core.js';
import {MultiplayerClient} from '../multiplayer-client.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const map={id:'stop-test',safe:true,nav:{zones:[{x:-50,z:-50,w:100,d:100}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]},idle={x:0,z:0,attack:false};

test('a released player ignores pre-stop snapshots and settles without restarting the walk animation',()=>{
 const w=new CombatWorld(map);w.player.x=1;w.player.face={x:1,z:0};
 for(let i=0;i<12;i++)predictMove(w,{x:.7+i*.01,z:0,moving:true,face:{x:-1,z:0}},1/60,idle,{pendingStop:true});
 assert.equal(w.player.x,1);assert.equal(w.player.moving,false);assert.deepEqual(w.player.face,{x:1,z:0});
 let previous=w.player.x;
 for(let i=0;i<90;i++){
  predictMove(w,{x:.95,z:0,moving:false,face:{x:1,z:0}},1/60,idle);
  assert.ok(w.player.x<=previous,'idle correction has no backwards/forwards bounce');assert.equal(w.player.moving,false);previous=w.player.x;
 }
 assert.ok(Math.abs(w.player.x-.95)<.003);
});

test('stop waiting does not block new steering, genuine AUTO movement, knockback or a teleport',()=>{
 const w=new CombatWorld(map);predictMove(w,{x:0,z:0,moving:false},1/60,{x:1,z:0},{pendingStop:true});assert.ok(w.player.x>0);assert.equal(w.player.moving,true);
 predictMove(w,{x:6,z:0,moving:false},1/60,idle,{pendingStop:true});assert.equal(w.player.x,6);
 predictMove(w,{x:6.2,z:0,moving:true,face:{x:1,z:0}},1/60,idle);assert.ok(w.player.x>6);assert.equal(w.player.moving,true);
 w.knockStep=()=>true;const before=w.player.x;predictMove(w,{x:6.5,z:0,moving:true,face:{x:1,z:0}},1/60,idle,{pendingStop:true});assert.ok(w.player.x>before);
});

test('the transport waits for its stop sequence, sends stop immediately, and bounds compatibility with old hosts',t=>{
 let now=1000;t.mock.method(performance,'now',()=>now);const packets=[],client=new MultiplayerClient({url:'ws://unused',identity:async()=>({})});client.status='online';client.socket={readyState:1,send:raw=>packets.push(JSON.parse(raw))};
 client.setInput({x:1,z:0});const moveSeq=client.seq;now+=10;client.setInput(idle);const stopSeq=client.seq;assert.equal(packets.length,2);assert.ok(stopSeq>moveSeq);
 assert.equal(client.waitingForStop(moveSeq),true);assert.equal(client.waitingForStop(stopSeq),false);assert.equal(client.waitingForStop(stopSeq+1),false);
 assert.equal(client.waitingForStop(undefined),true);now+=501;assert.equal(client.waitingForStop(undefined),false);
 client.setInput({x:-1,z:0});assert.equal(client.stopSeq,0);now+=10;client.setInput(idle);now+=10;const count=packets.length;client.setInput({x:1,z:0});assert.equal(packets.length,count+1,'a new start immediately follows a stop even inside the steering throttle');assert.equal(client.waitingForStop(moveSeq),false);
});

test('the authority acknowledges only validated movement that a simulation tick has applied',()=>{
 let now=10000;const realm=new RealmServer({catalog:{capital:map.id,maps:[map]},now:()=>now}),peer=realm.join({uid:'movement-test',serverId:'server-1',slotId:'slot-1',record:{character:{name:'Mover',gender:'male',classId:'novice'},state:initialSave()},send:()=>{}});
 assert.equal(realm.snapshot(peer).self.inputAck,0);
 assert.equal(realm.receive(peer.id,{type:'input',seq:1,x:1,z:0,attack:false}),true);assert.equal(realm.snapshot(peer).self.inputAck,0,'receiving input alone does not acknowledge a simulated position');
 now+=50;realm.step(.05);assert.equal(realm.snapshot(peer).self.inputAck,1);
 realm.receive(peer.id,{type:'ping',seq:2,stamp:1});assert.equal(realm.snapshot(peer).self.inputAck,1,'other commands do not acknowledge movement');
 assert.equal(realm.receive(peer.id,{type:'input',seq:3,x:Infinity,z:0,attack:false}),false);now+=50;realm.step(.05);assert.equal(realm.snapshot(peer).self.inputAck,1);
 realm.receive(peer.id,{type:'input',seq:4,...idle});assert.equal(realm.snapshot(peer).self.inputAck,1);now+=50;realm.step(.05);
 const stopped=realm.snapshot(peer).self;assert.equal(stopped.inputAck,4);assert.equal(stopped.player.moving,false);
});

test('repeated starts and stops stay idle after release with latency and buffered snapshots',t=>{
 for(const fps of [30,60,144])for(const latency of [.03,.1,.2]){
  let time=0;t.mock.method(performance,'now',()=>time*1000);
  const own=new CombatWorld(map),server=new CombatWorld(map),inbound=[],outbound=[],client=new MultiplayerClient({url:'ws://unused',identity:async()=>({})});
  client.status='online';client.socket={readyState:1,send:raw=>inbound.push({at:time+latency,...JSON.parse(raw)})};
  let serverClock=0,tick=0,applied=0,input=idle,snapshot={x:0,z:0,moving:false,inputAck:0},last=0,maxSettle=0,largest=null,jumps=[];
  for(let frame=0;frame<fps*5;frame++){
   time=frame/fps;const walking=time<1.1||time>=2.5&&time<3.1,dir=walking?{x:time<2?1:-1,z:0}:idle;
   client.setInput(dir);
   while(serverClock+.05<=time+1e-9){serverClock+=.05;tick++;
    while(inbound.length&&inbound[0].at<=serverClock+1e-9){const packet=inbound.shift();input=packet;applied=packet.seq;}
    server.update(.05,input,{monsters:false});if(tick%2===0)outbound.push({at:serverClock+latency+.12,state:{...server.player,face:{...server.player.face},inputAck:applied}});
   }
   while(outbound.length&&outbound[0].at<=time)snapshot=outbound.shift().state;
   last=own.player.x;predictMove(own,snapshot,1/fps,dir,{pendingStop:client.waitingForStop(snapshot.inputAck),inputAge:client.inputAge(snapshot.inputAck)});
   if(Math.abs(own.player.x-last)>own.walkSpeed(false)/fps*1.5)jumps.push({time,walking,last,next:own.player.x,snapshotX:snapshot.x,moving:snapshot.moving,age:client.inputAge(snapshot.inputAck),ack:snapshot.inputAck});
   if(!walking){assert.equal(own.player.moving,false,JSON.stringify({fps,latency,time}));const change=Math.abs(own.player.x-last);if(change>maxSettle){maxSettle=change;largest={time,last,next:own.player.x,snapshot,pendingStop:client.waitingForStop(snapshot.inputAck),stopSeq:client.stopSeq};}}
  }
  assert.ok(Math.abs(own.player.x-server.player.x)<.003,JSON.stringify({fps,latency}));assert.ok(maxSettle<.2,'settling stays gradual '+JSON.stringify({fps,latency,maxSettle,largest,jumps}));
  t.mock.restoreAll();
 }
});

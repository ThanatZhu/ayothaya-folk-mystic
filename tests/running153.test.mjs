import test from 'node:test';import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';import {CombatWorld,predictMove} from '../combat-core.js';
import {initialSave} from '../realm-state.js';import {RUN_MULTIPLIER} from '../character-action-state.js';
import {CLASSES,NOVICE} from '../classes.js';import {createRouteWalker,planRoute} from '../route-walk.js';
import {MultiplayerClient} from '../multiplayer-client.js';
const map={id:'ayutthaya',safe:true,nav:{zones:[{x:-90,z:-90,w:180,d:180}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
const fixture=({classId='shaman',runEnabled=true,record=null}={})=>{let now=1000;const realm=new RealmServer({catalog:{capital:map.id,maps:[map]},now:()=>now,runEnabled}),p=realm.join({uid:'runner',serverId:'server-1',slotId:'slot-1',record:record??{character:{name:'Runner',gender:'male',classId},state:{...initialSave(),mapId:map.id,position:{x:0,z:0}}},send(){}});return {realm,p,send:(type,data={})=>realm.receive(p.id,{type,seq:p.seq+1,...data}),step:(n=1)=>{for(let i=0;i<n;i++){now+=50;realm.step(.05);}}};};

test('all eight professions use the same authoritative run speed for manual and destination movement',()=>{
 for(const c of [NOVICE,...CLASSES])for(const safe of [false,true]){
  const t=fixture({classId:c.id}),client=new CombatWorld({...map,classId:c.id,safe});t.p.world.safe=safe;
  assert.equal(t.realm.snapshot(t.p).self.walkRunSchema,1);assert.equal(client.walkSpeed(true),client.walkSpeed()*RUN_MULTIPLIER);
  t.send('walkTo',{id:'run-speed-153',mapId:map.id,x:60,z:0,run:true});
  for(let i=0;i<20;i++){t.step();predictMove(client,t.p.world.player,.05,{x:1,z:0,run:true});assert.ok(Math.abs(client.player.x-t.p.world.player.x)<1e-8,c.id);}
  assert.equal(t.p.world.player.running,true);assert.equal(client.player.running,true);
 }
});

test('pace changes preserve the destination and background route, and manual movement still cancels',()=>{
 const t=fixture();t.send('walkTo',{id:'pace-switch-153',mapId:map.id,x:60,z:0,run:false});t.step();const walker=t.p.routeWalker,job=t.p.walkRoute.id;
 for(const run of [true,false,true]){
  assert.equal(t.send('walkPace',{id:job,run}),true);const x=t.p.world.player.x;t.step();assert.ok(Math.abs(t.p.world.player.x-x-t.p.world.walkSpeed(run)*.05)<1e-8);assert.equal(t.p.routeWalker,walker);assert.equal(t.p.walkRoute.id,job);assert.equal(t.p.walkRoute.status,'walking');
 }
 t.send('input',{x:0,z:0,attack:false,run:false});t.step(30);assert.equal(t.p.walkRoute.run,true);assert.equal(t.p.world.player.running,true);
 t.send('input',{x:-1,z:0,attack:false,run:false});assert.equal(t.p.walkRoute.status,'cancelled');t.step();assert.equal(t.p.world.player.running,false);
});

test('closed server policy, forged pace, stale route IDs and duplicate arrival cannot enable running',()=>{
 const t=fixture({runEnabled:false});assert.equal(t.realm.snapshot(t.p).self.walkRunSchema,0);
 for(const run of ['true',1,null,{}])assert.equal(t.send('walkTo',{id:'forged-run-153',mapId:map.id,x:10,z:0,run}),false);
 t.send('walkTo',{id:'gated-run-153',mapId:map.id,x:10,z:0,run:true});assert.equal(t.p.walkRoute.run,false);
 t.send('walkPace',{id:'gated-run-153',run:true});t.step();assert.equal(t.p.world.player.running,false);
 for(const run of ['true',1,null,{}])assert.equal(t.send('walkPace',{id:'gated-run-153',run}),false);
 assert.equal(t.send('walkPace',{id:'different-run-153',run:true}),false);t.step(70);assert.equal(t.p.walkRoute.status,'arrived');assert.equal(t.send('walkPace',{id:'gated-run-153',run:true}),false);
});

test('saved running destinations resume with the authoritative gate after reconnect',()=>{
 const t=fixture();t.send('walkTo',{id:'saved-sprint-153',mapId:map.id,x:60,z:0,run:true});t.step(20);const saved=t.realm.record(t.p,{character:t.p.character});assert.equal(saved.walkRoute.run,true);
 for(const runEnabled of [true,false]){const next=fixture({record:saved,runEnabled});assert.equal(next.p.walkRoute.run,runEnabled);const x=next.p.world.player.x;next.step(10);assert.ok(next.p.world.player.x>x);assert.equal(next.p.world.player.running,runEnabled);}
});

test('a fast rogue lands exactly at a small-radius goal instead of bouncing across it indefinitely',()=>{
 const t=fixture({classId:'rogue'});t.send('walkTo',{id:'small-goal-153',mapId:map.id,x:10.15,z:0,radius:.18,run:true});t.step(60);assert.equal(t.p.walkRoute.status,'arrived');assert.ok(Math.abs(t.p.world.player.x-10.15)<=.18);assert.equal(t.p.world.player.running,false);
});

test('grid paths retain turns without losing a sprint stride at every metre',()=>{
 const nav={zones:[{x:-5,z:-5,w:50,d:22}],obstacles:[{x:8,z:-5,w:1,d:9},{x:17,z:0,w:1,d:17},{x:26,z:-5,w:1,d:9}],props:[]},config={...map,nav},goal={x:36,z:0},path=planRoute(map.spawn,goal,nav);assert.ok(path&&path.length<18,JSON.stringify(path));
 for(const fps of [10,15,30,60,144]){
  let now=1000;const realm=new RealmServer({catalog:{capital:config.id,maps:[config]},now:()=>now,runEnabled:true}),p=realm.join({uid:'corner-runner',serverId:'server-1',slotId:'slot-1',record:{character:{name:'CornerRunner',gender:'male',classId:'rogue'},state:{...initialSave(),mapId:config.id,position:{x:0,z:0}}},send(){}}),own=new CombatWorld({...config,classId:'rogue'}),walker=createRouteWalker(()=>nav),queue=[];
  realm.receive(p.id,{type:'walkTo',seq:1,id:'corner-sprint-153',mapId:config.id,...goal,run:true});let arrived=false;walker.go(goal,{onArrive:()=>arrived=true});let clock=0,tick=0,snapshot={x:0,z:0,moving:false},jumps=0;
  for(let frame=0;frame<fps*18;frame++){
   const time=frame/fps;while(clock+.05<=time+1e-9){clock+=.05;now+=50;realm.step(.05);if(++tick%2===0)queue.push({due:clock+.22,state:{...realm.snapshot(p).self.player,status:p.walkRoute.status}});}while(queue.length&&queue[0].due<=time)snapshot=queue.shift().state;
   let remaining=1/fps;const before={x:own.player.x,z:own.player.z};while(remaining>1e-8){const dt=Math.min(.05,remaining),dir=walker.step(own.player,dt,own.walkSpeed(true)*dt)??{x:0,z:0};predictMove(own,snapshot,dt,{...dir,run:true},{pendingStop:arrived&&snapshot.status==='walking',inputAge:.35});remaining-=dt;}
   if(Math.hypot(own.player.x-before.x,own.player.z-before.z)>own.walkSpeed(true)/fps+.2)jumps++;
  }
  assert.equal(jumps,0,'no waypoint correction at '+fps+' fps');assert.equal(p.walkRoute.status,'arrived');assert.ok(Math.hypot(own.player.x-p.world.player.x,own.player.z-p.world.player.z)<.01);
 }
});

test('sustained and toggled route running does not rubber-band at 10/15/20/30/60/144 fps with latency and buffered snapshots',t=>{
 for(const classId of ['shaman','rogue'])for(const fps of [10,15,20,30,60,144])for(const latency of [.03,.1,.2]){
  let time=0;t.mock.method(performance,'now',()=>time*1000);const s=fixture({classId}),own=new CombatWorld({...map,classId}),walker=createRouteWalker(()=>map.nav),inbound=[],outbound=[];
  const client=new MultiplayerClient({url:'ws://unused',identity:async()=>({})});client.status='online';client.socket={readyState:1,send:raw=>inbound.push({at:time+latency,...JSON.parse(raw)})};
  let predictedArrival=false;client.command('walkTo',{id:'lagged-run-153',mapId:map.id,x:65,z:0,run:true});walker.go({x:65,z:0},{onArrive:()=>predictedArrival=true});let serverClock=0,tick=0,snapshot={x:0,z:0,moving:false,inputAck:0},previousRun=true,jumps=[];
  for(let frame=0;frame<fps*15;frame++){
   time=frame/fps;const run=!(time>=2.5&&time<4);if(run!==previousRun){client.command('walkPace',{id:'lagged-run-153',run});previousRun=run;}
   client.setInput({x:0,z:0,attack:false,run:false});
   while(serverClock+.05<=time+1e-9){serverClock+=.05;while(inbound.length&&inbound[0].at<=serverClock+1e-9){const {at,...m}=inbound.shift();s.realm.receive(s.p.id,m);}s.step();tick++;if(tick%2===0)outbound.push({at:serverClock+latency+.12,state:{...s.realm.snapshot(s.p).self.player,inputAck:s.p.appliedInputSeq,routeStatus:s.p.walkRoute?.status}});}
   while(outbound.length&&outbound[0].at<=time)snapshot=outbound.shift().state;
   const before=own.player.x,dir=walker.step(own.player,1/fps,own.walkSpeed(run)/fps)??{x:0,z:0};predictMove(own,snapshot,1/fps,{...dir,run},{pendingStop:predictedArrival&&snapshot.routeStatus==='walking',inputAge:client.inputAge(snapshot.inputAck)});if(own.player.x<before-.2)jumps.push({time,before,after:own.player.x,snapshot,dir});
  }
  assert.deepEqual(jumps,[],JSON.stringify({classId,fps,latency,jumps}));assert.equal(s.p.walkRoute.status,'arrived');assert.ok(Math.abs(own.player.x-s.p.world.player.x)<.003);t.mock.restoreAll();
 }
});

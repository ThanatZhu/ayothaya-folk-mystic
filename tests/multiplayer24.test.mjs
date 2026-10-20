import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {WebSocket} from 'ws';
import {RealmServer} from '../server/realm.js';
import {LocalStore,FirebaseStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {CLASSES,NOVICE} from '../classes.js';
import {MONSTER_TYPES,TOWN_PACE} from '../combat-core.js';
const tempRoot=path.resolve('.local-multiplayer');
await mkdir(tempRoot,{recursive:true});
async function cleanup(directory){assert.ok(path.resolve(directory).startsWith(tempRoot+path.sep));await rm(directory,{recursive:true,force:true});}
const map={id:'ayutthaya',safe:true,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[1,0,0]]};
const catalog={capital:map.id,maps:[map]};
function fixture({safe=true,capacity=50}={}){
 let time=10000;const realm=new RealmServer({catalog:{...catalog,maps:[{...map,safe}]},capacity,now:()=>time});
 const add=(uid,id='novice',serverId='server-1')=>{const messages=[],peer=realm.join({uid,serverId,slotId:'slot-1',record:{character:{name:uid,gender:'male',classId:id},state:initialSave()},send:m=>messages.push(m)});return {peer,messages};};
 const send=(p,type,data={})=>{time+=100;return realm.receive(p.id,{type,seq:p.seq+1,...data});};
 const step=(n=1)=>{for(let i=0;i<n;i++){time+=50;realm.step(.05);}};
 return {realm,add,send,step,advance:n=>time+=n};
}
test('rooms isolate realms; snapshots never expose UID, auth or another server',()=>{
 const {realm,add,step}=fixture();const a=add('userAlpha'),b=add('userBeta'),c=add('userGamma','novice','server-2');step(2);
 assert.equal(realm.snapshot(a.peer).players.length,1);assert.equal(realm.snapshot(c.peer).players.length,0);assert.equal(realm.snapshot(a.peer).players[0].id,b.peer.id);assert.equal(realm.snapshot(a.peer).players[0].player.maxHp,140);
 for(const p of realm.snapshot(a.peer).players){assert.equal(p.uid,undefined);assert.equal(p.token,undefined);assert.equal(p.slotId,undefined);}
 assert.throws(()=>add('userAlpha'),/already-online/);realm.leave(b.peer.id);assert.equal(realm.snapshot(a.peer).players.length,0);
});
test('server movement clamps speed, stops stale inputs and ignores position/XP forgery',()=>{
 const {realm,add,send,step}=fixture();const {peer:p}=add('playerOne');
 send(p,'input',{x:1,z:1,attack:false,baseXp:999999,position:{x:999,z:999}});step(4);
 assert.ok(Math.hypot(p.world.player.x,p.world.player.z)<=p.world.profession.speed*(p.world.safe?TOWN_PACE:1)*.2+.001);assert.equal(p.world.baseXp,0);
 step(10);const {x,z}=p.world.player;step(5);assert.deepEqual({x:p.world.player.x,z:p.world.player.z},{x,z});
 assert.equal(send(p,'input',{x:Infinity,z:0,attack:false}),false);assert.equal(send(p,'reward',{amount:999}),false);
 const seq=p.seq;assert.equal(realm.receive(p.id,{type:'input',seq,x:1,z:0,attack:true}),false);
});
test('safe cities cannot spawn or attack monsters and reject invalid skill slots',()=>{
 const {add,send}=fixture();const {peer:p}=add('playerOne');assert.equal(p.world.mobs.length,0);
 assert.equal(send(p,'skill',{index:0}),false);assert.equal(p.world.player.mp,100);assert.equal(send(p,'skill',{index:100}),false);
 assert.equal(send(p,'skill',{index:4}),true);assert.ok(p.world.player.mp<100);assert.equal(send(p,'skill',{index:4}),false);
});
test('all professions use server-authorized skills against the same shared monster',()=>{
 for(const c of [NOVICE,...CLASSES]){
  const {realm,add,send,step}=fixture({safe:false});const a=add('playerOne',c.id),b=add('playerTwo');assert.equal(a.peer.world.mobs,b.peer.world.mobs);
  const hp=a.peer.world.mobs[0].hp;send(a.peer,'select',{target:0});send(a.peer,'skill',{index:0});step(2);
  // snapshots carry only changed monster fields: merge what playerTwo received, as the client does
  const seen=Object.assign({},...b.messages.flatMap(m=>m.mobs??m.snapshot?.mobs??[]).filter(m=>m.id===0));
  assert.ok(seen.hp<hp,c.id);assert.equal(seen.hp,a.peer.world.mobs[0].hp);
  assert.ok(b.messages.some(m=>m.events?.some(e=>e.type==='cast'&&e.actor===a.peer.id)),c.id);
 }
});
test('party acceptance, private chat, transfer and kick require membership/leadership',()=>{
 const {realm,add,send,advance}=fixture();const a=add('playerOne'),b=add('playerTwo'),c=add('playerThree');
 send(a.peer,'invite',{target:b.peer.id});const invite=b.messages.find(m=>m.type==='invite');
 assert.equal(send(c.peer,'answer',{invite:invite.id,accept:true}),false);assert.equal(send(b.peer,'answer',{invite:invite.id,accept:true}),true);
 assert.equal(a.peer.partyId,b.peer.partyId);send(a.peer,'chat',{channel:'party',text:'hello team'});
 assert.ok(b.messages.some(m=>m.type==='chat'&&m.text==='hello team'));assert.ok(!c.messages.some(m=>m.type==='chat'));
 assert.equal(send(b.peer,'kick',{target:a.peer.id}),false);send(a.peer,'leader',{target:b.peer.id});assert.equal(realm.parties.get(a.peer.partyId).leader,b.peer.id);
 send(b.peer,'kick',{target:a.peer.id});assert.equal(a.peer.partyId,null);assert.equal(b.peer.partyId,null);assert.equal(realm.parties.size,0);
 advance(3000);send(a.peer,'invite',{target:c.peer.id});const expired=c.messages.find(m=>m.type==='invite');advance(31000);assert.equal(send(c.peer,'answer',{invite:expired.id,accept:true}),false);
});
test('party XP rewards are awarded once, split without inflation, and exclude distant members',()=>{
 const {realm,add,send,advance}=fixture({safe:false});const a=add('playerOne'),b=add('playerTwo'),far=add('playerFar');
 for(const target of [b,far]){advance(2100);send(a.peer,'invite',{target:target.peer.id});const invite=target.messages.findLast(m=>m.type==='invite');send(target.peer,'answer',{invite:invite.id,accept:true});}
 Object.assign(far.peer.world.player,{x:-19,z:-19});const mob=a.peer.world.mobs[0];a.peer.world.hurt(mob,100);a.peer.world.hurt(mob,100);
 assert.equal(a.peer.world.baseXp+b.peer.world.baseXp,MONSTER_TYPES[0].baseXp);assert.equal(a.peer.world.jobXp+b.peer.world.jobXp,MONSTER_TYPES[0].jobXp);assert.equal(far.peer.world.baseXp,0);
 assert.equal(a.peer.world.kills,1);assert.equal(b.peer.world.kills,1);assert.equal(realm.snapshot(b.peer).mobs.find(m=>m.id===0).hp,0);
});
test('chat and command floods are bounded; empty/oversized text rejected',()=>{
 const {realm,add,send}=fixture();const {peer:p}=add('playerOne');
 assert.equal(send(p,'chat',{channel:'room',text:'x'.repeat(241)}),false);assert.equal(send(p,'chat',{channel:'room',text:'   '}),false);
 assert.equal(send(p,'chat',{channel:'room',text:'hello'}),true);assert.equal(send(p,'chat',{channel:'room',text:'again'}),false);
 let accepted=0;for(let i=0;i<100;i++)if(realm.receive(p.id,{type:'input',seq:p.seq+1,x:0,z:0,attack:false}))accepted++;assert.ok(accepted<=40);
});
test('room capacity is enforced and disconnect frees a slot',()=>{
 const {realm,add}=fixture({capacity:2});const a=add('playerOne');add('playerTwo');assert.throws(()=>add('playerThree'),/room-full/);realm.leave(a.peer.id);assert.doesNotThrow(()=>add('playerThree'));
});
test('short disconnect retains party and peer identity; expiry removes ghost players',()=>{
 const {realm,add,send,advance,step}=fixture();const a=add('playerOne'),b=add('playerTwo');send(a.peer,'invite',{target:b.peer.id});send(b.peer,'answer',{invite:b.messages.find(m=>m.type==='invite').id,accept:true});
 const party=b.peer.partyId,id=b.peer.id;realm.suspend(id);assert.equal(send(b.peer,'input',{x:1,z:0,attack:false}),false);
 const resumed=add('playerTwo');assert.equal(resumed.peer.id,id);assert.equal(resumed.peer.partyId,party);
 realm.suspend(id);advance(21000);step();assert.equal(realm.peers.has(id),false);assert.equal(a.peer.partyId,null);
});

// Transaction harness tests adapter invariants; it does not substitute for deployed Rules tests.
function transactionDB(){
 const docs=new Map();let queue=Promise.resolve();
 const ref=name=>({path:name,collection:part=>({doc:id=>ref(name+'/'+part+'/'+id)})});
 return {docs,collection:name=>({doc:id=>ref(name+'/'+id),get:async()=>({docs:[...docs].filter(([k])=>k.startsWith(name+'/')&&k.split('/').length===2).map(([,v])=>({data:()=>structuredClone(v)}))})}),runTransaction(fn){const task=queue.then(async()=>{const writes=[];const tx={get:async r=>({exists:docs.has(r.path),data:()=>structuredClone(docs.get(r.path))}),set:(r,d)=>writes.push(()=>docs.set(r.path,structuredClone(d))),update:(r,d)=>writes.push(()=>docs.set(r.path,{...docs.get(r.path),...structuredClone(d)})),delete:r=>writes.push(()=>docs.delete(r.path))};const result=await fn(tx);writes.forEach(f=>f());return result;});queue=task.catch(()=>{});return task;}};
}
test('cloud adapter fences runtime and account leases; refuses legacy save races',async()=>{
 const db=transactionDB(),a=new FirebaseStore(db),b=new FirebaseStore(db),identity={uid:'google-user',serverId:'server-1',slotId:'slot-1'},row={serverId:'server-1',revision:1,character:{name:'ผู้ทดสอบ',gender:'female',classId:'novice'},state:initialSave()};
 db.docs.set('players/google-user/characters/slot-1',row);await a.renewAuthority();await assert.rejects(b.renewAuthority(),/another-authority/);
 const session=await a.acquire(identity,'lease-one');await assert.rejects(a.acquire(identity,'lease-two'),/already-online/);
 session.record.state.traveler.baseXp=200;await a.checkpoint(session,session.record);assert.equal(db.docs.get('players/google-user/characters/slot-1').state.traveler.baseXp,200);
 db.docs.get('players/google-user/characters/slot-1').revision++;await assert.rejects(a.checkpoint(session,session.record),/save-conflict/);
 await a.releaseAuthority();await b.renewAuthority();await assert.rejects(a.checkpoint(session,session.record),/authority-lost/);
});
test('private online XP and professions ignore later client claims; teacher quest stays private',async()=>{
 const db=transactionDB(),store=new FirebaseStore(db),identity={uid:'google-user',serverId:'server-1',slotId:'slot-1'},ref='players/google-user/characters/slot-1';
 db.docs.set(ref,{serverId:'server-1',revision:1,character:{name:'ผู้ทดสอบ',gender:'female',classId:'novice'},state:initialSave()});await store.renewAuthority();
 let s=await store.acquire(identity,'first');s.record.state.traveler.baseXp=100;await store.checkpoint(s,s.record,{release:true});
 db.docs.get(ref).state.traveler.baseXp=900000;s=await store.acquire(identity,'second');assert.equal(s.record.state.traveler.baseXp,100);await store.checkpoint(s,s.record,{release:true});
 db.docs.get(ref).character.classId='shaman';s=await store.acquire(identity,'third');assert.equal(s.record.character.classId,'novice');s.record.training={classId:'boxer',tier:'class',startKills:3};await store.checkpoint(s,s.record,{release:true});assert.equal(db.docs.get(ref).training,undefined);s=await store.acquire(identity,'fourth');assert.equal(s.record.training.startKills,3);
});
test('cloud equipment stays private, persists and ignores a later client mirror claim',async()=>{
 const db=transactionDB(),store=new FirebaseStore(db),identity={uid:'gear-user',serverId:'server-1',slotId:'slot-1'},ref='players/gear-user/characters/slot-1';
 db.docs.set(ref,{serverId:'server-1',revision:1,character:{name:'ลองอุปกรณ์',gender:'female',classId:'novice'},state:initialSave()});await store.renewAuthority();
 const first=await store.acquire(identity,'first');first.record.equipment={version:1,weapon:'novice-weapon-crafted',outfit:'novice-outfit-crimson'};await store.checkpoint(first,first.record,{release:true});
 assert.equal(db.docs.get(ref).equipment,undefined);
 db.docs.get(ref).equipment={version:1,weapon:'swordsman-weapon-crafted',outfit:'swordsman-outfit-ivory'};
 const next=await store.acquire(identity,'next');assert.deepEqual(next.record.equipment,first.record.equipment);
});
test('local persistence fences stale sessions and survives process restart',async()=>{
 const directory=await mkdtemp(path.join(tempRoot,'test-mp-'));
 try{const store=await new LocalStore(directory).init(),created=await store.createLocal({name:'ทดสอบเซฟ'}),identity={uid:created.uid,serverId:'server-1',slotId:'slot-1'},session=await store.acquire(identity,'first');
  await assert.rejects(store.acquire(identity,'second'),/already-online/);session.record.state.traveler.baseXp=123;await store.checkpoint(session,session.record,{release:true});
  const next=await store.acquire(identity,'second');await assert.rejects(store.checkpoint(session,session.record),/session-lost/);await store.checkpoint(next,next.record,{release:true});
  const restarted=await new LocalStore(directory).init();assert.equal(restarted.verifyLocal(created.token),created.uid);assert.equal((await restarted.acquire(identity,'third')).record.state.traveler.baseXp,123);
 }finally{await cleanup(directory);}
});
test('real WebSocket clients join, exchange chat, reconnect and reject unauthorized origins',async()=>{
 const directory=await mkdtemp(path.join(tempRoot,'test-ws-')),origin='http://127.0.0.1:8870',store=await new LocalStore(directory).init();
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const port=host.server.address().port,clients=[];
 const open=async token=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/realtime`,{origin}),messages=[];clients.push(ws);ws.on('message',m=>messages.push(JSON.parse(m)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({type:'join',token,serverId:'server-1',slotId:'slot-1'}));return {ws,messages};};
 const wait=async(predicate)=>{for(let n=0;n<100;n++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}assert.fail('timed out');};
 try{
  const first=await store.createLocal({name:'คนแรก'}),second=await store.createLocal({name:'คนที่สอง'}),a=await open(first.token),b=await open(second.token);await wait(()=>a.messages.some(m=>m.type==='welcome')&&b.messages.some(m=>m.type==='welcome'));
  a.ws.send(JSON.stringify({type:'chat',seq:1,channel:'room',text:'hello socket'}));await wait(()=>b.messages.some(m=>m.text==='hello socket'));
  const invalid=await open('wrong');await wait(()=>invalid.messages.some(m=>m.type==='error'));assert.equal(invalid.messages.find(m=>m.type==='error').code,'authentication-failed');
  a.ws.send(JSON.stringify({type:'save',id:'settings',settings:{zoom:2,azimuth:1,motion:false},baseXp:99999}));await wait(()=>a.messages.some(m=>m.type==='saved'&&m.id==='settings'));
  const saved=store.rows.get(first.uid);assert.equal(saved.state.settings.zoom,2);assert.equal(saved.state.traveler.baseXp,0);
  a.ws.send(JSON.stringify({type:'save',id:'second-save'}));await wait(()=>a.messages.some(m=>m.type==='saved'&&m.id==='second-save'));
  a.ws.send(JSON.stringify({type:'leave',id:'leave'}));await wait(()=>a.messages.some(m=>m.type==='left'));await wait(()=>host.realm.peers.size===1);
  const again=await open(first.token);await wait(()=>again.messages.some(m=>m.type==='welcome'));assert.equal(host.realm.peers.size,2);
  const bad=new WebSocket(`ws://127.0.0.1:${port}/realtime`,{origin:'https://untrusted.example'});await new Promise(resolve=>bad.once('error',resolve));assert.notEqual(bad.readyState,WebSocket.OPEN);
 }finally{for(const ws of clients)ws.terminate();await host.close();await cleanup(directory);}
});
test('replacement firebase host waits for the old authority instead of crashing, then takes over',async()=>{
 const db=transactionDB(),old=new FirebaseStore(db),next=new FirebaseStore(db),origin='https://ayothaya-folk-mystic.vercel.app';await old.renewAuthority();
 const host=await createHost({mode:'firebase',store:next,catalog,origins:[origin],authenticate:async()=>{throw new Error('unused');}});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const port=host.server.address().port;
 const health=async()=>(await fetch(`http://127.0.0.1:${port}/health`)).json();
 try{
  assert.equal((await health()).authority,false);
  const status=await new Promise(resolve=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/realtime`,{origin});ws.on('unexpected-response',(req,res)=>resolve(res.statusCode));ws.on('open',()=>{ws.terminate();resolve(101);});ws.on('error',()=>{});});
  assert.equal(status,503);
  await old.releaseAuthority();let taken=false;for(let i=0;i<70&&!taken;i++){await new Promise(r=>setTimeout(r,100));taken=(await health()).authority;}
  assert.equal(taken,true);
 }finally{await host.close();}
});
test('server simulation keeps pace with real time even when timers fire late',async()=>{
 const directory=await mkdtemp(path.join(tempRoot,'test-clock-')),store=await new LocalStore(directory).init();
 const host=await createHost({mode:'local',store,catalog,origins:['http://127.0.0.1:8870']});
 try{const start=host.realm.clock,began=performance.now();await new Promise(r=>setTimeout(r,1500));const real=(performance.now()-began)/1000,simulated=host.realm.clock-start;
  assert.ok(Math.abs(simulated-real)<.12,`simulated ${simulated.toFixed(3)}s vs real ${real.toFixed(3)}s`);
 }finally{await host.close();await cleanup(directory);}
});

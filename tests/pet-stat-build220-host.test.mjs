import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';import {petAccountAction} from '../pet-account.js';import {RealmServer} from '../server/realm.js';
const nav={zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},map={id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]};
const message=(ws,fn)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',receive);reject(Error('timeout'));},8000);function receive(raw){const m=JSON.parse(raw);if(fn(m)){clearTimeout(timer);ws.off('message',receive);resolve(m);}}ws.on('message',receive);});
test('host persists a character-wide S build before ack, rejects combat/forged stats, and replays the exact request even in combat',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ayothaya-pet-build-')),store=await new LocalStore(dir).init(),who=await store.createLocal({name:'BuildTest'});
 let s=petAccountAction(null,{type:'petGrant',pet:'garuda-dawn',gems:500,requestId:'grant-0001'}).state;s=petAccountAction(s,{type:'petEquip',pet:'garuda-dawn',requestId:'equip-0001'}).state;
 store.rows.get(who.uid).petCollection=s;store.rows.get(who.uid).state.mapId='field';
 const origins=['http://localhost'],host=await createHost({mode:'local',store,catalog:{capital:'field',maps:[map]},origins,serveStatic:false,prologue:false});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const socket=new WebSocket('ws://127.0.0.1:'+host.server.address().port+'/realtime',{origin:'http://localhost'});let seq=0;
 try{
  await new Promise(r=>socket.once('open',r));let reply=message(socket,m=>m.type==='welcome');socket.send(JSON.stringify({type:'join',token:who.token,serverId:'server-1',slotId:'slot-1'}));const welcome=await reply,p=host.realm.peers.get(welcome.id);
  const send=async(id,stats)=>{const pending=message(socket,m=>['petChanged','petError'].includes(m.type)&&m.id===id);socket.send(JSON.stringify({type:'petStatBuild',id,stats,seq:++seq,bonus:{str:99999}}));return pending;};
  const health=await fetch('http://127.0.0.1:'+host.server.address().port+'/health').then(r=>r.json());assert.equal(health.petStatBuild,1);
  const result=await send('build-0001',['agi','luk','str']);assert.equal(result.type,'petChanged');assert.deepEqual(result.petCollection.statBuild.stats,['agi','luk','str']);
  assert.deepEqual(store.rows.get(who.uid).petCollection.statBuild.stats,['agi','luk','str'],'durable before acknowledgment');assert.equal(result.petCollection.balance,500);assert.equal(p.derived.total.agi,5);
  p.world.auto=true;const denied=await send('build-0002',['int','vit','dex']);assert.equal(denied.code,'pet-build-combat');assert.deepEqual(p.petCollection.statBuild.stats,['agi','luk','str']);
  const replay=await send('build-0001',['agi','luk','str']);assert.equal(replay.replayed,true);assert.deepEqual(replay.petCollection.statBuild.stats,['agi','luk','str']);
  p.world.auto=false;const bad=await send('build-0003',['str','str','vit']);assert.equal(bad.code,'bad-pet-build');assert.equal(store.rows.get(who.uid).petCollection.balance,500);
  const coldStore=await new LocalStore(dir).init(),saved=coldStore.rows.get(who.uid);const coldRealm=new RealmServer({catalog:{capital:'field',maps:[map]}}),cold=coldRealm.join({uid:who.uid,serverId:'server-1',slotId:'slot-1',record:saved,send(){}});assert.deepEqual(cold.petCollection.statBuild.stats,['agi','luk','str']);assert.equal(cold.derived.total.agi,5);
  const other=await store.createLocal({name:'OtherBuild'});assert.equal(store.rows.get(other.uid).petCollection?.statBuild,undefined,'another character is independent');
  const record=host.realm.record(p,store.rows.get(who.uid));assert.deepEqual(record.petCollection.statBuild.stats,['agi','luk','str']);assert.equal(record.stats.agi,1,'raw player allocations stay untouched');
 }finally{socket.close();await host.close();await rm(dir,{recursive:true,force:true});}
});

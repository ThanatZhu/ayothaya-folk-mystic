// 0.114.2 audit hardening: per-address socket caps.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
test('one address can hold at most 10 unauthenticated sockets; another address is unaffected',async()=>{
 const base=path.resolve('.local-multiplayer');await mkdir(base,{recursive:true});const directory=await mkdtemp(path.join(base,'harden114-')),store=await new LocalStore(directory).init(),origin='http://127.0.0.1:8872';
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const open=ip=>new Promise(r=>{const ws=new WebSocket(`ws://127.0.0.1:${host.server.address().port}/realtime`,{headers:{origin,'do-connecting-ip':ip}});ws.on('open',()=>r(ws));ws.on('error',()=>r(null));});
 const socks=[];
 try{
  for(let i=0;i<10;i++)socks.push(await open('203.0.113.7'));
  assert.ok(socks.every(Boolean));assert.equal(await open('203.0.113.7'),null);
  const other=await open('198.51.100.2');assert.ok(other);socks.push(other);
  socks[0].close();await new Promise(r=>setTimeout(r,100));const again=await open('203.0.113.7');assert.ok(again);socks.push(again);
 }finally{for(const s of socks)s?.terminate();await host.close();await rm(directory,{recursive:true,force:true});}
});
test('mail actions that change nothing do not write to the store',async()=>{
 const base=path.resolve('.local-multiplayer');await mkdir(base,{recursive:true});const directory=await mkdtemp(path.join(base,'harden114-')),store=await new LocalStore(directory).init(),c=await store.createLocal({name:'NoWrite'});
 const origins=[],host=await createHost({mode:'local',store,catalog,origins});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+host.server.address().port;origins.push(origin);
 let writes=0;const real=store.checkpoint.bind(store);store.checkpoint=(...a)=>{writes++;return real(...a);};
 const ws=new WebSocket(origin.replace('http','ws')+'/realtime',{origin});const msgs=[];ws.on('message',d=>msgs.push(JSON.parse(d)));
 const until=async f=>{for(let i=0;i<100;i++){const m=msgs.find(f);if(m)return m;await new Promise(r=>setTimeout(r,50));}throw Error('timeout');};
 try{
  await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',token:c.token,serverId:'server-1',slotId:'slot-1'}));const welcome=await until(m=>m.type==='welcome');
  ws.send(JSON.stringify({type:'save',id:'s1'}));await until(m=>m.type==='saved'&&m.id==='s1');const first=writes;assert.ok(first>=1);
  let seq=host.realm.peers.get(welcome.id).seq;
  for(const id of ['m1','m2'])ws.send(JSON.stringify({type:'mailDeleteAll',id,seq:++seq}));await until(m=>m.id==='m2'&&/^mail/.test(m.type));assert.equal(writes,first);
 }finally{ws.terminate();await host.close();await rm(directory,{recursive:true,force:true});}
});
test('shutdown saves players before shops, bosses and logs',async()=>{
 const base=path.resolve('.local-multiplayer');await mkdir(base,{recursive:true});const directory=await mkdtemp(path.join(base,'harden114-')),store=await new LocalStore(directory).init(),c=await store.createLocal({name:'Shutdown'});
 const origins=[],host=await createHost({mode:'local',store,catalog,origins});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+host.server.address().port;origins.push(origin);
 const order=[],cp=store.checkpoint.bind(store),logs=store.saveDashboardLogs.bind(store);
 const ws=new WebSocket(origin.replace('http','ws')+'/realtime',{origin});const msgs=[];ws.on('message',d=>msgs.push(JSON.parse(d)));
 try{
  await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',token:c.token,serverId:'server-1',slotId:'slot-1'}));
  for(let i=0;i<100&&!msgs.some(m=>m.type==='welcome');i++)await new Promise(r=>setTimeout(r,50));
  store.checkpoint=async(...a)=>{order.push('player');return cp(...a);};store.saveDashboardLogs=async(...a)=>{order.push('logs');return logs(...a);};
  await host.close();assert.deepEqual(order,['player','logs']);assert.equal(store.rows.get(c.uid).state.mapId,'ayutthaya');
 }finally{ws.terminate();await rm(directory,{recursive:true,force:true});}
});

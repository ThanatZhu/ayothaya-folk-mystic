import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
import {levelStart,XP_CURVE} from '../experience.js';import {characterLevels} from '../admin-levels.js';
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},catalog={capital:'f',maps:[{id:'f',name:'Field',safe:false,nav,spawn:{x:0,z:0},mobs:[],npcs:[]}]};
test('admin level endpoint persists online/offline EXP, refreshes snapshots, respects caps and safely retries or fails a write',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayo-admin-levels-')),store=await new LocalStore(directory).init();
 const account=await store.createLocal({name:'LevelTester'}),other=await store.createLocal({name:'OfflineTester'});
 for(const a of [account,other]){const r=store.rows.get(a.uid);r.xpCurve=XP_CURVE;r.state.mapId='f';}
 await store.flush();const host=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost']}),sockets=[];await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;
 t.after(async()=>{sockets.forEach(ws=>ws.terminate());await host.close();if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep))await rm(directory,{recursive:true,force:true});});
 const post=async(body,origin='http://localhost')=>{const r=await fetch(base+'/admin/levels',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
 assert.equal((await post({peer:'anything',baseLevel:5},'https://bad.example')).status,403);
 const off='off:'+other.uid+':slot-1';let r=await post({peer:off,baseLevel:12,jobLevel:10});assert.equal(r.status,200);assert.equal(r.level,12);assert.equal(r.jobLevel,10);assert.equal(store.rows.get(other.uid).state.traveler.baseXp,levelStart(12));
 r=await post({peer:off,baseLevel:12,jobLevel:10});assert.equal(r.changed,false);assert.equal(store.rows.get(other.uid).mailbox.messages.length,1);
 assert.equal((await post({peer:off,jobLevel:11})).error,'bad-level');assert.equal((await post({peer:off,baseLevel:100})).error,'bad-level');
 async function connect(){const ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:'http://localhost'});sockets.push(ws);const queue=[],waiters=[];ws.on('message',raw=>{const m=JSON.parse(raw),i=waiters.findIndex(w=>w.check(m));if(i<0)queue.push(m);else{const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(m);}});
  const get=check=>new Promise((resolve,reject)=>{const i=queue.findIndex(check);if(i>=0)return resolve(queue.splice(i,1)[0]);const w={check,resolve,timer:setTimeout(()=>reject(Error('timeout')),8000)};waiters.push(w);});
  await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',token:account.token,serverId:'server-1',slotId:'slot-1'}));const welcome=await get(m=>m.type==='welcome');return {ws,get,peer:welcome.id};}
 const a=await connect();assert.equal((await post({peer:'off:'+account.uid+':slot-1',baseLevel:20})).error,'player-online');
 const originalCheckpoint=store.checkpoint.bind(store);let duringWrite=false;
 store.checkpoint=async(session,record,options)=>{if(record.state.traveler.baseXp===levelStart(20)){duringWrite=true;const peer=host.realm.peers.get(a.peer);assert.equal(peer.suspended,true);assert.notEqual(peer.world.baseXp,levelStart(20),'live level not applied before durable save');await new Promise(r=>setTimeout(r,120));}return originalCheckpoint(session,record,options);};
 r=await post({peer:a.peer,baseLevel:20,jobLevel:10});assert.equal(r.status,200);assert.ok(duringWrite);const peer=host.realm.peers.get(a.peer);assert.equal(peer.suspended,false);assert.equal(peer.world.baseXp,levelStart(20));assert.equal(characterLevels(store.rows.get(account.uid)).jobLevel,10);
 const snapshot=await a.get(m=>m.type==='snapshot'&&m.self.baseXp===levelStart(20));assert.equal(snapshot.self.skillPoints,9);assert.ok(snapshot.self.statPoints>0);
 await new Promise(r=>setTimeout(r,100));assert.equal(peer.mailbox.messages.filter(m=>m.id.startsWith('admin-level-')).length,1,'normal level event must not grant the same milestone rewards again');
 r=await post({peer:a.peer,baseLevel:20,jobLevel:10});assert.equal(r.changed,false);assert.equal(peer.mailbox.messages.length,1);
 const list=await (await fetch(base+'/admin/players?fresh=1',{headers:{origin:'http://localhost'}})).json();assert.equal(list.players.find(p=>p.id===a.peer).jobCap,10);assert.equal(list.players.find(p=>p.id===a.peer).jobLevel,10);
 const before=structuredClone(store.rows.get(account.uid));store.checkpoint=async(session,record,options)=>{if(record.state.traveler.baseXp===levelStart(21))throw Error('injected-level-save-failure');return originalCheckpoint(session,record,options);};
 r=await post({peer:a.peer,baseLevel:21});assert.equal(r.status,400);assert.equal(r.error,'injected-level-save-failure');assert.equal(store.rows.get(account.uid).state.traveler.baseXp,before.state.traveler.baseXp);store.checkpoint=originalCheckpoint;
});

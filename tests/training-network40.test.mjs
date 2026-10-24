import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {TRIAL} from '../city-life-data.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
test('online teacher uses authoritative level, position and kills; persists quest and releases the session only after class save',async()=>{
 const base=path.resolve('.local-multiplayer');await mkdir(base,{recursive:true});const directory=await mkdtemp(path.join(base,'training40-')),store=await new LocalStore(directory).init(),origin='http://127.0.0.1:8871';
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const port=host.server.address().port,clients=[];
 const wait=async predicate=>{for(let i=0;i<150;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}assert.fail('Timed out');};
 const open=async token=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/realtime`,{origin}),messages=[];clients.push(ws);ws.on('message',v=>messages.push(JSON.parse(v)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({type:'join',token,serverId:'server-1',slotId:'slot-1'}));await wait(()=>messages.some(m=>m.type==='welcome'));return {ws,messages};};
 try{
  const dev=await store.createLocal({name:'ทดสอบลานครู'}),a=await open(dev.token),peer=[...host.realm.peers.values()][0];
  const send=(id,action,extra={})=>{a.ws.send(JSON.stringify({type:'train',id,mentor:'box-master',action,...extra}));};
  send('forged','accept',{position:{x:48,z:-55},baseXp:9900,kills:1000});await wait(()=>a.messages.some(m=>m.id==='forged'));assert.equal(a.messages.find(m=>m.id==='forged').code,'trainer-distance');
  Object.assign(peer.world.player,{x:51,z:-46.5});peer.world.baseXp=2856;peer.world.jobXp=1260;peer.world.kills=10;peer.stats={str:20,agi:12,vit:7,int:1,dex:6,luk:1};
  await new Promise(r=>setTimeout(r,1250));send('accept','accept');await wait(()=>a.messages.some(m=>m.id==='accept'));assert.equal(store.rows.get(dev.uid).training.startKills,10);assert.equal(store.rows.get(dev.uid).stats.str,20,'accepting trial preserves allocations');
  await new Promise(r=>setTimeout(r,1250));send('early','complete',{kills:999});await wait(()=>a.messages.some(m=>m.id==='early'));assert.equal(a.messages.find(m=>m.id==='early').code,'trainer-incomplete');
  // 0.98 online the trial also needs its boss and the materials + cowries, which are paid on completion
  peer.world.kills=10+TRIAL.class.kills;await new Promise(r=>setTimeout(r,1250));send('boss','complete');await wait(()=>a.messages.some(m=>m.id==='boss'));assert.equal(a.messages.find(m=>m.id==='boss').code,'trainer-boss');
  peer.training={...peer.training,bossDone:true};peer.bag={coins:TRIAL.class.coins+5,items:Object.fromEntries(TRIAL.class.items.map(([id,n])=>[id,n+1]))};
  await new Promise(r=>setTimeout(r,1250));send('finish','complete');await wait(()=>a.messages.some(m=>m.id==='finish'));assert.equal(a.messages.find(m=>m.id==='finish').advanced,true);const row=store.rows.get(dev.uid);assert.equal(row.character.classId,'boxer');assert.equal(row.state.traveler.baseXp,2856);assert.equal(row.state.traveler.jobXp,0);assert.equal(row.training,null);assert.deepEqual(row.stats,{str:1,agi:1,vit:1,int:1,dex:1,luk:1});assert.equal(a.messages.find(m=>m.id==='finish').statReset,true);assert.equal(row.bag.coins,5);assert.ok(TRIAL.class.items.every(([id])=>row.bag.items[id]===1));assert.equal(store.leases.size,0);
  const b=await open(dev.token),welcome=b.messages.find(m=>m.type==='welcome');assert.equal(welcome.snapshot.self.character.classId,'boxer');assert.equal(welcome.snapshot.self.training,null);assert.equal(welcome.snapshot.self.jobXp,0);
  const masterPeer=[...host.realm.peers.values()][0];Object.assign(masterPeer.world.player,{x:51,z:-46.5});masterPeer.world.jobXp=100000;
  masterPeer.stats={str:30,agi:15,vit:12,int:1,dex:7,luk:1};masterPeer.training={classId:'boxer',tier:'master',startKills:masterPeer.world.kills-TRIAL.master.kills,boss:TRIAL.master.boss,bossDone:true};masterPeer.bag={coins:TRIAL.master.coins+10,items:Object.fromEntries(TRIAL.master.items)};
  const xpBefore=masterPeer.world.baseXp;b.ws.send(JSON.stringify({type:'train',id:'master',mentor:'box-master',action:'complete',jobId:'master-boxer'}));await wait(()=>b.messages.some(m=>m.id==='master'));
  assert.equal(b.messages.find(m=>m.id==='master').advanced,true);assert.deepEqual(store.rows.get(dev.uid).stats,{str:1,agi:1,vit:1,int:1,dex:1,luk:1});assert.equal(store.rows.get(dev.uid).character.jobId,'master-boxer');assert.equal(store.rows.get(dev.uid).state.traveler.baseXp,xpBefore);assert.equal(store.rows.get(dev.uid).bag.coins,10);
  const c=await open(dev.token);assert.equal(c.messages.find(m=>m.type==='welcome').snapshot.self.character.jobId,'master-boxer');assert.deepEqual(store.rows.get(dev.uid).stats,{str:1,agi:1,vit:1,int:1,dex:1,luk:1});

 }finally{for(const c of clients)c.terminate();await host.close();assert.ok(path.resolve(directory).startsWith(base+path.sep));await rm(directory,{recursive:true,force:true});}
});

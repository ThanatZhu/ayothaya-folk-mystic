import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
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
  Object.assign(peer.world.player,{x:51,z:-46.5});peer.world.baseXp=2856;peer.world.jobXp=300;peer.world.kills=10;
  await new Promise(r=>setTimeout(r,1250));send('accept','accept');await wait(()=>a.messages.some(m=>m.id==='accept'));assert.equal(store.rows.get(dev.uid).training.startKills,10);
  await new Promise(r=>setTimeout(r,1250));send('early','complete',{kills:999});await wait(()=>a.messages.some(m=>m.id==='early'));assert.equal(a.messages.find(m=>m.id==='early').code,'trainer-incomplete');
  peer.world.kills=15;await new Promise(r=>setTimeout(r,1250));send('finish','complete');await wait(()=>a.messages.some(m=>m.id==='finish'));assert.equal(a.messages.find(m=>m.id==='finish').advanced,true);const row=store.rows.get(dev.uid);assert.equal(row.character.classId,'boxer');assert.equal(row.state.traveler.baseXp,2856);assert.equal(row.state.traveler.jobXp,0);assert.equal(row.training,null);assert.equal(store.leases.size,0);
  const b=await open(dev.token),welcome=b.messages.find(m=>m.type==='welcome');assert.equal(welcome.snapshot.self.character.classId,'boxer');assert.equal(welcome.snapshot.self.training,null);assert.equal(welcome.snapshot.self.jobXp,0);
 }finally{for(const c of clients)c.terminate();await host.close();assert.ok(path.resolve(directory).startsWith(base+path.sep));await rm(directory,{recursive:true,force:true});}
});

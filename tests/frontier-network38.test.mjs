import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {packSpawns} from '../combat-core.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const rice=catalog.maps.find(m=>m.id==='rice-fields');
test('socket travel checkpoints authoritative progress, releases lease, and rejoins destination with shared monsters',async()=>{
 const base=path.resolve('.local-multiplayer'),directory=await mkdtemp(path.join(base,'travel38-')),store=await new LocalStore(directory).init(),origin='http://127.0.0.1:8871';
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const port=host.server.address().port,clients=[];
 const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}assert.fail('Timed out');};
 const open=async token=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/realtime`,{origin}),messages=[];clients.push(ws);ws.on('message',v=>messages.push(JSON.parse(v)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({type:'join',token,serverId:'server-1',slotId:'slot-1'}));await wait(()=>messages.some(m=>m.type==='welcome'));return {ws,messages};};
 try{
  const dev=await store.createLocal({name:'ทดสอบประตู'}),a=await open(dev.token),peer=[...host.realm.peers.values()][0];peer.world.baseXp=32;
  a.ws.send(JSON.stringify({type:'travel',id:'invalid',destination:'moonlit-mill',position:{x:0,z:-68},baseXp:99999}));await wait(()=>a.messages.some(m=>m.type==='travel-error'));assert.equal(peer.room.map.id,'ayutthaya');
  Object.assign(peer.world.player,{x:0,z:2.5});a.ws.send(JSON.stringify({type:'travel',id:'go',destination:'rice-fields',baseXp:99999}));await wait(()=>a.messages.some(m=>m.type==='traveled'));assert.equal(store.rows.get(dev.uid).state.mapId,'rice-fields');assert.equal(store.rows.get(dev.uid).state.traveler.baseXp,32);assert.equal(store.leases.size,0);
  const b=await open(dev.token),welcome=b.messages.find(m=>m.type==='welcome');assert.equal(welcome.room,'server-1:rice-fields');assert.equal(welcome.snapshot.mobs.length,packSpawns(rice.mobs,rice).length);assert.equal(welcome.snapshot.self.baseXp,32);
  const p=[...host.realm.peers.values()][0],mob=p.room.mobs[0];Object.assign(p.world.player,{x:mob.x,z:mob.z+1});b.ws.send(JSON.stringify({type:'attack',seq:1}));await wait(()=>b.messages.some(m=>m.type==='snapshot'&&m.mobs[0].hit>0));assert.ok(mob.hp<mob.maxHp);
 }finally{for(const c of clients)c.terminate();await host.close();assert.ok(path.resolve(directory).startsWith(base+path.sep));await rm(directory,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
test('socket equip validates class, saves before acknowledgement, broadcasts and survives reconnect',async()=>{
 const base=path.resolve('.local-multiplayer');await mkdir(base,{recursive:true});const directory=await mkdtemp(path.join(base,'equipment41-')),store=await new LocalStore(directory).init(),origin='http://127.0.0.1:8871';
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const port=host.server.address().port,clients=[];
 const wait=async predicate=>{for(let i=0;i<150;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}assert.fail('Timed out');};
 const open=async token=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/realtime`,{origin}),messages=[];clients.push(ws);ws.on('message',v=>messages.push(JSON.parse(v)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({type:'join',token,serverId:'server-1',slotId:'slot-1'}));await wait(()=>messages.some(m=>m.type==='welcome'));return {ws,messages};};
 try{
  const one=await store.createLocal({name:'ลองอุปกรณ์หนึ่ง'}),two=await store.createLocal({name:'ลองอุปกรณ์สอง'}),a=await open(one.token),b=await open(two.token);
  a.ws.send(JSON.stringify({type:'equip',id:'foreign',item:'swordsman-weapon-crafted',classId:'swordsman',baseXp:2856}));await wait(()=>a.messages.some(m=>m.id==='foreign'));assert.equal(a.messages.find(m=>m.id==='foreign').code,'equipment-class');
  a.ws.send(JSON.stringify({type:'equip',id:'weapon',item:'novice-weapon-crafted',attack:9999}));await wait(()=>a.messages.some(m=>m.id==='weapon'));
  assert.equal(a.messages.find(m=>m.id==='weapon').type,'equipped');assert.equal(store.rows.get(one.uid).equipment.weapon,'novice-weapon-crafted');assert.equal(store.rows.get(one.uid).state.traveler.baseXp,0);
  const id=a.messages.find(m=>m.type==='welcome').id;await wait(()=>b.messages.some(m=>m.type==='snapshot'&&m.players.some(p=>p.id===id&&p.equipment?.weapon==='novice-weapon-crafted')));
  await new Promise(r=>setTimeout(r,370));a.ws.send(JSON.stringify({type:'equip',id:'cloth',item:'novice-outfit-crimson'}));await wait(()=>a.messages.some(m=>m.id==='cloth'));assert.equal(store.rows.get(one.uid).equipment.outfit,'novice-outfit-crimson');assert.equal(store.rows.get(two.uid).equipment?.outfit??'novice-outfit-original','novice-outfit-original');
  a.ws.send(JSON.stringify({type:'leave'}));await wait(()=>a.messages.some(m=>m.type==='left'));await wait(()=>!host.realm.peers.has(id));
  const again=await open(one.token),gear=again.messages.find(m=>m.type==='welcome').snapshot.self.equipment;assert.equal(gear.weapon,'novice-weapon-crafted');assert.equal(gear.outfit,'novice-outfit-crimson');
 }finally{for(const c of clients)c.terminate();await host.close();assert.ok(path.resolve(directory).startsWith(base+path.sep));await rm(directory,{recursive:true,force:true});}
});

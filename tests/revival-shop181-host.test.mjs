import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
test('revival gold purchase checkpoints item and wallet, survives reconnect retries and rolls back failed saves',async t=>{
 const store=await new LocalStore(await mkdtemp(path.join(os.tmpdir(),'ayothaya-revival181-'))).init(),catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url))),origins=[];
 const a=await store.createLocal({name:'RevivalBuyer'});store.rows.get(a.uid).petCollection={balance:400};await store.flush();
 const host=await createHost({mode:'local',store,catalog,origins});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);const sockets=[];t.after(async()=>{sockets.forEach(s=>s.close());await host.close();});
 async function connect(session){const ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base});sockets.push(ws);const queue=[],waiters=[];ws.on('message',raw=>{const m=JSON.parse(raw);const i=waiters.findIndex(w=>w.type===m.type&&(!w.id||w.id===m.id));if(i>=0){const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(m);}else queue.push(m);});let seq=0;
 const get=(type,id)=>new Promise((resolve,reject)=>{const i=queue.findIndex(m=>m.type===type&&(!id||m.id===id));if(i>=0)return resolve(queue.splice(i,1)[0]);const w={type,id,resolve,timer:setTimeout(()=>reject(Error('timeout '+type)),15000)};waiters.push(w);});
 await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',token:session.token,serverId:'server-1',slotId:'slot-1',channel:1}));const welcome=await get('welcome');return {ws,welcome,get,send(type,data={}){ws.send(JSON.stringify({type,seq:++seq,...data}));},async request(type,id,data={},response){this.send(type,{id,...data});return get(response??({arenaRooms:'arenaChanged',travel:'traveled'}[type]??'identityChanged'),id);}};}

 let buyer=await connect(a);let result=await buyer.request('revivalBuy','buy-revival-181',{price:1,count:99});assert.equal(result.petCollection.balance,200);assert.equal(result.bag.items['soul-talisman'],1);assert.equal(store.rows.get(a.uid).petCollection.balance,200);
 result=await buyer.request('revivalBuy','buy-revival-181');assert.equal(result.petCollection.balance,200);assert.equal(result.bag.items['soul-talisman'],1);
 buyer.ws.close();await new Promise(r=>setTimeout(r,100));buyer=await connect(a);result=await buyer.request('revivalBuy','buy-revival-181');assert.equal(result.petCollection.balance,200);assert.equal(result.bag.items['soul-talisman'],1);
 const checkpoint=store.checkpoint.bind(store);store.checkpoint=async()=>{throw Error('injected-save-failure');};const closed=new Promise(resolve=>buyer.ws.once('close',resolve));buyer.send('revivalBuy',{id:'failed-revival-181'});await closed;store.checkpoint=checkpoint;
 assert.equal(store.rows.get(a.uid).petCollection.balance,200);assert.equal(store.rows.get(a.uid).bag.items['soul-talisman'],1);
 buyer=await connect(a);assert.equal(buyer.welcome.snapshot.self.bag.items['soul-talisman'],1);assert.equal(buyer.welcome.snapshot.self.petCollection.balance,200);
});

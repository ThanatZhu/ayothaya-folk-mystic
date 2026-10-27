import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const catalog={capital:'field',maps:[{id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],npcs:[]}]};
test('amulet draws durably commit inventory and gold once, replay across reconnect, and withhold success on save failure',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-amulet-')),store=await new LocalStore(directory).init(),account=await store.createLocal({name:'AmuletTest'});
 const original=store.rows.get(account.uid);original.state.mapId='field';original.petCollection={balance:2000,amuletGacha:{pity:99}};await store.flush();
 const host=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost']}),clients=[];await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 t.after(async()=>{clients.forEach(c=>c.terminate());await host.close();if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep))await rm(directory,{recursive:true,force:true});});
 async function connect(){
  const ws=new WebSocket('ws://127.0.0.1:'+host.server.address().port+'/realtime',{origin:'http://localhost'});clients.push(ws);const queue=[],waiters=[];let seq=0;
  ws.on('message',raw=>{const m=JSON.parse(raw),i=waiters.findIndex(w=>w.type===m.type&&(!w.id||w.id===m.id));if(i<0)queue.push(m);else{const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(m);}});
  const get=(type,id)=>new Promise((resolve,reject)=>{const i=queue.findIndex(m=>m.type===type&&(!id||m.id===id));if(i>=0)return resolve(queue.splice(i,1)[0]);const w={type,id,resolve,timer:setTimeout(()=>reject(Error('timeout '+type)),5000)};waiters.push(w);});
  await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',token:account.token,serverId:'server-1',slotId:'slot-1'}));const welcome=await get('welcome');
  return {ws,get,welcome,send(type,id,count=1){ws.send(JSON.stringify({type,id,count,seq:++seq}));}};
 }
 let a=await connect();a.send('amuletDraw','amulet-host-0001');let r=await a.get('amuletChanged','amulet-host-0001');
 assert.equal(r.petCollection.balance,1900);assert.ok(r.results[0].rainbow&&r.results[0].guaranteed);assert.equal(r.bag.items[r.results[0].id],1);
 assert.equal(store.rows.get(account.uid).petCollection.balance,1900);assert.equal(store.rows.get(account.uid).bag.items[r.results[0].id],1,'durably saved before success reply');
 assert.ok(!('receipts' in r.petCollection.amuletGacha));const earned=r.results[0].id;
 a.send('amuletDraw','amulet-host-0001');r=await a.get('amuletChanged','amulet-host-0001');assert.equal(r.replayed,true);assert.equal(r.petCollection.balance,1900);assert.equal(r.bag.items[earned],1);
 const closed=new Promise(resolve=>a.ws.once('close',resolve));a.ws.close();await closed;a=await connect();a.send('amuletDraw','amulet-host-0001');r=await a.get('amuletChanged','amulet-host-0001');assert.equal(r.replayed,true);assert.equal(r.petCollection.balance,1900);assert.equal(r.bag.items[earned],1);
 a.send('amuletDraw','amulet-host-0001',10);assert.equal((await a.get('amuletError','amulet-host-0001')).code,'request-conflict');
 const checkpoint=store.checkpoint.bind(store),before=structuredClone(store.rows.get(account.uid));store.checkpoint=async()=>{throw Error('simulated-save-failure');};
 let acknowledged=false;a.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='amuletChanged'&&m.id==='amulet-host-failed')acknowledged=true;});const failed=new Promise(resolve=>a.ws.once('close',resolve));a.send('amuletDraw','amulet-host-failed');await failed;store.checkpoint=checkpoint;
 assert.equal(acknowledged,false);assert.equal(store.rows.get(account.uid).petCollection.balance,before.petCollection.balance);assert.deepEqual(store.rows.get(account.uid).bag,before.bag);
});

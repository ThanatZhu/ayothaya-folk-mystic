import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
import {levelStart,XP_CURVE} from '../experience.js';import {earnedStatPoints} from '../character-stats.js';
test('stat reset commits before acknowledgment, restores live stats and budget, retries after reconnect and survives failed save',async t=>{
 const store=await new LocalStore(await mkdtemp(path.join(os.tmpdir(),'ayothaya-reset189-'))).init(),catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url))),origins=[];
 const account=await store.createLocal({name:'ResetQA'}),record=store.rows.get(account.uid);
 Object.assign(record,{stats:{str:30,agi:2,vit:3,int:1,dex:1,luk:1},rebirth:3,xpCurve:XP_CURVE,petCollection:{balance:200},bag:{coins:123,items:{'stat-reset-scroll':2}}});record.state.traveler.baseXp=levelStart(99);await store.flush();
 const host=await createHost({mode:'local',store,catalog,origins});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);const sockets=[];
 t.after(async()=>{sockets.forEach(s=>s.terminate());await host.close();});
 async function connect(){const ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base});sockets.push(ws);const queue=[],waiters=[];ws.on('message',raw=>{const m=JSON.parse(raw),i=waiters.findIndex(w=>w.type===m.type&&(!w.id||w.id===m.id));if(i>=0){const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(m);}else queue.push(m);});let seq=0;
 const get=(type,id)=>new Promise((resolve,reject)=>{const i=queue.findIndex(m=>m.type===type&&(!id||m.id===id));if(i>=0)return resolve(queue.splice(i,1)[0]);waiters.push({type,id,resolve,timer:setTimeout(()=>reject(Error('timeout '+type)),10000)});});
 await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',token:account.token,serverId:'server-1',slotId:'slot-1',channel:1}));const welcome=await get('welcome');return {ws,welcome,send(type,data={}){ws.send(JSON.stringify({type,seq:++seq,...data}));},async request(type,id){this.send(type,{id});return get('identityChanged',id);}};}
 let client=await connect();let r=await client.request('statResetUse','reset-host189');
 assert.equal(r.stats.str,1);assert.equal(r.statPoints,earnedStatPoints(99,3));assert.equal(r.derived.rebirthBonus,6);assert.equal(r.bag.items['stat-reset-scroll'],1);assert.equal(r.petCollection.balance,200);
 assert.equal(store.rows.get(account.uid).stats.str,1);assert.equal([...host.realm.peers.values()][0].stats.str,1);
 client.ws.close();await new Promise(r=>setTimeout(r,120));client=await connect();assert.equal(client.welcome.snapshot.self.stats.str,1);
 const peer=[...host.realm.peers.values()][0];peer.stats.str=4;host.realm.refreshStats(peer);
 r=await client.request('statResetUse','reset-host189');assert.equal(r.stats.str,4);assert.equal(r.bag.items['stat-reset-scroll'],1);
 // Force the next durable reset write to fail. The live mutation must never leak.
 const durable=structuredClone(store.rows.get(account.uid)),checkpoint=store.checkpoint.bind(store);store.checkpoint=async()=>{throw Error('injected-save-failure');};
 const closed=new Promise(resolve=>client.ws.once('close',resolve));client.send('statResetUse',{id:'reset-failed189'});await closed;store.checkpoint=checkpoint;
 assert.equal(store.rows.get(account.uid).bag.items['stat-reset-scroll'],durable.bag.items['stat-reset-scroll']);assert.deepEqual(store.rows.get(account.uid).stats,durable.stats);
 client=await connect();assert.deepEqual(client.welcome.snapshot.self.stats,durable.stats);assert.equal(client.welcome.snapshot.self.bag.items['stat-reset-scroll'],1);
});

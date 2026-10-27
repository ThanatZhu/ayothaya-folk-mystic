import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const catalog={capital:'field',maps:[{id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],npcs:[]}]};
test('premium shop durably commits before reply, replays after reconnect, rejects forged goods and withholds success on save failure',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-premium-')),store=await new LocalStore(directory).init(),account=await store.createLocal({name:'StoreTest'});
 const original=store.rows.get(account.uid);original.state.mapId='field';original.petCollection={balance:2000};await store.flush();
 const host=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost']}),clients=[];await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 t.after(async()=>{clients.forEach(c=>c.terminate());await host.close();if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep))await rm(directory,{recursive:true,force:true});});
 async function connect(){
  const ws=new WebSocket('ws://127.0.0.1:'+host.server.address().port+'/realtime',{origin:'http://localhost'});clients.push(ws);const queue=[],waiters=[];let seq=0;
  ws.on('message',raw=>{const m=JSON.parse(raw),i=waiters.findIndex(w=>w.type===m.type&&(!w.id||w.id===m.id));if(i<0)queue.push(m);else{const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(m);}});
  const get=(type,id)=>new Promise((resolve,reject)=>{const i=queue.findIndex(m=>m.type===type&&(!id||m.id===id));if(i>=0)return resolve(queue.splice(i,1)[0]);const w={type,id,resolve,timer:setTimeout(()=>reject(Error('timeout '+type)),5000)};waiters.push(w);});
  await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',token:account.token,serverId:'server-1',slotId:'slot-1'}));await get('welcome');
  return {ws,get,send(type,id,sku='lek-lai-pack',quantity=2){ws.send(JSON.stringify({type,id,sku,quantity,seq:++seq,price:0,item:'amulet-somdej',count:999}));}};
 }
 let a=await connect();a.send('premiumBuy','shop-host-0001');let r=await a.get('shopChanged','shop-host-0001');
 assert.equal(r.petCollection.balance,1800);assert.equal(r.bag.items['lek-lai'],10);assert.equal(r.bag.items['amulet-somdej'],undefined);assert.equal(r.purchase.total,200);assert.ok(!('receipts' in r.petCollection.premiumShop));
 assert.equal(store.rows.get(account.uid).petCollection.balance,1800);assert.equal(store.rows.get(account.uid).bag.items['lek-lai'],10);
 a.send('premiumBuy','shop-host-0001');r=await a.get('shopChanged','shop-host-0001');assert.equal(r.replayed,true);assert.equal(r.petCollection.balance,1800);
 const closed=new Promise(resolve=>a.ws.once('close',resolve));a.ws.close();await closed;a=await connect();a.send('premiumBuy','shop-host-0001');r=await a.get('shopChanged','shop-host-0001');assert.equal(r.replayed,true);assert.equal(r.bag.items['lek-lai'],10);
 a.send('premiumBuy','shop-host-0001','break-guard');assert.equal((await a.get('shopError','shop-host-0001')).code,'request-conflict');
 a.send('premiumBuy','shop-host-bad01','amulet-somdej');assert.equal((await a.get('shopError','shop-host-bad01')).code,'bad-product');
 const checkpoint=store.checkpoint.bind(store),before=structuredClone(store.rows.get(account.uid));store.checkpoint=async()=>{throw Error('simulated-save-failure');};
 let acknowledged=false;a.ws.on('message',raw=>{if(JSON.parse(raw).type==='shopChanged')acknowledged=true;});const failed=new Promise(resolve=>a.ws.once('close',resolve));a.send('premiumBuy','shop-host-failed');await failed;store.checkpoint=checkpoint;
 assert.equal(acknowledged,false);assert.equal(store.rows.get(account.uid).petCollection.balance,before.petCollection.balance);assert.deepEqual(store.rows.get(account.uid).bag,before.bag);
});

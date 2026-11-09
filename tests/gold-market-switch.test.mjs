import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},catalog={capital:'field',maps:[{id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],npcs:[]}]};
const headers={origin:'http://localhost','content-type':'application/json'};
const start=async store=>{const host=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost'],classRewards:false});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));return {host,base:'http://127.0.0.1:'+host.server.address().port};};
const post=async(base,enabled)=>{const r=await fetch(base+'/admin/gold-market',{method:'POST',headers,body:JSON.stringify({enabled})});return {status:r.status,...await r.json()};};
test('gold market switch: needs a finished wipe, sets the realm flag, survives a restart, shows in the report',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-goldmarket-')),store=await new LocalStore(directory).init();
 let a=await start(store);t.after(async()=>{await a.host.close();await rm(directory,{recursive:true,force:true});});
 assert.equal(a.host.realm.goldMarketOpen,false);
 assert.deepEqual(await post(a.base,true),{status:409,error:'wipe-not-finished'});assert.equal(a.host.realm.goldMarketOpen,false);
 await store.saveGoldWipeState({startedAt:1,completedAt:2});
 const on=await post(a.base,true);assert.equal(on.status,200);assert.equal(on.goldMarket.enabled,true);assert.ok(on.goldMarket.changedAt);assert.ok(on.goldMarket.by);assert.equal(a.host.realm.goldMarketOpen,true);assert.equal(on.live,true);
 assert.equal((await (await fetch(a.base+'/admin/gold-report',{headers})).json()).goldMarket.enabled,true);
 await a.host.close();a=await start(store);assert.equal(a.host.realm.goldMarketOpen,true); // same store = restart
 const off=await post(a.base,false);assert.equal(off.status,200);assert.equal(off.goldMarket.enabled,false);assert.equal(a.host.realm.goldMarketOpen,false);
 assert.equal((await store.loadGoldMarket()).enabled,false);
 assert.equal((await post(a.base,'yes')).status,400);
});
test('gold market switch fails closed when its load throws, and concurrent POSTs end consistent',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-goldmarket-')),store=await new LocalStore(directory).init();
 await store.saveGoldWipeState({startedAt:1,completedAt:2});await store.saveGoldMarket({enabled:true,changedAt:1,by:'x'});
 store.loadGoldMarket=async()=>{throw Error('read failed');};
 const a=await start(store);t.after(async()=>{await a.host.close();await rm(directory,{recursive:true,force:true});});
 assert.equal(a.host.realm.goldMarketOpen,false);
 const res=await Promise.all([post(a.base,true),post(a.base,false),post(a.base,true),post(a.base,false)]);
 assert.ok(res.every(r=>r.status===200));
 assert.equal(a.host.realm.goldMarketOpen,false);
 assert.equal(JSON.parse(await (await import('node:fs/promises')).readFile(path.join(directory,'gold-market.json'),'utf8')).enabled,false);
});
test('GET /admin/gold-market reads the switch without touching the wipe state',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-goldmarket-')),store=await new LocalStore(directory).init();
 await store.saveGoldWipeState({reportAt:123,report:{held:1}});
 const a=await start(store);t.after(async()=>{await a.host.close();await rm(directory,{recursive:true,force:true});});
 let r=await (await fetch(a.base+'/admin/gold-market',{headers})).json();assert.deepEqual(r,{goldMarket:null,live:false,state:{reportAt:123,report:{held:1}},wipeCompleted:false});
 await store.saveGoldWipeState({reportAt:123,startedAt:1,completedAt:2});await store.saveGoldMarket({enabled:true,changedAt:5,by:'x'});
 r=await (await fetch(a.base+'/admin/gold-market',{headers})).json();assert.equal(r.goldMarket.enabled,true);assert.equal(r.wipeCompleted,true);assert.equal(r.state.completedAt,2,'the real wipe state, so the tab shows the finished wipe');
 assert.equal(r.live,false,'stored on, live still off: the admin tab warns');
 assert.equal((await store.loadGoldWipeState()).reportAt,123);
});

import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';import {composeMail,deliverMail} from '../mailbox.js';
const wait=async f=>{for(let i=0;i<200;i++){if(await f())return;await new Promise(r=>setTimeout(r,25));}throw Error('timeout');};
test('admin gold wipe: report gate, confirm text, online and offline characters, finished wipe is a no-op',async t=>{
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},catalog={capital:'field',maps:[{id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],npcs:[]}]};
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-goldwipe-')),store=await new LocalStore(directory).init();
 const live=await store.createLocal({name:'LiveGold'}),away=await store.createLocal({name:'AwayGold'});
 Object.assign(store.rows.get(live.uid),{petCollection:{balance:300}});store.rows.get(live.uid).state.mapId='field';
 Object.assign(store.rows.get(away.uid),{petCollection:{balance:500},mailbox:deliverMail(null,composeMail({id:'gift-000001',title:'t',body:'b',attachments:{goldBars:40,coins:7}},1)).mailbox});await store.flush();
 // watch saves in memory: reading gold-wipe.json while it is renamed fails on Windows
 let saved=null;const save=store.saveGoldWipeState.bind(store);store.saveGoldWipeState=s=>save(s).then(()=>{saved=structuredClone(s);});
 const host=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost'],classRewards:false});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+host.server.address().port,ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:'http://localhost'});
 t.after(async()=>{ws.terminate();await host.close();await rm(directory,{recursive:true,force:true});});
 const messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise(r=>ws.once('open',r));
 ws.send(JSON.stringify({type:'join',token:live.token,serverId:'server-1',slotId:'slot-1'}));await wait(()=>messages.some(m=>m.type==='welcome'));
 const peer=[...host.realm.peers.values()].find(p=>p.uid===live.uid);assert.equal(peer.petCollection.balance,300);
 const headers={origin:'http://localhost','content-type':'application/json'};
 const wipe=async confirm=>{const r=await fetch(base+'/admin/gold-wipe',{method:'POST',headers,body:JSON.stringify({confirm})});return {status:r.status,...await r.json()};};
 assert.deepEqual(await wipe('ล้างทองแท่ง'),{status:400,error:'report-stale'});
 const report=await (await fetch(base+'/admin/gold-report',{headers})).json();
 assert.equal(report.holdings.held,800);assert.equal(report.holdings.mailGold,40);assert.equal(report.holdings.holders,2);assert.ok(report.state.reportAt);assert.equal(report.state.startedAt,null);
 assert.deepEqual(await wipe('ล้าง'),{status:400,error:'bad-confirm'});
 const started=await wipe('ล้างทองแท่ง');assert.equal(started.status,200);assert.ok(started.state.startedAt);
 await wait(()=>saved?.completedAt);const done=saved;
 assert.equal(done.wiped,2);assert.equal(done.wallet,800);assert.equal(done.mail,40);assert.equal(done.scanned,2);
 // online player is changed live, and a forced autosave keeps 0 (and the run-once flag)
 assert.equal(peer.petCollection.balance,0);
 ws.send(JSON.stringify({type:'save',id:'after-wipe'}));await wait(()=>messages.some(m=>m.type==='saved'&&m.id==='after-wipe'));
 assert.equal(store.rows.get(live.uid).petCollection.balance,0);assert.equal(store.rows.get(live.uid).goldWipe,1);
 // offline: wallet and mail gold gone, the rest of the mail kept
 const a=store.rows.get(away.uid);assert.equal(a.petCollection.balance,0);assert.equal(a.mailbox.messages[0].attachments.goldBars,0);assert.equal(a.mailbox.messages[0].attachments.coins,7);assert.equal(a.goldWipe,1);
 // finished wipe is a no-op
 const give=store.giveOffline.bind(store);let calls=0;store.giveOffline=(...x)=>{calls++;return give(...x);};
 const again=await wipe('ล้างทองแท่ง');assert.equal(again.status,200);assert.deepEqual(again.state,done);assert.equal(calls,0);
 // after completion /economy gold.held is 0 and the wipe is booked as a gold sink
 await wait(async()=>(await (await fetch(base+'/economy')).json()).gold.held===0);
 const view=await (await fetch(base+'/economy')).json();assert.equal(view.gold.days.at(-1).out.wipe,800);assert.equal(view.gold.characters,0); // holders, not every saved character
});
test('gold wipe waits while a closed socket leaves its peer suspended (a reconnect would resume the old wallet)',async t=>{
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},catalog={capital:'field',maps:[{id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],npcs:[]}]};
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-goldwipe-')),store=await new LocalStore(directory).init();
 const gone=await store.createLocal({name:'GoneGold'});Object.assign(store.rows.get(gone.uid),{petCollection:{balance:300}});store.rows.get(gone.uid).state.mapId='field';await store.flush();
 let saved=null;const save=store.saveGoldWipeState.bind(store);store.saveGoldWipeState=s=>save(s).then(()=>{saved=structuredClone(s);});
 const host=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost'],classRewards:false});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+host.server.address().port,ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:'http://localhost'});
 t.after(async()=>{ws.terminate();await host.close();await rm(directory,{recursive:true,force:true});});
 const messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise(r=>ws.once('open',r));
 ws.send(JSON.stringify({type:'join',token:gone.token,serverId:'server-1',slotId:'slot-1'}));await wait(()=>messages.some(m=>m.type==='welcome'));
 const peer=[...host.realm.peers.values()].find(p=>p.uid===gone.uid);
 ws.close();await wait(()=>peer.suspended&&!store.leases.has(gone.uid)); // lease released, peer kept for its 20 s resume window
 const headers={origin:'http://localhost','content-type':'application/json'},wipe=()=>fetch(base+'/admin/gold-wipe',{method:'POST',headers,body:JSON.stringify({confirm:'ล้างทองแท่ง'})}).then(r=>r.json());
 await fetch(base+'/admin/gold-report',{headers});assert.ok((await wipe()).state.startedAt);
 await wait(()=>saved?.scanComplete);assert.deepEqual(saved.pending,[{uid:gone.uid,slotId:'slot-1'}]);assert.equal(saved.completedAt,null);
 assert.equal(store.rows.get(gone.uid).petCollection.balance,300);assert.equal(store.rows.get(gone.uid).goldWipe,undefined);
 // the reaper drops the peer once its window ends; the next pass wipes the saved character
 host.realm.leave(peer.id);saved=null;await wipe();await wait(()=>saved?.completedAt);
 assert.equal(saved.wiped,1);assert.equal(store.rows.get(gone.uid).petCollection.balance,0);assert.equal(store.rows.get(gone.uid).goldWipe,1);
});
test('travel is refused while a mail write (e.g. the gold wipe) is queued, so its checkpoint cannot write the old gold back',async t=>{
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},catalog={capital:'field',maps:[{id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],npcs:[]}]};
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-goldwipe-')),store=await new LocalStore(directory).init();
 const dev=await store.createLocal({name:'Traveler'});store.rows.get(dev.uid).state.mapId='field';await store.flush();
 const host=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost'],classRewards:false});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const ws=new WebSocket('ws://127.0.0.1:'+host.server.address().port+'/realtime',{origin:'http://localhost'});
 t.after(async()=>{ws.terminate();await host.close();await rm(directory,{recursive:true,force:true});});
 const messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise(r=>ws.once('open',r));
 ws.send(JSON.stringify({type:'join',token:dev.token,serverId:'server-1',slotId:'slot-1'}));await wait(()=>messages.some(m=>m.type==='welcome'));
 const peer=[...host.realm.peers.values()].find(p=>p.uid===dev.uid);peer.world.player.hp=0;peer.mailMutationBusy=true;
 ws.send(JSON.stringify({type:'travel',id:'busy',destination:'field',respawn:true}));await wait(()=>messages.some(m=>m.id==='busy'));
 assert.deepEqual(messages.find(m=>m.id==='busy'),{type:'travel-error',id:'busy',code:'server-busy'});assert.ok(!peer.suspended);
 peer.mailMutationBusy=false;ws.send(JSON.stringify({type:'travel',id:'go',destination:'field',respawn:true}));await wait(()=>messages.some(m=>m.type==='traveled'&&m.id==='go'));
});

import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
import {warRound,warContribution,finishWarRound} from '../guild-war-rewards.js';
const catalog={capital:'f',maps:[{id:'f',name:'Field',safe:true,nav:{zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[],npcs:[]}]};
test('war prize journal durably mails online and disconnected participants, survives write failure and replay',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayo-war-mail-')),store=await new LocalStore(directory).init();
 const online=await store.createLocal({name:'OnlineFighter'}),offline=await store.createLocal({name:'OfflineFighter'});
 for(const a of [online,offline])store.rows.get(a.uid).state.mapId='f';await store.flush();
 const host=await createHost({mode:'local',store,catalog,origins:['http://localhost']}),clients=[];await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 t.after(async()=>{clients.forEach(ws=>ws.terminate());await host.close();if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep))await rm(directory,{recursive:true,force:true});});
 const base='ws://127.0.0.1:'+host.server.address().port;
 const ws=new WebSocket(base+'/realtime',{origin:'http://localhost'});clients.push(ws);
 const welcome=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('timeout')),5000);ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){clearTimeout(timer);resolve(m);}});});
 await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',token:online.token,serverId:'server-1',slotId:'slot-1'}));const player=host.realm.peers.get((await welcome).id);
 const round=warRound(null,10000,'winners'),guild={id:'winners',name:'Winners'};
 for(const a of [online,offline])warContribution(round,{key:a.uid+':slot-1',uid:a.uid,slotId:'slot-1',serverId:'server-1',character:{name:a.uid}},guild,{damage:10});
 const {board}=finishWarRound(null,round,'server-1',20000,()=>.5),snapshot=structuredClone(board),key='guild-war:server-1';host.realm.leaders.set(key,board);
 const save=store.saveLeaders.bind(store);let fail=true;store.saveLeaders=async(...args)=>{if(fail)throw Error('test-journal-write-failed');return save(...args);};
 await host.realm.onWarRewards();for(const a of [online,offline])assert.equal(store.rows.get(a.uid).mailbox?.messages?.length??0,0,'never deliver before the journal commits');assert.equal(Object.keys(board.pending).length,2);
 fail=false;await host.realm.onWarRewards();for(const a of [online,offline]){const mail=store.rows.get(a.uid).mailbox.messages[0];assert.equal(mail.attachments.items[0].id,'conquest-shard');assert.equal(mail.attachments.items[0].count,2);}
 assert.equal(player.mailbox.messages.length,1);assert.equal(Object.keys((await store.loadLeaders())[key].pending).length,0);
 host.realm.leaders.set(key,snapshot);await host.realm.onWarRewards();for(const a of [online,offline])assert.equal(store.rows.get(a.uid).mailbox.messages.length,1,'crash replay must not duplicate mail');
});


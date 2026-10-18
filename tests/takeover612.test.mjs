import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createHost} from '../server/host.js';
import {LocalStore} from '../server/storage.js';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('a second login of the same character replaces the first window instead of being refused', async () => {
 const store=await new LocalStore(await mkdtemp(path.join(tmpdir(),'ayo-'))).init();const {uid,token}=await store.createLocal({name:'สองเครื่อง'});
 const service=await createHost({mode:'local',store,origins:['http://local.test']});await new Promise(r=>service.server.listen(0,'127.0.0.1',r));
 const url=`ws://127.0.0.1:${service.server.address().port}/realtime`;
 const open=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(url,{headers:{origin:'http://local.test'}}),msgs=[];ws.on('message',d=>msgs.push(JSON.parse(d)));ws.on('open',()=>{ws.send(JSON.stringify({type:'join',token,serverId:'server-1',slotId:'slot-1'}));resolve({ws,msgs});});ws.on('error',reject);});
 const until=async f=>{for(let i=0;i<100&&!f();i++)await new Promise(r=>setTimeout(r,50));assert.ok(f());};
 const a=await open();await until(()=>a.msgs.some(m=>m.type==='welcome'));
 const b=await open();await until(()=>b.msgs.some(m=>m.type==='welcome'));
 assert.ok(a.msgs.some(m=>m.type==='error'&&m.code==='replaced'),'old window told it was replaced');
 assert.ok(!b.msgs.some(m=>m.type==='error'),'new window got in');
 b.ws.close();await service.close();assert.ok(uid);
});

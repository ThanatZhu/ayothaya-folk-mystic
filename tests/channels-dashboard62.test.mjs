import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {RealmServer} from '../server/realm.js';
import {createHost} from '../server/host.js';
import {LocalStore} from '../server/storage.js';
import {initialSave,CHANNELS} from '../realm-state.js';

const map={id:'ayothaya',safe:true,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
const catalog={capital:map.id,maps:[map]};

test('1 server with 5 channels isolates rooms by channel and supports live switchChannel',()=>{
 let time=1000;
 const realm=new RealmServer({catalog,now:()=>time});
 const msgsA=[],msgsB=[];
 const pA=realm.join({uid:'u1',serverId:'server-1',channel:1,slotId:'slot-1',record:{character:{name:'ขุนแผน',gender:'male',classId:'novice'},state:initialSave()},send:m=>msgsA.push(m)});
 const pB=realm.join({uid:'u2',serverId:'server-1',channel:2,slotId:'slot-1',record:{character:{name:'วันทอง',gender:'female',classId:'novice'},state:initialSave()},send:m=>msgsB.push(m)});

 assert.equal(pA.channel,1);
 assert.equal(pB.channel,2);
 assert.equal(realm.snapshot(pA).players.length,0,'different channels do not see each other');

 const switched=realm.receive(pB.id,{type:'switchChannel',seq:pB.seq+1,channel:1});
 assert.equal(switched,true);
 assert.equal(pB.channel,1);
 assert.equal(realm.snapshot(pA).players.length,1,'after switching to channel 1, players see each other');
 assert.ok(msgsB.some(m=>m.type==='channelSwitched'&&m.channel===1));
 assert.equal(realm.channelCounts().length,CHANNELS.length);
});

test('delta snapshot omits unchanged static fields and cuts payload size',()=>{
 const realm=new RealmServer({catalog});
 const pA=realm.join({uid:'u1',serverId:'server-1',channel:1,slotId:'slot-1',record:{character:{name:'นักเดินทาง',gender:'male',classId:'novice'},state:initialSave()},send:()=>{}});
 const pB=realm.join({uid:'u2',serverId:'server-1',channel:1,slotId:'slot-1',record:{character:{name:'สหาย',gender:'female',classId:'novice'},state:initialSave()},send:()=>{}});

 const full=JSON.stringify(realm.snapshot(pA,{delta:false}));
 const delta=JSON.stringify(realm.snapshot(pA,{delta:true}));
 assert.ok(delta.length<full.length*0.6,`delta (${delta.length}B) should be <60% of full (${full.length}B)`);
 assert.ok(pB.id);
});

test('/dashboard endpoint reports channels, bandwidth metrics, and activity logs',async()=>{
 const store=await new LocalStore(await mkdtemp(path.join(tmpdir(),'ayo-dash-'))).init();
 const service=await createHost({mode:'local',store,origins:['http://local.test']});
 await new Promise(r=>service.server.listen(0,'127.0.0.1',r));
 const port=service.server.address().port;
 const res=await fetch(`http://127.0.0.1:${port}/dashboard`);
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.status,'ok');
 assert.equal(data.channels.length,5);
 assert.ok(typeof data.bandwidth?.bytesSent==='number');
 assert.ok(Array.isArray(data.logs));
 await service.close();
});

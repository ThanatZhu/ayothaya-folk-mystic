import test from 'node:test';
import assert from 'node:assert/strict';
import {joinError,cleanDiag} from '../server/host.js';

const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
mem.set('ayothaya-alive',JSON.stringify({at:Date.now()-5000,online:300})); // the previous tab died while online
const {MultiplayerClient}=await import('../multiplayer-client.js');

class FakeSocket extends EventTarget{
 static all=[];
 constructor(){super();this.sent=[];this.readyState=1;FakeSocket.all.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
 send(d){this.sent.push(JSON.parse(d));}
 serve(m){this.dispatchEvent(Object.assign(new Event('message'),{data:JSON.stringify(m)}));}
 drop(code,reason=''){this.dispatchEvent(Object.assign(new Event('close'),{code,reason}));}
 close(){}
}
const welcome={type:'welcome',id:'p1',snapshot:{self:{}},history:[]};
const tick=()=>new Promise(r=>setTimeout(r,0));

test('only a bad token fails authentication; redeploy hiccups are server-busy and the client keeps trying', ()=>{
 assert.equal(joinError(new Error('authority-lost')),'server-busy');
 assert.equal(joinError(new Error('session-lost')),'server-busy');
 assert.equal(joinError(new Error('invalid-token')),'authentication-failed');
 assert.equal(joinError(Object.assign(new Error('x'),{code:'auth/id-token-expired'})),'authentication-failed');
 assert.equal(joinError(Object.assign(new Error('x'),{code:'auth/internal-error'})),'server-busy');
 assert.equal(joinError(new Error('room-full')),'room-full');
 assert.deepEqual(cleanDiag([{kind:'x',at:5,close:1012,reason:'r'.repeat(99),code:7,online:12.6,hidden:1,extra:'no'},null,'bad']),
  [{kind:'socket',at:5,close:1012,reason:'r'.repeat(60),code:'7',online:13,hidden:false,net:''}]);
});

test('a dead tab and a server restart are reported with the next join, and a restart is ridden out', async()=>{
 const client=new MultiplayerClient({url:'ws://x',identity:async()=>({token:'t'}),WebSocketImpl:FakeSocket});
 await client.connect();await tick();
 const first=FakeSocket.all[0];
 assert.equal(first.sent[0].diag[0].kind,'page'); // the tab that died before this load
 first.serve(welcome);assert.equal(client.status,'online');assert.equal(mem.get('ayothaya-drops'),undefined);
 assert.ok(JSON.parse(mem.get('ayothaya-alive')).at);
 first.drop(1012,'restart');
 assert.equal(client.status,'reconnecting');assert.equal(client.updating,true);
 const [drop]=JSON.parse(mem.get('ayothaya-drops'));
 assert.equal(drop.close,1012);assert.equal(drop.kind,'socket');assert.equal(mem.get('ayothaya-alive'),undefined);
 // many failed tries no longer give up: only 5 minutes without a welcome does
 client.retries=40;client.lostAt=Date.now()-200000;
 await client.connect();await tick();
 const second=FakeSocket.all.at(-1);assert.equal(second.sent[0].diag[0].close,1012);
 second.drop(1006);assert.equal(client.status,'reconnecting');
 client.lostAt=Date.now()-301000;await client.connect();await tick();FakeSocket.all.at(-1).drop(1006);
 assert.equal(client.status,'error');
 client.stop();
});

test('a leave or travel is not a drop', async()=>{
 mem.clear();
 const client=new MultiplayerClient({url:'ws://x',identity:async()=>({token:'t'}),WebSocketImpl:FakeSocket});
 await client.connect();await tick();const s=FakeSocket.all.at(-1);s.serve(welcome);
 s.serve({type:'traveled',id:'t'});s.drop(1000);
 assert.equal(mem.get('ayothaya-drops'),undefined);assert.equal(mem.get('ayothaya-alive'),undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiplayerClient} from '../multiplayer-client.js';

test('a sleeping or redeploying server gets five minutes of retries before the client gives up (0.122)', async t => {
 t.mock.timers.enable({apis:['setTimeout','Date']});
 let opened=0;class Dead extends EventTarget{constructor(){super();opened++;queueMicrotask(()=>this.dispatchEvent(new Event('close')));}send(){}close(){}}
 const client=new MultiplayerClient({url:'ws://x',identity:async()=>({}),WebSocketImpl:Dead});const states=[];client.addEventListener('status',e=>states.push(e.detail));
 client.connect();let waited=0;
 while(client.status!=='error'&&waited<400e3){await new Promise(r=>setImmediate(r));t.mock.timers.tick(1000);waited+=1000;}
 assert.equal(client.status,'error');assert.ok(opened>20,'tried '+opened+' times');
 assert.ok(waited>=300e3&&waited<=320e3,'gave up after '+waited/1000+' s');
 assert.ok(states.includes('reconnecting'));assert.equal(client.everOnline,undefined,'never online → UI says waking the server');
});

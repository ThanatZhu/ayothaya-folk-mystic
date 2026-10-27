import test from 'node:test';
import assert from 'node:assert/strict';
import {chatStream,chatVisible} from '../chat-channels191.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

test('map chat contains only room conversation and authenticated announcements',()=>{
 for(const stream of ['room','announcement'])assert.equal(chatVisible('room',stream),true);
 for(const stream of ['system','world','party','guild','whisper'])assert.equal(chatVisible('room',stream),false,stream);
 for(const channel of ['room','world','party','guild','whisper'])assert.equal(chatVisible(channel,'system'),false,channel);
 assert.equal(chatVisible('system','system'),true);
});
test('private channels stay separate; announcements remain available in map, world and system history',()=>{
 for(const channel of ['party','guild','whisper'])for(const stream of ['room','world','party','guild','whisper','system','announcement'])assert.equal(chatVisible(channel,stream),channel===stream);
 for(const channel of ['room','world','system'])assert.equal(chatVisible(channel,'announcement'),true);
 assert.equal(chatVisible('world','world'),true);assert.equal(chatVisible('world','room'),false);
});
test('only server authored announcements bypass room filtering; names and text cannot spoof them',()=>{
 for(const channel of ['system','world'])assert.equal(chatStream({actor:null,name:'ประกาศ',channel,text:'Announced'}),'announcement');
 assert.equal(chatStream({actor:'player-id',name:'ประกาศ',channel:'world',text:'Fake announcement'}),'world');
 assert.equal(chatStream({name:'ระบบ',channel:'system',text:'Announced'}),'system');
 assert.equal(chatStream({actor:null,name:'ระบบ',channel:'system',text:'System'}),'system');
});
test('room transport isolates map, channel and server; channel switch supplies the new room history',()=>{
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},map=id=>({id,safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]});let now=10000;
 const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[map('ayutthaya'),map('rice-fields')]},now:()=>now});
 const add=(name,mapId='ayutthaya',channel=1,serverId='server-1')=>{const messages=[],state=initialSave();state.mapId=mapId;const peer=realm.join({uid:name,serverId,channel,slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state},send:m=>messages.push(m)});return {peer,messages};};
 const a=add('Alice'),b=add('Bobby'),c=add('OtherMap','rice-fields'),d=add('OtherChannel','ayutthaya',2),e=add('OtherServer','ayutthaya',1,'server-2');
 assert.equal(realm.receive(a.peer.id,{type:'chat',channel:'room',text:'Map only',seq:1}),true);
 for(const p of [a,b])assert.equal(p.messages.filter(m=>m.type==='chat'&&m.text==='Map only').length,1);
 for(const p of [c,d,e])assert.equal(p.messages.filter(m=>m.type==='chat'&&m.text==='Map only').length,0);
 now+=2000;realm.receive(d.peer.id,{type:'chat',channel:'room',text:'Channel two history',seq:1});now+=2000;
 assert.equal(realm.receive(a.peer.id,{type:'switchChannel',channel:2,seq:2}),true);
 const switched=a.messages.find(m=>m.type==='channelSwitched');assert.ok(switched.history.some(m=>m.text==='Channel two history'));assert.ok(!switched.history.some(m=>m.text==='Map only'));
});

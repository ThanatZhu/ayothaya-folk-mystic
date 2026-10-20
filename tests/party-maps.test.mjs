import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
test('a party can be formed across maps of the same channel; the roster says where each player is',()=>{
 const map=id=>({id,name:'แผนที่ '+id,safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]});
 let time=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[map('f'),map('g')]},now:()=>time});
 const add=(uid,mapId)=>{const messages=[],state=initialSave();state.mapId=mapId;const peer=realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:'hero-'+uid,gender:'male',classId:'novice'},state,bag:{coins:0,items:{}}},send:m=>messages.push(m)});return {peer,messages};};
 const a=add('a','f'),b=add('b','g');assert.notEqual(a.peer.room,b.peer.room);
 const roster=a.messages.findLast(m=>m.type==='social').players;assert.equal(roster.length,2);assert.equal(roster.find(p=>p.id===b.peer.id).here,false);assert.equal(roster.find(p=>p.id===b.peer.id).map,'แผนที่ g');
 assert.equal(realm.receive(a.peer.id,{type:'invite',seq:1,target:b.peer.id}),true);
 const invite=b.messages.findLast(m=>m.type==='invite');assert.ok(invite);
 assert.equal(realm.receive(b.peer.id,{type:'answer',seq:1,invite:invite.id,accept:true}),true);
 assert.ok(a.peer.partyId);assert.equal(a.peer.partyId,b.peer.partyId);
});

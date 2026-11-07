import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {RealmServer} from '../server/realm.js';import {initialSave} from '../realm-state.js';

const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url)));
function realm(){const r=new RealmServer({catalog,now:()=>10000});
 const join=uid=>r.join({uid,serverId:'server-1',slotId:'slot-1',channel:1,record:{character:{name:uid,gender:'male',classId:'swordsman'},state:{...initialSave(),mapId:'ayutthaya'},bag:{items:{},coins:100}},send(){}});
 return {r,join};}
const lastInspect=p=>p.world.events.filter(e=>e.type==='inspect').at(-1);

test('inspect shows gear and power by default',()=>{
 const {r,join}=realm(),a=join('Viewer'),b=join('Target');
 assert.equal(a.room,b.room,'same room');
 r.receive(a.id,{type:'inspect',seq:2,target:b.id});
 const e=lastInspect(a);
 assert.ok(e&&e.gear&&typeof e.power==='number','gear and power visible');
 assert.ok(!e.private);
});

test('a player can hide their gear and power from inspect, and it persists',()=>{
 const {r,join}=realm(),a=join('Viewer'),b=join('Target');
 assert.equal(r.receive(b.id,{type:'inspectPrivacy',seq:2,hidden:true}),true);
 assert.equal(b.inspectHidden,true);
 assert.equal(r.record(b,{state:initialSave()}).inspectHidden,true,'saved in the record');
 a.inspectAt=-1e9; // clear the inspect cooldown
 r.receive(a.id,{type:'inspect',seq:2,target:b.id});
 const e=lastInspect(a);
 assert.ok(e.private&&e.gear===undefined&&e.power===undefined,'gear and power hidden');
 assert.equal(e.name,'Target','name, class and level still shown');
 // turning it back off restores visibility
 assert.equal(r.receive(b.id,{type:'inspectPrivacy',seq:3,hidden:false}),true);
 a.inspectAt=-1e9;r.receive(a.id,{type:'inspect',seq:3,target:b.id});
 assert.ok(lastInspect(a).gear&&!lastInspect(a).private,'visible again');
});

test('inspectPrivacy with no hidden field just reports the current state',()=>{
 const {r,join}=realm(),b=join('Target');let sent=[];b.send=d=>sent.push(d);
 b.inspectHidden=true;
 assert.equal(r.receive(b.id,{type:'inspectPrivacy',seq:2}),true);
 assert.equal(b.inspectHidden,true,'a query does not change the setting');
 assert.ok(b.world.events.some(e=>e.type==='inspectPrivacy'&&e.hidden===true),'echoes current state');
});

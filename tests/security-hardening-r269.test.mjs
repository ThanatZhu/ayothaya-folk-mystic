import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {RealmServer} from '../server/realm.js';import {initialSave} from '../realm-state.js';import {WAR} from '../guild-war.js';

const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url)));
let clock=10000;
function realm(){clock=10000;const r=new RealmServer({catalog,now:()=>clock});
 const join=(uid,mapId='ayutthaya')=>r.join({uid,serverId:'server-1',slotId:'slot-1',channel:1,record:{character:{name:uid,gender:'male',classId:'swordsman'},state:{...initialSave(),mapId},bag:{items:{},coins:100}},send(){}});
 return {r,join};}

test('a malformed or disallowed command is still charged against the rate bucket',()=>{
 const {r,join}=realm(),p=join('Mallory'),before=p.bucket;
 r.receive(p.id,{type:'definitely-not-a-command',seq:1});
 assert.equal(p.bucket,before-1,'an unknown type costs a token (metered before validation)');
 r.receive(p.id,{nonsense:true});
 assert.equal(p.bucket,before-2,'a shapeless message also costs a token');
});

test('switchChannel is refused on the war map during an active war, allowed otherwise',()=>{
 const {r,join}=realm(),p=join('Warrior',WAR.map);
 assert.equal(p.room.map.id,WAR.map,'joined the war map');
 r.warState('server-1').active=true;
 assert.equal(r.receive(p.id,{type:'switchChannel',seq:2,channel:2}),false,'blocked mid-war');
 assert.equal(p.channel??1,1,'did not escape to another channel');
 r.warState('server-1').active=false;
 assert.equal(r.receive(p.id,{type:'switchChannel',seq:3,channel:2}),true,'allowed once the war is over');
 assert.equal(p.channel,2,'switched');
});

test('a per-player cooldown throttles repeated leaderboard reads',()=>{
 const {r,join}=realm(),p=join('Ranker');let calls=0;r.leaderboard=()=>{calls++;return [];};
 r.receive(p.id,{type:'leaderboard',seq:2});r.receive(p.id,{type:'leaderboard',seq:3});
 assert.equal(calls,1,'the second immediate read is throttled');
 clock+=1000;r.receive(p.id,{type:'leaderboard',seq:4});
 assert.equal(calls,2,'allowed again after the 1 s cooldown');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAuto,pickPotion} from '../auto-play.js';
import {CombatWorld} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
test('AUTO settings are cleaned and pick the strongest potion for the bar that fell',()=>{
 assert.deepEqual(normalizeAuto({skills:[0,0,3,12,'x',-1],hp:150,mp:-5}),{skills:[0,3],hp:90,mp:0});
 assert.deepEqual(normalizeAuto(null),{skills:[0],hp:40,mp:0});
 const p={hp:30,maxHp:100,mp:100,maxMp:100},bag={items:{'hp-small':2,'hp-large':1,'mp-small':3}};
 assert.equal(pickPotion(bag,p,{hp:40,mp:0}),'hp-large');assert.equal(pickPotion(bag,{...p,hp:50},{hp:40,mp:0}),null);
 assert.equal(pickPotion(bag,{...p,hp:90,mp:20},{hp:40,mp:30}),'mp-small');assert.equal(pickPotion(bag,p,{hp:0,mp:0}),null);
});
test('AUTO casts ticked skills in reach and leaves unticked ones alone',()=>{
 const run=skills=>{const w=new CombatWorld({classId:'swordsman'});w.safe=false;const m=w.mobs[0];Object.assign(m,{x:w.player.x+1,z:w.player.z,home:{x:w.player.x+1,z:w.player.z}});
  w.toggleAuto();w.autoConfig=normalizeAuto({skills,hp:0,mp:0});let casts=0;for(let t=0;t<4;t+=.05){w.update(.05,{x:0,z:0,attack:false});for(const e of w.events.splice(0))if(e.type==='cast'&&Number.isInteger(e.skillIndex))casts++;}return casts;};
 assert.ok(run([0])>=2);assert.equal(run([]),0);
});
test('the realm server takes the AUTO settings and drinks a potion under the threshold',()=>{
 const map={id:'f',safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
 let time=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>time});
 const record={character:{name:'tester',gender:'male',classId:'novice'},state:initialSave(),bag:{coins:0,items:{'hp-small':2}}};
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 const send=(type,data)=>{time+=100;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 assert.equal(send('autoConfig',{skills:[0],hp:50,mp:0}),true);assert.deepEqual(peer.world.autoConfig,{skills:[0],hp:50,mp:0});
 peer.world.auto=true;peer.world.player.hp=20;time+=1000;realm.autoPotion(peer);
 assert.ok(peer.world.player.hp>20);assert.equal(peer.bag.items['hp-small'],1);
 realm.autoPotion(peer);assert.equal(peer.bag.items['hp-small'],1,'0.8 s between drinks');
});

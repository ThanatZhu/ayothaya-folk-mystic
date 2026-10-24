import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld,MONSTER_TYPES} from '../combat-core.js';
import {normalizeAutoTarget,autoTargetAllows} from '../auto-targets.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const map={id:'field',name:'Field',safe:false,nav:{zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[4,0,4],[5,0,5]]};
test('AUTO target filters distinguish monster types, legal entity IDs and all monsters',()=>{
 assert.equal(normalizeAutoTarget({kind:'entity',id:'random-player'}),null);assert.equal(normalizeAutoTarget({kind:'type',type:-1}),null);assert.deepEqual(normalizeAutoTarget({kind:'monsters',admin:true}),{kind:'monsters'});
 const monster={id:1,type:4},player={id:'duel:a',pvp:true};assert.equal(autoTargetAllows({kind:'monsters'},monster),true);assert.equal(autoTargetAllows({kind:'monsters'},player),false);assert.equal(autoTargetAllows({kind:'type',type:5},monster),false);assert.equal(autoTargetAllows({kind:'entity',id:'duel:a'},player),true);assert.equal(autoTargetAllows(null,monster,4),true);
});
test('AUTO locks the selected kind or enemy, keeps quest hunts and refuses unknown players',()=>{
 const w=new CombatWorld(map);w.setAuto(true,null,{kind:'type',type:5});assert.equal(w.prey(w.mobs.find(m=>m.type===4)),false);assert.equal(w.prey(w.mobs.find(m=>m.type===5)),true);
 w.foe={id:'duel:allowed',pvp:true,hp:100,x:20,z:0};assert.equal(w.setAuto(true,null,{kind:'entity',id:'duel:allowed'}),true);w.update(.1,{x:0,z:0});assert.equal(w.targetId,'duel:allowed');
 assert.equal(w.setAuto(true,null,{kind:'entity',id:'duel:stranger'}),false);assert.equal(w.autoTarget.id,'duel:allowed');w.setAuto(true,4);assert.equal(w.autoTarget,null);assert.equal(w.hunt,4);w.setAuto(false);assert.equal(w.autoTarget,null);assert.equal(w.prey(w.mobs[0]),true);
});
test('server AUTO target selection cannot turn an ordinary player into a PvP enemy',()=>{
 const realm=new RealmServer({catalog:{capital:'field',maps:[map]},now:()=>1e5}),messages=[],state=initialSave();state.mapId='field';
 const p=realm.join({uid:'a',serverId:'server-1',slotId:'slot-1',record:{character:{name:'Hero',gender:'male',classId:'novice'},state},send:m=>messages.push(m)}),q=realm.join({uid:'b',serverId:'server-1',slotId:'slot-1',record:{character:{name:'Friend',gender:'male',classId:'novice'},state},send:()=>{}});
 realm.receive(p.id,{type:'auto',seq:1,on:true,target:{kind:'entity',id:'duel:'+q.id}});assert.equal(p.world.auto,false);assert.equal(p.world.foe,null);
 realm.startDuel(p,q);realm.receive(p.id,{type:'auto',seq:2,on:true,target:{kind:'entity',id:p.world.foe.id}});assert.equal(p.world.auto,true);assert.equal(p.world.targetId,p.world.foe.id);assert.deepEqual(realm.snapshot(p).self.autoTarget,{kind:'entity',id:p.world.foe.id});
 realm.receive(p.id,{type:'auto',seq:3,on:true,target:{kind:'type',type:MONSTER_TYPES.length+1}});assert.equal(p.world.autoTarget.kind,'entity');
});

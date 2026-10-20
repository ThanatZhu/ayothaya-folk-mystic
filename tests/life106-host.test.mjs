import test from 'node:test';
import assert from 'node:assert/strict';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {RUN_MULTIPLIER} from '../character-action-state.js';

test('released host enables authoritative run and publishes it for shaman and dual-dagger players',async()=>{
 const map={id:'ayutthaya',safe:true,spawn:{x:0,z:0},nav:{zones:[{x:-50,z:-50,w:100,d:100}],obstacles:[],props:[]},mobs:[]};
 const host=await createHost({mode:'local',store:{},catalog:{capital:map.id,maps:[map]}});
 try{
  assert.equal(host.realm.runEnabled,true);
  for(const classId of ['shaman','rogue']){
   const p=host.realm.join({uid:classId,serverId:'server-1',slotId:'slot-1',record:{character:{name:classId,gender:'male',classId},state:initialSave()},send(){}});
   const start=p.world.player.x,speed=p.world.walkSpeed();
   assert.equal(host.realm.receive(p.id,{type:'input',seq:p.seq+1,x:1,z:0,attack:false,run:true}),true);
   host.realm.step(.05);
   assert.ok(Math.abs(p.world.player.x-start-speed*RUN_MULTIPLIER*.05)<1e-8);
   assert.equal(host.realm.snapshot(p).self.player.running,true);
  }
 }finally{await host.close();}
});

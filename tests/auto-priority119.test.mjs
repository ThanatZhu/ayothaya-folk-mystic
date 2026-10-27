import test from 'node:test';import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
// 0.119 owner: with the 1 s gap between skills every skill comes back at once, and AUTO took the first one on the
// hotbar each time, so a Muay only ever threw หมัดนำ. AUTO now takes the ready skill with the longest cooldown.
test('AUTO fires the long-cooldown skills and keeps the short one for the gaps', ()=>{
 const map={id:'f',name:'ทุ่ง',safe:false,nav:{zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[1,2,0]]};
 let t=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>t,roleSkills:true}),used=new Set();
 const state=initialSave();state.mapId='f';
 const p=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record:{character:{name:'Muay',gender:'male',classId:'boxer'},state,bag:{coins:0,items:{}}},send:m=>{for(const e of m.events??[])if(e.type==='cast'&&e.roleSkillId)used.add(e.skillIndex);}});
 const w=p.world;w.skillLevels=w.skills.map(()=>5);w.player.mp=w.player.maxMp=99999;
 let seq=0;const say=m=>realm.receive(p.id,{seq:++seq,...m});
 say({type:'autoConfig',skills:[0,1,2,3,4,5],hp:0,mp:0});say({type:'auto',on:true});
 const mob=p.room.mobs[0];
 for(let i=0;i<400;i++){t+=50;mob.hp=mob.maxHp=1e9;realm.step(.05);}
 for(const i of [0,1,2,3,4])assert.ok(used.has(i),'skill '+(i+1)+' used: '+[...used]);
});

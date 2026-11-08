import test from 'node:test';import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

// a comment glued to code on one line once disabled the slow rule online
test('a slowed monster walks slower on the server',()=>{
 const walked=slow=>{
  const map={id:'f',name:'ทุ่ง',safe:false,nav:{zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[12,0,1]]};
  const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>1e4}),state=initialSave();state.mapId='f';
  const p=realm.join({uid:'u1',serverId:'server-1',slotId:'slot-1',record:{character:{name:'ผู้ทดสอบ',gender:'male',classId:'novice'},state,bag:{coins:5,items:{}}},send:()=>{}});
  p.world.player.maxHp=p.world.player.hp=1e9;const [m]=p.room.mobs;m.aggro=true;m.x=12;m.z=0;if(slow)m.petSlow=5;
  for(let i=0;i<10;i++)realm.step(.05);return 12-m.x;
 };
 const normal=walked(false),slowed=walked(true);
 assert.ok(normal>0,'it walks toward the player');assert.ok(slowed<normal*.75,normal+' vs '+slowed);
});

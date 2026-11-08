import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

// r275 put a comment in front of rallyPack/amuletCrit on the same line in realm.hurt, so online packs never rallied.
test('hitting a monster online wakes its pack mates',()=>{
 const map={id:'f',name:'ทุ่ง',safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[4,0,1],[5,1,1],[5,-1,1]]};
 const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>1e4}),state=initialSave();state.mapId='f';
 const p=realm.join({uid:'u1',serverId:'server-1',slotId:'slot-1',record:{character:{name:'ผู้ทดสอบ',gender:'male',classId:'novice'},state,bag:{coins:5,items:{}}},send:()=>{}});
 const [a,b,c]=p.room.mobs;for(const m of [a,b,c]){m.pack=7;m.aggro=false;m.hp=m.maxHp=1000;}
 realm.hurt(p,a,10);
 assert.equal(b.aggro,true);assert.equal(c.aggro,true);
});

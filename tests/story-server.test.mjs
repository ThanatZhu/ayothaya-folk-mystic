import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MONSTER_TYPES} from '../combat-core.js';

const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const city={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[{to:'rice-fields',x:0,z:30}],npcs:[{name:'ลุงเรือง',x:4,z:0,text:'-'},{name:'ขุนอินทร์',x:-10,z:0,text:'-'}]};
const straw=MONSTER_TYPES.findIndex(t=>t.id==='straw');
const fields={id:'rice-fields',safe:false,nav,spawn:{x:0,z:0},mobs:[[1,0,straw],[2,0,straw],[3,0,straw],[4,0,straw],[5,0,straw]],portals:[{to:'ayutthaya',x:0,z:30}],npcs:[{name:'ป้าละไม',x:0,z:-3,text:'-'}]};

function setup(map,story){
 let time=1e4;const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[city,fields]},now:()=>time});
 const state=initialSave();state.mapId=map.id;
 const record={character:{name:'tester',gender:'female',classId:'novice'},state,...(story?{story}:{})};
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 const send=(type,data)=>{time+=200;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 return {realm,peer,send,record};
}

test('story talk only counts next to the right NPC, then pays the quest reward and is saved', () => {
 const {realm,peer,send,record}=setup(city);
 assert.deepEqual(realm.snapshot(peer).self.story,{quest:0,step:0,count:0,done:false});
 Object.assign(peer.world.player,{x:-8,z:0});
 assert.equal(send('questTalk',{npc:'ลุงเรือง'}),false,'too far from ลุงเรือง');
 assert.equal(send('questTalk',{npc:'ขุนอินทร์'}),false,'right place, wrong step');
 assert.equal(send('questTalk',{npc:'ไม่มีจริง'}),false);
 Object.assign(peer.world.player,{x:3,z:0});
 assert.equal(send('questTalk',{npc:'ลุงเรือง'}),true);
 const xp=peer.world.baseXp;
 Object.assign(peer.world.player,{x:-9,z:0});
 assert.equal(send('questTalk',{npc:'ขุนอินทร์'}),true);
 assert.ok(peer.world.baseXp>xp,'quest reward paid');
 assert.equal(realm.snapshot(peer).self.story.quest,1);
 assert.deepEqual(realm.record(peer,record).story,{quest:1,step:0,count:0,done:false});
 assert.ok(peer.world.events.some(e=>e.type==='story'&&e.completed==='คืนที่ประทีปดับ'));
});

test('entering a map completes an "enter" step; kills count toward a defeat step on the server', () => {
 const {realm,peer}=setup(fields,{quest:2,step:0});
 assert.equal(realm.snapshot(peer).self.story.step,1,'arriving in rice-fields completed the enter step');
 const hunt=setup(fields,{quest:3,step:0});
 for(const mob of hunt.peer.room.mobs){Object.assign(hunt.peer.world.player,{x:mob.x,z:mob.z+1});hunt.realm.hurt(hunt.peer,mob,9999);}
 assert.deepEqual(hunt.realm.snapshot(hunt.peer).self.story,{quest:3,step:1,count:0,done:false});
});

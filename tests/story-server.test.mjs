import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MONSTER_TYPES} from '../combat-core.js';

const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const city={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[{to:'rice-fields',x:0,z:30}],npcs:[{name:'ลุงเรือง',x:4,z:0,text:'-'},{name:'ครูแสนดาบ',x:-10,z:0,text:'-'}]};
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

// 0.123 chapter 1 is retired: any saved main-campaign progress is held as finished, so no talk, map or kill can
// advance it or pay a chapter-1 reward again
test('the realm holds every main-campaign save as finished and pays nothing for it', () => {
 for(const story of [undefined,{v:4,quest:0,step:0},{v:4,quest:4,step:0},{v:3,quest:12,step:1},{v:4,quest:99,done:true}]){
  const {realm,peer,send,record}=setup(story?.quest===4?fields:city,story);
  const done={v:4,quest:23,step:0,count:0,done:true};
  assert.deepEqual(realm.snapshot(peer).self.story,done);
  const xp=peer.world.baseXp,coins=peer.bag.coins;
  Object.assign(peer.world.player,{x:3,z:0});assert.equal(send('questTalk',{npc:'ลุงเรือง'}),false);
  assert.equal(peer.bag.coins,coins);assert.equal(peer.world.baseXp,xp);assert.ok(!peer.bag.items['starter-wraps']);
  for(const mob of peer.room.mobs){Object.assign(peer.world.player,{x:mob.x,z:mob.z+1});realm.hurt(peer,mob,9999);}
  assert.deepEqual(realm.record(peer,record).story,done);
 }
});


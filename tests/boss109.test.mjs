import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MONSTER_TYPES} from '../combat-core.js';
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const field={id:'field',name:'ทุ่ง',safe:false,nav,spawn:{x:0,z:0},mobs:[[5,5,0]]};
const town={...field,id:'town',name:'เมือง',safe:true},cellar={...field,id:'cellar',instance:true};
function setup(){
 let time=1e6;const realm=new RealmServer({catalog:{capital:'field',maps:[field,town,cellar]},now:()=>time}),out=[];
 const p=realm.join({uid:'a',serverId:'server-1',slotId:'slot-1',record:{character:{name:'hero',gender:'male',classId:'swordsman'},state:initialSave()},send:m=>out.push(m)});
 return {realm,p,out};
}
test('the back office summons a one-off world boss on a chosen field map and announces it',()=>{
 const {realm,p,out}=setup(),mvp=MONSTER_TYPES.findIndex(t=>t.mvp),clock=realm.mvpState('server-1').nextAt;
 const r=realm.summonBoss({serverId:'server-1',mapId:'field'});assert.equal(r.name,MONSTER_TYPES[mvp].name);
 const boss=p.room.mobs.find(m=>m.summoned);assert.ok(boss&&boss.hp===MONSTER_TYPES[mvp].hp&&boss.type===mvp);
 assert.ok(out.some(m=>m.type==='chat'&&/บอสโลก/.test(m.text)),'announced');
 // killed: top damage gets the prize, it stays down, and the timed MVP clock is untouched
 Object.assign(p.world.player,{x:boss.x,z:boss.z});realm.hurt(p,boss,boss.hp+5);
 assert.equal(boss.hp,0);assert.equal(boss.dead,1e9);assert.equal(p.bag.items['king-ember'],1);assert.equal(realm.mvpState('server-1').nextAt,clock);
 assert.equal(realm.summonBoss({mapId:'field'}).name,MONSTER_TYPES[mvp].name,'a new one can be called after');
});
test('many bosses at once, at a chosen spot, each with its own winner',()=>{
 const {realm,p}=setup();
 const r=realm.summonBoss({mapId:'field',count:5,x:10,z:-12});assert.equal(r.count,5);assert.deepEqual([r.x,r.y],[10,12]);
 const bosses=p.room.mobs.filter(m=>m.summoned&&m.hp>0);assert.equal(bosses.length,5);
 assert.ok(bosses.every(b=>Math.hypot(b.x-10,b.z+12)<4),'grouped around the spot');
 realm.hurt(p,bosses[0],bosses[0].hp);assert.equal(p.bag.items['king-ember'],1);assert.equal(bosses[1].hp,bosses[1].maxHp,'the others are untouched');
 assert.throws(()=>realm.summonBoss({mapId:'field',x:500,z:500}),/bad-spot/,'off the map');
 assert.throws(()=>realm.summonBoss({mapId:'field',count:20})&&realm.summonBoss({mapId:'field',count:20})&&realm.summonBoss({mapId:'field',count:20}),/boss-many/);
});
test('no world boss in towns, dungeons, unknown maps, or for non-boss monsters',()=>{
 const {realm}=setup();
 for(const mapId of ['town','cellar','nowhere'])assert.throws(()=>realm.summonBoss({mapId}),/bad-map/,mapId);
 assert.throws(()=>realm.summonBoss({mapId:'field',typeId:0}),/bad-boss/);
 assert.equal(realm.summonBoss({serverId:'server-2',mapId:'field'}).map,'ทุ่ง','works with no player on that map yet');
});

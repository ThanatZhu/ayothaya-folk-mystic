import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer,DUEL} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const map={id:'f',safe:false,nav:{zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
function setup(){
 let time=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>time}),out={};
 const join=(uid,classId)=>{out[uid]=[];return realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:'hero-'+uid,gender:'male',classId},state:initialSave(),bag:{coins:0,items:{}}},send:m=>out[uid].push(m)});};
 const a=join('a','swordsman'),b=join('b','swordsman');Object.assign(a.world.player,{x:0,z:0});Object.assign(b.world.player,{x:1,z:0});
 const send=(p,type,data)=>{time+=100;return realm.receive(p.id,{type,seq:p.seq+1,...data});};
 return {realm,a,b,send,out,tick:ms=>{time+=ms;realm.step(.05);}};
}
test('a duel starts when both players challenge each other and ends at a knockout without dying',()=>{
 const {realm,a,b,send,out}=setup();
 assert.equal(send(a,'duel',{target:b.id}),true);assert.equal(out.b.find(m=>m.type==='duelAsk')?.from,a.id);assert.equal(a.duel,undefined);
 assert.equal(send(b,'duel',{target:a.id}),true);assert.equal(a.duel.foe,b.id);assert.equal(b.duel.foe,a.id);
 assert.equal(a.world.target?.id,'duel:'+b.id,'the opponent is targeted at once');
 b.world.player.hp=5;realm.duelSync(a);let swings=0;while(b.duel&&swings++<200){a.world.player.attackCD=0;a.world.basicAttack();}
 assert.equal(b.duel,null);assert.equal(a.duel,null);assert.equal(b.world.player.hp,1,'the loser keeps 1 HP');assert.ok(!(b.world.player.down>0));
 assert.equal(a.world.foe,null);
});
test('player hits are scaled down and the bout ends as a draw when the players walk apart',()=>{
 const {realm,a,b,send,tick}=setup();send(a,'duel',{target:b.id});send(b,'duel',{target:a.id});
 const before=b.world.player.hp;realm.hurt(a,a.world.foe,100);const lost=before-b.world.player.hp;assert.ok(lost===0||lost<=Math.round(100*DUEL.scale),'scaled: '+lost);
 b.world.player.x=DUEL.range+5;tick(50);assert.equal(a.duel,null);assert.equal(b.duel,null);
});
test('duels are refused in safe towns, while busy, and an opponent leaving hands the win over',()=>{
 const {realm,a,b,send,out}=setup();a.room.map={...map,safe:true};send(a,'duel',{target:b.id});assert.equal(out.a.at(-1).code,'duel-invalid');a.room.map=map;
 send(a,'duel',{target:b.id});send(b,'duel',{target:a.id});assert.ok(a.duel);
 realm.leave(b.id);realm.step(.05);assert.equal(a.duel,null);assert.equal(a.world.foe,null);
});

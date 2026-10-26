import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const map={id:'f',safe:false,nav:{zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
const other={...map,id:'g'};
function setup(){
 let time=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[map,other]},now:()=>time}),out={};
 const join=(uid,classId,gear={})=>{out[uid]=[];return realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:'hero-'+uid,gender:'male',classId},state:initialSave(),bag:{coins:0,items:{}},gear},send:m=>out[uid].push(m)});};
 const a=join('a','swordsman'),b=join('b','swordsman',{armor:'starter-shirt'});
 const send=(p,type,data)=>{time+=400;return realm.receive(p.id,{type,seq:p.seq+1,...data});};
 const seen=p=>p.world.events.find(e=>e.type==='inspect');
 return {realm,a,b,send,out,seen};
}
test('tapping a player on the same map returns their worn gear, level and power',()=>{
 const {a,b,send,seen}=setup();
 assert.equal(send(a,'inspect',{target:b.id}),true);
 const e=seen(a);assert.ok(e,'inspect event');assert.equal(e.name,'hero-b');assert.equal(e.gear.armor,'starter-shirt');assert.equal(e.id,b.id);
 assert.ok(Number.isFinite(e.power)&&e.level>=1);assert.equal(e.bag,undefined,'never sends the bag');assert.equal(e.stats,undefined);
});
test('players on another map or unknown ids cannot be inspected',()=>{
 const {realm,a,b,send,out}=setup();
 send(a,'inspect',{target:'nobody'});assert.equal(out.a.at(-1).code,'inspect-gone');
 b.room={...b.room};send(a,'inspect',{target:b.id});assert.equal(out.a.at(-1).code,'inspect-gone');
});

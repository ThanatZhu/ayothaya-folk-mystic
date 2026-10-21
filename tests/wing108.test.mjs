import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {randomSpot,walkable} from '../combat-core.js';
import {ITEM_ERRORS} from '../items.js';
const refused=p=>p.world.events.some(e=>e.type==='notice'&&e.text===ITEM_ERRORS['wing-blocked']);
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[{x:-5,z:-5,w:10,d:10}],props:[]};
const map={id:'f',safe:false,nav,spawn:{x:20,z:20},mobs:[]};
function setup(mapDef=map){
 let time=1e4;const realm=new RealmServer({catalog:{capital:'f',maps:[mapDef]},now:()=>time}),out=[];
 const p=realm.join({uid:'a',serverId:'server-1',slotId:'slot-1',record:{character:{name:'hero',gender:'male',classId:'swordsman'},state:initialSave(),bag:{coins:0,items:{'fly-wing':2}}},send:m=>out.push(m)});p.bag={coins:0,items:{'fly-wing':2}};
 const send=(type,data)=>{time+=1000;return realm.receive(p.id,{type,seq:p.seq+1,...data});};
 return {realm,p,send,out};
}
test('randomSpot only lands on walkable ground',()=>{
 let seed=7;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<200;i++){const s=randomSpot(nav,rand);assert.ok(s&&walkable(s.x,s.z,.28,nav),JSON.stringify(s));}
 assert.equal(randomSpot({zones:[],obstacles:[],props:[]}),null);
});
test('the wind wing moves the player to a random walkable spot and uses one wing',()=>{
 const {p,send}=setup();const before={x:p.world.player.x,z:p.world.player.z};
 assert.equal(send('useItem',{item:'fly-wing'}),true);
 assert.equal(p.bag.items['fly-wing'],1);
 const {x,z}=p.world.player;assert.ok(walkable(x,z,.28,p.world.nav));assert.notDeepEqual({x,z},before);
});
test('the wind wing is refused in instances, the guild hall and during a duel, keeping the wing',()=>{
 for(const flag of ['instance','guildHall']){const {p,send,out}=setup();p.room.map={...p.room.map,[flag]:true};
  assert.equal(send('useItem',{item:'fly-wing'}),false);assert.ok(refused(p),flag);assert.equal(p.bag.items['fly-wing'],2);}
 const {p,send,out}=setup();p.duel={foe:'x'};assert.equal(send('useItem',{item:'fly-wing'}),false);assert.ok(refused(p));assert.equal(p.bag.items['fly-wing'],2);
});

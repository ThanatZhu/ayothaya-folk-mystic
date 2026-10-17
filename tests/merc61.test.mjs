import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CombatWorld,MONSTER_TYPES} from '../combat-core.js';
import {RealmServer,MERC_COST} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]};
test('mercenary hits your target every 1.4 s within 6, then the contract ends', () => {
 const w=new CombatWorld({classId:'novice',safe:false,nav,spawn:{x:0,z:0},mobs:[[2,0,MONSTER_TYPES.findIndex(t=>t.id==='straw')]]});
 const m=w.mobs[0];m.hp=m.maxHp=9999;w.select(m.id);w.hire(3);
 for(let i=0;i<62;i++)w.update(.05,{x:0,z:0},{monsters:false});
 assert.equal(9999-m.hp,3*12,'three hits of 10+2·Lv1');assert.equal(w.merc,null);assert.ok(w.events.some(e=>e.type==='notice'&&e.text.includes('หมดสัญญา')));
});
test('server: hire only at ครูแสนดาบ, charges once', () => {
 const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));const realm=new RealmServer({catalog});let time=Date.now();realm.now=()=>time;
 const p=realm.join({uid:'um',serverId:'server-1',slotId:'slot-1',record:{character:{name:'นายจ้าง',gender:'male',classId:'novice'},state:initialSave(),daily:{day:'2099-01-01',streak:1},bag:{coins:1000,items:{}}},send:()=>{}});
 let seq=0;const send=d=>{time+=1000;return realm.receive(p.id,{type:'hire',seq:++seq,...d});};
 assert.equal(send({}),false,'too far');const npc=catalog.maps[0].npcs.find(n=>n.name==='ครูแสนดาบ');Object.assign(p.world.player,{x:npc.x+1,z:npc.z});
 const before=p.bag.coins;assert.equal(send({}),true);assert.equal(p.bag.coins,before-MERC_COST);assert.equal(send({}),false,'already hired');
});

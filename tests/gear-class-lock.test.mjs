import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEMS} from '../items.js';
import {canWear,equipGear} from '../character-stats.js';
import {lookClass} from '../gear-sets.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

const CLASSES=['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
const looks=Object.entries(ITEMS).filter(([,it])=>it.kind==='gear'&&it.look);

test('every class-look set and boss armor piece fits only its own class (Novices may wear any look)',()=>{
 assert.ok(looks.length>=992,'all 0.117 set pieces and boss armor are covered');
 for(const [id,it] of looks){
  for(const classId of CLASSES)assert.equal(canWear(id,{classId,level:99})===null,lookClass(it.look)===classId,id+' on '+classId);
  assert.equal(canWear(id,{classId:'novice',level:99}),null,id+' on a Novice');
 }
 // nun and monk armor are both the acolyte's; the hunter's hat from the report is the hunter's only
 assert.equal(canWear('mantra-head-hunter-one',{classId:'lancer',level:10}),'wrong-class');
 assert.equal(canWear('mantra-head-nun-one',{classId:'acolyte',level:10}),null);
 assert.throws(()=>equipGear({items:{'mantra-head-hunter-one':1},coins:0},{},'mantra-head-hunter-one',{classId:'lancer',level:10}),/wrong-class/);
});

test('the realm refuses the wrong class and takes already-worn wrong gear off into the bag on join',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
 const realm=new RealmServer({catalog,roleSkills:true,now:()=>Date.UTC(2026,9,28,8)});let seq=0;
 const state=initialSave();state.traveler={...state.traveler,baseXp:5e6};
 const record={character:{name:'Lancer',gender:'male',classId:'lancer',jobId:''},state,daily:{day:'2099-01-01',streak:1},
  gear:{head:'mantra-head-hunter-one',armor:'mantra-armor-lancer-one'},bag:{coins:0,items:{'mantra-garment-hunter-one':1}}};
 const p=realm.join({uid:'u-lock',serverId:'server-1',slotId:'slot-1',channel:1,record,send(){}});
 assert.equal(p.gear.head,null,'the hunter hat came off');assert.equal(p.gear.armor,'mantra-armor-lancer-one','own-class armor stays on');
 assert.equal(p.bag.items['mantra-head-hunter-one'],1,'and went into the bag');
 assert.ok(p.world.events.some(e=>e.type==='notice'&&/อาชีพนี้ใช้ไม่ได้/.test(e.text)),'the player is told why');
 p.gearAt=-Infinity;realm.receive(p.id,{type:'equip',item:'mantra-garment-hunter-one',seq:++seq});
 assert.equal(p.gear.garment,null);assert.equal(p.bag.items['mantra-garment-hunter-one'],1);
});

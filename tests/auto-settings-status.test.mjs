import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {swapSkillSlots,orderedAutoConfig} from '../auto-settings-model.js';
import {STATUS_ICONS,statusDefinition,statusArtStyle,remainingStatus,statusTime} from '../assets/status/status-catalog.js';
import {activeStatusIcons,statusBadgeHTML} from '../status-icons.js';
import {AILMENTS} from '../ailments.js';
import {ITEMS} from '../items.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const bar=Array.from({length:17},(_,i)=>i);
test('reordering the live hotbar preserves every skill once and AUTO follows the skill, including Master',()=>{
 const next=swapSkillSlots(bar,0,10);assert.deepEqual(bar,Array.from({length:17},(_,i)=>i));assert.equal(next[0],10);assert.equal(next[10],0);assert.equal(new Set(next).size,17);
 assert.deepEqual(orderedAutoConfig(next,{skills:[0,10,4],hp:40,mp:20}),{skills:[10,4,0],hp:40,mp:20});
 for(const [from,to] of [[-1,0],[0,17],[NaN,1],[1.5,2]])assert.equal(swapSkillSlots(bar,from,to),null);assert.equal(swapSkillSlots(Array(17).fill(0),0,1),null);
});
test('status atlas covers all 24 buffs, 12 debuffs, current ailments and every food stat',async()=>{
 assert.equal(STATUS_ICONS.length,36);assert.equal(new Set(STATUS_ICONS.map(s=>s.id)).size,36);assert.equal(STATUS_ICONS.filter(s=>s.kind==='buff').length,24);
 for(const id of Object.keys(AILMENTS))assert.ok(statusDefinition(id),id);
 for(const [id,item] of Object.entries(ITEMS))if(item.buff){const a=activeStatusIcons({food:{id,left:600}});assert.equal(a.length,Object.keys(item.buff).length,id);}
 for(const file of ['buffs-v1.png','debuffs-v1.png']){const png=await readFile(new URL('../assets/status/'+file,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.length>500000);}
 for(const s of STATUS_ICONS)assert.ok(!statusArtStyle(s.id).includes('NaN'));
});
test('HUD shows only active effects with truthful durations and one shield, and ignores invalid status input',()=>{
 const world={player:{shield:7.2},status:{poison:3.1,sleep:0,shield:7.2,curse:Infinity,root:{time:1.2},notReal:100},food:{id:'miang-kham',left:61}};
 const effects=activeStatusIcons(world);assert.equal(effects.filter(e=>e.id==='shield').length,1);assert.equal(effects.find(e=>e.id==='poison').seconds,4);assert.ok(effects.some(e=>e.id==='agility'));assert.ok(!effects.some(e=>e.id==='curse'||e.id==='sleep'||e.id==='notReal'));
 assert.equal(remainingStatus({time:2.1}),3);assert.equal(remainingStatus(-1),0);assert.equal(statusTime(61),'2m');assert.ok(statusBadgeHTML(effects[0]).includes('status-art'));assert.equal(statusBadgeHTML({id:'notReal'}),'');
});
test('online food buffs publish remaining time only to the owner and clear when expired',()=>{
 const map={id:'f',safe:true,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
 const realm=new RealmServer({catalog:{capital:'f',maps:[map]}}),join=uid=>realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:uid,gender:'male',classId:'novice'},state:initialSave(),bag:{coins:0,items:{}}},send:()=>{}});
 const a=join('aa'),b=join('bb');a.world.food={id:'miang-kham',left:59.4};
 assert.deepEqual(realm.snapshot(a).self.food,{id:'miang-kham',left:60});assert.equal(realm.snapshot(b).players.find(p=>p.id===a.id).food,undefined);
 a.world.food=null;assert.equal(realm.snapshot(a).self.food,null);
});

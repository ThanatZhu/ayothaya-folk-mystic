import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLASSES,getClass,className,atlasPath} from '../classes.js';
import {CombatWorld} from '../combat-core.js';
import {character} from '../realm-state.js';
import {createRealmStore} from '../realm-store.js';
import {poseFrame,atlasCell,previewPose} from '../sprite-motion.js';
const nav={zones:[{x:-15,z:-15,w:30,d:30}],obstacles:[],props:[]};
const world=id=>new CombatWorld({classId:id,nav,spawn:{x:0,z:0},mobs:[[1,0,0]]});
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
test('all fourteen appearances have valid identities and shipped 4 x 2 atlases',()=>{
 assert.equal(CLASSES.length,7);assert.equal(new Set(CLASSES.map(c=>c.id)).size,7);
 for(const c of CLASSES){for(const gender of ['male','female'])assert.equal(character({name:'ทดสอบ',gender,classId:c.id}).classId,c.id);
 const png=fs.readFileSync(new URL('../'+atlasPath(c.id),import.meta.url));assert.equal(png.readUInt32BE(16)/png.readUInt32BE(20),2);}
 assert.equal(className('acolyte','male'),'พระ');assert.equal(className('acolyte','female'),'แม่ชี');
 assert.throws(()=>getClass('fake'));
});
test('all seven classes have usable ten-slot skill sets with damage/resource effects',()=>{
 for(const c of CLASSES){const w=world(c.id);assert.equal(w.skills.length,10);
 for(let i=0;i<10;i++){const w=world(c.id);w.player.hp=10;w.select(0);assert.equal(w.skill(i),true,c.id+':'+i);assert.ok(w.cooldowns[i]>0);assert.ok(w.player.mp>=0&&w.player.mp<=100);
 if(i===4)assert.ok(w.player.hp>10);if([0,1,2,3,6,9].includes(i))assert.ok(w.mobs[0].hp<78,c.id+': damage '+i);}
 }
});
test('melee cannot hit at bow range; attack visuals and timing reflect each class',()=>{
 for(const c of CLASSES){const w=world(c.id);w.mobs[0].x=4;w.select(0);const expected=c.range>=4;assert.equal(w.basicAttack(),expected,c.id);
 if(expected){assert.equal(w.events.find(e=>e.type==='cast').kind,c.kind);assert.equal(w.player.attackCD,c.delay);}
 }
 assert.ok(getClass('boxer').delay<getClass('lancer').delay);
 assert.ok(getClass('hunter').range>getClass('swordsman').range);
});
test('short-range auto attackers close the gap and defeat a target',()=>{
 for(const id of ['swordsman','lancer','boxer','rogue']){const w=world(id);w.mobs[0].x=5;w.mobs[0].home.x=5;w.toggleAuto();for(let t=0;t<20;t+=.05)w.update(.05);assert.ok(w.kills>0,id);}
});
test('profession change preserves progress and identity and rejects stale saves',async()=>{
 const mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
 const store=createRealmStore({catalog,storage});let record=await store.create('server-2',{name:'แก้ว',gender:'female',classId:'shaman'});
 record.state.traveler.kills=19;record.state.traveler.cooldowns[0]=1;record=await store.save('server-2',record,record.state);
 const changed=await store.changeClass('server-2',record,'boxer');assert.equal(changed.character.classId,'boxer');assert.equal(changed.character.name,'แก้ว');assert.equal(changed.character.gender,'female');assert.deepEqual(changed.state,record.state);
 assert.equal((await store.load('server-2')).character.classId,'boxer');await assert.rejects(store.changeClass('server-2',record,'hunter'),/save-conflict/);await assert.rejects(store.changeClass('server-2',changed,'invalid'),/อาชีพ/);
});
test('animation timing covers idle, both walk poses, casting and reduced motion',()=>{
 assert.equal(poseFrame({time:1}),0);assert.equal(poseFrame({casting:true,moving:true}),3);
 assert.deepEqual([0,1/9,2/9,3/9].map(time=>poseFrame({time,moving:true})),[1,0,2,0]);
 assert.equal(poseFrame({moving:true,reduced:true}),0);assert.deepEqual(atlasCell('female',3),[.75,.5,.25,.5]);assert.deepEqual(atlasCell('male',0),[0,0,.25,.5]);
 assert.equal(previewPose(5.2).casting,true);assert.equal(previewPose(3).moving,true);
});

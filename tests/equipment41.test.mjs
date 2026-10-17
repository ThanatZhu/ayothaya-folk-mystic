import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EQUIPMENT,starterEquipment,normalizeEquipment,equipItem,equipmentAppearance} from '../equipment.js';
import {createRealmStore} from '../realm-store.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url)));
test('starter grants cover every class; invalid or foreign weapons cannot be equipped',()=>{
 assert.equal(new Set(EQUIPMENT.map(i=>i.id)).size,48);
 for(const id of new Set(EQUIPMENT.map(i=>i.classId))){assert.equal(starterEquipment(id).length,6);let gear=normalizeEquipment(null,id);gear=equipItem(gear,id,`${id}-weapon-crafted`);gear=equipItem(gear,id,`${id}-outfit-crimson`);assert.equal(gear.weapon,`${id}-weapon-crafted`);assert.equal(gear.outfit,`${id}-outfit-crimson`);}
 assert.throws(()=>equipItem(null,'novice','swordsman-weapon-crafted'),/equipment-class/);assert.throws(()=>equipItem(null,'novice','forged'),/equipment-item/);
 assert.deepEqual(normalizeEquipment({weapon:'lancer-weapon-crafted',outfit:'shaman-outfit-crimson'},'novice'),normalizeEquipment(null,'novice'));
});
test('garment equipment preserves face customization and restores saved costume',()=>{
 const appearance={hair:'braid',hairColor:'silver',eyes:'green',tattoo:'arms',outfit:'ivory'};
 const original=normalizeEquipment(null,'shaman'),red=equipItem(original,'shaman','shaman-outfit-crimson');
 assert.deepEqual(equipmentAppearance(appearance,original,'shaman'),appearance);assert.deepEqual(equipmentAppearance(appearance,red,'shaman'),{...appearance,outfit:'crimson'});assert.equal(appearance.outfit,'ivory');
});
test('equipment persists per character slot without changing novice progression or XP',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},store=createRealmStore({catalog,storage});
 const a=await store.create('server-1',{name:'ทดสอบหนึ่ง',gender:'male'}),b=await store.create('server-1',{name:'ทดสอบสอง',gender:'female'});
 const equipment=equipItem(null,'novice','novice-weapon-crafted');await store.save('server-1',{...a,equipment},a.state);
 const again=createRealmStore({catalog,storage}),saved=await again.load('server-1',a.slotId),other=await again.load('server-1',b.slotId);
 assert.equal(saved.equipment.weapon,'novice-weapon-crafted');assert.equal(other.equipment.weapon,'novice-weapon-basic');assert.equal(saved.character.classId,'novice');assert.equal(saved.state.traveler.baseXp,0);
});
test('known remote characters receive equipment changes and authoritative records keep gear',()=>{
 const realm=new RealmServer({catalog}),join=name=>realm.join({uid:name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state:initialSave()},send:()=>{}});
 const a=join('นักเดินทางหนึ่ง'),b=join('นักเดินทางสอง');realm.snapshot(a);b.equipment=equipItem(b.equipment,'novice','novice-weapon-crafted');
 const remote=realm.snapshot(a).players.find(p=>p.id===b.id);assert.equal(remote.character,undefined);assert.equal(remote.equipment.weapon,'novice-weapon-crafted');assert.equal(remote.uid,undefined);
 assert.equal(realm.record(b,{state:initialSave()}).equipment.weapon,'novice-weapon-crafted');
});
test('new weapons have twenty complete frames per gender without clipped source or destination',()=>{
 for(const id of new Set(EQUIPMENT.map(i=>i.classId))){const base=new URL('../assets/equipment41/',import.meta.url),meta=JSON.parse(readFileSync(new URL(id+'.json',base)));
 for(const gender of ['male','female']){assert.ok([20,36].includes(meta.frames[gender].length),'20 poses, or + front/back walk (0.56.2)');for(const f of meta.frames[gender]){const png=readFileSync(new URL(f.source,base)),W=png.readUInt32BE(16),H=png.readUInt32BE(20),[x,y,w,h]=f.rect;assert.ok(x>=0&&y>=0&&x+w<=W&&y+h<=H);const left=128-f.anchor*f.scale;assert.ok(left>=0&&left+w*f.scale<=256&&244-h*f.scale>=0,id+' '+gender);}}}
});

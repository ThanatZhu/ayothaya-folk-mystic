import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {CombatWorld,MONSTER_TYPES,AUTO_RANGE,TOWN_PACE} from '../combat-core.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));

test('town gates are a cart ride (no walk to the gate); field portals still need you there', () => {
 const realm=new RealmServer({catalog});const join=mapId=>{const state=initialSave();state.mapId=mapId;return realm.join({uid:'u'+mapId,serverId:'server-1',slotId:'slot-1',record:{character:{name:'นักเดิน',gender:'male',classId:'novice'},state,daily:{day:'2099-01-01',streak:1}},send:()=>{}});};
 const town=join('ayutthaya');Object.assign(town.world.player,{x:-40,z:-70});
 assert.equal(realm.travelDestination(town,'rice-fields').id,'rice-fields');
 assert.throws(()=>realm.travelDestination(town,'moonlit-mill'),/travel-invalid/,'only the town\'s own gates');
 const field=join('rice-fields');Object.assign(field.world.player,{x:-40,z:-40});
 assert.throws(()=>realm.travelDestination(field,'ayutthaya'),/travel-invalid/);
});

test('AUTO finds monsters up to 14 away and towns are walked faster', () => {
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},rat=MONSTER_TYPES.findIndex(t=>t.id==='rat');
 const w=new CombatWorld({classId:'novice',safe:false,nav,spawn:{x:0,z:0},mobs:[[13,0,rat]]});w.toggleAuto();
 assert.equal(AUTO_RANGE,14);assert.ok(w.nearest(),'a monster 13 away is found');
 const town=new CombatWorld({classId:'novice',safe:true,nav,spawn:{x:0,z:0}});
 assert.equal(town.walkSpeed(),w.walkSpeed()*TOWN_PACE);
});

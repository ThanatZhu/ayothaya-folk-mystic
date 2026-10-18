import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CombatWorld} from '../combat-core.js';
import {captureSave,applySave,validateSave,nextRevision} from '../save-state.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
const map=catalog.maps[0];
const capture=world=>captureSave(world,map,{zoom:1.3},{getAzimuthalAngle:()=>.7},false);
test('expanded district saves restore far coordinates and overview does not save invalid zoom',()=>{
 const {x,z}=map.masterCourt,a=new CombatWorld(map);a.player.x=x;a.player.z=z;
 const data=captureSave(a,map,{zoom:.14},{getAzimuthalAngle:()=>.7},true);
 const b=new CombatWorld(map);applySave(b,map,validateSave(data,catalog));
 assert.equal(b.player.x,x);assert.equal(b.player.z,z);assert.equal(data.settings.zoom,.65);
 for(const m of catalog.maps.filter(m=>!m.safe))assert.equal(validateSave({...data,mapId:m.id},catalog).mapId,m.id);
});
test('cloud snapshot round-trips resources, cooldowns, map and walkable position',()=>{
 const a=new CombatWorld(map);a.player.hp=81;a.player.mp=35;a.kills=7;a.cooldowns[0]=1.5;
 a.player.x=map.districts[1].x;a.player.z=map.districts[1].z;
 const data=validateSave(JSON.parse(JSON.stringify(capture(a))),catalog),b=new CombatWorld(map);
 applySave(b,map,data);
 assert.equal(b.player.hp,81);assert.equal(b.player.mp,35);assert.equal(b.kills,7);assert.equal(b.cooldowns[0],1.5);
 assert.equal(b.player.x,a.player.x);assert.equal(b.player.z,a.player.z);assert.equal(data.settings.motion,false);
});
test('newer or corrupt saves are rejected rather than replaced by defaults',()=>{
 const data=capture(new CombatWorld(map));
 assert.throws(()=>validateSave({...data,schema:99},catalog),/save-version/);
 assert.throws(()=>validateSave({...data,mapId:'missing'},catalog),/save-map/);
 assert.throws(()=>validateSave({...data,traveler:{...data.traveler,cooldowns:[0]}},catalog),/save-data/);
 assert.throws(()=>validateSave({...data,traveler:{...data.traveler,hp:NaN}},catalog),/save-data/);
});
test('a position inside an obstacle or a different map is not restored',()=>{
 const world=new CombatWorld(map),data=capture(world),canal=map.waterAreas[0];
 data.position={x:canal.x+canal.w/2,z:canal.z+canal.d/2};applySave(world,map,data);
 assert.equal(world.player.x,map.spawn.x);assert.equal(world.player.z,map.spawn.z);
 data.position={x:map.districts[1].x,z:map.districts[1].z};data.mapId='bangsai';applySave(world,map,data);
 assert.equal(world.player.x,map.spawn.x);assert.equal(world.player.z,map.spawn.z);
});
test('older devices cannot overwrite a newer revision',()=>{
 assert.equal(nextRevision(0,0),1);assert.equal(nextRevision(4,4),5);
 assert.throws(()=>nextRevision(5,4),/save-conflict/);
 assert.throws(()=>nextRevision(0,4),/save-conflict/);
});

test('retired map save loads resources into capital without reusing obsolete coordinates',()=>{
 const data=capture(new CombatWorld(map));data.mapId='suphan-wilds';data.position={x:72,z:-176};data.traveler.kills=260;
 const copy=JSON.parse(JSON.stringify(data));validateSave(data,catalog);assert.deepEqual(data,copy,'validation must not mutate legacy migration payload');
 const w=new CombatWorld(map);applySave(w,map,data);assert.equal(w.kills,260);assert.equal(w.player.x,map.spawn.x);assert.equal(w.player.z,map.spawn.z);
});

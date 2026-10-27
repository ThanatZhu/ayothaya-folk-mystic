import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {CombatWorld,MONSTER_TYPES,walkable,mobRespawn} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';import {initialSave} from '../realm-state.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const regular=m=>{const t=MONSTER_TYPES[m.type];return !(t.boss||t.elite||t.mvp||t.worldBoss||t.sheet==='elite-monsters');};
test('all ten hunting maps double each ordinary type exactly, including dungeon spawns; special encounters stay unchanged',()=>{
 let fields=0;
 for(const map of catalog.maps){
  const original=structuredClone(map),before=new CombatWorld({...map,mobPopulation:1}),after=new CombatWorld(map);
  assert.deepEqual(map,original,'population expansion cannot mutate authored map data');
  assert.deepEqual(after.mobs.slice(0,before.mobs.length),before.mobs,'original IDs, leaders and combat stats stay stable');
  if(map.prologue){assert.deepEqual(after.mobs,before.mobs,'the prologue keeps its authored training field');continue;}
  if(!before.mobs.length){assert.equal(after.mobs.length,0);continue;}
  fields++;assert.equal(map.mobPopulation,2);
  for(const type of new Set(before.mobs.map(m=>m.type))){const a=before.mobs.filter(m=>m.type===type),b=after.mobs.filter(m=>m.type===type);assert.equal(b.length,a.length*(regular(a[0])?2:1),map.id+': '+MONSTER_TYPES[type].id);}
  assert.deepEqual(after.mobs.filter(m=>!regular(m)),before.mobs.filter(m=>!regular(m)));
  assert.deepEqual(new CombatWorld(map).mobs,after.mobs,'client and server expansion is deterministic');
 }
 assert.equal(fields,10);
});
test('added monsters have unique IDs, walkable non-overlapping homes, and independent complete camp leaders',()=>{
 for(const map of catalog.maps.filter(m=>m.mobs?.length)){
  const before=new CombatWorld({...map,mobPopulation:1}),after=new CombatWorld(map),added=after.mobs.slice(before.mobs.length);
  assert.equal(new Set(after.mobs.map(m=>m.id)).size,after.mobs.length);
  assert.equal(new Set(added.map(m=>m.x.toFixed(3)+':'+m.z.toFixed(3))).size,added.length,map.id+' copies do not stack');
  for(const m of added){assert.ok(walkable(m.x,m.z,.4,map.nav),map.id+' land');assert.deepEqual(m.home,{x:m.x,z:m.z});assert.ok(!before.mobs.some(b=>Math.hypot(m.x-b.x,m.z-b.z)<.01),map.id+' old spawn');}
  if(map.packs)for(const pack of new Set(added.map(m=>m.pack))){const group=added.filter(m=>m.pack===pack);assert.equal(group.filter(m=>m.leader).length,1);assert.ok(!before.mobs.some(m=>m.pack===pack),'new camps cannot rally old camps');}
 }
});
test('respawning never expands population a second time and keeps copied monster identity',()=>{
 const map=catalog.maps.find(m=>m.id==='mill-cellar'),world=new CombatWorld(map),size=world.mobs.length,mob=world.mobs.at(-1),id=mob.id;mob.hp=0;mob.dead=.01;
 world.update(.02,{x:0,z:0});assert.equal(world.mobs.length,size);assert.equal(mob.id,id);assert.ok(mob.hp>0);assert.equal(mobRespawn(mob),MONSTER_TYPES[mob.type].respawn??12);
});
test('online rooms and channel switches use the same doubled population as the client',()=>{
 const realm=new RealmServer({catalog}),map=catalog.maps.find(m=>m.id==='rice-fields'),state=initialSave();state.mapId=map.id;state.position=map.spawn;
 const peer=realm.join({uid:'population-qa',serverId:'server-1',slotId:'slot-1',channel:1,record:{character:{name:'PopulationQA',gender:'male',classId:'novice'},state},send(){}}),expected=new CombatWorld(map);
 assert.equal(peer.room.mobs.length,expected.mobs.length);assert.equal(peer.world.mobs,peer.room.mobs);
 assert.equal(realm.receive(peer.id,{type:'switchChannel',channel:2,seq:1}),true);assert.equal(peer.room.mobs.length,expected.mobs.length);
});
test('town traffic halves while all eight citizen styles, permanent NPCs and teachers remain',()=>{
 const city=catalog.maps.find(m=>m.id==='ayutthaya'),lab=catalog.maps.find(m=>m.id==='lablae');assert.equal(city.citizens.length,16);assert.equal(lab.citizens.length,12);
 for(const map of [city,lab])assert.equal(new Set(map.citizens.map(c=>c.style)).size,8);
 assert.equal(city.npcs.filter(n=>n.mentorId).length,8);assert.equal(lab.npcs.length,5);assert.equal(new Set(lab.citizens.map(c=>c.route[0].x+':'+c.route[0].z)).size,3);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {walkable} from '../combat-core.js';
import {DUNGEONS} from '../dungeons.js';

const world=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url)));
test('each dungeon has a private map where every room point can be stood on',()=>{
 for(const d of DUNGEONS){
  const map=world.maps.find(m=>m.id===d.map);assert.ok(map,d.map);
  assert.equal(map.instance,true);assert.equal(map.dungeon,d.id);assert.equal(map.safe,false);
  assert.deepEqual(map.mobs,[],'the room script spawns everything');assert.deepEqual(map.portals,[],'leave by the menu, not a portal');
  assert.deepEqual(map.spawn,d.rooms[0].start);
  for(const r of d.rooms)for(const p of [r.start,r.center,r.door,...(r.lanterns??[])].filter(Boolean))assert.ok(walkable(p.x,p.z,.6,map.nav),d.id+' '+r.name+' '+JSON.stringify(p));
 }
});

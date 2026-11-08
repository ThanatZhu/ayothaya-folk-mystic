import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {walkable,findPath} from '../combat-core.js';
import {DUNGEONS} from '../dungeons.js';

const world=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url)));
test('each dungeon has a private map where every room point can be stood on',()=>{
 for(const d of DUNGEONS){
  const map=world.maps.find(m=>m.id===d.map);assert.ok(map,d.map);
  assert.equal(map.instance,true);assert.equal(map.dungeon,d.id);assert.equal(map.safe,false);
  assert.deepEqual(map.mobs,[],'the room script spawns everything');assert.deepEqual(map.portals,[],'leave by the menu, not a portal');
  for(const r of d.rooms)for(const p of [r.start,r.center,r.gate,r.hold].filter(Boolean))assert.ok(walkable(p.x,p.z,.6,map.nav),d.id+' '+r.name+' '+JSON.stringify(p));
  // a lantern sits on a plinth: someone must be able to stand within reach of it
  for(const r of d.rooms)for(const l of r.lanterns??[])assert.ok([[1.3,0],[-1.3,0],[0,1.3],[0,-1.3]].some(([dx,dz])=>walkable(l.x+dx,l.z+dz,.3,map.nav)),r.name+' lantern '+JSON.stringify(l));
  assert.ok(findPath(map.spawn,d.rooms.at(-1).center,map.nav),'one walkable path from the pier to the boss');
 }
});

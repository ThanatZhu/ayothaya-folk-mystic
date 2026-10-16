import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CombatWorld,walkable,findPath,moveBody} from '../combat-core.js';
import {resolveMap,destinations,restoreTraveler,serializeTraveler} from '../world-state.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
const map=catalog.maps[0];
test('rebuilt capital retains its districts and safe boundary while opening the starter route',()=>{
 assert.equal(catalog.maps.length,5);assert.equal(map.id,'ayutthaya');assert.equal(map.safe,true);
 assert.deepEqual(map.portals.map(p=>p.to),['rice-fields']);assert.deepEqual(map.mobs,[]);assert.equal(map.districts.length,8);
 assert.equal(resolveMap(catalog,'bangsai').id,'ayutthaya');assert.equal(resolveMap(catalog,'bad-url').id,'ayutthaya');
 const files=fs.readdirSync(new URL('../maps/',import.meta.url)).filter(n=>n.endsWith('.glb'));
 assert.deepEqual(files,['ayutthaya.glb']);assert.ok(fs.statSync(new URL('../maps/ayutthaya.glb',import.meta.url)).size>10000);
 assert.ok(map.nav.zones[0].w*map.nav.zones[0].d>14000);
});
test('all eight districts are reachable on foot and every story NPC can be approached',()=>{
 assert.ok(walkable(map.spawn.x,map.spawn.z,.32,map.nav));
 for(const d of map.districts){assert.ok(walkable(d.x,d.z,.32,map.nav),d.name);if(d.z||d.x)assert.ok(findPath(map.spawn,d,map.nav).length,d.name+' connected');}
 for(const n of map.npcs){
  assert.ok(!walkable(n.x,n.z,.28,map.nav));
  const near=map.districts.reduce((a,b)=>Math.hypot(a.x-n.x,a.z-n.z)<Math.hypot(b.x-n.x,b.z-n.z)?a:b);
  const approaches=[[0,1.4],[1.4,0],[-1.4,0],[0,-1.4]].map(([x,z])=>({x:n.x+x,z:n.z+z})).filter(p=>walkable(p.x,p.z,.32,map.nav));
  assert.ok(approaches.some(p=>findPath(near,p,map.nav).length),n.name+' approachable');
 }
});
test('canal collisions block water and leave three connected bridge crossings',()=>{
 assert.equal(walkable(-28,-50,.32,map.nav),false);
 for(const z of [0,-32,-70]){const p={x:-34,z};moveBody(p,13,0,map.nav);assert.ok(p.x>-23,'bridge '+z);}
 const a={x:-2,z:2};moveBody(a,0,20,map.nav);assert.ok(a.z<4.2);
 const b={x:-.5,z:2};moveBody(b,0,20,map.nav);assert.ok(b.z>6.5&&b.z<7.1);
});
test('capital heals players and rejects monster spawns and auto combat',()=>{
 const w=new CombatWorld({...map,mobs:[[0,0,0]]});assert.equal(w.mobs.length,0);assert.equal(w.toggleAuto(),false);
 w.player.hp=40;for(let i=0;i<600;i++)w.update(1/60);assert.ok(w.player.hp>40);assert.equal(w.kills,0);
});
test('travel retains resources, kills and cooldowns, while rejecting corrupt values and old targets',()=>{
 const a=new CombatWorld(resolveMap(catalog,'bangsai'));Object.assign(a.player,{hp:73,mp:42,x:9,z:-7});a.kills=12;a.cooldowns[0]=1.8;a.auto=true;a.targetId=0;
 const b=new CombatWorld(resolveMap(catalog,'ayutthaya'));restoreTraveler(b,serializeTraveler(a));
 assert.equal(b.player.hp,73);assert.equal(b.player.mp,42);assert.equal(b.kills,12);assert.equal(b.cooldowns[0],1.8);
 assert.equal(b.auto,false);assert.equal(b.targetId,null);assert.deepEqual({x:b.player.x,z:b.player.z},b.spawn);
 restoreTraveler(b,{version:5,hp:Infinity,mp:-50,kills:NaN,cooldowns:Array(10).fill(-7)});
 assert.equal(b.player.hp,140);assert.equal(b.player.mp,0);assert.equal(b.kills,0);assert.ok(b.cooldowns.every(c=>c===0));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CombatWorld,walkable,findPath,moveBody,lineClear} from '../combat-core.js';
import {resolveMap,destinations,restoreTraveler,serializeTraveler} from '../world-state.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
test('six unique, exported districts have one safe capital and a connected hub graph',()=>{
 assert.equal(catalog.maps.length,6);assert.equal(new Set(catalog.maps.map(m=>m.id)).size,6);
 const capital=resolveMap(catalog,'ayutthaya');assert.equal(capital.name,'อยุธยา');assert.equal(capital.safe,true);assert.equal(capital.mobs.length,0);
 assert.equal(catalog.maps.filter(m=>m.safe).length,1);assert.equal(destinations(catalog,capital).size,5);
 for(const m of catalog.maps){
  assert.ok(fs.statSync(new URL('../'+m.model,import.meta.url)).size>10000,m.id);
  assert.ok(fs.statSync(new URL('../maps/'+m.id+'.blend',import.meta.url)).size>10000,m.id);
  if(m.id!=='ayutthaya')assert.deepEqual([...destinations(catalog,m)],['ayutthaya']);
 }
 assert.equal(resolveMap(catalog,'bad-url').id,'ayutthaya');
});
for(const m of catalog.maps){
 test(m.name+': spawn, portals and monsters are valid and reachable around buildings',()=>{
  assert.ok(walkable(m.spawn.x,m.spawn.z,.32,m.nav),'player spawn');
  const targets=[...m.portals,...m.mobs.map(([x,z])=>({x,z}))];
  for(const p of targets){
   assert.ok(walkable(p.x,p.z,.32,m.nav),JSON.stringify(p));
   const path=findPath(m.spawn,p,m.nav);
   assert.ok(path.length>0,JSON.stringify(p));
   path.forEach(v=>assert.ok(walkable(v.x,v.z,.32,m.nav)));
   assert.ok(Math.hypot(path.at(-1).x-p.x,path.at(-1).z-p.z)<.7);
  }
  for(const n of m.npcs){
   assert.ok(!walkable(n.x,n.z,.28,m.nav),'NPC collision');
   const approaches=[[0,1.4],[1.4,0],[-1.4,0],[0,-1.4]].map(([x,z])=>({x:n.x+x,z:n.z+z})).filter(p=>walkable(p.x,p.z,.32,m.nav));
   assert.ok(approaches.some(p=>findPath(m.spawn,p,m.nav).length),n.name+' must be approachable');
  }
 });
 test(m.name+': river blocks walking but the pier connects to shore',()=>{
  const a={x:-2,z:2};moveBody(a,0,20,m.nav);assert.ok(a.z<4.1);
  const p={x:-.5,z:2};moveBody(p,0,20,m.nav);assert.ok(p.z>6.5&&p.z<7.1,JSON.stringify(p));
 });
}
test('map navigation is owned by each world, not a shared global',()=>{
 const a=new CombatWorld(resolveMap(catalog,'ayutthaya')),b=new CombatWorld(resolveMap(catalog,'suphan'));
 const f={x:-7.3,z:-3};assert.equal(walkable(f.x,f.z,.28,a.nav),true);assert.equal(walkable(f.x,f.z,.28,b.nav),false);
 assert.equal(a.mobs.length,0);assert.equal(b.mobs.length,6);a.toggleAuto();assert.equal(a.auto,false);
 a.player.hp=30;a.update(.05);assert.ok(a.player.hp>30);
 b.player.hp=0;b.player.down=.01;b.update(.05);assert.deepEqual({x:b.player.x,z:b.player.z},b.spawn);
});
test('travel retains resources, kills and cooldowns, while rejecting corrupt values and old targets',()=>{
 const a=new CombatWorld(resolveMap(catalog,'bangsai'));Object.assign(a.player,{hp:73,mp:42,x:9,z:-7});a.kills=12;a.cooldowns[0]=1.8;a.auto=true;a.targetId=0;
 const b=new CombatWorld(resolveMap(catalog,'ayutthaya'));restoreTraveler(b,serializeTraveler(a));
 assert.equal(b.player.hp,73);assert.equal(b.player.mp,42);assert.equal(b.kills,12);assert.equal(b.cooldowns[0],1.8);
 assert.equal(b.auto,false);assert.equal(b.targetId,null);assert.deepEqual({x:b.player.x,z:b.player.z},b.spawn);
 restoreTraveler(b,{version:5,hp:Infinity,mp:-50,kills:NaN,cooldowns:Array(10).fill(-7)});
 assert.equal(b.player.hp,140);assert.equal(b.player.mp,0);assert.equal(b.kills,0);assert.ok(b.cooldowns.every(c=>c===0));
});
test('every regional world can run auto combat without leaving its map or throwing',()=>{
 for(const m of catalog.maps.filter(m=>!m.safe)){
  const w=new CombatWorld(m);w.toggleAuto();for(let i=0;i<900;i++)w.update(1/60);
  assert.ok(walkable(w.player.x,w.player.z,.28,w.nav),m.name);
  assert.ok(w.kills>0,m.name+' auto combat should reach at least one nearby target');
 }
});

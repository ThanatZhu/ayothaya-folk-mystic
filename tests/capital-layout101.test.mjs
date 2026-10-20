import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {walkable,moveBody} from '../combat-core.js';
import {createRouteWalker} from '../route-walk.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
const city=catalog.maps.find(m=>m.id==='ayutthaya');

test('revised capital ships geometry and a walkable court around all eight teachers',()=>{
 assert.ok(fs.statSync(new URL('../'+city.scene,import.meta.url)).size>10000);
 const teachers=city.npcs.filter(n=>n.mentorId);
 assert.equal(teachers.length,8);
 const [x,z,halfWidth,halfDepth]=city.plazas[2];
 for(const teacher of teachers){
  assert.ok(Math.abs(teacher.x-x)<=halfWidth-2&&Math.abs(teacher.z-z)<=halfDepth-2,teacher.name+' court margin');
  assert.ok(walkable(teacher.x,teacher.z,.6,{...city.nav,props:[]}),teacher.name+' ground clearance');
 }
});

test('temple crossings, missing connector and residential lane remain clear at body width',()=>{
 for(const [name,a,b] of [
  ['west wall',[-24,-36],[-14,-36]],
  ['east wall',[14,-36],[24,-36]],
  ['connector',[11,-18],[11,-34]],
  ['house lane',[-47,40],[-47,-52]],
 ]){
  const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);
  for(let i=0;i<=steps;i++){
   const t=i/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
   assert.ok(walkable(x,z,.6,city.nav),`${name} blocked at ${x},${z}`);
  }
 }
});

test('spawn can reach every capital NPC and the field portal with real movement collision',()=>{
 for(const target of [...city.npcs.map(n=>({...n,radius:2.2})),...city.portals.map(p=>({...p,radius:1.2}))]){
  let arrived=false,failed=null;
  const body={...city.spawn},walker=createRouteWalker(()=>city.nav);
  walker.go(target,{radius:target.radius,onArrive:()=>{arrived=true;},onFail:reason=>{failed=reason;}});
  for(let i=0;i<7200&&walker.active;i++){
   const direction=walker.step(body,1/30);
   if(direction)moveBody(body,direction.x*5.33/30,direction.z*5.33/30,city.nav);
  }
  assert.ok(arrived,`${target.name||target.to}: ${failed||'did not arrive'}`);
 }
});

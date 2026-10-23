import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/build/three.module.js';
import {ALL_SKILLS} from '../assets/skills-next/catalog.js';
import {createRoleVfx,createRooster} from '../assets/skills-next/vfx.js';
test('all 84 active VFX build, animate and release shared GPU resources',()=>{
 const scene=new THREE.Scene(),fx=createRoleVfx(scene);let allocations=0,releases=0;const seen=new Set();
 const track=()=>scene.traverse(node=>{if(node.material&&!seen.has(node.material)){seen.add(node.material);allocations++;node.material.addEventListener('dispose',()=>releases++);}for(const m of node.userData.materials??[])if(!seen.has(m)){seen.add(m);allocations++;m.addEventListener('dispose',()=>releases++);}});
 for(const s of ALL_SKILLS.filter(s=>!s.passive)){fx.burst(s,{x:-2,z:0},{x:2,z:1},'#f5c66b',true);track();fx.update(.2);fx.burst(s,{x:-2,z:0},{x:2,z:1},'#f5c66b');track();for(let t=0;t<4;t+=.05)fx.update(.05);assert.equal(fx.count,0,s.id);}
 assert.equal(allocations,releases);assert.ok(fx.geometryCount>0&&fx.geometryCount<=10);fx.dispose();assert.equal(scene.children.length,0);
});
test('effects are capped during rapid casts; reduced motion disables camera shake',()=>{
 const scene=new THREE.Scene(),fx=createRoleVfx(scene,{reduced:true}),skill=ALL_SKILLS[0];for(let i=0;i<40;i++)fx.burst(skill,{x:0,z:0},{x:1,z:0},'#f5c66b');assert.ok(fx.count<=6);assert.deepEqual(fx.shake(1),{x:0,y:0});fx.clear();assert.equal(fx.count,0);fx.dispose();
});
test('persistent fields and an articulated rooster clean up owned resources',()=>{
 const scene=new THREE.Scene(),fx=createRoleVfx(scene),r=createRooster();scene.add(r);r.userData.animate(1,true);assert.ok(r.children.length>15);fx.syncFields([{kind:'lifeTree',x:0,z:0,radius:3}], '#b3ed87');fx.syncFields([], '#b3ed87');r.userData.dispose();scene.remove(r);fx.dispose();assert.equal(scene.children.length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/build/three.module.js';
import {lablaeCitizens} from '../lablae-citizens.js';
import {sampleRoute,routeDuration} from '../citizen-routes.js';
import {walkable} from '../combat-core.js';
const source=fs.readFileSync(new URL('../scene-v2.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(new URL('../vendor/build/three.module.js',import.meta.url).href)).replace("'./water-surface158.js?v=158'",JSON.stringify(new URL('../water-surface158.js',import.meta.url).href));
const {prepareSceneV2}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
globalThis.matchMedia=()=>({matches:false});
test('Lablae pavilion cutaway activates on its 40 cm deck without changing capital thresholds',async()=>{
 const code=fs.readFileSync(new URL('../roof-cutaway.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(new URL('../vendor/build/three.module.js',import.meta.url).href));
 const {createRoofCutaway}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 for(const [options,expected] of [[{minFloor:.3},3.8],[{},0]]){
  const mat=new THREE.MeshStandardMaterial(),model=new THREE.Group();model.add(new THREE.Mesh(new THREE.BoxGeometry(),mat));
  const motion=createRoofCutaway(model,options),shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'void main() {'};
  mat.onBeforeCompile(shader);motion.update(0,.4,-8);assert.equal(shader.uniforms.roofCut.value.w,expected);
  motion.update(0,0,-8);assert.equal(shader.uniforms.roofCut.value.w,0);
 }
});
test('shared material atlases never scroll into neighbouring tiles, including cloned textures',()=>{
 for(const cloned of [false,true]){
  const texture=new THREE.Texture({width:1024,height:1024}),normal=new THREE.Texture({width:1024,height:1024});
  texture.offset.set(.02,.03);normal.offset.set(.04,.05);
  const model=new THREE.Group();
  for(const name of ['roof','wood','leaf','water'])model.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({name,map:cloned?texture.clone():texture,normalMap:cloned?normal.clone():normal})));
  const motion=prepareSceneV2({scene:new THREE.Scene(),model,map:{id:'lablae'}});
  for(let i=0;i<7500;i++)motion.update(.08);
  for(const o of model.children){assert.deepEqual(o.material.map.offset.toArray(),[.02,.03]);assert.deepEqual(o.material.normalMap.offset.toArray(),[.04,.05]);}
 }
});
test('standalone water keeps its original offset and still animates',()=>{
 const map=new THREE.Texture({}),model=new THREE.Group();map.offset.set(.1,.2);
 model.add(new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial({name:'water',map})));
 const motion=prepareSceneV2({scene:new THREE.Scene(),model,map:{id:'ayutthaya'}});motion.update(.08);
 assert.ok(map.offset.x<.1);assert.ok(map.offset.y>.2);
 const stopped=map.offset.clone();motion.toggle();motion.update(.08);assert.ok(map.offset.equals(stopped));
});
test('Lablae has 24 varied residents whose complete routes clear the collision grid',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url))),map=catalog.maps.find(m=>m.id==='lablae');
 assert.deepEqual(map.citizens,lablaeCitizens());assert.equal(map.citizens.length,24);assert.equal(new Set(map.citizens.map(c=>c.style)).size,8);
 assert.ok(!map.masterCourt);assert.equal(map.npcs.length,5);
 for(const c of map.citizens)for(let t=0;t<routeDuration(c.route,c.speed,c.pause);t+=.15){const p=sampleRoute(c.route,t,c);assert.ok(walkable(p.x,p.z,.6,map.nav),`${c.id} blocked at ${p.x},${p.z}`);}
});

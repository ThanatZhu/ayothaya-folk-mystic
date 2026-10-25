import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/build/three.module.js';
import {isWaterMaterial,waterProfile,shoreDistances,createWaterSurface} from '../water-surface158.js';

test('all catalogued water, including troughs/cellars/waterfalls, is classified without the water buffalo',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));let maps=0;
 for(const map of catalog.maps){if(!map.scene){assert.equal(map.procedural,'arena');assert.equal(map.id,'duel-arena');assert.deepEqual(map.waterAreas,[]);continue;}const b=fs.readFileSync(new URL('../'+map.scene,import.meta.url)),glb=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const water=glb.materials.filter(isWaterMaterial);if(water.length)maps++;
  assert.equal(water.length,['kailash-peak','duel-arena'].includes(map.id)?0:['rice-fields','himmapan-edge'].includes(map.id)?2:1,map.id);
 }
 assert.equal(maps,12);assert.equal(isWaterMaterial({name:'Props_water_buffalo'}),false);assert.equal(isWaterMaterial({name:'Waterfall_rock_face'}),false);
});
test('flow profiles distinguish slow pools/paddies, river axes and falling water',()=>{
 const river=waterProfile({id:'ayutthaya',waterAreas:[{w:100,d:8}]});assert.deepEqual(river.direction,[1,0]);
 const paddy=waterProfile({id:'rice-fields'},'Ayothaya_paddy_water'),cave=waterProfile({id:'naga-cave'}),fall=waterProfile({id:'himmapan-edge'},'waterfall');
 assert.ok(paddy.speed<river.speed&&cave.speed<river.speed&&fall.speed>river.speed);assert.deepEqual(fall.direction,[0,-1]);
});
test('shore distances follow actual land holes, not just a rectangular map bound',()=>{
 const mask=new Uint8Array(81).fill(1);mask[4*9+4]=0;const d=shoreDistances(mask,9,9,.5,1);
 assert.equal(d[40],0);assert.equal(d[41],.5);assert.equal(d[49],1);assert.ok(d[2*9+2]>0);assert.equal(d[0],.25);
});
test('surface clock, atlas coordinates, navigation and geometry remain independent',()=>{
 const tex=new THREE.Texture({});tex.offset.set(.2,.4);tex.repeat.set(.3,.3);const geometry=new THREE.PlaneGeometry(10,10);geometry.rotateX(-Math.PI/2);
 const m=new THREE.MeshStandardMaterial({name:'Ayothaya_water',map:tex,roughness:.4}),model=new THREE.Group(),mesh=new THREE.Mesh(geometry,m);model.add(mesh);
 const positions=[...geometry.attributes.position.array],nav={blocked:[1,2]},map={id:'rice-fields',nav},clock={value:0},surface=createWaterSurface({model,map,clock,mobile:true});
 assert.equal(surface.count,1);clock.value=12;const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);
 assert.equal(shader.uniforms.waterClock158,clock);assert.ok(shader.fragmentShader.includes('waterWaves158'));assert.equal(mesh.geometry,geometry);assert.deepEqual([...geometry.attributes.position.array],positions);assert.deepEqual(map.nav,nav);assert.deepEqual(tex.offset.toArray(),[.2,.4]);assert.deepEqual(tex.repeat.toArray(),[.3,.3]);
 surface.setEnabled(false);assert.equal(shader.uniforms.waterOn158.value,0);assert.equal(m.roughness,.4);
 let disposals=0;surface.states[0].field.texture.addEventListener('dispose',()=>disposals++);surface.dispose();surface.dispose();assert.equal(disposals,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/build/three.module.js';
import {gaitFits217,gaitFrame217,GAIT_DIRECTIONS217} from '../painted-gait217.js';
import {createRiggedSprite} from '../rigged-sprite.js';
import {createPaintedAvatar} from '../painted-avatar.js';
import {characterMotion} from '../character-motion.js';
const painted=async()=>Object.fromEntries(['male','female'].map(g=>[g,Array.from({length:36},(_,i)=>({width:320,height:320,label:g+'/'+i}))]));
const fakeGait=()=>({extent:1.015625,footV:196/208,clips:Object.fromEntries(['walk','run'].map(mode=>[mode,{frames:Object.fromEntries(GAIT_DIRECTIONS217.map(d=>[d,Array.from({length:4},(_,i)=>{const t=new THREE.Texture();t.name=mode+'/'+d+'/'+i;return t;})]))}]))});
const loaders={paintedArtLoader:painted,lifeArtLoader:async()=>null};
test('gait is only used for the reviewed boxer/male original appearance',()=>{
 assert.equal(gaitFits217('boxer','male'),true);
 for(const [id,g] of [['boxer','female'],['shaman','male'],['novice','male']])assert.equal(gaitFits217(id,g),false);
 for(const appearance of [{hair:'braid'},{outfit:'crimson'},{garment:'cloak'}])assert.equal(gaitFits217('boxer','male',appearance),false);
 assert.equal(gaitFits217('boxer','male',{}, {weapon:'boxer-weapon-crafted'}),false);
});
test('four distance phases stay frozen when time changes; wrapping/reduced motion stay grounded',()=>{
 for(const mode of ['walk','run'])for(const direction of GAIT_DIRECTIONS217)for(let i=0;i<4;i++){
  const a=gaitFrame217({mode,direction,phase:i/4,time:0});assert.equal(a.index,i);
  assert.deepEqual(a,gaitFrame217({mode,direction,phase:i/4,time:999}));
 }
 assert.equal(gaitFrame217({phase:1}).index,0);
 assert.equal(gaitFrame217({phase:-.25}).index,3);
 assert.equal(gaitFrame217({mode:'run',phase:.75,reduced:true}).index,0);
 assert.equal(gaitFrame217({mode:'attack'}),null);
});
test('actual painted renderer uses eight-view walk/run textures without flipping the authored view',async()=>{
 const gait=fakeGait(),mesh=createRiggedSprite(null,{...loaders,classId:'boxer',gaitArtLoader:async()=>gait});
 await mesh.userData.ready;assert.equal(mesh.userData.supportsAction('run'),true);
 for(const mode of ['walk','run'])for(const direction of GAIT_DIRECTIONS217)for(let i=0;i<4;i++){
  mesh.userData.pose({...characterMotion({mode,classId:'boxer',phase:i/4}),viewDirection:direction},true);
  assert.equal(mesh.material.map.name,mode+'/'+direction+'/'+i);
  assert.equal(mesh.userData.usesAuthoredGround(mode),true);
  assert.equal(mesh.userData.paintedGait217.index,i);
  assert.ok(mesh.geometry.attributes.position.getX(0)<0,'no double flip of the W/SW atlas');
 }
 mesh.userData.pose(characterMotion({mode:'attack',classId:'boxer',time:.1}));
 assert.equal(mesh.userData.paintedGait217,null);assert.equal(mesh.material.map.name,'');
 mesh.userData.dispose();
});
test('avatar forwards camera-relative heading even with old directional mesh disabled',async t=>{
 t.mock.method(console,'warn',()=>{});
 const gait=fakeGait(),mesh=createPaintedAvatar(null,{...loaders,classId:'boxer',directional:false,gaitArtLoader:async()=>gait,directionalArtLoader:async()=>{throw new Error('old optional art');}});
 await mesh.userData.ready;
 mesh.userData.setFacing({x:-1,z:0},0,{mode:'run',phase:.5,time:1});
 mesh.userData.pose(characterMotion({mode:'run',classId:'boxer',phase:.5,time:1}),true);
 assert.equal(mesh.material.map.name,'run/W/2');assert.equal(mesh.material.visible,true);mesh.userData.dispose();
});
test('missing optional gait art preserves existing renderer and class/gender changes cannot reuse it',async t=>{
 t.mock.method(console,'warn',()=>{});
 const mesh=createRiggedSprite(null,{...loaders,classId:'boxer',gaitArtLoader:async()=>{throw new Error('offline');}});
 await mesh.userData.ready;assert.equal(mesh.userData.artReady,true);assert.equal(mesh.userData.gaitError,'offline');
 mesh.userData.pose(characterMotion({mode:'walk',classId:'boxer',phase:.5}));assert.equal(mesh.userData.paintedGait217,null);assert.ok(mesh.material.map);
 mesh.userData.dispose();
 const changed=createRiggedSprite(null,{...loaders,classId:'boxer',gaitArtLoader:async()=>fakeGait()});await changed.userData.ready;
 await changed.userData.setRig('boxer','female');assert.equal(changed.userData.usesAuthoredGround('run'),false);
 changed.userData.pose(characterMotion({mode:'walk',classId:'boxer',phase:.5}));assert.equal(changed.userData.paintedGait217,null);changed.userData.dispose();
});


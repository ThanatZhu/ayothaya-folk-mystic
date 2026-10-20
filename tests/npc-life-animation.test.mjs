import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/build/three.module.js';
import {FRAME_SIZE,FRAME_FOOT,LOGICAL_SIZE,CHARACTER_WORLD_SCALE} from '../character-size.js';

// This browser module uses the game's import map. Resolve those same URLs for
// Node without substituting the renderer or the frame-selection implementation.
const url=new URL('../npc-life-animation.js',import.meta.url);
const source=(await readFile(url,'utf8')).replace(/from '([^']+)'/g,(_,specifier)=>`from '${new URL(specifier==='three'?'./vendor/build/three.module.js':specifier,url).href}'`);
const {applyNPCLife,stationaryNPCAction}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const makeSprite=()=>new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.Texture()}));
const art=()=>({clips:Object.fromEntries(['idle','sit','sleep','walk'].map(action=>[action,{fps:2,frames:[new THREE.Texture(),new THREE.Texture()]}]))});

test('NPC poses retain their ground anchor and normalized body scale while breathing',()=>{
 const sprite=makeSprite(),life=art();sprite.position.set(8,.07,12);
 const originalPosition=sprite.position.clone(),size=FRAME_SIZE/LOGICAL_SIZE*CHARACTER_WORLD_SCALE;
 for(const action of ['idle','sit','sleep','walk'])for(const time of [0,.25,1,4]){
  assert.equal(applyNPCLife(sprite,life,action,time),true);
  assert.deepEqual(sprite.position,originalPosition);
  assert.equal(sprite.center.x,.5);assert.equal(sprite.center.y,(FRAME_SIZE-FRAME_FOOT)/FRAME_SIZE);
  assert.equal(sprite.scale.x,size);assert.ok(Math.abs(sprite.scale.y-size)<=size*.0025+1e-12);
  // The contact pixel and sprite pivot stay coincident for every breath.
  const contactWorldY=sprite.position.y+((1-FRAME_FOOT/FRAME_SIZE)-sprite.center.y)*sprite.scale.y;
  assert.ok(Math.abs(contactWorldY-originalPosition.y)<1e-12);
 }
});

test('opposite-facing NPCs use separate UVs with positive scales and reuse their mirrored texture',()=>{
 const life=art(),left=makeSprite(),right=makeSprite(),original=life.clips.sit.frames[0];
 applyNPCLife(left,life,'sit',0,{flip:true});applyNPCLife(right,life,'sit',0);
 const mirrored=left.material.map;
 assert.notEqual(mirrored,original);assert.equal(right.material.map,original);
 assert.deepEqual([mirrored.repeat.x,mirrored.offset.x],[-1,1]);
 assert.deepEqual([original.repeat.x,original.offset.x],[1,0]);
 assert.ok(left.scale.x>0&&right.scale.x>0);
 applyNPCLife(left,life,'sit',0,{flip:true});assert.equal(left.material.map,mirrored);
 applyNPCLife(left,life,'sit',0,{flip:false});assert.equal(left.material.map,original);
});

test('NPC gait uses travelled phase and reduced motion retains a real resting pose',()=>{
 const life=art(),sprite=makeSprite();
 applyNPCLife(sprite,life,'walk',100,{phase:.75});assert.equal(sprite.material.map,life.clips.walk.frames[1]);
 applyNPCLife(sprite,life,'walk',0,{phase:.75});assert.equal(sprite.material.map,life.clips.walk.frames[1]);
 applyNPCLife(sprite,life,'sleep',.75,{reduced:true});
 assert.equal(sprite.material.map,life.clips.sleep.frames[0]);assert.equal(sprite.userData.lifeAction,'sleep');
 const map=sprite.material.map;
 assert.equal(applyNPCLife(sprite,life,'run',0),false);assert.equal(sprite.material.map,map);
});

test('talk wakes each resting stationary NPC without changing its route or anchor',()=>{
 for(let index=0;index<20;index++){
  const restTime=170-index*17;
  assert.equal(stationaryNPCAction(restTime,index),'sit');
  assert.equal(stationaryNPCAction(restTime,index,true),'idle');
  assert.equal(stationaryNPCAction(restTime+20,index),'idle');
 }
});

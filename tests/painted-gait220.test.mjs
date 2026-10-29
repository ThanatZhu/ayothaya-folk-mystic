import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/build/three.module.js';
import {GAIT_CLASSES220,GAIT_DIRECTIONS220,gaitFits220,gaitFrame220} from '../painted-gait220.js';
import {createRiggedSprite} from '../rigged-sprite.js';
const painted=async()=>Object.fromEntries(['male','female'].map(g=>[g,Array.from({length:36},()=>({width:320,height:320}))]));
const make=(id,g)=>({classId:id,gender:g,extent:1.3125,footV:240/256,clips:Object.fromEntries(['walk','run'].map(mode=>[mode,{frames:Object.fromEntries(GAIT_DIRECTIONS220.map(d=>[d,Array.from({length:4},(_,i)=>{const t=new THREE.Texture();t.name=[id,g,mode,d,i].join('/');return t;})]))}]))});
test('every profession and gender has matching HD/SD images and four distinct frame windows',async()=>{
 for(const id of GAIT_CLASSES220)for(const g of ['male','female']){
  assert.equal(gaitFits220(id,g),true);
  const m=JSON.parse(await readFile(new URL('../assets/character-gait220/'+id+'-'+g+'.json',import.meta.url),'utf8'));
  assert.equal(m.classId,id);assert.equal(m.gender,g);assert.deepEqual(m.directions,GAIT_DIRECTIONS220);
  for(const meta of [m,{...m,...m.tiers.sd}])for(const mode of ['walk','run']){
   assert.equal(meta.clips[mode].frames,4);const b=await readFile(new URL('../assets/character-gait220/'+meta.clips[mode].image,import.meta.url));
   assert.equal(b.readUInt32BE(16),meta.cell*4);assert.equal(b.readUInt32BE(20),meta.cell*8);
  }
  assert.equal(gaitFits220(id,g,{outfit:'crimson'}),false);
  assert.equal(gaitFits220(id,g,{}, {weapon:id+'-weapon-crafted'}),false);
 }
 assert.equal(gaitFits220('../../outside','male'),false);assert.equal(gaitFits220('boxer','other'),false);
});
test('real renderer changes class/gender without reusing another actors gait and preserves skill/idle fallback',async()=>{
 const calls=[],mesh=createRiggedSprite(null,{classId:'novice',gender:'male',paintedArtLoader:painted,lifeArtLoader:async()=>null,gaitArtLoader:async(id,g)=>{calls.push([id,g]);return make(id,g);}});
 await mesh.userData.ready;
 for(const id of GAIT_CLASSES220)for(const g of ['male','female']){
  await mesh.userData.setRig(id,g);
  for(const mode of ['walk','run'])for(const d of GAIT_DIRECTIONS220)for(let i=0;i<4;i++){
   mesh.userData.pose({mode,time:99,phase:i/4,viewDirection:d},true);
   assert.equal(mesh.material.map.name,[id,g,mode,d,i].join('/'));
   assert.equal(mesh.userData.paintedGait220.index,i);
  }
  mesh.userData.pose({mode:'attack',artFrame:6});assert.equal(mesh.userData.paintedGait220,null);
  mesh.userData.pose({mode:'idle'});assert.equal(mesh.userData.paintedGait220,null);
 }
 assert.ok(calls.some(([id,g])=>id==='shaman'&&g==='female'));mesh.userData.dispose();
});
test('all clips use distance phase; reduced motion uses grounded contact pose',()=>{
 for(const mode of ['walk','run'])for(let i=0;i<4;i++){
  assert.deepEqual(gaitFrame220({mode,phase:i/4,time:1}),gaitFrame220({mode,phase:i/4,time:1000}));
  assert.equal(gaitFrame220({mode,phase:i/4,reduced:true}).index,0);
 }
 assert.equal(gaitFrame220({mode:'cast'}),null);
});


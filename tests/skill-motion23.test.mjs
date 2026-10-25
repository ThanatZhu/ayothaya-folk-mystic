import test from 'node:test';
import assert from 'node:assert/strict';
import {poseChannels} from './pose-test-helpers.mjs';
import {SKILL_TRACKS,skillTrack,skillPose} from '../skill-choreography.js';
import {deformPoint} from '../character-motion.js';
import {CLASSES,NOVICE} from '../classes.js';
import {CombatWorld} from '../combat-core.js';
import * as THREE from '../vendor/build/three.module.js';
import {createSkillEffects} from '../skill-effects.js';
const classes=[NOVICE,...CLASSES];
test('80 skills have distinct timed body tracks, with a neutral start and recovery',()=>{
 const signatures=new Set();
 for(const {id} of classes){assert.equal(SKILL_TRACKS[id].length,10);
  for(let i=0;i<10;i++){const t=skillTrack(id,i),neutral=skillPose(id,i,0),recovery=skillPose(id,i,t.duration);assert.deepEqual(poseChannels(recovery),poseChannels(neutral));assert.equal(recovery.mode,'cast');assert.equal(recovery.time,t.duration);assert.deepEqual(skillPose(id,i,NaN),neutral);
   const samples=Array.from({length:41},(_,n)=>skillPose(id,i,t.duration*n/40));
   for(const [n,p] of samples.entries()){assert.ok(Object.values(poseChannels(p)).every(Number.isFinite));assert.equal(p.mode,'cast');assert.equal(p.time,t.duration*n/40);assert.equal(p.phase,null);assert.equal(p.reduced,false);}
   signatures.add(JSON.stringify(samples.map(poseChannels)));assert.ok(t.strikes.every(q=>q>0&&q<1));
  }
 }assert.equal(signatures.size,80);assert.equal(skillTrack('invalid',0),null);
});
test('every skill preserves a connected non-inverted rig throughout motion',()=>{
 const area=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(const {id} of classes)for(let i=0;i<10;i++)for(let n=0;n<=60;n++){
  const pose=skillPose(id,i,skillTrack(id,i).duration*n/60);
  for(let y=0;y<24;y++)for(let x=0;x<16;x++){
   const a=deformPoint(x/16,y/24,pose),b=deformPoint((x+1)/16,y/24,pose),c=deformPoint(x/16,(y+1)/24,pose),d=deformPoint((x+1)/16,(y+1)/24,pose);
   assert.ok(area(a,b,c)>0&&area(b,d,c)>0,`${id} ${i} ${n}: folded mesh`);
  }
 }
});
test('reduced motion retains a skill cue without translation or mesh deformation',()=>{
 for(const {id} of classes)for(let i=0;i<10;i++)for(const q of [.2,.5,.8]){
  const p=skillPose(id,i,skillTrack(id,i).duration*q,{reduced:true});assert.equal(p.mode,'cast');assert.equal(p.reduced,true);assert.equal(p.x+p.y+p.rotation,0);
  const point=deformPoint(.5,.5,p);assert.deepEqual(point,{x:.5,y:.5});if(q===.5)assert.equal(p.frame,3);
 }
});
const config={nav:{zones:[{x:-15,z:-15,w:30,d:30}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[1,0,0]]};
test('all active skill casts carry their exact slot; rejected casts create no animation',()=>{
 for(const {id} of classes)for(let i=0;i<10;i++){
  const w=new CombatWorld({...config,classId:id});if(w.skills[i].reserved){assert.equal(w.skill(i),false);continue;}w.select(0);const start={x:w.player.x,z:w.player.z};assert.equal(w.skill(i),true);
  const events=w.events.filter(e=>e.type==='cast');assert.equal(events.length,1);assert.equal(events[0].skillIndex,i);assert.deepEqual(events[0].from,start);
  w.events=[];assert.equal(w.skill(i),false);assert.equal(w.events.filter(e=>e.type==='cast').length,0);
 }
 const w=new CombatWorld({...config,classId:'novice'});w.select(0);assert.equal(w.basicAttack(),true);assert.equal(w.events.find(e=>e.type==='cast').skillIndex,null);
 const safe=new CombatWorld({...config,classId:'novice',safe:true});assert.equal(safe.mobs.length,0);assert.equal(safe.skill(0),false);assert.equal(safe.events.some(e=>e.type==='cast'),false);
});
test('skill FX are seekable, bounded, and release scene objects and materials',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),fx=createSkillEffects(scene);let disposed=0;
 for(const {id} of classes)for(let i=0;i<10;i++){
  const track=skillTrack(id,i),effect=fx.create(track,{from:{x:0,z:0},to:{x:2,z:1}});effect.material.addEventListener('dispose',()=>disposed++);
  for(const q of [.9,0,.2,.5,.8,1.2]){effect.sample(q*track.duration,camera);for(const m of effect.group.children)assert.ok([...m.position,...m.scale,...m.quaternion].every(Number.isFinite));}
  assert.ok(fx.count<=16);assert.equal(scene.children.length,fx.count);
 }assert.equal(disposed,64);fx.update(10,camera);assert.equal(fx.count,0);assert.equal(scene.children.length,0);assert.equal(disposed,80);fx.dispose();
});

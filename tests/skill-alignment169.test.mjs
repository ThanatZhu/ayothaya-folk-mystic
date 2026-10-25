import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/build/three.module.js';
import {ALL_PROFILES,SKILL_PROFILES,sampleSkill} from '../assets/skill-polish/library-profiles.js';
import {createSkillLibraryRenderer} from '../assets/skill-polish/library-renderer.js';
import {roleEffectSpace,createLiveRoleVfx} from '../role-skill-vfx.js';
import {castFacing,createRoleAnimation,sampleRolePose,sampleRoleEffect} from '../combat-animation165.js';

const nav={zones:[{x:-100,z:-100,w:200,d:200}],obstacles:[],props:[]};
const close=(a,b,label='')=>assert.ok(Math.abs(a-b)<1e-8,`${label}: ${a} != ${b}`);
const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);
camera.position.set(6,10,8);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const texture=()=>new THREE.Texture({width:1024,height:512});

test('switching targets after stopping aims every role cast at its own event, not the last walking snapshot',()=>{
 for(const p of ALL_PROFILES.filter(p=>!p.passive))for(const [x,z]of [[-4,0],[4,0],[0,4],[0,-4],[-3,4]]){
  const e={roleSkillId:p.id,from:{x:10,z:5},to:{x:10+x,z:5+z}},oldFace={x:1,z:0},a=createRoleAnimation(e,0);
  const f=castFacing(e,oldFace);close(f.x,x/Math.hypot(x,z),p.id);close(f.z,z/Math.hypot(x,z),p.id);assert.deepEqual(a.facing,f);
  e.to.x+=100;assert.deepEqual(a.facing,f,'later target updates do not turn an in-flight cast');assert.deepEqual(oldFace,{x:1,z:0});
 }
 assert.deepEqual(castFacing({from:{x:0,z:0},to:{x:0,z:0}},{x:0,z:-2}),{x:0,z:-1});
 assert.equal(castFacing({from:{x:NaN,z:0},to:{x:0,z:0}}),null);
});

test('self and target aura radii stay circular at zero, melee and ranged distances in all directions',()=>{
 for(const distance of [0,.5,3.55,9])for(const angle of [0,.7,Math.PI,4.2]){
  const from={x:7,z:-2},to={x:7+Math.cos(angle)*distance,z:-2+Math.sin(angle)*distance},space=roleEffectSpace(from,to,nav);
  for(const [anchor,center]of [[-2,from],[1.55,to]])for(let a=0;a<Math.PI*2;a+=.3){
   const p=space.point({x:anchor+Math.cos(a)*1.2,y:.04,z:Math.sin(a)*1.2},{x:anchor,z:0});
   close(Math.hypot(p.x-center.x,p.z-center.z),1.2,'preserved radius');
  }
  const start=space.point({x:-2,y:1,z:0}),end=space.point({x:1.55,y:1,z:0});
  close(start.x,from.x);close(start.z,from.z);close(end.x,to.x);close(end.z,to.z);
 }
});

test('the actual atlas renderer preserves self orbits and rotates ground effects along the cast direction',async t=>{
 t.mock.method(THREE.TextureLoader.prototype,'loadAsync',async()=>texture());
 const scene=new THREE.Scene(),renderer=createSkillLibraryRenderer(scene),p=SKILL_PROFILES.spirit;
 await renderer.prepare(p);
 const s=sampleRoleEffect(createRoleAnimation({roleSkillId:p.id},0),1);
 renderer.sample(s,camera,{space:roleEffectSpace({x:4,z:3},{x:4,z:3},nav)});
 const orbit=scene.children.filter(o=>o.visible&&Math.abs(o.scale.x-1.8)<1e-8);
 assert.equal(orbit.length,1);close(Math.hypot(orbit[0].position.x-4,orbit[0].position.z-3),.95,'zero-range summon orbit');
 await renderer.prepare(SKILL_PROFILES.talisman);
 renderer.sample(sampleSkill('talisman',1),camera,{space:roleEffectSpace({x:0,z:0},{x:2,z:3},nav)});
 const ground=scene.children.find(o=>o.visible&&o.isMesh);assert.ok(ground);ground.updateMatrixWorld();
 const axis=new THREE.Vector3(1,0,0).transformDirection(ground.matrixWorld);
 close(axis.x,2/Math.hypot(2,3));close(axis.z,3/Math.hypot(2,3));
 renderer.dispose();assert.equal(scene.children.length,0);
});

test('all 84 live atlas effects remain finite at self, melee and ranged targets with camera rotation',async t=>{
 t.mock.method(THREE.TextureLoader.prototype,'loadAsync',async()=>texture());
 const scene=new THREE.Scene(),renderer=createSkillLibraryRenderer(scene);
 for(const p of ALL_PROFILES.filter(p=>!p.passive)){
  await renderer.prepare(p);
  for(const distance of [0,1,8])for(const age of [.3,p.impacts[0]??.8,(p.impacts.at(-1)??.8)+.2]){
   const a=createRoleAnimation({roleSkillId:p.id},0),s=sampleRoleEffect(a,age);
   renderer.sample(s,camera,{space:roleEffectSpace({x:0,z:0},{x:distance*.6,z:distance*.8},nav)});
   for(const o of scene.children.filter(o=>o.visible))for(const value of [...o.position,...o.scale])assert.ok(Number.isFinite(value),p.id);
   assert.ok(renderer.metrics.visibleLayers<=64,p.id);
  }
 }
 renderer.dispose();assert.equal(scene.children.length,0);
});

test('body and particles use the manager presentation clock through server-time corrections and slow frames',async t=>{
 t.mock.method(THREE.TextureLoader.prototype,'loadAsync',async()=>texture());
 const previous=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:false});
 t.after(()=>{if(previous)globalThis.matchMedia=previous;else delete globalThis.matchMedia;});
 const scene=new THREE.Scene(),world={nav,time:100},fx=createLiveRoleVfx(scene,camera,world);
 const e={roleSkillId:'thread',from:{x:0,z:0},to:{x:-4,z:0},lag:.06},a=createRoleAnimation(e,fx.time);fx.spawn(e);
 await new Promise(r=>setImmediate(r));
 for(const dt of [.016,.067,.1,.033]){
  fx.advance(dt);world.time+=20;const before=sampleRolePose(a,fx.time);fx.update(0);
  assert.deepEqual(sampleRolePose(a,fx.time),before);close(before.time,fx.time-a.start);assert.ok(fx.metrics.active>0);
 }
 fx.dispose();assert.equal(scene.children.length,0);
});

test('preview push and pull never displace live contact effects beyond their authoritative target',()=>{
 for(const p of ALL_PROFILES.filter(p=>p.targetMotion)){
  const at=(p.impacts[0]??.8)+.4,a=createRoleAnimation({roleSkillId:p.id},0);
  assert.notEqual(sampleSkill(p.id,at).targetX,1.55,p.id+' preview motion stays authored');
  assert.equal(sampleRoleEffect(a,at).targetX,1.55,p.id+' live uses combat target');
 }
});

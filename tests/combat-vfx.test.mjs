import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/build/three.module.js';
import {createSkillEffects,createFootDust} from '../skill-effects.js';
import {createCombatVfxResources,combatVfxProfile} from '../combat-vfx.js';
import {skillTrack} from '../skill-choreography.js';
import {attackDuration} from '../character-motion.js';
import {CLASSES,NOVICE} from '../classes.js';

const classes=[NOVICE,...CLASSES],camera=new THREE.PerspectiveCamera();
camera.position.set(5,6,5);camera.lookAt(0,1,0);camera.updateMatrixWorld();
const snapshot=e=>e.group.children.map(m=>({p:m.position.toArray(),q:m.quaternion.toArray(),s:m.scale.toArray(),v:m.visible,instances:m.isInstancedMesh?Array.from(m.instanceMatrix.array):null}));
const finiteTransforms=e=>{
 e.group.traverse(m=>{assert.ok([...m.position.toArray(),...m.scale.toArray(),...m.quaternion.toArray()].every(Number.isFinite),m.name);if(m.isInstancedMesh)assert.ok(Array.from(m.instanceMatrix.array).every(Number.isFinite));});
};

test('every shared geometry supplies RGBA for the gradient material, with feathered ribbon edges',()=>{
 const art=createCombatVfxResources();
 for(const [name,g] of Object.entries(art.geometry)){assert.equal(g.attributes.color.itemSize,4,name);assert.equal(g.attributes.color.count,g.attributes.position.count,name);assert.ok(Array.from(g.attributes.color.array).every(Number.isFinite));}
 const alpha=Array.from(art.geometry.sweep.attributes.color.array).filter((_,i)=>i%4===3);assert.ok(alpha.some(a=>a===0));assert.ok(alpha.some(a=>a>.8));
 assert.ok(Array.from(art.geometry.arrow.attributes.color.array).every(c=>c===1));art.dispose();
});

test('the real eight classes and eighty tracks resolve to distinct semantic presentations without changing their tracks',()=>{
 const scene=new THREE.Scene(),fx=createSkillEffects(scene),signatures=new Set();
 const kinds=['attack','area','bind','push','heal','shield','attack','dash','focus','ultimate'];
 for(const c of classes)for(let i=0;i<10;i++){
  const track=skillTrack(c.id,i),before=JSON.stringify(track),e=fx.create(track,{from:{x:0,z:0},to:{x:2,z:1}});
  assert.equal(e.profile.kind,kinds[i]);assert.equal(e.profile.classId,c.id);assert.equal(e.profile.heavy,i===6);signatures.add(e.profile.signature);
  for(const beat of track.strikes){e.sample(beat*track.duration+.06,camera);assert.ok(e.group.children.some(m=>m.visible));finiteTransforms(e);}
  assert.equal(JSON.stringify(track),before);assert.ok(e.group.children.length<=52);assert.ok(e.group.userData.particleBudget<=24);e.dispose();
 }
 assert.equal(signatures.size,80);fx.dispose();assert.equal(scene.children.length,0);
});

test('all eight basic attacks keep the real class weapon but use a quieter particle budget',()=>{
 const fx=createSkillEffects(new THREE.Scene());
 for(const c of classes){
  const track={...skillTrack(c.id,0),duration:attackDuration(c.id),strikes:[.42]},e=fx.create(track,{skillIndex:null});
  assert.equal(e.profile.basic,true);assert.equal(e.profile.kind,'attack');assert.equal(e.group.userData.particleBudget,10);
  e.sample(track.duration*.41,camera);assert.ok(e.group.children.filter(m=>m.userData.beat===0).every(m=>!m.visible));
  e.sample(track.duration*.42+.04,camera);assert.ok(e.group.children.some(m=>m.userData.beat===0&&m.visible));e.dispose();
 }
 assert.equal(combatVfxProfile(skillTrack('lancer',0)).attack,'lance');assert.equal(combatVfxProfile(skillTrack('hunter',0)).attack,'arrow');fx.dispose();
});

test('slashes aim at all eight world directions and remain stable when the camera orbits',()=>{
 const fx=createSkillEffects(new THREE.Scene());
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,e=fx.create(skillTrack('swordsman',0),{from:{x:4,y:2,z:7},to:{x:4+Math.cos(a)*2,y:2,z:7+Math.sin(a)*2}});
  const forward=new THREE.Vector3(1,0,0).applyQuaternion(e.group.quaternion);
  assert.ok(Math.abs(forward.x-Math.cos(a))<1e-12);assert.ok(Math.abs(forward.z-Math.sin(a))<1e-12);assert.equal(e.group.position.y,2);
  e.sample(e.track.strikes[0]*e.track.duration+.12,camera);const blade=e.group.children.find(m=>m.userData.shape==='sweep'&&m.userData.beat===0),q=blade.quaternion.toArray();
  const orbit=camera.clone();orbit.position.set(-5,7,-3);orbit.lookAt(0,1,0);orbit.updateMatrixWorld();e.sample(e.track.strikes[0]*e.track.duration+.12,orbit);assert.deepEqual(blade.quaternion.toArray(),q);e.dispose();
 }
 fx.dispose();
});

test('arrow travel follows the target direction and elevation instead of the billboard camera',()=>{
 const fx=createSkillEffects(new THREE.Scene()),track=skillTrack('hunter',0),e=fx.create(track,{from:{x:3,y:1,z:4},to:{x:3,y:2,z:8}});
 e.sample(track.strikes[0]*track.duration+.09,camera);e.group.updateMatrixWorld(true);
 const arrow=e.group.children.find(m=>m.userData.shape==='arrow'),position=arrow.getWorldPosition(new THREE.Vector3());
 assert.ok(Math.abs(position.x-3)<1e-10);assert.ok(position.z>4&&position.z<8);assert.ok(position.y>2);
 const forward=new THREE.Vector3(0,1,0).applyQuaternion(arrow.getWorldQuaternion(new THREE.Quaternion()));assert.ok(forward.z>.99);fx.dispose();
});

test('seek, rewind and resample are deterministic including instanced particles for every track',()=>{
 const fx=createSkillEffects(new THREE.Scene());
 for(const c of classes)for(let i=0;i<10;i++){
  const track=skillTrack(c.id,i),e=fx.create(track),t=track.strikes[0]*track.duration+.22;e.sample(t,camera);const expected=snapshot(e);
  for(const time of [e.life+.5,-1,NaN,.1,0])e.sample(time,camera);e.sample(t,camera);assert.deepEqual(snapshot(e),expected,`${c.id}:${i}`);e.dispose();
 }
 fx.dispose();
});

test('reduced and low quality retain semantics with bounded draw and particle budgets',()=>{
 const fx=createSkillEffects(new THREE.Scene());
 for(const c of classes)for(let i=0;i<10;i++){
  const track=skillTrack(c.id,i),reduced=fx.create(track,{reduced:true}),low=fx.create(track,{quality:'low'});
  assert.equal(reduced.group.userData.particleBudget,0);assert.ok(reduced.group.children.length<=8);assert.ok(low.group.children.length<=28);assert.ok(low.group.userData.particleBudget<=8);
  for(const [b,beat] of track.strikes.entries()){reduced.sample(beat*track.duration+.06,camera);assert.ok(reduced.group.children.some(m=>m.userData.beat===b&&m.visible));}
  reduced.dispose();low.dispose();
 }
 fx.dispose();
});

test('same-position and malformed endpoints remain finite with explicit heading and ground height',()=>{
 const fx=createSkillEffects(new THREE.Scene());
 for(const options of [{from:{x:1,z:1},to:{x:1,z:1},direction:{x:0,z:-1},groundY:3},{from:{x:NaN,y:NaN,z:Infinity},to:{x:NaN,z:-Infinity}},{from:null,to:null}]){
  const e=fx.create(skillTrack('rogue',9),options);for(const t of [0,.4,.9,1.5,2.2]){e.sample(t);finiteTransforms(e);}e.dispose();
 }
 const e=fx.create(skillTrack('swordsman',0),{from:{x:0,z:0},to:{x:0,z:0},direction:{x:0,z:-1},groundY:3});assert.deepEqual(e.group.userData.aim.map(n=>Math.round(n)),[0,-1]);assert.equal(e.group.position.y,3);fx.dispose();
});

test('cast eviction, explicit disposal and manager disposal release each GPU resource once',()=>{
 const scene=new THREE.Scene(),fx=createSkillEffects(scene);let materialDisposals=0,instanceDisposals=0;
 for(let i=0;i<80;i++){
  const e=fx.create(skillTrack('boxer',9));for(const m of e.materials)m.addEventListener('dispose',()=>materialDisposals++);
  e.group.children.find(m=>m.isInstancedMesh).addEventListener('dispose',()=>instanceDisposals++);assert.ok(fx.count<=16);
  if(i%3===0){e.dispose();e.dispose();}
 }
 fx.update(NaN,camera);fx.update(-1,camera);fx.update(50,camera);assert.equal(materialDisposals,80*6);assert.equal(instanceDisposals,80);assert.equal(scene.children.length,0);
 fx.clear();fx.dispose();fx.dispose();assert.equal(materialDisposals,80*6);assert.throws(()=>fx.create(skillTrack('novice',0)),/disposed/);
 const art=createCombatVfxResources();let geometry=0,textures=0;for(const g of Object.values(art.geometry))g.addEventListener('dispose',()=>geometry++);for(const t of [art.paper,art.spirit,art.seal,art.soft])t.addEventListener('dispose',()=>textures++);art.dispose();assert.equal(geometry,Object.keys(art.geometry).length);assert.equal(textures,4);
});

test('foot dust is bounded and releases its geometry when the scene is closed',()=>{
 const scene=new THREE.Scene(),dust=createFootDust(scene);for(let i=0;i<20;i++)dust.puff(i,0,0);assert.equal(dust.count,10);
 let geometryDisposed=0;scene.children[0].geometry.addEventListener('dispose',()=>geometryDisposed++);dust.update(1);assert.equal(dust.count,0);dust.dispose();dust.dispose();assert.equal(geometryDisposed,1);assert.equal(scene.children.length,0);
});

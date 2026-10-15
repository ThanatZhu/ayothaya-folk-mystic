import test from 'node:test';
import assert from 'node:assert/strict';
import {rigDefinition,sampleRig,transformPoint,solveLimb,JOINT_CHANNELS} from '../character-rig.js';
import {characterMotion,MOTION_MODES} from '../character-motion.js';
import {skillPose,skillTrack,SKILL_TRACKS} from '../skill-choreography.js';
import {createRiggedSprite} from '../rigged-sprite.js';
import {createSkillEffects} from '../skill-effects.js';
import {FX_STYLES} from '../skill-fx-art.js';
import * as THREE from '../vendor/build/three.module.js';
const ids=Object.keys(SKILL_TRACKS),length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('all 160 class/gender skill tracks preserve bone lengths and attached joints',()=>{
 for(const id of ids)for(const gender of ['male','female']){
  const rig=rigDefinition(id,gender),n=rig.nodes;
  for(let index=0;index<10;index++)for(let step=0;step<=24;step++){
   const pose=skillPose(id,index,skillTrack(id,index).duration*step/24),m=sampleRig(rig,pose);
   assert.equal(pose.sx,1);assert.equal(pose.sy,1);
   for(const [name,node] of Object.entries(n)){
    assert.ok(m[name].every(Number.isFinite));near(m[name][0]*m[name][3]-m[name][1]*m[name][2],1);
    if(!node.parent)continue;
    const parent=n[node.parent],a=transformPoint(m[node.parent],parent.at),b=transformPoint(m[node.parent],node.at),joint=transformPoint(m[name],node.at);
    near(length(a,b),length(parent.at,node.at));near(length(b,joint),0);
   }
  }
 }
});

test('rendered cutout triangles keep area and edge lengths during kicks, casts and slashes',()=>{
 for(const id of ids){
  const mesh=createRiggedSprite(null,{classId:id}),position=mesh.geometry.attributes.position;
  mesh.userData.pose(characterMotion({reduced:true}));const rest=position.array.slice();
  for(const slot of [0,3,9])for(const q of [.14,.47,.65,.79]){
   mesh.userData.pose(skillPose(id,slot,skillTrack(id,slot).duration*q));
   for(let i=0;i<position.count;i+=3){
    const a={x:position.getX(i),y:position.getY(i)},b={x:position.getX(i+1),y:position.getY(i+1)},c={x:position.getX(i+2),y:position.getY(i+2)};
    const ar={x:rest[i*3],y:rest[i*3+1]},br={x:rest[(i+1)*3],y:rest[(i+1)*3+1]},cr={x:rest[(i+2)*3],y:rest[(i+2)*3+1]};
    near(length(a,b),length(ar,br),3e-7);near(length(b,c),length(br,cr),3e-7);
   }
  }
  let released=0;mesh.children[0].geometry.addEventListener('dispose',()=>released++);mesh.userData.dispose();assert.equal(released,1);
 }
});

test('stance feet stay near ground, swing feet lift and blocked movement freezes the gait',()=>{
 for(const id of ids){const rig=rigDefinition(id);
  for(let step=0;step<20;step++){
   const phase=step/20,p=characterMotion({classId:id,mode:'walk',phase}),m=sampleRig(rig,p);
   for(const side of ['L','R']){const foot=transformPoint(m['foot'+side],rig.nodes['foot'+side].at);if(p['foot'+side+'Y']===0)near(foot.y,rig.sole,.025);else assert.ok(foot.y<rig.sole+.01);}
   assert.deepEqual(p,characterMotion({classId:id,mode:'walk',phase,time:999}));assert.equal(p.sx,1);assert.equal(p.sy,1);
  }
 }
});

test('each skill has a different joint trajectory, including novice and master base classes',()=>{
 for(const id of ids){const signatures=new Set();for(let i=0;i<10;i++)signatures.add(JSON.stringify(Array.from({length:31},(_,n)=>{const p=skillPose(id,i,skillTrack(id,i).duration*n/30);return JOINT_CHANNELS.map(k=>p[k]);})));assert.equal(signatures.size,10,id);}
});

test('unreachable IK is finite and reduced motion never articulates limbs',()=>{
 for(const target of [{x:0,y:0},{x:1e6,y:1e6}])assert.ok(solveLimb({x:0,y:0},{x:0,y:.1},{x:.02,y:.2},target).every(Number.isFinite));
 for(const id of ids)for(const mode of MOTION_MODES){const p=characterMotion({mode,classId:id,time:.25,reduced:true});for(const key of JOINT_CHANNELS)assert.equal(p[key],0);}
});

test('class motifs, multi-hit releases and material cleanup survive seek and eviction',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),fx=createSkillEffects(scene),motifs=new Set();let disposals=0;
 for(const id of ids){const track=skillTrack(id,9),cast=fx.create(track);motifs.add(cast.group.userData.motif);assert.equal(cast.group.userData.motif,FX_STYLES[id].motif);
  for(const m of cast.materials)m.addEventListener('dispose',()=>disposals++);
  for(const [beatIndex,beat] of track.strikes.entries()){
   cast.sample(beat*track.duration+.06,camera);assert.ok(cast.group.children.some(m=>m.userData.beat===beatIndex&&m.visible));
  }
  cast.sample(.5,camera);const first=cast.group.children.map(m=>({p:m.position.toArray(),q:m.quaternion.toArray(),s:m.scale.toArray(),v:m.visible}));cast.sample(0,camera);cast.sample(.5,camera);
  assert.deepEqual(cast.group.children.map(m=>({p:m.position.toArray(),q:m.quaternion.toArray(),s:m.scale.toArray(),v:m.visible})),first);
 }
 assert.equal(motifs.size,8);fx.clear();assert.equal(disposals,8*6);assert.equal(scene.children.length,0);fx.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/build/three.module.js';
import {DIRECTIONS} from '../directional-sprite.js';
import {screenDirection} from '../combat-core.js';
import {directionalRigDefinition,directionalSkinWeights,directionalPose,sampleDirectionalRig,directionalRigPoint,stableViewDirection} from '../directional-motion.js';
import {transformPoint} from '../character-rig.js';
import {createDirectionalActor} from '../directional-actor.js';
import {createPaintedAvatar,directionalCompatibility} from '../painted-avatar.js';
const classes=['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);

test('camera orbit selects every real view, with stable boundaries and zero-vector heading',()=>{
 for(let az=-Math.PI*2;az<=Math.PI*2;az+=Math.PI/8)for(const [i,d] of DIRECTIONS.entries()){
  const face=screenDirection(Math.sin(i*Math.PI/4),-Math.cos(i*Math.PI/4),az);
  assert.equal(stableViewDirection(face,az,d),d);
 }
 const face=angle=>({x:Math.sin(angle),z:Math.cos(angle)});
 assert.equal(stableViewDirection(face(Math.PI/8+.02),0,'S'),'S');
 assert.equal(stableViewDirection(face(Math.PI/8+.12),0,'S'),'SE');
 assert.equal(stableViewDirection({x:0,z:0},1,'NW'),'NW');
 assert.equal(stableViewDirection({x:NaN,z:0},0,'N'),'N');
});

test('all 128 class/gender/direction rigs have normalized finite skinning and fixed bone lengths',()=>{
 for(const classId of classes)for(const gender of ['male','female'])for(const direction of DIRECTIONS){
  const rig=directionalRigDefinition(classId,gender,direction),nodes=rig.nodes;
  for(let y=0;y<=20;y++)for(let x=0;x<=16;x++){
   const weights=directionalSkinWeights(rig,x/16,y/20);near(weights.reduce((a,[,w])=>a+w,0),1);
   assert.ok(weights.every(([bone,w])=>nodes[bone]&&Number.isFinite(w)&&w>=0));
  }
  for(const mode of ['idle','walk','attack','cast','hit'])for(const phase of [0,.25,.5,.75]){
   const matrices=sampleDirectionalRig(rig,directionalPose({classId,direction,mode,time:phase*.6,phase}));
   for(const [name,node] of Object.entries(nodes)){
    const m=matrices[name];assert.ok(m.every(Number.isFinite));near(m[0]*m[3]-m[1]*m[2],1);
    if(node.parent){const parent=nodes[node.parent],a=transformPoint(matrices[node.parent],parent.at),b=transformPoint(matrices[node.parent],node.at),joint=transformPoint(m,node.at);near(distance(a,b),distance(parent.at,node.at));near(distance(b,joint),0);}
   }
  }
 }
});

test('painted face core and explicitly marked weapon regions remain rigid during a strike',()=>{
 const rig=directionalRigDefinition('swordsman','male','S',{weapons:[{bone:'handL',polygon:[[.12,.12],[.30,.12],[.30,.49],[.12,.49]]}]}),pose=directionalPose({classId:'swordsman',direction:'S',mode:'attack',time:.27}),matrices=sampleDirectionalRig(rig,pose);
 const pairs=[[[.45,.30],[.57,.39],'head'],[[.24,.20],[.27,.47],'handL']];
 for(const [a,b,bone] of pairs){const wa=directionalSkinWeights(rig,...a),wb=directionalSkinWeights(rig,...b);assert.deepEqual(wa,[[bone,1]]);assert.deepEqual(wb,[[bone,1]]);const aa=directionalRigPoint(...a,wa,matrices),bb=directionalRigPoint(...b,wb,matrices);near(distance(aa,bb),Math.hypot(a[0]-b[0],a[1]-b[1]));}
 assert.throws(()=>directionalRigDefinition('swordsman','male','S',{weapons:[{bone:'none',polygon:[[0,0],[1,0],[1,1]]}]}),/weapon-mask/);
 near(Math.atan2(matrices.handL[1],matrices.handL[0])-Math.atan2(matrices.torso[1],matrices.torso[0]),pose.wristL);
 // Sword masks already isolate the original silhouette: long-staff grid
 // padding must not drag adjacent painted hair into the sword transform.
 assert.deepEqual(directionalSkinWeights(rig,.32,.30),[['head',1]]);
});

test('walking alternates planted/swing feet and frozen distance phase stops leg motion',()=>{
 for(const classId of classes)for(const direction of DIRECTIONS){
  const a=directionalPose({classId,direction,mode:'walk',time:1,phase:.25}),b=directionalPose({classId,direction,mode:'walk',time:9,phase:.75});
  assert.ok(a.footLY<0);assert.equal(a.footRY,0);assert.equal(b.footLY,0);assert.ok(b.footRY<0);
  assert.deepEqual(a,directionalPose({classId,direction,mode:'walk',time:999,phase:.25}));
  assert.ok(Math.abs(a.footLX)<=.034&&Math.abs(b.footRX)<=.034);
  const m=sampleDirectionalRig(directionalRigDefinition(classId,'male',direction),a);
  for(const side of ['L','R'])assert.deepEqual(m['foot'+side].slice(0,4),[1,0,0,1]);
 }
});

test('shaman full staff keeps the shaft and ornament on the visible gripping hand',()=>{
 const points={S:[[.306,.22],[.333,.90],'handL'],E:[[.371,.40],[.403,.90],'handL'],W:[[.715,.29],[.614,.88],'handR'],N:[[.729,.27],[.689,.87],'handR']};
 for(const [direction,[a,b,bone]] of Object.entries(points)){
  const rig=directionalRigDefinition('shaman','male',direction),m=sampleDirectionalRig(rig,directionalPose({classId:'shaman',direction,mode:'cast',time:.4}));
  for(const point of [a,b])assert.deepEqual(directionalSkinWeights(rig,...point),[[bone,1]],direction+' '+point);
  const aa=directionalRigPoint(...a,[[bone,1]],m),bb=directionalRigPoint(...b,[[bone,1]],m);near(distance(aa,bb),distance({x:a[0],y:a[1]},{x:b[0],y:b[1]}));
 }
});

test('occluded left-view spear retains its grip without moving through the painted hair',()=>{
 for(const direction of ['W','SW','NW']){
  const p=directionalPose({classId:'lancer',direction,mode:'attack',time:.3});
  assert.equal(p.wristR,0);assert.equal(p.handRX,0);assert.equal(p.handRY,0);
  const external=directionalPose({classId:'lancer',direction,mode:'attack',pose:{handLX:.03,wristL:.12,handRX:.01,wristR:.06}});
  near(external.handRX,0);near(external.wristR,0);near(external.handLX,-.0045);near(external.wristL,-.027);
 }
});

test('thin profile spear covers every vertex of its in-world texture triangles',()=>{
 const rig=directionalRigDefinition('lancer','female','W');
 // Native blade centers in the actual W crop, projected by its 192px placement.
 for(const [x,y] of [[846,985],[847,1010],[844,1024]]){
  const s=172/288,u=(96-79*s+(x-692)*s)/192,v=(180-288*s+(y-962)*s)/192;
  for(const columns of [32,48])for(const rows of [40,56]){
   const gx=Math.floor(u*columns),gy=Math.floor(v*rows);
   for(const dx of [0,1])for(const dy of [0,1])assert.deepEqual(directionalSkinWeights(rig,(gx+dx)/columns,(gy+dy)/rows),[['handR',1]]);
  }
 }
});

test('reduced motion is a neutral rig and existing large skill input is bounded',()=>{
 for(const classId of classes)for(const mode of ['walk','attack','cast','dash']){
  const stopped=directionalPose({classId,mode,time:.3,phase:.3,reduced:true,pose:{handLX:999}});assert.ok(Object.values(stopped).every(v=>v===0));
 }
 const p=directionalPose({mode:'cast',pose:{handLX:9,wristL:-8,lean:20,footRX:50}});assert.equal(p.handLX,.032);assert.equal(p.wristL,-.14);assert.equal(p.lean,.012);assert.equal(p.footRX,.030);
});

function fakeArt(){return {frames:Object.fromEntries(['male','female'].map(g=>[g,Object.fromEntries(DIRECTIONS.map(d=>[d,{width:192,height:192,label:g+'/'+d}]))])),footV:180/192,manifest:{cell:192,anchor:[96,180]}};}
test('actor changes actual directional textures, poses connected vertices, and disposes once',()=>{
 const art=fakeArt(),actor=createDirectionalActor(art,{classId:'swordsman'}),initial=actor.geometry.attributes.position.array.slice();
 assert.equal(actor.userData.rigType,'directional-rig');assert.ok(actor.geometry.index);assert.equal(actor.material.map.image,art.frames.male.S);
 actor.userData.update({direction:'N',mode:'walk',phase:.25});assert.equal(actor.material.map.image,art.frames.male.N);assert.notDeepEqual(actor.geometry.attributes.position.array,initial);
 actor.userData.setGender('female');assert.equal(actor.material.map.image,art.frames.female.N);assert.throws(()=>actor.userData.setDirection('bad'),/missing-view/);assert.equal(actor.material.map.image,art.frames.female.N);
 let materials=0,geometries=0;actor.material.addEventListener('dispose',()=>materials++);actor.geometry.addEventListener('dispose',()=>geometries++);actor.userData.dispose();actor.userData.dispose();assert.equal(materials,1);assert.equal(geometries,1);assert.equal(actor.userData.update({}),false);
});

test('actor billboarding respects a rotated parent and camera parent',()=>{
 const scene=new THREE.Scene(),parent=new THREE.Group(),cameraParent=new THREE.Group(),camera=new THREE.PerspectiveCamera(),actor=createDirectionalActor(fakeArt());
 parent.rotation.set(.2,.7,-.1);cameraParent.rotation.set(-.1,.3,.05);camera.rotation.set(.3,-.4,.1);scene.add(parent,cameraParent);parent.add(actor);cameraParent.add(camera);scene.updateMatrixWorld(true);
 actor.onBeforeRender(null,scene,camera);const actual=actor.getWorldQuaternion(new THREE.Quaternion()),wanted=camera.getWorldQuaternion(new THREE.Quaternion());near(Math.abs(actual.dot(wanted)),1,1e-6);actor.userData.dispose();
});

test('avatar preserves crafted weapons/custom silhouettes and supports standard outfit dyes',async()=>{
 for(const id of classes){
  assert.equal(directionalCompatibility(id,{},null),null);
  assert.equal(directionalCompatibility(id,{outfit:'crimson'},{weapon:id+'-weapon-basic',outfit:id+'-outfit-ivory'}),null);
  assert.equal(directionalCompatibility(id,{}, {weapon:id+'-weapon-crafted'}),'weapon');
  assert.equal(directionalCompatibility(id,{hair:'braid'}),'appearance');
  assert.equal(directionalCompatibility(id,{garment:'cloak'}),'appearance');
 }
 let requested=0;const avatar=createPaintedAvatar(null,{classId:'swordsman',equipment:{weapon:'swordsman-weapon-crafted'},directionalArtLoader:async()=>{requested++;return fakeArt();}});
 await avatar.userData.ready;assert.equal(requested,0);assert.equal(avatar.userData.directionalActive,false);assert.equal(avatar.material.visible,true);avatar.userData.dispose();
});

test('avatar selection ignores stale art loads and preserves a switched-off preference',async()=>{
 const requests=[],avatar=createPaintedAvatar(null,{classId:'swordsman',directionalArtLoader:id=>new Promise(resolve=>requests.push({id,resolve}))});
 const initial=avatar.userData.ready,older=avatar.userData.setRig('lancer','female'),latest=avatar.userData.setRig('swordsman','male');
 assert.equal(avatar.material.visible,true);assert.equal(avatar.userData.directionalActive,false);
 requests[2].resolve(fakeArt());await latest;assert.equal(avatar.children.length,1);assert.equal(avatar.children[0].userData.classId,'swordsman');
 requests[1].resolve(fakeArt());await older;requests[0].resolve(fakeArt());await initial;assert.equal(avatar.children.length,1);assert.equal(avatar.children[0].userData.classId,'swordsman');
 await avatar.userData.setDirectional(false);assert.equal(avatar.children[0].visible,false);assert.equal(avatar.material.visible,true);
 avatar.userData.setFacing({x:0,z:-1},0,{mode:'walk',phase:.25,time:1});avatar.userData.pose({});assert.equal(avatar.userData.directionalActive,false);
 await avatar.userData.setDirectional(true);avatar.userData.pose({});assert.equal(avatar.children[0].userData.direction,'N');assert.equal(avatar.material.visible,false);avatar.userData.dispose();
});

test('failed or disposed directional loading leaves equipped base art usable',async t=>{
 t.mock.method(console,'warn',()=>{});
 const failed=createPaintedAvatar(null,{classId:'novice',directionalArtLoader:async()=>{throw new Error('test missing image');}});await failed.userData.ready;
 assert.equal(failed.userData.directionalReason,'load');assert.equal(failed.material.visible,true);assert.equal(failed.userData.directionalActive,false);failed.userData.pose({});failed.userData.dispose();
 let complete;const removed=createPaintedAvatar(null,{classId:'novice',directionalArtLoader:()=>new Promise(resolve=>{complete=resolve;})}),ready=removed.userData.ready;removed.userData.dispose();complete(fakeArt());await ready;assert.equal(removed.children.length,0);assert.equal(removed.userData.directionalActive,false);
});

import test from 'node:test';import assert from 'node:assert/strict';import {readFile,stat} from 'node:fs/promises';
import * as THREE from '../vendor/build/three.module.js';
import {attackVariant224,attackFrame224,ATTACK_CLASSES224,ATTACK_DIRECTIONS224,ATTACK_STYLE224} from '../attack-style224.js';
import {createRiggedSprite} from '../rigged-sprite.js';
import {basicTiming} from '../combat-timing.js';
import {createBasicAttackEffect224} from '../basic-attack-fx224.js';
import {createSkillEffects} from '../skill-effects.js';
const art=()=>Object.fromEntries(['trails','impacts'].map(k=>[k,Object.fromEntries(ATTACK_CLASSES224.map(id=>[id,Array.from({length:6},(_,i)=>{const t=new THREE.Texture();t.name=k+'/'+id+'/'+i;return t;})]))]));
test('same authoritative cast selects the same variation on every renderer without changing combat timing',()=>{
 for(let id=1;id<200;id++)assert.equal(attackVariant224(id),(id-1)%3);
 assert.equal(attackVariant224('peer:abc'),attackVariant224('peer:abc'));
 for(const id of ATTACK_CLASSES224)for(const speed of [.06,.15,.3,.9]){
  const t=basicTiming(id,speed),hit=t.impacts[0]/t.duration;
  assert.equal(attackFrame224(hit-1e-8,hit),1);assert.equal(attackFrame224(hit,hit),2);
  assert.equal(t.impacts[0],t.duration*.42);
 }
 assert.equal(attackFrame224(.2,.42,true),0);assert.equal(attackFrame224(.5,.42,true),2);
});
test('all sixteen identities have three full eight-view clips in both sizes',async()=>{
 for(const id of ATTACK_CLASSES224)for(const g of ['male','female']){
  const m=JSON.parse(await readFile(new URL('../assets/attack224/'+id+'-'+g+'.json',import.meta.url),'utf8'));
  assert.equal(m.classId,id);assert.equal(m.gender,g);assert.deepEqual(m.directions,ATTACK_DIRECTIONS224);assert.equal(m.variants.length,3);
  for(const v of m.variants){for(const f of [v.image,v.sdImage])assert.ok((await stat(new URL('../assets/attack224/'+f,import.meta.url))).size>1000);for(const d of ATTACK_DIRECTIONS224)assert.ok(v.views[d].bodyHeight>30);}
 }
});
test('new basic artwork overrides novice procedural pose but cannot replace a skill or custom equipment',async()=>{
 const tex=new THREE.Texture();tex.name='authored-basic';
 const sample=(id,g,p)=>({texture:tex,extent:1.8,footV:.9,variant:attackVariant224(p.basicAttack224.castId),direction:p.viewDirection,frame:attackFrame224(p.actionPhase),castId:p.basicAttack224.castId});
 const painted=async()=>({male:Array.from({length:36},()=>({width:320,height:320})),female:Array.from({length:36},()=>({width:320,height:320}))});
 const mesh=createRiggedSprite(null,{classId:'novice',gender:'male',paintedArtLoader:painted,lifeArtLoader:async()=>null,gaitArtLoader:async()=>null,attackArtSampler:sample});
 await mesh.userData.ready;
 const pose={mode:'attack',time:.2,actionPhase:.42,profileFrame:true,viewDirection:'NW',paintOffsetX:20,basicAttack224:{castId:2,impactPhase:.42}};
 mesh.userData.pose(pose,true);assert.equal(mesh.material.map,tex);assert.equal(mesh.userData.attackArt224.variant,1);assert.equal(mesh.userData.attackArt224.direction,'NW');
 assert.ok(Math.abs(mesh.geometry.attributes.position.getX(0))<2,'old novice punch translation must not move authored feet');
 mesh.userData.pose({...pose,basicAttack224:null});assert.notEqual(mesh.material.map,tex);
 await mesh.userData.setAppearance({hair:'braid'});mesh.userData.pose(pose);assert.equal(mesh.userData.attackArt224,null);mesh.userData.dispose();
});
test('generated impact waits for confirmed basic damage; air, misses and unrelated spirit damage cannot flash',()=>{
 const a=art(),camera=new THREE.PerspectiveCamera();camera.position.set(4,5,4);camera.lookAt(0,0,0);
 for(const id of ATTACK_CLASSES224){
  const e=createBasicAttackEffect224({classId:id,duration:.4,strikes:[.42]},{castId:3,from:{x:0,z:0},to:{x:2,z:1}},a);
  e.sample(.18,camera);assert.equal(e.group.children[1].visible,false);
  e.hit({type:'miss',source:'basic'});e.sample(.18,camera);assert.equal(e.group.children[1].visible,false);
  e.hit({type:'damage',source:'spirit'});assert.equal(e.group.userData.confirmed,false);
  e.age=.168;e.hit({type:'damage',source:'basic',x:2,z:1,crit:true});e.sample(.19,camera);assert.equal(e.group.children[1].visible,true);
  const at=e.group.children[1].position.clone();e.hit({type:'damage',source:'basic',x:100,z:100});e.sample(.2,camera);assert.deepEqual(e.group.children[1].position,at,'duplicate confirmation cannot move/restart the impact');
  e.sample(.5,camera);assert.equal(e.group.children[1].visible,false);
  let disposed=0;for(const m of e.group.children)m.material.addEventListener('dispose',()=>disposed++);e.releaseResources();e.releaseResources();assert.equal(disposed,2);
 }
 const air=createBasicAttackEffect224({classId:'hunter',duration:.4,strikes:[.42]},{air:true},a);air.age=.2;air.hit({type:'damage',source:'basic'});air.sample(.2,camera);assert.equal(air.group.children[1].visible,false);air.releaseResources();
});
test('camera orbit keeps trail pointed at the projected target; crowd manager isolates actors and cancellation',()=>{
 const a=art(),track={classId:'hunter',duration:.4,strikes:[.42]},scene=new THREE.Scene();
 const manager=createSkillEffects(scene,{basicEffectFactory:(t,o)=>createBasicAttackEffect224(t,o,a)});
 const alice=manager.create(track,{skillIndex:null,castId:1,actor:'alice',from:{x:0,z:0},to:{x:2,z:1}}),bob=manager.create(track,{skillIndex:null,castId:1,actor:'bob',from:{x:0,z:0},to:{x:2,z:1}});
 manager.hit({type:'damage',source:'basic',actor:'alice',castId:1});assert.equal(alice.group.userData.confirmed,true);assert.equal(bob.group.userData.confirmed,false);
 const camera=new THREE.PerspectiveCamera();camera.position.set(-5,6,4);camera.lookAt(0,0,0);manager.update(.13,camera);
 const actual=new THREE.Vector3(1,0,0).applyQuaternion(bob.group.children[0].quaternion),direction=new THREE.Vector3(2,0,1),normal=new THREE.Vector3(0,0,1).applyQuaternion(camera.quaternion);
 direction.addScaledVector(normal,-direction.dot(normal)).normalize();assert.ok(actual.dot(direction)>.999);
 manager.cancel(1,'alice');assert.equal(manager.count,1);manager.cancel(1,'alice');assert.equal(manager.count,1);manager.cancel(1,'bob');assert.equal(manager.count,0);
 for(let i=0;i<22;i++)manager.create(track,{skillIndex:null,castId:i,actor:'bob'});assert.equal(manager.count,16);manager.dispose();assert.equal(scene.children.length,0);
});


test('basic effects sample the same presentation clock as the body, including late hit confirmation',()=>{
 const a=art(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let clock=10;
 const manager=createSkillEffects(scene,{basicEffectFactory:(t,o)=>createBasicAttackEffect224(t,o,a)});
 const e=manager.create({classId:'boxer',duration:.4,strikes:[.42]},{skillIndex:null,actor:'alice',castId:1,presentationClock:()=>clock,startedAt:10,from:{x:0,z:0},to:{x:1,z:0}});
 clock=10.12;manager.update(.5,camera);assert.ok(Math.abs(e.age-.12)<1e-8,'render delta cannot advance the effect ahead of the body');
 clock=10.22;manager.hit({type:'damage',actor:'alice',castId:1,source:'basic'});manager.update(.5,camera);
 assert.ok(Math.abs(e.age-.22)<1e-8);assert.equal(e.group.children[1].visible,true,'confirmation starts at the current shared clock rather than the previous frame');
 manager.update(.5,camera);assert.ok(Math.abs(e.age-.22)<1e-8,'a paused presentation clock cannot age independently');
 clock=10.8;manager.update(0,camera);assert.equal(manager.count,0);manager.dispose();
});

test('cold browser atlas loading cannot fall back to an unconfirmed procedural impact',async()=>{
 const previous=globalThis.document;globalThis.document={};
 try{
  const e=createBasicAttackEffect224({classId:'boxer',duration:.4,strikes:[.42]},{castId:1});
  assert.equal(e.kind,'basic224');e.sample(.2,new THREE.PerspectiveCamera());assert.ok(e.group.children.every(m=>!m.visible));
  e.releaseResources();await Promise.resolve();
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});


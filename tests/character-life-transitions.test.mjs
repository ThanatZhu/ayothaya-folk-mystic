import test from 'node:test';
import assert from 'node:assert/strict';
import {createPosturePlayback,GAMEPLAY_RUN_ENABLED} from '../character-action-state.js';
import {createRiggedSprite} from '../rigged-sprite.js';
import {createPaintedAvatar} from '../painted-avatar.js';
import {characterMotion} from '../character-motion.js';

const transitions={sitDown:{frames:[0,1,2,3],fps:4,loop:false},standUp:{frames:[3,2,1,0],fps:4,loop:false}};
const sample=(player,mode,time,reduced=false)=>player.sample(mode,time,{clips:transitions,reduced});

test('sit-down and stand-up play once, then hold the requested final posture',()=>{
 const p=createPosturePlayback();
 assert.equal(sample(p,'idle',0).mode,'idle');
 assert.deepEqual(sample(p,'sit',10),{mode:'sitDown',time:0,transition:true});
 assert.equal(sample(p,'sit',10.6).mode,'sitDown');
 assert.equal(sample(p,'sit',11).mode,'sit');assert.equal(sample(p,'sit',100).mode,'sit');
 assert.deepEqual(sample(p,'idle',200),{mode:'standUp',time:0,transition:true});
 assert.equal(sample(p,'idle',201).mode,'idle');assert.equal(sample(p,'idle',400).mode,'idle');
 // A direct preview action also settles rather than repeatedly replaying itself.
 p.reset();sample(p,'sitDown',0);assert.equal(sample(p,'sitDown',10).mode,'sit');
 sample(p,'standUp',0);assert.equal(sample(p,'standUp',10).mode,'idle');
});

test('walking, running, attacks and damage interrupt a transition immediately',()=>{
 for(const mode of ['walk','run','attack','cast','hit','sleep']){
  const p=createPosturePlayback();sample(p,'sit',0);sample(p,'sit',.3);
  assert.deepEqual(sample(p,mode,5),{mode,time:5,transition:false});
  assert.equal(sample(p,mode,8).mode,mode);
 }
});

test('reversing a partial sit follows the corresponding point in the stand-up artwork',()=>{
 const p=createPosturePlayback();sample(p,'sit',0);sample(p,'sit',.25);
 const up=sample(p,'idle',2);assert.equal(up.mode,'standUp');assert.equal(up.time,.75);
 sample(p,'idle',2.1);
 const down=sample(p,'sit',3);assert.equal(down.mode,'sitDown');assert.ok(Math.abs(down.time-.15)<1e-9);
 assert.equal(sample(p,'sit',4).mode,'sit');
});

test('reduced motion and missing transition art select the real final resting pose',()=>{
 const p=createPosturePlayback();
 for(const [mode,expected] of [['sit','sit'],['idle','idle'],['sitDown','sit'],['standUp','idle']]){
  assert.deepEqual(sample(p,mode,5,true),{mode:expected,time:5,transition:false});
 }
 p.reset();assert.equal(p.sample('sit',0,{clips:{}}).mode,'sit');
 assert.equal(p.sample('idle',3,{clips:{}}).mode,'idle');
 assert.equal(GAMEPLAY_RUN_ENABLED,false,'review artwork must not enable released gameplay');
});

test('renderer samples authored transitions, locks facing during a transition and does not mirror per frame',async()=>{
 const cell=label=>({width:320,height:320,label});
 const painted=Object.fromEntries(['male','female'].map(g=>[g,Array.from({length:20},(_,i)=>cell(g+'/'+i))]));
 const clips=Object.fromEntries(['idle','sit','sitDown','standUp','walk','run'].map(action=>[action,{frames:Array.from({length:['idle','sit'].includes(action)?1:4},(_,i)=>cell(action+'/'+i)),fps:4,loop:!['sitDown','standUp'].includes(action)}]));
 const mesh=createRiggedSprite(null,{paintedArtLoader:async()=>painted,lifeArtLoader:async()=>({clips})});await mesh.userData.ready;
 mesh.userData.pose(characterMotion({mode:'idle',time:0}),true);
 mesh.userData.pose(characterMotion({mode:'sit',time:0}),true);assert.equal(mesh.userData.lifeAction,'sitDown');assert.equal(mesh.material.map.image.label,'sitDown/0');
 mesh.userData.pose(characterMotion({mode:'sit',time:.6}),false);assert.equal(mesh.material.map.image.label,'sitDown/2');
 assert.ok(mesh.geometry.attributes.position.getX(0)>0,'transition retains the starting facing');
 mesh.userData.pose(characterMotion({mode:'sit',time:1.1}),true);assert.equal(mesh.userData.lifeAction,'sit');
 await mesh.userData.setEquipment({weapon:'novice-weapon-basic'});
 mesh.userData.pose(characterMotion({mode:'sit',time:1.2}),true);assert.equal(mesh.userData.lifeAction,'sit','equipment reload must not restart sitting down');
 mesh.userData.pose(characterMotion({mode:'idle',time:30}),true);assert.equal(mesh.userData.lifeAction,'standUp');
 mesh.userData.pose(characterMotion({mode:'walk',time:31,phase:.5}),true);assert.equal(mesh.userData.lifeAction,'walk');assert.equal(mesh.userData.lifeTransition,false);
 mesh.userData.pose(characterMotion({mode:'sit',time:0,reduced:true}));assert.equal(mesh.userData.lifeAction,'sit');assert.equal(mesh.userData.lifeTransition,false);
 mesh.userData.dispose();
});

test('the optional eight-direction actor waits for stand-up to finish, and returns immediately on movement',async()=>{
 const cell=label=>({width:320,height:320,label});
 const painted=Object.fromEntries(['male','female'].map(g=>[g,Array.from({length:20},(_,i)=>cell(g+'/'+i))]));
 const clips=Object.fromEntries(['idle','sit','sitDown','standUp'].map(action=>[action,{frames:Array.from({length:['idle','sit'].includes(action)?1:4},(_,i)=>cell(action+'/'+i)),fps:4}]));
 const directional={frames:Object.fromEntries(['male','female'].map(g=>[g,Object.fromEntries(['S','SW','W','NW','N','NE','E','SE'].map(d=>[d,{width:192,height:192,label:g+'/'+d}]))])),footV:180/192,manifest:{cell:192,anchor:[96,180]}};
 const mesh=createPaintedAvatar(null,{directional:true,paintedArtLoader:async()=>painted,lifeArtLoader:async()=>({clips}),directionalArtLoader:async()=>directional});await mesh.userData.ready;
 mesh.userData.pose(characterMotion({mode:'idle'}));assert.equal(mesh.userData.directionalActive,true);
 mesh.userData.pose(characterMotion({mode:'sit',time:0}));assert.equal(mesh.userData.lifeAction,'sitDown');assert.equal(mesh.userData.directionalActive,false);
 mesh.userData.pose(characterMotion({mode:'sit',time:1.1}));
 mesh.userData.pose(characterMotion({mode:'idle',time:10}));assert.equal(mesh.userData.lifeAction,'standUp');assert.equal(mesh.userData.directionalActive,false);
 mesh.userData.pose(characterMotion({mode:'idle',time:11.1}));assert.equal(mesh.userData.directionalActive,true);
 mesh.userData.pose(characterMotion({mode:'sit',time:0}));
 mesh.userData.pose(characterMotion({mode:'walk',time:20}));assert.equal(mesh.userData.lifeTransition,false);assert.equal(mesh.userData.directionalActive,true);
 mesh.userData.dispose();
});

test('per-frame atlas sources append locomotion without replacing the existing rest atlas',async t=>{
 const decoded=[],draws=[];
 class FakeImage{async decode(){decoded.push(this.src);}}
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({actors:{'test-actor':{
  source:'rest.png',frames:[
   {rect:[0,0,320,320]},
   {source:'../character-life101/locomotion/test.png',rect:[0,0,320,320]},
   {source:'../character-life101/locomotion/test.png',rect:[320,0,320,320]},
   {source:'./assets/character-life101/transition/test.png',rect:[0,0,320,320]}
  ],clips:{sit:{frames:[0],fps:1},walk:{frames:[1,2,1,2],fps:4},sitDown:{frames:[3,0],fps:3,loop:false}}
 }}})}));
 for(const [key,value] of Object.entries({Image:FakeImage,document:{createElement:()=>({getContext:()=>({drawImage:(...args)=>draws.push(args)})})}})){
  const original=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  t.after(()=>{if(original)Object.defineProperty(globalThis,key,original);else delete globalThis[key];});
 }
 const {loadLifeArt}=await import('../character-life-art.js?frame-source-test');
 const art=await loadLifeArt('test-actor');
 assert.deepEqual(decoded.sort(),[
  './assets/character-life100/rest.png',
  './assets/character-life100/../character-life101/locomotion/test.png',
  './assets/character-life101/transition/test.png'
 ].sort());
 assert.equal(draws.length,4);assert.equal(art.clips.walk.frames.length,4);
 assert.equal(art.clips.sit.frames[0],art.clips.sitDown.frames[1]);
 assert.equal(art.clips.walk.frames[0],art.clips.walk.frames[2]);
});

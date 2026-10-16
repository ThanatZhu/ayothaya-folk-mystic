import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCitizenMotion,stepCitizenMotion} from '../citizen-motion.js';

const camera={rightX:1,rightZ:0,viewX:0,viewZ:1};
const citizen=(x=10,z=10)=>({route:[{x:0,z:0},{x,z}],speed:1,pause:2,talking:false});

test('front/back painted steps face the travel direction, also after rotating the camera',()=>{
 for(const angle of [0,.7,Math.PI/2,Math.PI,4.2]){
  const basis={rightX:Math.cos(angle),rightZ:Math.sin(angle),viewX:-Math.sin(angle),viewZ:Math.cos(angle)};
  for(const [side,toward,front,flip] of [[-1,1,true,false],[1,1,true,true],[1,-1,false,false],[-1,-1,false,true]]){
   const n=citizen(10*(basis.rightX*side+basis.viewX*toward),10*(basis.rightZ*side+basis.viewZ*toward));
   const pose=stepCitizenMotion(createCitizenMotion(n,1),n,.016,basis);
   assert.equal(pose.frame<4,front);assert.equal(pose.flip,flip);
  }
 }
});

test('talking freezes position and gait; closing a conversation resumes without teleporting',()=>{
 const n=citizen(),state=createCitizenMotion(n,1);
 stepCitizenMotion(state,n,.1,camera);
 const before={...state.pose},distance=state.distance,time=state.time;
 n.talking=true;
 for(let i=0;i<300;i++){
  const pose=stepCitizenMotion(state,n,.1,camera);
  assert.equal(pose.frame,1);assert.equal(pose.moving,false);
  assert.equal(pose.x,before.x);assert.equal(pose.z,before.z);
 }
 assert.equal(state.time,time);assert.equal(state.distance,distance);
 n.talking=false;
 const resumed=stepCitizenMotion(state,n,.016,camera);
 assert.ok(Math.abs(Math.hypot(resumed.x-before.x,resumed.z-before.z)-.016)<1e-8);
});

test('steps follow distance, not wall-clock time; hidden tabs and long frames cannot jump the route',()=>{
 const n=citizen(),state=createCitizenMotion(n,1),start={...state.pose};
 stepCitizenMotion(state,n,0,camera);assert.deepEqual(state.pose,start);
 stepCitizenMotion(state,n,60,camera);
 assert.ok(Math.hypot(state.pose.x-start.x,state.pose.z-start.z)<=.100001);
 const normal=citizen(),fast={...citizen(),speed:2};
 const a=createCitizenMotion(normal,0),b=createCitizenMotion(fast,0);
 for(let i=0;i<10;i++){
  const p=stepCitizenMotion(a,normal,.1,camera),q=stepCitizenMotion(b,fast,.05,camera);
  assert.equal(p.frame,q.frame);assert.ok(Math.abs(a.distance-b.distance)<1e-8);
 }
 const resting={...citizen(),route:[{x:0,z:0,rest:true},{x:10,z:10}]},r=createCitizenMotion(resting,0);
 for(let i=0;i<10;i++)assert.equal(stepCitizenMotion(r,resting,.1,camera).frame,0);
 assert.equal(r.distance,0);
});

test('all 80 painted NPC poses have valid body anchors; cook head crosses the old row boundary intact',async()=>{
 const sheets=JSON.parse(await readFile(new URL('../assets/citizens40/frames.json',import.meta.url)));
 let count=0;
 for(const sheet of Object.values(sheets)){
  assert.equal(sheet.rects.length,sheet.columns*4);assert.equal(sheet.anchors.length,sheet.rects.length);
  sheet.rects.forEach(([x,y,w,h],i)=>{
   assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=sheet.width&&y+h<=sheet.height);
   assert.ok(sheet.anchors[i]>0&&sheet.anchors[i]<w);count++;
  });
 }
 assert.equal(count,80);
 for(const [x,y,w,h] of sheets['citizens-market'].rects.slice(18,24)){
  assert.ok(y<768,'cook head must start above the old fixed-grid crop');
  assert.ok(y+h>=1014,'keep the complete feet as well as the head');
 }
});

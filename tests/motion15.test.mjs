import test from 'node:test';
import assert from 'node:assert/strict';
import {characterMotion,deformPoint,attackDuration,MOTION_MODES} from '../character-motion.js';
import {CLASSES} from '../classes.js';
test('walk follows distance and alternates supporting feet',()=>{
 const a=characterMotion({mode:'walk',phase:0}),b=characterMotion({mode:'walk',phase:.5});assert.ok(a.liftL>0);assert.equal(a.liftR,0);assert.ok(b.liftR>0);assert.equal(b.liftL,0);assert.deepEqual(a,characterMotion({mode:'walk',phase:0,time:100}));assert.equal(deformPoint(.75,.98,a).y,.98);
});
test('attacks wind up, strike once, and recover for every profession',()=>{
 for(const {id} of CLASSES){const d=attackDuration(id);assert.ok(characterMotion({mode:'attack',classId:id,time:d*.2}).lean<0);assert.equal(characterMotion({mode:'attack',classId:id,time:d*.45}).frame,3);assert.equal(characterMotion({mode:'attack',classId:id,time:d+1}).frame,0);}
});
test('mesh triangles never invert in any animation',()=>{
 const area=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(const mode of MOTION_MODES)for(const {id} of CLASSES)for(let step=0;step<=40;step++){
  const pose=characterMotion({mode,classId:id,time:step/20});
  for(let y=0;y<24;y++)for(let x=0;x<16;x++){
   const a=deformPoint(x/16,y/24,pose),b=deformPoint((x+1)/16,y/24,pose),c=deformPoint(x/16,(y+1)/24,pose),d=deformPoint((x+1)/16,(y+1)/24,pose);assert.ok(area(a,b,c)>0,mode+' '+id);assert.ok(area(b,d,c)>0,mode+' '+id);
  }
 }
});
test('reduced motion is static; idle soles stay grounded',()=>{
 for(const mode of MOTION_MODES)assert.deepEqual(deformPoint(.3,.95,characterMotion({mode,time:1,reduced:true})),{x:.3,y:.95});
 for(const t of [0,1,2,3])assert.equal(deformPoint(.3,.98,characterMotion({time:t})).y,.98);
});

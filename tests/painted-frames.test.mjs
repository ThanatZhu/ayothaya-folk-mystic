import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FRAME_COUNT,motionFrame,gestureFrame} from '../animation-frames.js';
import {skillTrack,skillPose,SKILL_TRACKS} from '../skill-choreography.js';
const ids=Object.keys(SKILL_TRACKS),base=new URL('../assets/animation37/',import.meta.url);
test('every class and gender has complete, unclipped authored frames and six parts',()=>{
 for(const id of ids){const meta=JSON.parse(readFileSync(new URL(id+'.json',base)));for(const gender of ['male','female']){
  assert.ok([20,28,FRAME_COUNT].includes(meta.frames[gender].length),'poses + side walk, optionally + front (20–27) and back (28–35) walk');assert.equal(Object.keys(meta.parts[gender]).length,6);
  for(const f of meta.frames[gender]){const png=readFileSync(new URL(f.source,base)),W=png.readUInt32BE(16),H=png.readUInt32BE(20),[x,y,w,h]=f.rect;
   assert.ok(x>=0&&y>=0&&x+w<=W&&y+h<=H&&w>0&&h>0,id+' '+gender+' source bounds');
   assert.ok(f.scale>0&&Number.isFinite(f.anchor));
   const left=128-f.anchor*f.scale,top=244-h*f.scale;
   assert.ok(left>=0&&left+w*f.scale<=256&&top>=0,id+' '+gender+' destination bounds '+JSON.stringify(f));
  }
 }}
});
test('walking advances eight painted samples and stays fixed when distance stops',()=>{
 const samples=Array.from({length:8},(_,n)=>motionFrame('walk',0,n/8));assert.equal(new Set(samples).size,8);assert.ok(samples.every(f=>f>=12&&f<FRAME_COUNT));
 assert.equal(motionFrame('walk',999,.31),motionFrame('walk',0,.31));assert.equal(motionFrame('walk',99,.5,true),0);
});
test('skill playback stays within painted atlas and distinct signature attacks use correct poses',()=>{
 for(const id of ids)for(let slot=0;slot<10;slot++){const t=skillTrack(id,slot);for(let n=0;n<=100;n++){const p=skillPose(id,slot,t.duration*n/100);assert.ok(Number.isInteger(p.artFrame)&&p.artFrame>=0&&p.artFrame<12);assert.equal(p.sx,1);assert.equal(p.sy,1);}assert.equal(skillPose(id,slot,.4,{reduced:true}).artFrame,0);}
 assert.equal(gestureFrame('elbow','boxer'),7);assert.equal(gestureFrame('knee','boxer'),8);assert.equal(gestureFrame('kick','boxer'),9);
 assert.notEqual(gestureFrame('draw','hunter'),gestureFrame('release','hunter'));assert.equal(gestureFrame('pray','acolyte'),11);
});

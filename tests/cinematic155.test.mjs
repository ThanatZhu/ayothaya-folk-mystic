import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STORY} from '../story-quests.js';
import {storyScene,sceneUnlocked,sampleScene,taskScene} from '../quest-cinematic-data155.js';
test('every real story step has a readable cinematic using existing artwork',async()=>{
 let count=0;for(const [q,quest] of STORY.entries())for(const [s,step]of quest.steps.entries()){
  const scene=storyScene(q,s);assert.deepEqual(scene.step,step);assert.equal(scene.title,quest.title);assert.equal(scene.captions.length,3);assert.ok(scene.captions.every(x=>typeof x==='string'&&x.length>10));assert.ok(scene.duration>=12);
  assert.ok((await readFile(new URL('../'+scene.art.src.replace(/^\.\//,''),import.meta.url))).length>1000);count++;
 }assert.equal(count,43);assert.equal(STORY.length,22);assert.equal(storyScene(999,0),null);
});
test('future scenes stay locked while current and completed steps can be replayed',()=>{
 const state={quest:3,step:0,done:false};assert.ok(sceneUnlocked(storyScene(0,0),state));assert.ok(sceneUnlocked(storyScene(3,0),state));assert.ok(!sceneUnlocked(storyScene(3,1),state));assert.ok(!sceneUnlocked(storyScene(4,0),state));assert.ok(!sceneUnlocked(storyScene(0,0),null));
});
test('seeking is deterministic, bounded, and never changes quest progress',()=>{
 const scene=storyScene(4,0),original=structuredClone(scene);for(const time of [0,.5,2,3,7,13,14,999,NaN,-5]){
  const a=sampleScene(scene,time);sampleScene(scene,8);assert.deepEqual(sampleScene(scene,time),a);assert.ok(a.time>=0&&a.time<=14);assert.ok(Number.isFinite(a.heroX));
 }assert.deepEqual(scene,original);assert.equal(sampleScene(scene,14).done,true);assert.equal(sampleScene(scene,1).heroAction,'walk');assert.equal(sampleScene(scene,6).heroAction,'attack');
});
test('reduced motion keeps readable poses without moving camera or attack loops',()=>{
 const scene=storyScene(4,0);for(const t of [1,6,12]){const pose=sampleScene(scene,t,true);assert.equal(pose.camera,1);assert.equal(pose.heroX,.43);assert.equal(pose.heroAction,'idle');}
});
test('daily, weekly and class trials have independent previews without reward fields',()=>{
 for(const kind of ['bounty','weekly','training']){const scene=taskScene({kind,title:'บททดสอบ',goal:'ล่ามอนสเตอร์สิบตัว',monster:kind==='training'?null:'straw'});assert.equal(scene.duration,12);assert.equal(scene.captions[1],'ล่ามอนสเตอร์สิบตัว');assert.ok(!('reward'in scene));assert.equal(sampleScene(scene,12).done,true);}
});

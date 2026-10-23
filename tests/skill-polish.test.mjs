import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CLIPS,sampleClip,atlasUv} from '../assets/skill-polish/timing.js';
test('a sword combo lands at its two painted strike beats, then returns to its planted origin',()=>{
 assert.equal(sampleClip('sword',.73).hp,700);assert.equal(sampleClip('sword',.75).hp,570);assert.equal(sampleClip('sword',1.07).hp,570);const second=sampleClip('sword',1.09);assert.equal(second.hp,340);assert.equal(second.frame,7);assert.equal(second.fxFrame,4);assert.ok(second.fxOpacity>.9);assert.equal(sampleClip('sword',CLIPS.sword.duration).heroX,-2);
});
test('rooster beak reaches its victim at impact and its recovery ends grounded',()=>{const s=sampleClip('rooster',.96);assert.ok(Math.abs(s.roosterX+.86-1.55)<.2);assert.equal(s.roosterFrame,4);assert.equal(sampleClip('rooster',.95).hp,700);assert.equal(s.hp,520);const end=sampleClip('rooster',2);assert.ok(Math.abs(end.roosterY)<1e-8);assert.equal(end.roosterFrame,7);});
test('lotus blooms before revival and a fallen ally rises only after the return-of-life beat',()=>{const before=sampleClip('lotus',2.07),after=sampleClip('lotus',2.09);assert.equal(before.hp,0);assert.equal(before.targetMode,'sleep');assert.equal(after.hp,525);assert.equal(after.targetMode,'standUp');assert.ok(after.targetTime>0);assert.equal(after.fxFrame,4);assert.equal(sampleClip('lotus',4.5).targetMode,'idle');assert.equal(sampleClip('lotus',4.5).fxOpacity,0);});
test('every seek is deterministic, every frame stays in its atlas, reduced motion suppresses camera and root travel',()=>{
 for(const id of Object.keys(CLIPS))for(let t=0;t<=CLIPS[id].duration;t+=.017){const first=sampleClip(id,t);sampleClip(id,CLIPS[id].duration-t);assert.deepEqual(sampleClip(id,t),first);assert.ok(first.frame>=0&&first.frame<12);assert.ok(first.fxFrame>=0&&first.fxFrame<8);assert.ok(first.roosterFrame>=0&&first.roosterFrame<8);for(const value of Object.values(first))if(typeof value==='number')assert.ok(Number.isFinite(value));const reduced=sampleClip(id,t,{reduced:true});assert.equal(reduced.shake,0);assert.equal(reduced.heroX,-2);assert.equal(reduced.reaction,0);}
 for(let i=0;i<8;i++){const uv=atlasUv(i);assert.ok(uv.x>=0&&uv.y>=0&&uv.x+uv.w<=1&&uv.y+uv.h<=1);assert.ok(uv.w<.25&&uv.h<.5);}
});

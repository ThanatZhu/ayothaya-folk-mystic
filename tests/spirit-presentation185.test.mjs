import test from 'node:test';
import assert from 'node:assert/strict';
import {spiritPresentationTime} from '../spirit-companion-vfx.js';

test('short spirit bolts use presentation lag rather than the drifting prediction clock',()=>{
 const event={actor:'owner',at:100,launchAt:100,lag:.04};
 for(const clock of [99.75,100,100.25])assert.ok(Math.abs(clock-spiritPresentationTime(clock,event)-.04)<1e-8);
});
test('spirit summon keeps its event offset and queued delay on the same presentation clock',()=>{
 const born=spiritPresentationTime(500,{actor:'other',at:100,spawnedAt:99.9,lag:.07},'spawnedAt');
 assert.ok(Math.abs(500-born-.17)<1e-8);
});
test('offline spirit presentation retains simulation time for deterministic previews',()=>{
 assert.equal(spiritPresentationTime(8,{launchAt:7.7}),7.7);
 assert.equal(spiritPresentationTime(8,{}),8);
});

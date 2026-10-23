import test from 'node:test';import assert from 'node:assert/strict';
import {skillPage} from '../mobile-play-ui.js';
test('all learned hotbar slots stay reachable without changing their saved order',()=>{
 const slots=[0,1,2,3,4,5,6,7,8,9,11,13],seen=[];
 for(let p=0;p<3;p++){const s=skillPage(slots,p);assert.ok(s.slots.length<=5);seen.push(...s.slots);}
 assert.deepEqual(seen,slots);assert.equal(skillPage(slots,3).index,0);assert.deepEqual(skillPage([],8),{index:0,pages:1,slots:[]});
});

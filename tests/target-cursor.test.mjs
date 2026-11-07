import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestTarget} from '../target-cursor.js';

test('the pointer pulls onto the closest monster in reach',()=>{
 const near={x:130,y:100},far={x:150,y:100};
 assert.equal(nearestTarget([far,near],100,100,64),near);
});
test('nothing in reach leaves the pointer free',()=>{
 assert.equal(nearestTarget([{x:300,y:100}],100,100,64),null);
 assert.equal(nearestTarget([],100,100,64),null);
});

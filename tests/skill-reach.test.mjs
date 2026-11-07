import test from 'node:test';
import assert from 'node:assert/strict';
import {skillInReach} from '../role-combat.js';

const target={x:0,z:0};
test('standing still, the edge of the range is close enough',()=>{
 assert.equal(skillInReach(target,5,{x:5.2,z:0,moving:false}),true);
 assert.equal(skillInReach(target,5,{x:5.4,z:0,moving:false}),false);
});
test('still walking, keep going: the server sees us a moment behind',()=>{
 assert.equal(skillInReach(target,5,{x:5.2,z:0,moving:true}),false);
 assert.equal(skillInReach(target,5,{x:4.3,z:0,moving:true}),true);
});
test('the walk stops inside the moving limit, so an approach always ends in a cast',()=>{
 for(const range of [1.4,2.5,5,7]){const stop=Math.max(.5,range-.8);assert.equal(skillInReach(target,range,{x:stop,z:0,moving:true}),true,String(range));}
});

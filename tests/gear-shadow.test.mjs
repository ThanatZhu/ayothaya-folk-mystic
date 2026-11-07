import test from 'node:test';
import assert from 'node:assert/strict';
import {gearShadow} from '../gear-shadow.js';
import {pieceId,weaponId,bossId,withGrade,GRADES,SET_SLOTS} from '../gear-sets.js';
import {itemDef} from '../items.js';

const piece=(slot,family='wind',grade=0,tier=2)=>withGrade(pieceId(family,slot,'swordsman',tier),grade);
const fullSet=(grades=[1,1,1,1],family='wind')=>Object.fromEntries(SET_SLOTS.map((slot,i)=>[slot,piece(slot,family,grades[i])]));

test('the ids in this test are real items',()=>{
 for(const id of Object.values(fullSet()))assert.ok(itemDef(id),id);
});
test('nothing worn casts no coloured shadow',()=>{
 assert.deepEqual(gearShadow({}),{weapon:null,set:null});
 assert.deepEqual(gearShadow(null),{weapon:null,set:null});
});
test('a set shows only when all four pieces are worn',()=>{
 const gear=fullSet();delete gear.shoes;
 assert.equal(gearShadow(gear).set,null);
 assert.equal(gearShadow(fullSet()).set,GRADES[1].color);
});
test('mixed grades show the lowest, and mixed tiers of a family still count',()=>{
 assert.equal(gearShadow(fullSet([4,3,2,3])).set,GRADES[2].color);
 assert.equal(gearShadow({...fullSet(),head:piece('head','wind',1,4)}).set,GRADES[1].color);
});
test('pieces from two families are not a set',()=>{
 assert.equal(gearShadow({...fullSet(),shoes:piece('shoes','wall')}).set,null);
});
test('the weapon shows its own grade colour, apart from the set',()=>{
 const id=weaponId('swordsman',2);
 assert.ok(itemDef(id),id);
 assert.equal(gearShadow({weapon:withGrade(id,3)}).weapon,GRADES[3].color);
 assert.equal(gearShadow({weapon:withGrade(id,3)}).set,null);
});
test('a complete boss set is rainbow',()=>{
 const gear=Object.fromEntries(SET_SLOTS.map(slot=>[slot,bossId(slot,'swordsman')]));
 for(const id of Object.values(gear))assert.ok(itemDef(id),id);
 assert.equal(gearShadow(gear).set,'rainbow');
 assert.equal(gearShadow({...gear,shoes:null}).set,null);
 assert.equal(gearShadow({weapon:bossId('weapon','swordsman')}).weapon,'rainbow');
});

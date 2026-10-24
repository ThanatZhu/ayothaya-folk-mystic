import test from 'node:test';import assert from 'node:assert/strict';
import {levelUpSummary} from '../level-up-summary.js';
test('the level-45 shaman unlock list remains available without including other professions',()=>{
 const s=levelUpSummary(45,'shaman');assert.equal(s.points,12);assert.ok(s.items.length>10,'tier unlocks can produce the long list from the screenshot');
 assert.ok(s.items.some(it=>it.name.includes('ครุฑ')));assert.ok(s.items.every(it=>it.level===45&&(!it.classes||it.classes.includes('shaman'))));
 assert.equal(levelUpSummary(44,'shaman').items.length,0);
});
test('invalid levels cannot create a level-up notice',()=>{for(const n of [null,0,1,100,-1,45.5,NaN])assert.equal(levelUpSummary(n,'shaman'),null);});

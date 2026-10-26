import test from 'node:test';import assert from 'node:assert/strict';
import {levelUpSummary} from '../level-up-summary.js';
test('the level-40 shaman unlock list shows the tier-3 sets in the shaman look only',()=>{
 const s=levelUpSummary(40,'shaman');assert.equal(s.points,11);assert.equal(s.items.length,21,'20 set pieces + the tier-3 staff');
 assert.ok(s.items.some(it=>it.name.includes('หนามไผ่ทะลวง')));assert.ok(s.items.every(it=>it.level===40&&(!it.classes||it.classes.includes('shaman'))&&(!it.look||it.look==='shaman')));
 assert.equal(levelUpSummary(40,'acolyte','female').items.filter(it=>it.look).every(it=>it.look==='nun'),true);
 assert.equal(levelUpSummary(39,'shaman').items.length,0);
});
test('invalid levels cannot create a level-up notice',()=>{for(const n of [null,0,1,100,-1,45.5,NaN])assert.equal(levelUpSummary(n,'shaman'),null);});

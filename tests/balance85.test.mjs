import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanBalance,patch,BASELINE,FIELDS} from '../balance.js';
test('dashboard overrides keep only known numeric fields, clamped to their range',()=>{
 const c=cleanBalance({skills:{'swordsman:0':{damage:50,name:'x',cd:-5}},items:{'hp-small':{buy:1e12,hp:'60'}},junk:{a:{b:1}}});
 assert.deepEqual(c.skills,{'swordsman:0':{damage:50,cd:0}});assert.deepEqual(c.items,{'hp-small':{buy:FIELDS.items.buy[1]}});assert.equal(c.junk,undefined);
});
test('patch leaves objects alone without overrides and remembers originals when it changes them',()=>{
 const target={damage:7};assert.equal(patch('skills','nobody:0',target).damage,7);assert.equal(Object.keys(BASELINE).length,0);
});

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
test('drop chance overrides are clamped to 0-1 and names like __proto__ are dropped',()=>{
 const c=cleanBalance(JSON.parse('{"drops":{"rat":{"rat-tooth":0.9,"card-rat":5,"x":"1"},"__proto__":{"a":1}},"skills":{"__proto__":{"damage":5}}}'));
 assert.deepEqual(c.drops,{rat:{'rat-tooth':.9,'card-rat':1}});assert.equal(({}).damage,undefined);assert.equal(({}).a,undefined);
});

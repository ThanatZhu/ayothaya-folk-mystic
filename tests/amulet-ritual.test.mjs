import test from 'node:test';import assert from 'node:assert/strict';
import {amuletRevealBatch,revealAmulet,revealAllAmulets,amuletRevealComplete,amuletRevealTier} from '../amulet-ritual-state.js';
import {MAX_STACK} from '../items.js';
test('sealed draws copy committed results, take rarity from item definitions, and never expose a prize twice',()=>{
 const input=[{id:'amulet-somdej',count:1,tier:'material',guaranteed:true}],before=structuredClone(input),batch=amuletRevealBatch(input);
 assert.equal(amuletRevealTier(batch),'rainbow');assert.equal(amuletRevealComplete(batch),false);assert.equal(batch.results[0].guaranteed,true);
 assert.equal(revealAmulet(batch,0),true);assert.equal(revealAmulet(batch,0),false);assert.equal(amuletRevealComplete(batch),true);assert.deepEqual(input,before);assert.notEqual(batch.results[0],input[0]);
});
test('opening all reveals exactly the remaining slots and keeps all counts and material/amulet rarities',()=>{
 const input=Array.from({length:10},(_,i)=>({id:['lek-lai','amulet-somdej-orange','amulet-phra-rod-red','amulet-nang-phaya'][i%4],count:i%4===0?2:1})),batch=amuletRevealBatch(input);
 assert.equal(amuletRevealTier(batch),'rainbow');assert.equal(revealAmulet(batch,3),true);assert.deepEqual(revealAllAmulets(batch),[0,1,2,4,5,6,7,8,9]);assert.deepEqual(revealAllAmulets(batch),[]);assert.ok(amuletRevealComplete(batch));assert.deepEqual(batch.results.map(r=>[r.id,r.count]),input.map(r=>[r.id,r.count]));
 assert.equal(amuletRevealTier(amuletRevealBatch([{id:'amulet-somdej-red',count:1}])),'red');assert.equal(amuletRevealTier(amuletRevealBatch([{id:'amulet-somdej-orange',count:1}])),'orange');assert.equal(amuletRevealTier(amuletRevealBatch([{id:'lek-lai',count:2}])),'material');
});
test('invalid result shapes and indices cannot create or reveal new rewards',()=>{
 for(const rows of [null,[],Array.from({length:2},()=>({id:'lek-lai',count:1})),[{id:'missing',count:1}],[{id:'lek-lai',count:0}],[{id:'lek-lai',count:MAX_STACK+1}],[{id:'lek-lai',count:1.5}]])assert.throws(()=>amuletRevealBatch(rows),/bad-amulet-results/);
 const batch=amuletRevealBatch([{id:'lek-lai',count:2}]);for(const i of [-1,1,NaN,'0',.5])assert.equal(revealAmulet(batch,i),false);assert.deepEqual(batch.opened,[false]);
});

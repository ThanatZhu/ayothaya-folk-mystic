import test from 'node:test';
import assert from 'node:assert/strict';
import {summonBatch,openSummonEgg,openAllSummonEggs,allSummonEggsOpen,summonTier} from '../pet-summon-state.js';
import {petAccountAction} from '../pet-account.js';
import {CHAPTER2_MONSTERS} from '../chapter2-monsters.js';
import {stat,readFile} from 'node:fs/promises';
test('reveals only expose the already saved server result, including duplicates and pity',()=>{
 const granted=petAccountAction(null,{type:'petGrant',gems:1000,pet:null,requestId:'grant-gacha147'}).state;granted.pity=79;
 const action={type:'petDraw',count:10,requestId:'draw-gacha147'},saved=petAccountAction(granted,action,()=>.5),snapshot=JSON.stringify(saved.state),batch=summonBatch(saved.result.results);
 assert.equal(saved.state.balance,0);assert.equal(batch.results[0].tier,'S');assert.equal(summonTier(batch),'B');assert.equal(openSummonEgg(batch,0),true);assert.equal(summonTier(batch),'S');assert.equal(openSummonEgg(batch,0),false);assert.equal(openSummonEgg(batch,-1),false);assert.equal(openSummonEgg(batch,10),false);assert.equal(allSummonEggsOpen(batch),false);openAllSummonEggs(batch);assert.equal(allSummonEggsOpen(batch),true);assert.equal(JSON.stringify(saved.state),snapshot);assert.equal(petAccountAction(saved.state,action,()=>{throw Error('must never reroll');}).replayed,true);
});
test('each missing chapter card now has its own generated portrait',async()=>{
 const manifest=JSON.parse(await readFile('assets/summon147/prompts.json','utf8'));assert.equal(manifest.cards.length,CHAPTER2_MONSTERS.length);
 for(const m of CHAPTER2_MONSTERS){assert.ok(manifest.cards.some(x=>x.id===m.id));assert.ok((await stat('assets/cards147/'+m.id+'.webp')).size>4000,m.id);}
});

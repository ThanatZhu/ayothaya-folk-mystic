import test from 'node:test';import assert from 'node:assert/strict';
import {gachaRateInfo,gachaRatePercent} from '../gacha-rate-info.js';
import {AMULET_REWARDS,AMULETS,AMULET_PITY} from '../amulets.js';
import {PREMIUM_PETS} from '../premium-pets.js';
import {PET_RATE,PET_PITY} from '../pet-gacha.js';
const total=rows=>rows.reduce((n,r)=>n+r.rate,0),equal=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('help lists every actual amulet/material reward and normal rates without rounding the underlying data',()=>{
 const info=gachaRateInfo('amulets');assert.equal(info.rewards.length,19);assert.equal(info.pity,AMULET_PITY);assert.equal(info.price,100);equal(total(info.rewards),1);equal(total(info.tiers),1);
 for(const r of AMULET_REWARDS){const row=info.rewards.find(x=>x.id===r.id);assert.ok(row.name);equal(row.rate,r.rate);assert.equal(row.count,r.count);}
 equal(info.tiers.find(r=>r.id==='material').rate,.75);equal(info.tiers.find(r=>r.id==='rainbow').rate,.005);
});
test('pet help splits tier rates equally across the real tier pools and distinguishes S guarantee rates',()=>{
 const info=gachaRateInfo('pets');assert.equal(info.rewards.length,10);assert.equal(info.pity,PET_PITY);equal(total(info.rewards),1);equal(total(info.tiers),1);
 for(const p of PREMIUM_PETS)equal(info.rewards.find(x=>x.id===p.id).rate,PET_RATE[p.tier]/PREMIUM_PETS.filter(x=>x.tier===p.tier).length);
 assert.equal(info.guaranteed.length,3);equal(total(info.guaranteed),1);for(const row of info.guaranteed){assert.equal(row.tier,'S');equal(row.rate,1/3);}
});
test('amulet guarantee contains only five rainbow amulets at 20% each, independent from normal .1% per design',()=>{
 const info=gachaRateInfo('amulets');assert.equal(info.guaranteed.length,AMULETS.length);equal(total(info.guaranteed),1);for(const row of info.guaranteed){equal(row.rate,.2);assert.equal(row.tier,'rainbow');equal(info.rewards.find(r=>r.id===row.id).rate,.001);}
 assert.equal(gachaRatePercent(.001),'0.1%');assert.equal(gachaRatePercent(1/3),'33.3333%');assert.throws(()=>gachaRateInfo('unknown'),/bad-gacha-category/);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {createLedger,ECON_SOURCES,ECON_SINKS} from '../server/economy-ledger.js';

const day=(y,m,d,h=12)=>Date.UTC(y,m-1,d,h-7);   // a Thai-time moment
test('coins created and destroyed are counted per Thai day and per reason',()=>{
 let now=day(2026,11,10,9);const L=createLedger({now:()=>now});
 L.record(500,'monster');L.record(120,'npcSell');L.record(-80,'npcBuy');L.record(-20,'refine');L.record(0,'monster');
 const d=L.today();assert.equal(d.day,'2026-11-10');
 assert.deepEqual(d.in,{monster:500,npcSell:120});assert.deepEqual(d.out,{npcBuy:80,refine:20});
 now=day(2026,11,11,0)+60e3;L.record(7,'daily');   // just after Thai midnight
 assert.equal(L.today().day,'2026-11-11');assert.deepEqual(L.today().in,{daily:7});
 assert.equal(L.days().length,2);
});
test('unknown reasons and bad amounts are refused, so the books stay clean',()=>{
 const L=createLedger({now:()=>day(2026,11,10)});
 assert.throws(()=>L.record(10,'trade'),/econ-reason/);
 L.record(Number.NaN,'monster');L.record(Infinity,'monster');
 assert.deepEqual(L.today().in,{});
 assert.ok(ECON_SOURCES.monster&&ECON_SINKS.refine,'reasons carry Thai labels');
});
test('the books keep 30 days, round-trip through saving, and report a public view',()=>{
 let now=day(2026,10,1);const L=createLedger({now:()=>now});
 for(let i=0;i<40;i++){now=day(2026,10,1)+i*86400e3;L.record(100,'monster');L.record(-40,'npcBuy');}
 assert.equal(L.days().length,30);
 const copy=createLedger({now:()=>now,saved:L.toJSON()});assert.deepEqual(copy.days(),L.days());
 L.setHeld(123456,10);const v=L.publicView();
 assert.equal(v.held,123456);assert.equal(v.characters,10);assert.equal(v.days.at(-1).net,60);
 assert.ok(v.sources.monster.th&&v.sinks.npcBuy.th);
 assert.equal(L.dirty,true);L.markSaved();assert.equal(L.dirty,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createLedger,GOLD_SOURCES,GOLD_SINKS} from '../server/economy-ledger.js';
const gold=opts=>createLedger({sources:GOLD_SOURCES,sinks:GOLD_SINKS,...opts});
test('gold ledger books by its own reasons',()=>{
 const g=gold();g.record(500,'mail');g.record(-120,'gacha');
 const d=g.publicView().days[0];
 assert.deepEqual(d.in,{mail:500});assert.deepEqual(d.out,{gacha:120});assert.equal(d.net,380);
 assert.throws(()=>g.record(10,'monster'),/econ-reason/);
});
test('coin ledger is unchanged',()=>{
 const c=createLedger();c.record(5,'monster');
 assert.throws(()=>c.record(-5,'gacha'),/econ-reason/);
 assert.equal(c.publicView().pending,null);
});
test('pending survives save and load',()=>{
 const g=gold();g.setHeld(900,3,250);
 const v=gold({saved:g.toJSON()}).publicView();
 assert.equal(v.held,900);assert.equal(v.characters,3);assert.equal(v.pending,250);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {goldStats} from '../explorer-gold.js';
test('goldStats reads holdings and today from the gold view',()=>{
 assert.deepEqual(goldStats({gold:{held:120,characters:7,pending:30,days:[{totalIn:1,totalOut:2},{totalIn:50,totalOut:9}]}}),{held:120,holders:7,mailGold:30,todayIn:50,todayOut:9});
 assert.deepEqual(goldStats({gold:{days:[]}}),{held:0,holders:0,mailGold:0,todayIn:0,todayOut:0});
});
test('goldStats is null for an old server without gold',()=>{assert.equal(goldStats({held:1}),null);assert.equal(goldStats(null),null);});

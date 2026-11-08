import test from 'node:test';import assert from 'node:assert/strict';
import {itemDef,composeId} from '../items.js';
import {setBonuses,withGrade,dungeonPieceId,dungeonRainbowId,dungeonLines} from '../gear-sets.js';
import {deriveStats} from '../character-stats.js';

const SLOTS=['head','armor','garment','shoes'];
const piece=(slot,grade=0,refine=0)=>itemDef(composeId(dungeonPieceId('krasue',slot),refine,null,null,grade));
const rainbow=(slot,refine=0)=>itemDef(composeId(dungeonRainbowId('krasue',slot),refine));
const r4=n=>+n.toFixed(4);

test('dungeon pieces: helmet PVE by colour, DEF by colour, any class',()=>{
 const red=piece('head',4);assert.equal(red.pct.pveDmg,.016);assert.equal(red.def,Math.round(Math.round(.05*35)*1.6));
 assert.equal(piece('head').pct.pveDmg,.01);assert.equal(rainbow('head').pct.pveDmg,.018);
 assert.equal(piece('armor',4).pct?.pveDmg,undefined);
 assert.equal(piece('armor').classes,undefined);assert.equal(piece('armor').level,35);
 assert.equal(itemDef('shard-krasue').kind,'loot');
});
test('dungeon set bonus: 2 pieces HP, 4 pieces ATK/MATK by the lowest colour, refine tiers add PVE',()=>{
 const blue=setBonuses(SLOTS.map(s=>piece(s))).total;assert.equal(r4(blue.atkPct),.05);assert.equal(r4(blue.matkPct),.05);assert.equal(r4(blue.hpPct),.05);
 assert.equal(r4(setBonuses(SLOTS.map(s=>piece(s,4))).total.atkPct),.08);
 assert.equal(r4(setBonuses([piece('head',4),piece('armor',4),piece('garment',4),piece('shoes',0)]).total.atkPct),.05);
 assert.equal(r4(setBonuses(SLOTS.map(s=>rainbow(s))).total.atkPct),.09);
 const two=setBonuses([piece('head'),piece('armor')]).total;assert.equal(r4(two.hpPct),.05);assert.equal(two.atkPct,undefined);
 assert.equal(r4(setBonuses(SLOTS.map(s=>piece(s,0,10))).total.pveDmg),.11);   // helmet .01 + tier 2 .10 (not .15)
 assert.equal(setBonuses(SLOTS.map(s=>piece(s,0,10))).active.find(a=>a.dungeon).refineTier,2);
});
test('a full rainbow dungeon set at +10 gives PVE .118 through deriveStats, under the 15% cap',()=>{
 const gear=Object.fromEntries(SLOTS.map(s=>[s,composeId(dungeonRainbowId('krasue',s),10)]));
 assert.equal(r4(deriveStats({classId:'hunter',level:60,gear}).pveDmg),.118);
});
test('the bag lists the dungeon set lines',()=>{
 const lines=dungeonLines('krasue',4,4);assert.equal(lines.length,2);assert.ok(lines.every(l=>l[1]));
 assert.match(lines[1][0],/ATK\/MATK \+8%/);
});

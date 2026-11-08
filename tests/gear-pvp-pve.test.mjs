import test from 'node:test';import assert from 'node:assert/strict';
import {itemDef} from '../items.js';
import {pieceId,weaponId,bossId,withGrade} from '../gear-sets.js';

const def=id=>itemDef(id);
test('heads and weapons carry PVP damage by grade, armour pieces do not',()=>{
 assert.equal(def(pieceId('pierce','head','swordsman',6)).pct.pvpDmg,.005);
 assert.equal(def(withGrade(pieceId('pierce','head','swordsman',6),4)).pct.pvpDmg,.008);
 assert.equal(def(withGrade(weaponId('swordsman',6),4)).pct.pvpDmg,.016);
 assert.equal(def(pieceId('pierce','armor','swordsman',6)).pct.pvpDmg,undefined);
 assert.equal(def(bossId('head','swordsman')).pct.pvpDmg,.015);
 assert.equal(def(bossId('weapon','swordsman')).pct.pvpDmg,.025);
});
test('DEF moves from the helmet to the garment and shoes',()=>{
 assert.equal(def(pieceId('wall','head','swordsman',6)).def,Math.round(.05*85));
 assert.equal(def(pieceId('wall','garment','swordsman',6)).def,Math.round(.15*85));
 assert.equal(def(pieceId('wall','shoes','swordsman',6)).def,Math.round(.12*85));
});

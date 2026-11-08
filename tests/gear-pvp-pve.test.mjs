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

import {composeId} from '../items.js';
import {setBonuses,setTierLines,STAT_CAPS} from '../gear-sets.js';
import {deriveStats} from '../character-stats.js';
const at4=(family,r)=>['head','armor','garment','shoes'].map(s=>itemDef(composeId(pieceId(family,s,'swordsman',6),r)));
test('a full family set unlocks PVP at +5 on every piece and doubles at +10',()=>{
 const pvp=w=>+setBonuses(w).total.pvpDmg.toFixed(4);
 assert.equal(pvp(at4('pierce',4)),.005);
 assert.equal(pvp(at4('pierce',5)),.035);assert.equal(pvp(at4('pierce',10)),.065);
 const mixed=at4('pierce',5);mixed[2]=itemDef(composeId(pieceId('pierce','garment','swordsman',6),4));
 assert.equal(pvp(mixed),.005);
 assert.equal(setBonuses(at4('pierce',10)).active[0].refineTier,2);
 assert.equal(setBonuses(at4('pierce',5).slice(0,3)).active[0].refineTier??0,0);
});
test('a boss set needs all five pieces, weapon included',()=>{
 const armour=r=>['head','armor','garment','shoes'].map(s=>itemDef(composeId(bossId(s,'swordsman'),r)));
 assert.equal(+setBonuses(armour(10)).total.pvpDmg.toFixed(4),.015);
 const full=[...armour(10),itemDef(composeId(bossId('weapon','swordsman'),10))];
 assert.equal(+setBonuses(full).total.pvpDmg.toFixed(4),.14);
});
test('derived PVE and PVP damage come from gear and stay under the 15% cap',()=>{
 const gear={weapon:composeId(bossId('weapon','swordsman'),10),...Object.fromEntries(['head','armor','garment','shoes'].map(s=>[s,composeId(bossId(s,'swordsman'),10)]))};
 const d=deriveStats({classId:'swordsman',level:99,gear});
 assert.equal(+d.pvpDmg.toFixed(4),.14);assert.equal(d.pveDmg,0);
 assert.equal(STAT_CAPS.pvpDmg,.15);assert.equal(STAT_CAPS.pveDmg,.15);
});
test('the bag shows both refine tiers and marks the reached one',()=>{
 const lines=setTierLines('family',[5,5,5,7],4);
 assert.deepEqual(lines,[['ตีบวก +5 ทั้งชุด: ดาเมจ PVP +3%',true],['ตีบวก +10 ทั้งชุด: ดาเมจ PVP +6%',false]]);
 assert.deepEqual(setTierLines('boss',[10,10,10,10],5).map(l=>l[1]),[false,false]);
});

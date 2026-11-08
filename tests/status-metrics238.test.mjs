import test from 'node:test';
import assert from 'node:assert/strict';
import {statusMetrics,statNumber,statPercent} from '../status-metrics238.js';
import {deriveStats} from '../character-stats.js';
const flatten=d=>new Map(statusMetrics(d).flatMap(g=>g.rows.map(r=>[r.key,r])));
test('combat ratios use correct units, retaining decimals and unknown values',()=>{
 const rows=flatten({atk:123.45,def:79,mdef:18.8,armorPen:.25,crit:.4,critMult:1.5,delay:.5,cdr:.15,mpRegen:1.2});
 assert.equal(rows.get('armorPen').value,'25%');assert.equal(rows.get('critMult').value,'150%');assert.equal(rows.get('attackSpeed').value,'200%');assert.equal(rows.get('mpRegen').value,'120%');assert.equal(rows.get('def').value,'79');assert.equal(rows.get('mdef').value,'18.8');assert.equal(rows.get('atk').value,'123.45');assert.equal(rows.get('coinPct').value,'—');assert.equal(statNumber(Infinity),'—');assert.equal(statPercent(NaN),'—');assert.deepEqual(statusMetrics(null),[]);
});
test('known absent conditional bonuses show zero; an absent snapshot field stays unknown',()=>{
 const rows=flatten({vsSize:{small:.2},vsElement:{fire:.15},resist:{water:.1}});
 assert.equal(rows.get('vsSize-small').value,'20%');assert.equal(rows.get('vsSize-large').value,'0%');assert.equal(rows.get('vsElement-fire').value,'15%');assert.equal(rows.get('resist-water').value,'10%');assert.equal(flatten({}).get('resist-water').value,'—');
});
test('all real derived combat stats are displayed without modifying the snapshot',()=>{
 const d=deriveStats({level:30,classId:'hunter',stats:{str:10,agi:15,vit:10,int:10,dex:20,luk:10},reborn:2}),before=JSON.stringify(d),rows=flatten(d);
 for(const key of ['maxHp','maxMp','atk','matk','def','mdef','hit','fleeStat','flee','crit','critMult','armorPen','cdr','mpCut','mpRegen','dmgReduce','pveDmg','pvpDmg','moveSpeed','coinPct','skillPower','weaponElement'])assert.notEqual(rows.get(key)?.value,'—',key);
 for(const key of ['str','agi','vit','int','dex','luk'])assert.equal(rows.get('total-'+key).value,statNumber(d.total[key]));
 assert.equal(JSON.stringify(d),before);assert.equal(rows.size,47);assert.match(rows.get('flee').help,/เลเวลเดียวกัน/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {statTip} from '../stat-tips.js';
import {STATS,STAT_MAX,normalizeStats,deriveStats,raiseCost} from '../character-stats.js';
import {CLASSES} from '../classes.js';

const CLASS_IDS=['novice',...CLASSES.map(c=>c.id)];
const who=classId=>({classId,level:50,reborn:0});

test('every class and stat has help text and a cost line that matches the real cost',()=>{
 for(const classId of CLASS_IDS)for(const stat of STATS){
  const stats=normalizeStats({[stat]:12}),t=statTip(stat,{who:who(classId),stats,gear:{}});
  assert.ok(t.rules.length>0,classId+' '+stat);assert.match(t.raise,new RegExp(`12 → 13 ใช้ ${raiseCost(12)} แต้ม`));
  const max=statTip(stat,{who:who(classId),stats:normalizeStats({[stat]:STAT_MAX}),gear:{}});assert.deepEqual(max.gains,[]);assert.match(max.raise,/สูงสุดแล้ว/);
 }
});

test('the live preview is exactly what deriveStats gives for one more point',()=>{
 for(const classId of CLASS_IDS)for(const stat of STATS)for(const value of [1,9,29,44]){
  const stats=normalizeStats({[stat]:value}),t=statTip(stat,{who:who(classId),stats,gear:{weapon:null}});
  const a=deriveStats({...who(classId),stats,gear:{}}),b=deriveStats({...who(classId),stats:{...stats,[stat]:value+1},gear:{}});
  const gain=label=>t.gains.find(([k])=>k===label)?.[1];
  if(b.atk!==a.atk&&!a.magic)assert.equal(gain('ATK'),'+'+(Math.round((b.atk-a.atk)*10)/10),classId+' '+stat+' '+value);else assert.equal(gain('ATK'),undefined);
  if(b.hit!==a.hit)assert.equal(gain('HIT'),'+'+(b.hit-a.hit));
  if(b.maxHp!==a.maxHp)assert.ok(gain('HP สูงสุด'));
 }
});

test('the rules say what the formulas do at the breakpoints',()=>{
 // melee STR: +1 a point, and the 10th point adds the first bonus
 let t=statTip('str',{who:who('swordsman'),stats:normalizeStats({str:9}),gear:{}});assert.ok(t.gains.some(([k,n])=>k==='ATK'&&n==='+2'));
 // ranged: DEX is the damage stat, STR only every 5
 t=statTip('dex',{who:who('hunter'),stats:normalizeStats({dex:9}),gear:{}});assert.ok(t.gains.some(([k,n])=>k==='ATK'&&n==='+2'));
 t=statTip('str',{who:who('hunter'),stats:normalizeStats({str:4}),gear:{}});assert.ok(t.gains.some(([k,n])=>k==='ATK'&&n==='+1'));assert.match(t.rules.join(),/ทุก 5 STR/);
 // magic: STR changes nothing they hit with, INT does
 t=statTip('str',{who:who('shaman'),stats:normalizeStats({str:20}),gear:{}});assert.ok(!t.gains.some(([k])=>k==='MATK'));assert.match(t.rules[0],/MATK/);
 t=statTip('int',{who:who('shaman'),stats:normalizeStats({int:6}),gear:{}});assert.ok(t.gains.some(([k])=>k==='MATK'));
 // LUK: every 3rd point gives ATK and HIT together, crit every point
 t=statTip('luk',{who:who('rogue'),stats:normalizeStats({luk:2}),gear:{}});assert.ok(['ATK','HIT','คริติคอล'].every(k=>t.gains.some(([g])=>g===k)));
 // AGI and DEX speed up attacks
 t=statTip('agi',{who:who('boxer'),stats:normalizeStats({agi:10}),gear:{}});assert.ok(t.gains.some(([k])=>k==='ความเร็วโจมตี'));
});

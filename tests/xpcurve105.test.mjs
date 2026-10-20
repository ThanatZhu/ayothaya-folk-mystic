import test from 'node:test';
import assert from 'node:assert/strict';
import {levelNeed,levelStart,baseProgress,migrateXp,LEVEL_BANDS} from '../experience.js';

test('0.105.2 level bands: 1-50 as before, reaching 51-70 costs x5 and 71-99 x15',()=>{
 assert.equal(levelNeed(1),50);assert.equal(levelNeed(49),50+6*48);
 assert.equal(levelNeed(50),(50+6*49)*5);assert.equal(levelNeed(69),(50+6*68)*5);
 assert.equal(levelNeed(70),(50+6*69)*15);assert.equal(levelNeed(98),(50+6*97)*15);
 assert.deepEqual(LEVEL_BANDS.map(b=>b[1]),[1,5,15]);
 assert.ok(levelStart(25)>=2400&&levelStart(60)>=5900,'Firestore class/job thresholds still hold');
});
test('old saves keep their level and progress share on the new curve',()=>{
 const old=l=>{let t=0;for(let i=1;i<l;i++)t+=50+6*(i-1);return t;}; // 0.57 START
 for(const l of [1,10,50,51,60,70,71,98]){
  assert.equal(baseProgress({baseXp:migrateXp(old(l))}).level,l);
  const half=old(l)+Math.floor((50+6*(l-1))/2),p=baseProgress({baseXp:migrateXp(half)});assert.equal(p.level,l);assert.ok(Math.abs(p.percent-50)<1.5,l+': '+p.percent);
 }
 assert.equal(baseProgress({baseXp:migrateXp(old(99)+500)}).level,99);assert.equal(migrateXp(0),0);assert.equal(migrateXp(-5),0);
});

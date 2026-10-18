import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {walkCycle,walkView,gaitStep,WALK_CADENCE} from '../character-motion.js';
import {motionFrame} from '../animation-frames.js';
// 0.61.3: original character art for every class (20 frames per gender); front/back walk and stand frames are
// optional and fall back to the side walk / original idle (rigged-sprite.js) when a class has no such art.
test('original art is back: 20 frames per gender, walk strips from the original sheets', () => {
 for(const c of ['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']){
  const m=JSON.parse(fs.readFileSync(new URL('../assets/animation37/'+c+'.json',import.meta.url)));
  for(const g of ['male','female']){assert.equal(m.frames[g].length,20);assert.equal(m.frames[g][12].source,c+'-walk.png');}
 }
 assert.equal(walkCycle('novice'),2.1);
});
test('walk view and cadence cap still apply', () => {
 assert.equal(walkView({x:0,z:1},0),'front');assert.equal(motionFrame('walk',0,.01,false,'novice','front'),20);
 assert.equal(WALK_CADENCE,2);assert.ok(Math.abs(gaitStep(5.3/60,1/60,'novice')-2/60)<1e-9);
});

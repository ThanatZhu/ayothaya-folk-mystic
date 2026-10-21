import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterHit,TANK_CLASSES} from '../combat-core.js';
const world=(cls,def=100,maxHp=2000,shield=0)=>({player:{maxHp,hp:maxHp,shield},profession:{id:cls},status:{},derived:{def,mdef:0,flee:0,fleeStat:null,resist:{}}});
const roll=v=>{let first=true;return ()=>{if(first){first=false;return .99;}return v;};}; // first draw = dodge roll (miss it), second = the share
test('the Straw King hits a tank for 20% of max HP minus DEF',()=>{
 assert.ok(TANK_CLASSES.has('swordsman'));
 assert.equal(monsterHit(world('swordsman',100,2000),34,roll(.5),'straw-king'),400-100);
 assert.equal(monsterHit(world('swordsman',999,2000),34,roll(.5),'straw-king'),1,'huge DEF still takes at least 1');
});
test('everyone else takes a random 20-30% of max HP that DEF does not reduce',()=>{
 for(const cls of ['shaman','hunter','rogue','acolyte','boxer','lancer']){
  assert.equal(monsterHit(world(cls,300,2000),34,roll(0),'straw-king'),400,cls+' low roll = 20%');
  assert.equal(monsterHit(world(cls,300,2000),34,roll(.999),'straw-king'),Math.round(2000*(.2+.999*.1)),cls+' high roll ~30%');
 }
 assert.equal(monsterHit(world('shaman',0,2000,5),34,roll(0),'straw-king'),Math.round(400*.35),'a guard shield still cuts it');
});
test('other monsters keep the normal DEF formula',()=>{
 assert.equal(monsterHit(world('shaman',0,2000),34,roll(0),'rat'),34);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterDef,monsterMdef,monsterFlee,monsterHit,defFactor,hitChance,dodgeChance,magicMonster} from '../combat-formulas.js';
import {deriveStats} from '../character-stats.js';
import {CombatWorld,MONSTER_TYPES,monsterHit as blow} from '../combat-core.js';
test('defence, hit and dodge curves stay inside their bounds',()=>{
 assert.equal(defFactor(0),1);assert.equal(defFactor(100),.5);
 assert.equal(hitChance(500,0),1);assert.equal(hitChance(0,500),.3);
 assert.ok(dodgeChance(0,500)>=.05&&dodgeChance(500,0)<=.75);
 const boss={level:95};assert.ok(monsterDef(boss)>monsterDef({level:10}));assert.equal(monsterDef({level:9,def:3}),3);
 assert.ok(magicMonster({id:'bog-lantern'})&&!magicMonster({id:'rat'}));
 assert.ok(monsterMdef(boss)>0&&monsterFlee(boss)>0&&monsterHit(boss)>0);
});
test('stats feed the new numbers: DEX → HIT, AGI → FLEE, INT → MDEF, LUK/DEX → a little ATK',()=>{
 const a=deriveStats({level:50,classId:'swordsman',stats:{str:40}}),b=deriveStats({level:50,classId:'swordsman',stats:{str:40,dex:30,luk:30,agi:40,int:30}});
 assert.ok(b.hit>a.hit&&b.fleeStat>a.fleeStat&&b.mdef>a.mdef&&b.atk>a.atk);
});
test('a monster blow is softened by DEF, or by MDEF when a lantern casts it',()=>{
 const w=new CombatWorld({classId:'swordsman'});w.applyDerived({...deriveStats({level:60,classId:'swordsman',stats:{vit:60}}),fleeStat:0});
 const never=()=>.99;assert.ok(blow(w,100,never,'rat')<100);
 w.derived.mdef=0;assert.equal(blow(w,100,never,'bog-lantern'),100,'no MDEF, full magic blow');
});
test('physical basic attacks can miss a much higher-level monster; skills lose some damage to DEF',()=>{
 const w=new CombatWorld({classId:'swordsman'});w.safe=false;w.applyDerived(deriveStats({level:1,classId:'swordsman'}));
 const m=w.mobs[0];m.type=MONSTER_TYPES.findIndex(t=>t.id==='marsh-ape-awakened');m.hp=m.maxHp=1e9;Object.assign(w.player,{x:m.x+1,z:m.z});w.select(m.id);
 let miss=0;for(let i=0;i<200;i++){w.player.attackCD=0;w.events.length=0;w.basicAttack(true);if(w.events.some(e=>e.type==='miss'))miss++;}
 assert.ok(miss>60,'about 2 in 3 swings miss a Lv.95 boss at Lv.1 ('+miss+'/200)');
 assert.ok(w.guardOf(m,false)<1&&w.guardOf({pvp:true},false)===1);
});

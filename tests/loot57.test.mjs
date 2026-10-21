import test from 'node:test';
import assert from 'node:assert/strict';
import {itemDef,rollLoot,composeId,ITEMS,SHOPS} from '../items.js';
import {baseProgress,levelStart,levelNeed} from '../experience.js';
import {deriveStats,canWear} from '../character-stats.js';
import {refineGear} from '../refine.js';

test('0.57 level curve grows and keeps the class/job thresholds above the Firestore rules', () => {
 assert.equal(levelNeed(1),50);assert.ok(levelNeed(30)>levelNeed(10));
 assert.ok(levelStart(25)>=2400&&levelStart(60)>=5900);assert.equal(baseProgress({baseXp:levelStart(25),jobXp:0}).level,25);
});

test('affixes: parse, add stats, raise rarity, survive refine, and roll on ~35% of gear drops', () => {
 const d=itemDef('vest-buffalo!v2');assert.equal(d.bonus.vit,2);assert.equal(d.rarity,itemDef('vest-buffalo').rarity+1);
 assert.equal(itemDef('rat-tooth!s1'),null,'only gear takes affixes');assert.equal(itemDef('vest-buffalo!x1'),null);
 const plain=deriveStats({level:20,classId:'swordsman',gear:{armor:'vest-buffalo'}}),aff=deriveStats({level:20,classId:'swordsman',gear:{armor:'vest-buffalo!v2'}});
 assert.equal(aff.total.vit,plain.total.vit+2);
 const up=refineGear({coins:9999,items:{'iron-ore':1,laterite:1}},{armor:'vest-buffalo!v2'},'armor',{rand:()=>0});assert.equal(up.gear.armor,'vest-buffalo+1!v2');
 assert.equal(composeId('sword-iron',3,'card-rat','s1'),'sword-iron+3~card-rat!s1');assert.ok(itemDef('sword-iron+3~card-rat!s1'));
 let gear=0,aff2=0;for(let i=0;i<3000;i++)for(const it of rollLoot('mill-keeper').items)if(itemDef(it.id).kind==='gear'){gear++;if(it.id.includes('!'))aff2++;}
 assert.ok(aff2/gear>.28&&aff2/gear<.42,'affix rate '+aff2/gear);
});

test('tier 3 (Lv.25, forge) and tier 4 (Lv.35, boss only) weapons exist for all 7 classes', () => {
 for(const c of ['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']){
  const w=Object.entries(ITEMS).filter(([,it])=>it.slot==='weapon'&&it.classes?.includes(c)&&it.level>=25&&!it.bracket); // 0.107 Lv.45+ bracket gear: tests/gear106
  assert.deepEqual(w.map(([,it])=>it.level).sort(),[25,35]);
  const t3=w.find(([,it])=>it.level===25)[0];assert.ok(SHOPS['ครูแสนดาบ'].stock.includes(t3));
  assert.equal(canWear(t3,{classId:c,level:24}),'low-level');assert.equal(canWear(t3,{classId:c,level:25}),null);
 }
});

import test from 'node:test';import assert from 'node:assert/strict';
import {craftSection,craftRecipes} from '../craft-view176.js';
import {RECIPES} from '../crafting.js';
// owner 9 Nov: equipment recipes fold into field tiers, then dungeons, then the rainbow sets
test('equipment recipes sort into field, dungeon and rainbow sections',()=>{
 const of=out=>craftSection(RECIPES.find(r=>r.out===out));
 assert.equal(of('weapon-swordsman-one').label,'ฟีลด์ Lv.10');
 assert.equal(of('dg-krasue-head-r').label,'ดันเจี้ยน Lv.35 · เรือนกระสือริมคลอง');
 assert.equal(of('boss-head-swordsman').label,'ชุดบอสสีรุ้ง Lv.80');
 const keys=craftRecipes({coins:0,items:{}},{classId:'swordsman',gender:'male',group:'gear'}).map(r=>craftSection(r).key);
 assert.ok(new Set(keys).size>=8&&keys.includes('dg-krasue'),'several sections, the dungeon among them');
 assert.deepEqual(RECIPES.find(r=>r.out==='dg-krasue-shoes-r').needs,{'shard-krasue':500});
});

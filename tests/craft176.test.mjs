import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {craftRecipes,craftQuote,craftSources} from '../craft-view176.js';
import {RECIPES,craft} from '../crafting.js';
import {ITEMS,BAG_SLOTS} from '../items.js';
import {MONSTER_TYPES} from '../combat-core.js';
const recipe=id=>RECIPES.find(r=>r.out===id);
const bag={coins:25000,items:{'relic-rice':15,'lek-lai':4,'iron-ore':12,'straw-bundle':9}};
test('recipe browsing respects class, localized search, and ready-only filtering',()=>{
 const rows=craftRecipes(bag,{classId:'swordsman',group:'gear'});
 assert.ok(rows.some(r=>r.out==='weapon-swordsman-one'));
 assert.ok(rows.every(r=>!ITEMS[r.out].classes||ITEMS[r.out].classes.includes('swordsman')));
 assert.ok(!craftRecipes(bag,{classId:'mage',group:'gear'}).some(r=>r.out==='weapon-swordsman-one'));
 assert.deepEqual(craftRecipes(bag,{classId:'swordsman',group:'gear',query:'ทุ่งนา',readyOnly:true}).map(r=>r.out),['weapon-swordsman-one']);
 assert.deepEqual(craftRecipes(bag,{classId:'swordsman',group:'gear',query:'WEAPON-SWORDSMAN-ONE'}).map(r=>r.out),['weapon-swordsman-one']);
 assert.deepEqual(craftRecipes(bag,{classId:'swordsman',group:'gear',query:'Wingblade',translate:s=>s===ITEMS['weapon-swordsman-one'].name?'Garuda Wingblade':s}).map(r=>r.out),['weapon-swordsman-one']);
 assert.deepEqual(craftRecipes(bag,{group:'food',readyOnly:true}),[]);
});
test('quantity preview uses the actual multi-output recipe, costs and shortage',()=>{
 const before=structuredClone(bag),q=craftQuote(bag,recipe('hp-small'),2);
 assert.equal(q.max,3);assert.equal(q.times,2);assert.equal(q.made,4);assert.equal(q.cost,10);assert.equal(q.canCraft,true);
 assert.deepEqual(q.needs,[{id:'straw-bundle',have:9,need:6,missing:0}]);
 assert.equal(craftQuote(bag,recipe('hp-small'),99).times,3);
 assert.equal(craftQuote(bag,recipe('hp-small'),-3).times,1);
 assert.equal(craftQuote(bag,recipe('weapon-swordsman-one')).cost,250);
 const missing=craftQuote({coins:0,items:{}},recipe('weapon-swordsman-one'));
 assert.equal(missing.canCraft,false);assert.equal(missing.reason,'no-coins');assert.equal(missing.needs[0].missing,15);
 assert.deepEqual(bag,before,'preview must not consume anything');
 assert.equal(craftQuote(bag,null),null);
});
test('bag-capacity preview matches atomic craft and does not consume materials on failure',()=>{
 const ids=Object.entries(ITEMS).filter(([id,it])=>!['hp-small','straw-bundle'].includes(id)&&['loot','gear'].includes(it.kind)).map(([id])=>id);
 const full={coins:100,items:Object.fromEntries(ids.slice(0,BAG_SLOTS-1).map(id=>[id,1]))};full.items['straw-bundle']=9;
 const before=structuredClone(full),q=craftQuote(full,recipe('hp-small'),1);
 assert.equal(q.reason,'bag-full');assert.equal(q.canCraft,false);assert.throws(()=>craft(full,'hp-small',1),/bag-full/);assert.deepEqual(full,before);
 // Spending the last input frees a slot: do not reject a full bag indiscriminately.
 full.items['straw-bundle']=3;assert.equal(craftQuote(full,recipe('hp-small'),1).canCraft,true);
});
test('sources resolve existing shops, real drop chances and exact regular/boss maps',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
 const sources=craftSources('iron-ore',catalog);
 assert.ok(sources.some(s=>s.kind==='shop'&&s.name==='ครูแสนดาบ'&&s.map==='อยุธยา'));
 assert.ok(sources.some(s=>s.kind==='craft'&&s.group==='refine'));
 const index=MONSTER_TYPES.findIndex(m=>m.id==='hopper'),type=MONSTER_TYPES[index];
 const custom={maps:[{id:'a',name:'Spawn Field',mobs:[[1,2,index]]},{id:'b',name:'Boss Field',worldBoss:{id:type.id}}]};
 assert.deepEqual(craftSources('hopper-wing',custom).find(s=>s.kind==='drop'&&s.name===type.name).maps,['Spawn Field','Boss Field']);
 assert.deepEqual(craftSources('does-not-exist',catalog),[]);
});

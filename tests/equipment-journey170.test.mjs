import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {ITEMS,CHAPTERS,CLASSES,RECIPES,WORLD_MAP_BOSSES,levelChapter,chapterGear,featuredGear,createItemGuide,searchItems,cardSlots,itemEffects} from '../equipment-journey-data170.js';
import {DROPS,GEAR_BRACKETS} from '../items.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),guide=createItemGuide(catalog);
test('all Base levels and all 284 gear items belong to exactly one progression chapter',()=>{
 for(let level=1;level<=99;level++)assert.equal(CHAPTERS.filter(c=>level>=c.min&&level<=c.max).length,1);
 const gear=Object.entries(ITEMS).filter(([,i])=>i.kind==='gear');assert.equal(gear.length,284);
 for(const [id,it]of gear){const chapter=levelChapter(it.level??1);assert.ok(chapter);for(const cls of it.classes??CLASSES.map(c=>c.id))assert.equal(chapterGear(chapter,cls).filter(i=>i.id===id).length,1,id);}
});
test('every displayed item has a real source and each drop location matches the actual spawn index',()=>{
 for(const [id,it]of Object.entries(ITEMS).filter(([,i])=>['gear','card'].includes(i.kind))){
  const s=guide.sources(id);assert.ok(s.shop.length||s.quest.length||s.drop.length||s.recipe,id);
  for(const d of s.drop){assert.ok(d.chance>0&&d.chance<=1,id);assert.ok(DROPS[d.monster].items.some(r=>r[0]===id&&r[1]===d.chance));assert.ok(d.maps.length,d.monster+' location');}
 }
});
test('starter quest is Novice gear; class-change reward is not falsely promised at the initial quest',()=>{
 assert.ok(guide.sources('wrap-novice').quest.some(q=>q.id==='t1'));
 for(const id of ['sword-iron','staff-wan','beads-wood']){assert.ok(!guide.sources(id).quest.some(q=>q.id==='t1'));assert.ok(guide.sources(id).quest.some(q=>q.id==='t17'));}
 assert.ok(guide.sources('card-rat').quest.some(q=>q.id==='t8'));assert.ok(guide.sources('vest-chain').quest.some(q=>q.id==='t21'));
});
test('all class routes respect class restrictions, while common/fine/elite and card slots stay distinct',()=>{
 for(const cls of CLASSES)for(const c of CHAPTERS){for(const it of featuredGear(c,cls.id))assert.ok(!it.classes||it.classes.includes(cls.id),it.id);}
 for(const b of GEAR_BRACKETS)for(const cls of CLASSES){
  const ids=Object.entries(ITEMS).filter(([,i])=>i.bracket===b.key&&i.slot==='weapon'&&i.classes.includes(cls.id));assert.equal(ids.length,3);
  for(const [id,it]of ids){const s=guide.sources(id);assert.equal(cardSlots(it),it.tier==='elite'?1:0);assert.equal(!!s.recipe,it.tier==='fine');assert.equal(s.shop.length>0,it.tier==='common');if(it.tier==='elite')assert.ok(s.drop.length);}
 }
});
test('all 84 equipment recipes and material sources preserve exact quantities, fees and outputs',()=>{
 for(const r of RECIPES.filter(r=>ITEMS[r.out]?.kind==='gear')){
  const actual=guide.recipeDetails(r.out);assert.equal(actual.coins,r.coins);assert.equal(actual.count,r.count);assert.deepEqual(Object.fromEntries(actual.needs.map(n=>[n.id,n.count])),r.needs);
  for(const n of actual.needs){assert.ok(ITEMS[n.id]);assert.ok(n.sources.shop.length||n.sources.drop.length||n.sources.quest.length||n.sources.recipe);}
 }
 for(const b of WORLD_MAP_BOSSES){const r=guide.recipeDetails(b.accessory);assert.ok(r.needs.some(n=>n.id===b.material));assert.equal(guide.sources(b.material).drop.some(d=>!d.boss),b.order>4,'first four materials are boss-only; later maps have farmable creatures');}
});
test('catalog search finds all 49 cards and all classes without fabricating a level 99 weapon set',()=>{
 assert.equal(searchItems({classId:'shaman',kind:'card'}).length,49);
 assert.equal(searchItems({classId:'novice',kind:'gear',allClasses:true}).length,284);
 assert.ok(searchItems({classId:'shaman',query:'INT',kind:'gear'}).length>0);
 assert.equal(Math.max(...Object.values(ITEMS).filter(i=>i.kind==='gear'&&i.slot==='weapon').map(i=>i.level??1)),80);
 assert.ok(itemEffects(ITEMS['card-rat']).length>0);
});
test('all chapter artwork exists and the public page is reachable from both navigation surfaces',async()=>{
 for(const c of CHAPTERS)await access(new URL('../'+c.image,import.meta.url));
 for(const file of ['index.html','world-atlas.html'])assert.ok((await readFile(new URL('../'+file,import.meta.url),'utf8')).includes('equipment-journey.html'));
});

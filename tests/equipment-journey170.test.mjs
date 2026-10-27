import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {ITEMS,CHAPTERS,CLASSES,RECIPES,WORLD_MAP_BOSSES,levelChapter,chapterGear,featuredGear,createItemGuide,searchItems,cardSlots,itemEffects,fitsClass} from '../equipment-journey-data170.js';
import {DROPS} from '../items.js';
import {AMULET_REWARDS} from '../amulets.js';
const gearCount=1062+35+AMULET_REWARDS.filter(r=>r.tier!=='material').length;
import {weaponId,pieceId} from '../gear-sets.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),guide=createItemGuide(catalog);
test('all Base levels and all regular and gacha gear items belong to exactly one progression chapter',()=>{
 for(let level=1;level<=99;level++)assert.equal(CHAPTERS.filter(c=>level>=c.min&&level<=c.max).length,1);
 const gear=Object.entries(ITEMS).filter(([,i])=>i.kind==='gear');assert.equal(gear.length,gearCount);
 for(const [id,it]of gear){const chapter=levelChapter(it.level??1),fits=CLASSES.filter(c=>fitsClass(it,c.id));assert.ok(chapter);assert.ok(fits.length,id+' fits some class');for(const cls of fits)assert.equal(chapterGear(chapter,cls.id).filter(i=>i.id===id).length,1,id);}
});
test('every displayed item has a real source and each drop location matches the actual spawn index',()=>{
 for(const [id,it]of Object.entries(ITEMS).filter(([,i])=>['gear','card'].includes(i.kind))){
  const s=guide.sources(id);assert.ok(s.shop.length||s.quest.length||s.drop.length||s.recipe||s.gacha.length,id);
  for(const d of s.drop){assert.ok(d.chance>0&&d.chance<=1,id);assert.ok(it.set?DROPS[d.monster].sets?.tier===it.set.tier:DROPS[d.monster].items.some(r=>r[0]===id&&r[1]===d.chance));assert.ok(d.maps.length,d.monster+' location');}
 }
});
test('starter quest is Novice gear; class-change reward is not falsely promised at the initial quest',()=>{
 assert.ok(guide.sources('starter-wraps').quest.some(q=>q.id==='t1'));
 for(const id of ['weapon-swordsman-one','weapon-shaman-one','weapon-acolyte-one']){assert.ok(!guide.sources(id).quest.some(q=>q.id==='t1'));assert.ok(guide.sources(id).quest.some(q=>q.id==='t17'));}
 assert.ok(guide.sources('card-rat').quest.some(q=>q.id==='t8'));
});
test('all class routes respect class looks; weapons are crafted, armor drops from bosses, card slots per slot',()=>{
 for(const cls of CLASSES)for(const c of CHAPTERS){for(const it of featuredGear(c,cls.id))assert.ok(fitsClass(it,cls.id),it.id);}
 for(const cls of CLASSES.filter(c=>c.id!=='novice'))for(let t=1;t<=6;t++){
  const w=weaponId(cls.id,t),ws=guide.sources(w);assert.ok(ws.recipe,w);assert.equal(ws.shop.length,0);assert.equal(cardSlots(ITEMS[w]),1);
 }
 for(let t=1;t<=6;t++){const armor=pieceId('pierce','armor','monk',t),head=pieceId('pierce','head','monk',t);
  assert.equal(cardSlots(ITEMS[armor]),1);assert.equal(cardSlots(ITEMS[head]),0);
  const ad=guide.sources(armor).drop;assert.ok(ad.length,armor);assert.ok(ad.every(d=>d.boss),armor+' only from bosses');assert.ok(guide.sources(head).drop.length,head);}
});
test('all 84 equipment recipes and material sources preserve exact quantities, fees and outputs',()=>{
 for(const r of RECIPES.filter(r=>ITEMS[r.out]?.kind==='gear')){
  const actual=guide.recipeDetails(r.out);assert.equal(actual.coins,r.coins);assert.equal(actual.count,r.count);assert.deepEqual(Object.fromEntries(actual.needs.map(n=>[n.id,n.count])),r.needs);
  for(const n of actual.needs){assert.ok(ITEMS[n.id]);assert.ok(n.sources.shop.length||n.sources.drop.length||n.sources.quest.length||n.sources.recipe);}
 }
 for(const b of WORLD_MAP_BOSSES){const r=guide.recipeDetails(b.accessory);assert.ok(r.needs.some(n=>n.id===b.material));assert.equal(guide.sources(b.material).drop.some(d=>!d.boss),b.order>4,'first four materials are boss-only; later maps have farmable creatures');}
});
test('catalog search finds all 49 cards and all classes; class weapons top out at tier 6 (Lv.85)',()=>{
 assert.equal(searchItems({classId:'shaman',kind:'card'}).length,49);
 assert.equal(searchItems({classId:'novice',kind:'gear',allClasses:true}).length,gearCount);
 assert.ok(searchItems({classId:'shaman',query:'INT',kind:'gear'}).length>0);
 assert.equal(Math.max(...Object.values(ITEMS).filter(i=>i.kind==='gear'&&i.slot==='weapon').map(i=>i.level??1)),85);
 assert.ok(itemEffects(ITEMS['card-rat']).length>0);
});
test('all chapter artwork exists and the public page is reachable from both navigation surfaces',async()=>{
 for(const c of CHAPTERS)await access(new URL('../'+c.image,import.meta.url));
 for(const file of ['index.html','world-atlas.html'])assert.ok((await readFile(new URL('../'+file,import.meta.url),'utf8')).includes('equipment-journey.html'));
});

test('gacha gear sources match the real reward pool without claiming monster drops',()=>{for(const r of AMULET_REWARDS.filter(r=>r.tier!=='material')){const source=guide.sources(r.id);assert.equal(source.gacha.length,1);assert.equal(source.gacha[0].chance,r.rate);assert.equal(source.gacha[0].price,100);assert.equal(source.drop.length,0);}});

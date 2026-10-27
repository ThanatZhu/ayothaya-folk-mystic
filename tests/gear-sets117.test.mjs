import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {ITEMS,itemDef,composeId,rollLoot,DROPS,SHOPS} from '../items.js';
import {deriveStats,canWear} from '../character-stats.js';
import {craft,recipeFor} from '../crafting.js';
import {rewardItems} from '../story-quests.js';
import {pieceId,weaponId,bossId,setBonuses,STAT_CAPS,GRADES,rollGrade,STARTER} from '../gear-sets.js';
const root=new URL('../',import.meta.url);
const gear=Object.entries(ITEMS).filter(([,it])=>it.kind==='gear'&&it.slot!=='accessory'&&!it.classReward);

test('0.117 catalog: 960 set pieces, 42 tier weapons, 39 boss pieces, the 5-piece starter kit, each on its own sliced icon',()=>{
 assert.equal(gear.filter(([,it])=>it.set).length,960);assert.equal(gear.filter(([,it])=>it.tier&&it.slot==='weapon').length,42);
 assert.equal(gear.filter(([,it])=>it.bossSet).length,39);assert.deepEqual(gear.filter(([,it])=>it.starter).map(([id])=>id).sort(),[...STARTER].sort());
 assert.equal(gear.length,1046);const images=new Set(gear.map(([,it])=>it.image));assert.equal(images.size,1046,'one icon per item');
 for(const img of images)assert.ok(existsSync(new URL(img,root)),img);
 // the icon cell follows the sheet layout: row = family, column = slot, cell 20 = weapon; nun has no weapon of her own
 assert.equal(ITEMS[pieceId('wind','shoes','nun',3)].image,'assets/gear2/nun-t3-19.webp');
 assert.equal(ITEMS[weaponId('acolyte',6)].image,'assets/gear2/monk-t6-20.webp');assert.equal(ITEMS[bossId('weapon','acolyte')].image,'assets/gear2/boss-monk-0.webp');
 assert.equal(ITEMS[bossId('head','nun')].image,'assets/gear2/boss-nun-1.webp');
 assert.deepEqual(SHOPS['ครูแสนดาบ'].stock.filter(id=>ITEMS[id].kind==='gear'&&ITEMS[id].slot!=='accessory').sort(),[...STARTER].sort());
});

test('set bonus: 2 pieces give 40% of the main stat, 4 give it all plus the second stat and ATK/MATK; mixed tiers count the lowest',()=>{
 const w=ids=>ids.map(itemDef);
 const two=setBonuses(w([pieceId('pierce','head','monk',3),pieceId('pierce','shoes','monk',3)])).total;
 assert.ok(Math.abs(two.armorPen-(.02+.2*.4))<1e-9);
 const four=setBonuses(w(['head','armor','garment','shoes'].map(s=>pieceId('exec',s,'rogue',6)))).total;
 assert.ok(Math.abs(four.crit-(.04+.15))<1e-9);assert.equal(four.critDmg,.6);assert.equal(four.atkPct,.08);assert.equal(four.matkPct,.08);
 const mixed=setBonuses(w([pieceId('wall','head','lancer',6),pieceId('wall','armor','lancer',6),pieceId('wall','garment','lancer',6),pieceId('wall','shoes','lancer',1)])).total;
 assert.equal(mixed.hpPct,.08);assert.equal(mixed.dmgReduce,.04+.03);
 // grades never change the set bonus
 assert.deepEqual(setBonuses(w(['head','armor'].map(s=>pieceId('wind',s,'boxer',2)+'^4'))).total,setBonuses(w(['head','armor'].map(s=>pieceId('wind',s,'boxer',2)))).total);
});

test('derived stats apply the new stats with their caps',()=>{
 const set=(f,t,look='swordsman')=>Object.fromEntries(['head','armor','garment','shoes'].map(s=>[s,pieceId(f,s,look,t)]));
 const base=deriveStats({level:90,classId:'swordsman'}),wall=deriveStats({level:90,classId:'swordsman',gear:set('wall',6)});
 assert.ok(wall.maxHp>base.maxHp*1.29);assert.equal(wall.dmgReduce,.13+.04);
 const lucky=deriveStats({level:90,classId:'rogue',stats:{luk:99},gear:set('exec',6,'rogue')});assert.equal(lucky.crit,STAT_CAPS.crit);assert.equal(lucky.critMult,2.1);
 const mantra=deriveStats({level:90,classId:'shaman',gear:set('mantra',6,'shaman')});assert.equal(mantra.cdr,.24);assert.equal(mantra.mpCut,.18);
 const wind=deriveStats({level:90,classId:'hunter',gear:set('wind',6,'hunter')});assert.equal(wind.moveSpeed,.10);assert.ok(wind.delay<base.delay);
 assert.equal(deriveStats({level:90,classId:'lancer',gear:set('pierce',6,'lancer')}).armorPen,.39);
 assert.equal(base.armorPen,0);assert.equal(base.critMult,1.5);
});

test('grades travel as a ^1..^4 suffix, scale base stats only, and survive refine/card/affix ids',()=>{
 const id=pieceId('wall','armor','nun',4),plain=itemDef(id),red=itemDef(id+'^4');
 assert.equal(red.grade,4);assert.equal(red.def,Math.round(plain.def*1.6));assert.deepEqual(red.pct,plain.pct);assert.equal(red.rarity,4);
 assert.equal(itemDef('starter-shirt^1'),null,'starter and boss gear have no grade');assert.equal(itemDef(bossId('armor','nun')+'^2'),null);
 const sword=weaponId('swordsman',2),full=composeId(sword,7,'card-rat',null,3);assert.equal(full,sword+'+7~card-rat^3');const d=itemDef(full);assert.equal(d.grade,3);assert.equal(d.refine,7);assert.equal(d.base,sword);
 assert.ok(itemDef(composeId(id,0,null,'s2',2)).bonus.str===2);
 assert.deepEqual([.005,.03,.1,.3,.9].map(x=>rollGrade(()=>x,true)),[4,3,2,1,0]);assert.equal(rollGrade(()=>.005,false),3,'red only from bosses');
 assert.deepEqual(GRADES.map(g=>g.mul),[1,1.1,1.25,1.4,1.6]);
});

test('set gear drops in the killer\'s look at the monster\'s tier; armor only from bosses; bosses drop shards',()=>{
 assert.deepEqual(DROPS['stream-serpent'].sets,{tier:5,piece:.06,armor:0,boss:false});assert.equal(DROPS['underwater-naga-guardian'].sets.armor,.25);
 assert.ok(DROPS['rat-chief-awakened'].items.some(([id])=>id==='shard-divine'));assert.ok(DROPS['pop-grove-lord'].items.some(([id])=>id==='shard-soul'));
 assert.ok(DROPS['woodland-elephant'].items.some(([id])=>id==='shard-gem'));assert.equal(DROPS.rat.sets,undefined,'Lv.1 monsters drop no set gear');
 let seed=3;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647,got=[];
 for(let i=0;i<4000;i++)for(const it of rollLoot('underwater-naga-guardian',rand,null,1,'nun').items)if(itemDef(it.id)?.set)got.push(itemDef(it.id));
 assert.ok(got.length>1000);assert.ok(got.every(d=>d.look==='nun'&&d.set.tier===5));assert.ok(got.some(d=>d.slot==='armor'));assert.ok(got.some(d=>d.grade===4));
 const field=[];for(let i=0;i<20000;i++)for(const it of rollLoot('stream-serpent',rand,null,1,null).items)if(itemDef(it.id)?.set)field.push(itemDef(it.id));
 assert.ok(field.every(d=>d.slot!=='armor'&&d.grade<4));assert.ok(new Set(field.map(d=>d.look)).size>4,'a Novice gets any look');
});

test('weapons and boss sets are crafted; crafting starts with guaranteed blue weapons; quests give the class weapon and a look-matched armor',()=>{
 const r=recipeFor(weaponId('hunter',1));assert.deepEqual(r.needs,{'weapon-fragment-rice':15,'iron-ore':2});
 const bag={coins:10000,items:{'weapon-fragment-rice':30,'iron-ore':4}},made=craft(bag,weaponId('hunter',1),2,()=>.02);
 assert.deepEqual(made.items,[{id:weaponId('hunter',1),count:2}]);
 const boss=recipeFor(bossId('armor','monk'));assert.deepEqual(boss.needs,{'shard-soul':20,'shard-gem':12,'shard-divine':5,'conquest-shard':100});
 assert.equal(craft({coins:1000000,items:{'shard-soul':20,'shard-gem':12,'shard-divine':5,'conquest-shard':100}},bossId('armor','monk')).items[0].id,bossId('armor','monk'));
 assert.deepEqual(rewardItems({items:[{id:'@weapon',count:1},{id:'@armor',count:1}]},'acolyte','female').map(i=>i.id),[weaponId('acolyte',1),pieceId('wall','armor','nun',2)]);
 assert.equal(rewardItems({items:[{id:'@weapon',count:1}]},'novice')[0].id,'starter-wraps');
 assert.equal(canWear(weaponId('lancer',1),{classId:'lancer',level:9}),'low-level');assert.equal(canWear(pieceId('pierce','head','monk',1),{classId:'lancer',level:10}),null,'any class wears any look');
 assert.equal(canWear(weaponId('lancer',1),{classId:'hunter',level:99}),'wrong-class');
});

test('the generated sheets are fully used: every occupied manifest cell has exactly one icon file',()=>{
 const manifest=new URL('outputs/gear-sets/manifest.json',root);if(!existsSync(manifest))return; // art source stays local (outputs/ is not committed)
 const m=JSON.parse(readFileSync(manifest,'utf8')),cells=m.entries.flatMap(e=>e.occupiedCells.map(c=>'assets/gear2/'+e.filename.replace('.png','')+'-'+c+'.webp'));
 assert.equal(cells.length,1046);assert.deepEqual(new Set(cells),new Set(gear.map(([,it])=>it.image)));
});

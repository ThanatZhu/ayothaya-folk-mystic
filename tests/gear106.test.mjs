import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,DROPS,SHOPS,GEAR_BRACKETS,GEAR_CLASSES,GEAR_TIERS,GEAR_ARCHETYPES,GEAR_PIECES,gearId,pieceId,itemDef,buy} from '../items.js';
import {RECIPES,craft} from '../crafting.js';
import {canWear} from '../character-stats.js';

const all=Object.keys(ITEMS).filter(id=>ITEMS[id].bracket),gear=all.filter(id=>['weapon','armor'].includes(ITEMS[id].slot));
const power=it=>it.atk??it.matk??it.def;

test('0.107 the generator makes 144 valid class items (3 brackets × 8 classes × weapon/armor × 3 tiers)', () => {
 assert.equal(gear.length,144);
 for(const id of gear){
  const it=itemDef(id);
  assert.ok(/^[a-z-]+$/.test(id)&&it,id);
  assert.equal(it.kind,'gear');assert.equal(it.classes.length,1);
  assert.ok(power(it)>0&&it.level>=45&&it.level<=99&&it.sell>0&&it.name&&it.text,id);
  assert.ok(it.icon>=0&&it.icon<24&&ITEMS[id].ph,id);
 }
 // one icon cell per class × bracket on each sheet
 for(const atlas of ['gear104w','gear104a'])assert.equal(new Set(gear.filter(id=>ITEMS[id].atlas===atlas).map(id=>ITEMS[id].icon)).size,24);
});

test('every class has a weapon and an armor per bracket, stats rise with bracket and tier', () => {
 GEAR_CLASSES.forEach(([cls],ci)=>{for(const slot of ['weapon','armor']){
  const grid=GEAR_BRACKETS.map(b=>GEAR_TIERS.map(t=>ITEMS[gearId(b.key,ci,slot,t.key)]));
  grid.flat().forEach(it=>{assert.ok(it,cls+slot);assert.deepEqual(it.classes,[cls]);assert.equal(it.slot,slot);});
  // up a tier inside a bracket, and the same tier up a bracket (an elite piece may still beat the next bracket's common)
  grid.forEach((row,bi)=>row.forEach((it,ti)=>{
   if(ti)assert.ok(power(it)>power(row[ti-1]),it.name);
   if(bi)assert.ok(power(it)>power(grid[bi-1][ti])&&it.level>grid[bi-1][ti].level,it.name);
  }));
 }});
});

test('tiers: common is sold, fine is gold, elite is violet with a card slot', () => {
 const krut=t=>itemDef(gearId('krut',1,'weapon',t));
 assert.ok(krut('').buy>0&&!krut('fine').buy&&!krut('elite').buy);
 assert.equal(krut('fine').tint,'gold');assert.equal(krut('elite').tint,'violet');
 assert.ok(krut('').rarity<krut('fine').rarity&&krut('fine').rarity<krut('elite').rarity);
 assert.ok(itemDef('krut-sword-elite~card-rat'),'elite takes a card');
 assert.equal(itemDef('krut-sword-fine~card-rat'),null,'fine has no card slot');
 assert.equal(itemDef('himma-armor-shaman+7').refine,7,'refine works');
});

test('head, garment and shoes: 81 pieces per archetype (3 brackets × 3 archetypes × 3 slots × 3 tiers), rising stats', () => {
 assert.equal(all.length-gear.length,81);
 for(const [slot,,atlas] of GEAR_PIECES)GEAR_ARCHETYPES.forEach(([arch,classes])=>{
  const grid=GEAR_BRACKETS.map(b=>GEAR_TIERS.map(t=>itemDef(pieceId(b.key,slot,arch,t.key))));
  grid.flat().forEach(it=>{assert.ok(it&&it.slot===slot&&it.atlas===atlas&&it.slots===0&&it.ph,arch+slot);assert.deepEqual(it.classes,classes);});
  grid.forEach((row,bi)=>row.forEach((it,ti)=>{
   const score=x=>x.def*10+Object.values(x.bonus)[0];
   if(ti)assert.ok(score(it)>score(row[ti-1]),it.name);
   if(bi)assert.ok(score(it)>score(grid[bi-1][ti]),it.name);
  }));
 });
 for(const atlas of ['gear106a','gear106b'])assert.equal(new Set(all.filter(id=>ITEMS[id].atlas===atlas).map(id=>ITEMS[id].icon)).size,atlas==='gear106a'?18:9);
 assert.equal(canWear('kotcha-cloak-agile',{classId:'rogue',level:60}),null);
 assert.equal(canWear('kotcha-cloak-agile',{classId:'shaman',level:60}),'wrong-class');
 assert.equal(itemDef('krut-hat-power-elite~card-rat'),null,'no card slot');
});

test('class and level requirements apply', () => {
 assert.equal(canWear('kotcha-sword',{classId:'swordsman',level:59}),'low-level');
 assert.equal(canWear('kotcha-sword',{classId:'shaman',level:60}),'wrong-class');
 assert.equal(canWear('kotcha-sword',{classId:'swordsman',level:60}),null);
});

test('shops, drops and recipes only reference real items', () => {
 for(const [npc,s] of Object.entries(SHOPS))for(const id of s.stock)assert.ok(ITEMS[id],npc+' '+id);
 for(const [m,d] of Object.entries(DROPS))for(const [id] of d.items)assert.ok(ITEMS[id],m+' '+id);
 for(const r of RECIPES){assert.ok(ITEMS[r.out],r.out);for(const id of Object.keys(r.needs))assert.ok(ITEMS[id],id);}
 const shop=SHOPS['ช่างตีบวกขั้นสูง'];
 assert.equal(shop.mapId,'lablae');assert.equal(shop.stock.length,75);
 const dropped=new Set(Object.values(DROPS).flatMap(d=>d.items.map(([id])=>id)));
 for(const id of all.filter(id=>ITEMS[id].tier!=='common'))assert.ok(dropped.has(id),id+' drops somewhere');
 const bag=buy({coins:20000,items:{}},'ช่างตีบวกขั้นสูง','krut-sword');
 assert.equal(bag.items['krut-sword'],1);
 const made=craft({coins:99999,items:{'krut-sword':1,'lek-lai':2,'iron-ore':5}},'krut-sword-fine').bag;
 assert.deepEqual(made.items,{'krut-sword-fine':1});
});

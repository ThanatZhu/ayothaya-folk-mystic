import fs from 'node:fs';
import assert from 'node:assert/strict';
import {CLASSES} from '../classes.js';
import {JOBS} from '../advancement.js';
import {MONSTER_TYPES} from '../combat-core.js';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const c=read('../content/chapter-01.json'),world=read('../maps/world.json');
const index=(rows,label)=>{const map=new Map();for(const row of rows){assert.ok(row.id&&!map.has(row.id),label+' duplicate/missing ID '+row.id);map.set(row.id,row);}return map;};
const npcs=index(c.npcs,'NPC'),items=index(c.items,'item'),mobs=index(c.monsters,'monster'),quests=index(c.quests,'quest'),maps=index(c.maps,'map');
const liveMaps=index(world.maps,'world map'),validMaps=new Set([...liveMaps.keys(),...maps.keys()]);
const integer=(v,label)=>assert.ok(Number.isSafeInteger(v)&&v>=0,label+' must be nonnegative integer');
assert.equal(c.status,'design-only-not-loaded-by-game');
for(const map of c.maps)if(map.existing){assert.ok(liveMaps.has(map.id));assert.equal(map.safe,liveMaps.get(map.id).safe);}
for(const npc of c.npcs){assert.ok(validMaps.has(npc.mapId));if(npc.existingName)assert.ok(liveMaps.get(npc.mapId).npcs.some(n=>n.name===npc.existingName),'Missing existing NPC '+npc.id);}
for(const m of c.monsters){assert.ok(maps.has(m.mapId));assert.equal(maps.get(m.mapId).safe,false,'Monster in safe city');integer(m.xp,m.id);if(m.existingType!==null)assert.equal(MONSTER_TYPES[m.existingType]?.name,m.name);}
const targetSets={talk:npcs,defeat:mobs,collect:items,buy:items,equip:new Map([...items,...Object.entries(c.selectors)]),craft:new Map(c.recipes.map(r=>[r.id,r])),enter:maps,interact:new Map(c.interactions.map(id=>[id,true]))};
const seen=new Set(),visiting=new Set();
function visit(id){assert.ok(quests.has(id),'Missing prerequisite '+id);assert.ok(!visiting.has(id),'Quest cycle at '+id);if(seen.has(id))return;visiting.add(id);for(const dep of quests.get(id).requires)visit(dep);visiting.delete(id);seen.add(id);}
function grants(rows=[]){for(const r of rows){assert.ok(r.count>0);integer(r.count,'grant count');assert.ok(r.itemId?items.has(r.itemId):c.selectors[r.selector],'Unknown item grant');}}
let xp=0,combatXp=0,coins=0,budget=0,minutes=0;const owned=new Set(),completed=new Set();
for(const q of c.quests){
 visit(q.id);assert.ok(q.requires.every(id=>completed.has(id)),'Unreachable quest order '+q.id);assert.ok(npcs.has(q.giverId)&&npcs.has(q.turnInId));assert.ok(maps.has(q.mapId));assert.equal(q.repeatable,false);
 grants(q.onAcceptItems);for(const r of q.onAcceptItems??[])owned.add(r.itemId??r.selector);
 for(const o of q.objectives){assert.ok(targetSets[o.type]?.has(o.targetId),'Unknown objective '+q.id+' '+o.targetId);assert.ok(o.count>0);integer(o.count,'objective count');
  if(o.type==='defeat')combatXp+=mobs.get(o.targetId).xp*o.count;
  if(o.type==='buy'){const price=items.get(o.targetId).buyPrice;assert.ok(price>0);assert.ok(c.shops.some(s=>s.itemIds.includes(o.targetId)));assert.ok(budget>=price*o.count,'Required purchase cannot be afforded');budget-=price*o.count;owned.add(o.targetId);}
  if(o.type==='equip')assert.ok(owned.has(o.targetId),'Equipment required before acquisition '+o.targetId);
  if(o.type==='collect')assert.ok(c.questItemSources.some(s=>s.questId===q.id&&s.itemId===o.targetId&&s.count>=o.count),'Missing guaranteed quest item source');
 }
 integer(q.rewards.xp,'quest XP');integer(q.rewards.coins,'quest coins');grants(q.rewards.items);for(const r of q.rewards.items)owned.add(r.itemId??r.selector);
 xp+=q.rewards.xp;coins+=q.rewards.coins;budget+=q.rewards.coins;minutes+=q.minutesTarget;completed.add(q.id);
}
for(const {id} of CLASSES){assert.ok(items.has(c.selectors['class-starter'][id]));assert.equal(JOBS[id].length,2);}
for(const shop of c.shops){assert.ok(npcs.has(shop.npcId));for(const id of shop.itemIds)assert.ok(items.has(id));}
for(const recipe of c.recipes){for(const input of recipe.inputs){assert.ok(items.has(input.itemId));assert.ok(c.questItemSources.some(s=>s.itemId===input.itemId&&s.count>=input.count));}assert.ok(items.has(recipe.output.itemId));}
const levels=c.progression.levelXpTotal;assert.equal(levels[0],0);levels.forEach((v,i)=>{integer(v,'level XP');if(i)assert.ok(v>levels[i-1]);});
assert.equal(xp,c.progression.questXp);assert.equal(combatXp,c.progression.requiredCombatXp);assert.equal(xp+combatXp,levels[c.progression.jobUnlock.level-1]);assert.equal(coins,c.economy.questCoins);assert.equal(minutes,c.targetMinutes);
assert.ok(quests.has(c.progression.jobUnlock.questId));assert.ok(npcs.has(c.progression.jobUnlock.trainerId));
console.log(JSON.stringify({status:'valid design data; not live gameplay',quests:quests.size,npcs:npcs.size,items:items.size,monsters:mobs.size,questXp:xp,requiredCombatXp:combatXp,totalXp:xp+combatXp,questCoins:coins,coinsAfterMandatoryPurchases:budget,targetActivityMinutes:minutes},null,2));

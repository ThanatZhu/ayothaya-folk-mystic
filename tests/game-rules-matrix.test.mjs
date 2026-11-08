// Walks the real catalogs, not samples: a rule hole here reaches every player before anyone notices.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEMS,DROPS,SHOPS,itemDef} from '../items.js';
import {RECIPES} from '../crafting.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {canWear} from '../character-stats.js';
import {LOOKS,SET_SLOTS,TIERS,lookClass,pieceId,weaponId,WEAPON_CLASSES} from '../gear-sets.js';
import {CLASSES} from '../classes.js';
import {warpCost} from '../world-state.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url))),exists=p=>fs.existsSync(new URL('../'+p,import.meta.url));
const problems=(rows,label)=>assert.deepEqual([...new Set(rows)].slice(0,25),[],label);
const live=Object.entries(ITEMS).filter(([,i])=>!i.retired),maps=new Map(catalog.maps.map(m=>[m.id,m]));

test('every class has a full weapon and armor line at every tier, and nobody wears another class line',()=>{
 const bad=[];
 for(let t=1;t<=TIERS.length;t++){
  for(const [cls] of WEAPON_CLASSES){const id=weaponId(cls,t);if(!itemDef(id))bad.push('no '+id);for(const c of CLASSES)if(c.id!=='novice'&&(canWear(id,{classId:c.id,level:99})===null)!==(c.id===cls))bad.push(id+' on '+c.id);}
  for(const [look] of LOOKS)for(const slot of SET_SLOTS)for(const family of ['pierce','exec','mantra','wall','wind']){const id=pieceId(family,slot,look,t);if(!itemDef(id))bad.push('no '+id);else if(canWear(id,{classId:lookClass(look),level:99}))bad.push(id+' refuses its own class');}
 }
 problems(bad,'gear lines');
});
test('every item has art on disk, a real kind and sane prices; no shop item sells back for profit',()=>{
 const bad=[];
 for(const [id,it] of live){
  if(it.image&&!exists(it.image))bad.push(id+' art '+it.image);
  if(!(it.sell>=0)&&it.sell!==undefined)bad.push(id+' sell');
  if(it.buy&&it.sell>it.buy)bad.push(`${id} buy ${it.buy} < sell ${it.sell}`);
 }
 problems(bad,'items');
});
test('every drop table points at a real monster and real items with rates in 0..1',()=>{
 const ids=new Set(MONSTER_TYPES.map(t=>t.id)),bad=[];
 for(const [id,d] of Object.entries(DROPS)){
  if(!ids.has(id))bad.push('drops for unknown monster '+id);
  for(const [item,rate,count=1] of d.items??[]){if(!itemDef(item))bad.push(id+' -> unknown '+item);else if(itemDef(item).retired)bad.push(id+' -> retired '+item);if(!(rate>0&&rate<=1))bad.push(`${id} ${item} rate ${rate}`);if(!(count>=1))bad.push(`${id} ${item} count ${count}`);}
 }
 problems(bad,'drops');
});
test('every shop line can be bought, on a map and from an NPC that exist',()=>{
 const bad=[];
 for(const [name,s] of Object.entries(SHOPS)){
  const m=maps.get(s.mapId);if(!m)bad.push(name+' map '+s.mapId);else if(!(m.npcs??[]).some(n=>n.name===name))bad.push(name+' not on '+s.mapId);
  for(const id of s.stock??[]){const it=itemDef(id);if(!it)bad.push(name+' stock '+id);else if(it.retired)bad.push(name+' retired '+id);else if(!(s.currency?it.tokens>0:it.buy>0))bad.push(name+' no price '+id);}
 }
 problems(bad,'shops');
});
test('every recipe makes and needs real items',()=>{
 const bad=[];
 for(const r of RECIPES){if(!itemDef(r.out))bad.push('out '+r.out);for(const [id,n] of Object.entries(r.needs??{})){if(!itemDef(id))bad.push(r.out+' needs '+id);if(!(n>0))bad.push(r.out+' amount '+id);}if(!(r.coins>=0)&&r.coins!==undefined)bad.push(r.out+' coins');}
 problems(bad,'recipes');
});
test('every portal, spawn and warp leads somewhere real, and every open map can be reached',()=>{
 const bad=[],open=catalog.maps.filter(m=>!m.instance&&!m.guildHall&&!m.pvpArena&&!m.prologue&&m.id!=='duel-arena');
 for(const m of catalog.maps){
  for(const p of m.portals??[])if(!maps.has(p.to))bad.push(m.id+' portal '+p.to);
  for(const [,,n] of m.mobs??[])if(!MONSTER_TYPES[n])bad.push(m.id+' mob index '+n);
 }
 for(const m of open)if(m.id!==catalog.capital&&warpCost(catalog,catalog.capital,m.id)===null)bad.push('cannot reach '+m.id);
 for(const m of catalog.maps.filter(m=>m.levels&&!m.dungeon))if(!(m.mobs??[]).length)bad.push(m.id+' is a farm map with no monsters');
 problems(bad,'maps');
});
test('every monster that spawns has real numbers and something to drop',()=>{
 const spawn=new Set(catalog.maps.flatMap(m=>(m.mobs??[]).map(([,,n])=>n))),bad=[];
 for(const n of spawn){const t=MONSTER_TYPES[n];if(!(t.hp>0&&t.damage>=0&&t.baseXp>=0&&t.jobXp>=0))bad.push(t.id+' numbers');if(!(t.level>0))bad.push(t.id+' level');if(!DROPS[t.id]?.items?.length)bad.push(t.id+' drops nothing');}
 problems(bad,'monsters');
});

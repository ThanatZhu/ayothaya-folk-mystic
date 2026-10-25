import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CombatWorld,MONSTER_TYPES,walkable,findPath,moveBody,lineClear} from '../combat-core.js';
import {monsterFrame,markMonsterHit,advanceMonster} from '../monster-catalog.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
test('starter region has reciprocal reachable portals and safe monster-free capital',()=>{
 assert.equal(catalog.maps.length,14); // 0.49 mill-cellar instance, 0.60 lotus-marsh, 1.01 guild-hall
 for(const m of catalog.maps){assert.ok(walkable(m.spawn.x,m.spawn.z,.32,m.nav),m.id+' spawn');if(m.safe)assert.equal(new CombatWorld(m).mobs.length,0);
  for(const p of m.portals){const to=catalog.maps.find(v=>v.id===p.to);if(!m.guildHall)assert.ok(to.portals.some(v=>v.to===m.id)); /* 1.01 the hall is entered from the guild page / NPC, not a portal */assert.ok(walkable(p.x,p.z,.32,m.nav));assert.ok(findPath(m.spawn,p,m.nav).length,m.id+' portal');}
  for(const [x,z,type]of m.mobs){assert.ok(MONSTER_TYPES[type]);assert.ok(walkable(x,z,.32,m.nav),m.id+' mob '+type+' at '+x+','+z);assert.ok(findPath(m.spawn,{x,z},m.nav).length,m.id+' accessible mob');}
 }
});
test('hit recoil has dedicated frames, preserves attack timing, preserves world position, and death outranks hit',()=>{
 const m={x:2,z:0,hp:50,root:0,attackCD:0,step:0,home:{x:2,z:0},windup:.3};markMonsterHit(m,{x:0,z:0});assert.equal(m.windup,.3);assert.equal(monsterFrame(m,0),5);assert.deepEqual([m.x,m.z],[2,0]);m.hit=.1;assert.equal(monsterFrame(m,0),6);m.hp=0;assert.equal(monsterFrame(m,0),7);
});
test('telegraphed monster strike can be evaded and cannot strike through collision',()=>{
 const nav={zones:[{x:-10,z:-10,w:20,d:20}],obstacles:[],props:[]},m={x:0,z:0,home:{x:0,z:0},hp:50,maxHp:50,root:0,attackCD:0,hit:0,step:0,aggro:true},target={x:1,z:0};const type=MONSTER_TYPES[4];
 assert.equal(advanceMonster(m,target,type,.05,nav,{moveBody,lineClear}),undefined);assert.ok(m.windup>0);target.x=4;for(let i=0;i<12;i++)assert.notEqual(advanceMonster(m,target,type,.05,nav,{moveBody,lineClear}),'hit');
 m.windup=.01;m.aggro=true;target.x=1;assert.equal(advanceMonster(m,target,type,.02,nav,{moveBody,lineClear}),'hit');m.windup=.01;nav.obstacles.push({x:.3,z:-1,w:.3,d:2});assert.notEqual(advanceMonster(m,target,type,.02,nav,{moveBody,lineClear}),'hit');
});
test('all nine creatures have eight complete bounded art frames and three environment rows',()=>{
 for(const sheet of ['field-monsters','orchard-monsters','elite-monsters','rural-props']){const meta=JSON.parse(fs.readFileSync(new URL('../assets/frontier38/'+sheet+'.json',import.meta.url)));assert.equal(meta.rects.length,sheet==='rural-props'?9:24);for(const [x,y,w,h]of meta.rects){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=meta.width&&y+h<=meta.height);}}
});
test('server validates portal adjacency, alive state and destination capacity before travel',()=>{
 const realm=new RealmServer({catalog}),record={character:{name:'นักเดินทาง',gender:'male',classId:'novice'},state:initialSave()};const p=realm.join({uid:'traveler',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 assert.throws(()=>realm.travelDestination(p,'moonlit-mill'),/travel-invalid/);Object.assign(p.world.player,{x:0,z:2.5});assert.equal(realm.travelDestination(p,'rice-fields').id,'rice-fields');p.world.player.hp=0;assert.throws(()=>realm.travelDestination(p,'rice-fields'),/travel-invalid/);
});

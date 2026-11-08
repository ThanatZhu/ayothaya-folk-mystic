import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {DUNGEONS,DIFFICULTY,PARTY_HP,PIECE_CHANCE,CHESTS_PER_DAY,SHARDS_PER_PIECE,MAX_PARTY,dungeonById,monsterScale,rollGradeFor,canEnter} from '../dungeons.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {MONSTER_BEHAVIOUR} from '../monster-catalog.js';

const types=new Map(MONSTER_TYPES.map(t=>[t.id,t]));
const roomTypes=d=>d.rooms.flatMap(r=>[...(r.waves??[]).flat(2).filter(x=>typeof x==='string'),r.spawn?.type,r.boss,r.phase2,r.summon?.[0],r.adds?.type,r.hellAdds?.type].filter(Boolean));

test('the owner-approved rules are the numbers in the catalog',()=>{
 assert.equal(dungeonById('krasue').level,35);assert.equal(MAX_PARTY,5);assert.equal(CHESTS_PER_DAY,3);assert.equal(SHARDS_PER_PIECE,500);
 assert.deepEqual(PARTY_HP,[.45,.6,.75,.9,1]);assert.deepEqual(PIECE_CHANCE,[.5,.6,.7,.85,1]);
 assert.deepEqual([DIFFICULTY.normal.mul,DIFFICULTY.hard.mul,DIFFICULTY.hell.mul],[1,1.6,2.5]);
 assert.deepEqual([DIFFICULTY.normal.shards,DIFFICULTY.hard.shards,DIFFICULTY.hell.shards],[1,2,3]);
 assert.deepEqual(monsterScale('hell',2),{hp:1.5,damage:2.5});assert.deepEqual(monsterScale('normal',5),{hp:1,damage:1});
 assert.equal(rollGradeFor('hell',()=>.95),4);assert.equal(rollGradeFor('normal',()=>0),0);assert.equal(rollGradeFor('hard',()=>.6),2);
 assert.equal(canEnter(dungeonById('krasue'),34),false);assert.equal(canEnter(dungeonById('krasue'),99),true);
});
test('every dungeon monster exists, is never a summoned world boss, and has pixel art',()=>{
 const pixel=JSON.parse(readFileSync(new URL('../assets/pixel/monsters.json',import.meta.url)));
 for(const d of DUNGEONS)for(const id of roomTypes(d)){
  const t=types.get(id);assert.ok(t,id);assert.ok(!t.worldBoss&&!t.mvp&&!t.summoned&&!t.clearReward,id);
  assert.ok(pixel[id],id);assert.ok(existsSync(new URL('../assets/pixel/'+pixel[id].art+'.png',import.meta.url)),id);
  assert.ok(MONSTER_BEHAVIOUR[id],id);
 }
 assert.equal(MONSTER_TYPES.at(-1).id,'vision-straw-guardian','the prologue boss stays last');
});

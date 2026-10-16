import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORY,normalizeStory,storyEvent,currentObjective,nextHop} from '../story-quests.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {ITEMS} from '../items.js';

const world=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));

test('every story step points at an NPC, monster and map that exist in the world', () => {
 const ids=new Set(MONSTER_TYPES.map(t=>t.id).filter(Boolean));
 for(const q of STORY)for(const s of q.steps){
  const map=world.maps.find(m=>m.id===s.mapId);assert.ok(map,`${q.id}: map ${s.mapId}`);
  if(s.type==='talk')assert.ok(map.npcs.some(n=>n.name===s.npc),`${q.id}: ${s.npc} in ${s.mapId}`);
  if(s.type==='defeat'){
   assert.ok(ids.has(s.monster),`${q.id}: monster ${s.monster}`);
   const index=MONSTER_TYPES.findIndex(t=>t.id===s.monster);
   assert.ok(map.mobs.some(m=>m[2]===index),`${q.id}: ${s.monster} spawns in ${s.mapId}`);
  }
  assert.ok(s.hint);if(s.type==='talk')assert.ok(s.say);
 }
 for(const q of STORY)for(const it of q.reward.items??[])assert.ok(ITEMS[it.id]&&['loot','potion'].includes(ITEMS[it.id].kind),`${q.id} rewards ${it.id}`);
});

test('the whole chapter can be played through in order and pays each reward once', () => {
 let state=normalizeStory(null),paid=0,completed=0;
 for(let guard=0;guard<200&&!state.done;guard++){
  const {step}=currentObjective(state);
  const event=step.type==='talk'?{type:'talk',npc:step.npc,mapId:step.mapId}:step.type==='defeat'?{type:'defeat',monster:step.monster,mapId:step.mapId}:{type:'enter',mapId:step.mapId};
  const r=storyEvent(state,event);assert.ok(r.changed);state=r.state;
  if(r.reward){paid+=r.reward.baseXp;completed++;}
 }
 assert.ok(state.done);assert.equal(completed,STORY.length);
 assert.equal(paid,STORY.reduce((n,q)=>n+q.reward.baseXp,0));
 assert.equal(currentObjective(state),null);
 assert.equal(storyEvent(state,{type:'talk',npc:'ลุงเรือง',mapId:'ayutthaya'}).changed,false);
});

test('wrong NPC, wrong map or wrong monster do not advance', () => {
 const s=normalizeStory({quest:0,step:0});
 assert.equal(storyEvent(s,{type:'talk',npc:'แม่บัว',mapId:'ayutthaya'}).changed,false);
 assert.equal(storyEvent(s,{type:'talk',npc:'ลุงเรือง',mapId:'rice-fields'}).changed,false);
 const hunt=normalizeStory({quest:3,step:0});
 assert.equal(storyEvent(hunt,{type:'defeat',monster:'rat',mapId:'rice-fields'}).changed,false);
 const one=storyEvent(hunt,{type:'defeat',monster:'straw',mapId:'rice-fields'});
 assert.deepEqual(one.state,{quest:3,step:0,count:1,done:false});
});

test('corrupt saves are clamped instead of crashing', () => {
 assert.deepEqual(normalizeStory({quest:99,step:-4,count:'x'}),{quest:STORY.length,step:0,count:0,done:true});
 assert.deepEqual(normalizeStory({quest:3,step:7,count:99}),{quest:3,step:1,count:0,done:false});
 assert.deepEqual(normalizeStory({quest:3,step:0,count:99}),{quest:3,step:0,count:5,done:false});
});

test('auto-walk finds the next map through portals', () => {
 assert.equal(nextHop(world.maps,'ayutthaya','moonlit-mill'),'rice-fields');
 assert.equal(nextHop(world.maps,'rice-fields','moonlit-mill'),'old-orchard');
 assert.equal(nextHop(world.maps,'moonlit-mill','ayutthaya'),'old-orchard');
 assert.equal(nextHop(world.maps,'ayutthaya','ayutthaya'),'ayutthaya');
 assert.equal(nextHop(world.maps,'ayutthaya','nowhere'),null);
});

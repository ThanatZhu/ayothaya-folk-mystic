import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORY,normalizeStory,storyEvent,currentObjective,nextHop,rewardItems,storySatisfied,STARTER_WEAPON} from '../story-quests.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {ITEMS} from '../items.js';

const world=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));

test('every story step points at an NPC, monster and map that exist in the world', () => {
 const ids=new Set(MONSTER_TYPES.map(t=>t.id).filter(Boolean));
 for(const q of STORY)for(const s of q.steps){
  if(!s.mapId){assert.ok(['do','level'].includes(s.type),q.id);assert.ok(s.hint&&s.how,q.id);continue;}
  const map=world.maps.find(m=>m.id===s.mapId);assert.ok(map,`${q.id}: map ${s.mapId}`);
  if(s.type==='talk')assert.ok(map.npcs.some(n=>n.name===s.npc),`${q.id}: ${s.npc} in ${s.mapId}`);
  if(s.type==='defeat'){
   assert.ok(ids.has(s.monster),`${q.id}: monster ${s.monster}`);
   const index=MONSTER_TYPES.findIndex(t=>t.id===s.monster);
   assert.ok(map.mobs.some(m=>m[2]===index),`${q.id}: ${s.monster} spawns in ${s.mapId}`);
  }
  assert.ok(s.hint);if(s.type==='talk')assert.ok(s.say);
 }
 for(const q of STORY)for(const cls of Object.keys(STARTER_WEAPON))for(const it of rewardItems(q.reward,cls))assert.ok(ITEMS[it.id]&&['loot','potion','gear','card','lure','petfood'].includes(ITEMS[it.id].kind),`${q.id} rewards ${it.id}`);
});

test('the whole chapter can be played through in order and pays each reward once', () => {
 let state=normalizeStory(null),paid=0,completed=0;
 for(let guard=0;guard<200&&!state.done;guard++){
  const {step}=currentObjective(state);
  const event=step.type==='talk'?{type:'talk',npc:step.npc,mapId:step.mapId}:step.type==='defeat'?{type:'defeat',monster:step.monster,mapId:step.mapId}:step.type==='do'?{type:'do',action:step.action}:step.type==='level'?{type:'check',ctx:{level:99}}:{type:'enter',mapId:step.mapId};
  const r=storyEvent(state,event);assert.ok(r.changed);state=r.state;
  if(r.reward){paid+=r.reward.baseXp;completed++;}
 }
 assert.ok(state.done);assert.equal(completed,STORY.length);
 assert.equal(paid,STORY.reduce((n,q)=>n+q.reward.baseXp,0));
 assert.equal(currentObjective(state),null);
 assert.equal(storyEvent(state,{type:'talk',npc:'ลุงเรือง',mapId:'ayutthaya'}).changed,false);
});

test('wrong NPC, wrong map or wrong monster do not advance', () => {
 const s=normalizeStory({v:3,quest:0,step:0});
 assert.equal(storyEvent(s,{type:'talk',npc:'แม่บัว',mapId:'ayutthaya'}).changed,false);
 assert.equal(storyEvent(s,{type:'talk',npc:'ลุงเรือง',mapId:'rice-fields'}).changed,false);
 const hunt=normalizeStory({v:3,quest:4,step:0});
 assert.equal(storyEvent(hunt,{type:'defeat',monster:'rat',mapId:'rice-fields'}).changed,false);
 const one=storyEvent(hunt,{type:'defeat',monster:'straw',mapId:'rice-fields'});
 assert.deepEqual(one.state,{v:3,quest:4,step:0,count:1,done:false});
});

test('corrupt saves are clamped instead of crashing', () => {
 assert.deepEqual(normalizeStory({v:3,quest:99,step:-4,count:'x'}),{v:3,quest:STORY.length,step:0,count:0,done:true});
 assert.deepEqual(normalizeStory({v:3,quest:4,step:7,count:99}),{v:3,quest:4,step:1,count:0,done:false});
 assert.deepEqual(normalizeStory({v:3,quest:4,step:0,count:99}),{v:3,quest:4,step:0,count:5,done:false});
 assert.deepEqual(normalizeStory({quest:8,step:1}),{v:3,quest:0,step:0,count:0,done:false},'old chain progress starts the tutorial over');
});

test('auto-walk finds the next map through portals', () => {
 assert.equal(nextHop(world.maps,'ayutthaya','moonlit-mill'),'rice-fields');
 assert.equal(nextHop(world.maps,'rice-fields','moonlit-mill'),'old-orchard');
 assert.equal(nextHop(world.maps,'moonlit-mill','ayutthaya'),'old-orchard');
 assert.equal(nextHop(world.maps,'ayutthaya','ayutthaya'),'ayutthaya');
 assert.equal(nextHop(world.maps,'ayutthaya','nowhere'),null);
});

test('tutorial steps finish from the player state or their own action, and rewards fit the class', () => {
 const at=id=>normalizeStory({v:3,quest:STORY.findIndex(q=>q.id===id),step:0});
 assert.equal(storyEvent(at('t2'),{type:'check',ctx:{weapon:false}}).changed,false);
 const worn=storyEvent(at('t2'),{type:'check',ctx:{weapon:true}});assert.equal(worn.completed.id,'t2');
 assert.equal(storyEvent(at('t11'),{type:'check',ctx:{level:99,weapon:true}}).changed,false,'crafting only counts when it happens');
 assert.ok(storyEvent(at('t11'),{type:'do',action:'craft'}).completed);
 assert.equal(storyEvent(at('t11'),{type:'do',action:'pet'}).changed,false);
 assert.ok(storySatisfied({type:'level',level:6},{level:6}));assert.ok(!storySatisfied({type:'level',level:6},{level:5}));
 assert.equal(rewardItems(STORY[0].reward,'novice')[0].id,'starter-wraps');
 assert.equal(rewardItems(STORY.find(q=>q.id==='t17').reward,'hunter')[0].id,'weapon-hunter-one');
});

test('removing the capture quest preserves old v2 progress before, during, after and beyond the removed quest',()=>{
 assert.equal(STORY.some(q=>q.id==='t13'),false);assert.equal(STORY.some(q=>q.steps.some(s=>s.type==='do'&&s.action==='pet')),false);
 for(const q of STORY)assert.equal(q.reward.items.some(i=>i.id==='pet-lure'||i.id==='pet-food'),false);
 const before=normalizeStory({v:2,quest:11,step:0,count:2});assert.equal(currentObjective(before).quest.id,'t12');assert.equal(before.count,2);
 const removed=normalizeStory({v:2,quest:12,step:0});assert.equal(currentObjective(removed).quest.id,'t14');assert.equal(removed.v,3);assert.equal(storyEvent(removed,{type:'do',action:'pet'}).changed,false);
 const after=normalizeStory({v:2,quest:14,step:3,count:0});assert.equal(currentObjective(after).quest.id,'t15');assert.equal(after.step,3);assert.deepEqual(normalizeStory(after),after,'migration runs once');
 assert.equal(normalizeStory({v:2,quest:23,step:0,done:true}).done,true);assert.equal(currentObjective(normalizeStory({v:2,quest:20,step:0})).quest.id,'t21');
});

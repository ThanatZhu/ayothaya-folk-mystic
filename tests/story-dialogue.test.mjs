import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY,currentObjective,normalizeStory} from '../story-quests.js';
import {STORY_DIALOGUE,STORY_RECAP,dialogueFor,sameObjective} from '../story-dialogue.js';

test('every existing talk objective has three pages, an optional question and an explicit final response',()=>{
 let count=0;STORY.forEach((quest,q)=>{
  assert.ok(STORY_RECAP[quest.id]?.length>30,quest.id+' context in quest journal');
  quest.steps.forEach((step,s)=>{const state=normalizeStory({v:4,quest:q,step:s}),obj=currentObjective(state),before=structuredClone(state),dialogue=dialogueFor(obj);
   if(step.type!=='talk'){assert.equal(dialogue,null);return;}
   count++;assert.equal(dialogue.pages.length,3,quest.id);assert.ok(dialogue.pages.every(p=>typeof p==='string'&&p.length>20));assert.ok(dialogue.question&&dialogue.answer&&dialogue.accept);assert.equal(dialogue.pages.at(-1),step.say);
   assert.deepEqual(state,before,'reading never advances saved progress');assert.ok(sameObjective(state,{quest:q,step:s}));assert.equal(sameObjective(state,{quest:q,step:s+1}),false);
  });
 });assert.equal(Object.keys(STORY_DIALOGUE).length,count);assert.equal(Object.keys(STORY_RECAP).length,STORY.length);assert.equal(dialogueFor(null),null);
});

 test('story art covers every quest with local lightweight assets and shows resolution only after the boss',async()=>{
 const {STORY_ART,storyArt}=await import('../story-dialogue.js'),{stat}=await import('node:fs/promises');let bytes=0;
 for(const art of Object.values(STORY_ART)){assert.ok(art.alt);const file=await stat(new URL('../'+art.src,import.meta.url));assert.ok(file.size>10000);bytes+=file.size;}
 assert.ok(bytes<4000000);for(const q of STORY)assert.ok(storyArt(q.id).src);
 assert.equal(storyArt('t15',3),STORY_ART['moonlit-mill']);assert.equal(storyArt('t15',5),STORY_ART['city-home']);assert.equal(storyArt('t21',1),STORY_ART['lotus-thread']);assert.equal(storyArt('t21',2),STORY_ART['city-home']);
 });

 test('speaker portraits use the same actor artwork as every quest NPC in the world',async()=>{
 const {storyPortrait}=await import('../story-dialogue.js'),{readFile,stat}=await import('node:fs/promises'),catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
 for(const q of STORY)for(const step of q.steps){if(step.type!=='talk')continue;const npc=catalog.maps.find(m=>m.id===step.mapId).npcs.find(n=>n.name===step.npc),art=storyPortrait(npc);assert.equal(art.alt,npc.name);assert.ok(art.src.endsWith(npc.name==='เจ้าจุก'?'chao-chuk-portrait.webp':'npc-'+npc.texture+'.webp'));assert.ok((await stat(new URL('../'+art.src,import.meta.url))).size>1000);}
 });

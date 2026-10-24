import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY,currentObjective,normalizeStory} from '../story-quests.js';
import {STORY_DIALOGUE,STORY_RECAP,dialogueFor,sameObjective} from '../story-dialogue.js';

test('every existing talk objective has three pages, an optional question and an explicit final response',()=>{
 let count=0;STORY.forEach((quest,q)=>{
  assert.ok(STORY_RECAP[quest.id]?.length>30,quest.id+' context in quest journal');
  quest.steps.forEach((step,s)=>{const state=normalizeStory({v:2,quest:q,step:s}),obj=currentObjective(state),before=structuredClone(state),dialogue=dialogueFor(obj);
   if(step.type!=='talk'){assert.equal(dialogue,null);return;}
   count++;assert.equal(dialogue.pages.length,3,quest.id);assert.ok(dialogue.pages.every(p=>typeof p==='string'&&p.length>20));assert.ok(dialogue.question&&dialogue.answer&&dialogue.accept);assert.equal(dialogue.pages.at(-1),step.say);
   assert.deepEqual(state,before,'reading never advances saved progress');assert.ok(sameObjective(state,{quest:q,step:s}));assert.equal(sameObjective(state,{quest:q,step:s+1}),false);
  });
 });assert.equal(Object.keys(STORY_DIALOGUE).length,count);assert.equal(Object.keys(STORY_RECAP).length,STORY.length);assert.equal(dialogueFor(null),null);
});

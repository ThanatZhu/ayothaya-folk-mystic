import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as storyRules from '../story-quests.js';import {baseProgress,awardExperience,levelStart} from '../experience.js';
import {MONSTER_TYPES} from '../combat-core.js';

// Drive the real tracker update function with a tiny DOM; unrelated coach/cinematic work stays inert.
function tracker(online){
 const quest=storyRules.STORY.findIndex(q=>q.id==='t15'),state={v:storyRules.STORY_VERSION,quest,step:0,count:0,done:false},nodes=new Map();
 const node=()=>({writes:0,_text:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},append(){},
  get textContent(){return this._text;},set textContent(v){this._text=v;this.writes++;}});
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:()=>node(),querySelector:()=>null,querySelectorAll:()=>[],head:{append(){}},body:{append(){}}};
 const world={baseXp:levelStart(15),jobXp:0,story:structuredClone(state),player:{x:0,z:0},mobs:[],notice(){}};
 const env={document,localStorage:{getItem:()=>JSON.stringify(state),setItem(){}},sessionStorage:{getItem:()=>null,removeItem(){},setItem(){}},setTimeout(){},performance:{now:()=>100}};
 const deps={...storyRules,baseProgress,awardExperience,MONSTER_TYPES,dialogueFor(){},createCoach:()=>({off:true,update(){},setOff(){}}),createQuestCinematics:()=>({observe(){},onTalk(){}})};
 const source=readFileSync(new URL('../story-ui.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export function createStoryUI','function createStoryUI');
 const create=new Function('deps','env',`const {${Object.keys(deps).join(',')}}=deps;const {${Object.keys(env).join(',')}}=env;${source};return createStoryUI;`)(deps,env);
 const game={online,world,walking:false,onEvent(){}};
 const api=create({game,map:{id:'old-orchard',portals:[],npcs:[]},catalog:{maps:[]},worldUI:{npcLabel:()=>null}});
 return {api,world,hint:nodes.get('quest-hint'),title:nodes.get('quest-title')};
}
for(const online of [true,false])test(`tracker follows Lv.15 to Lv.17 within the same level objective (${online?'online':'offline'})`,()=>{
 const {api,world,hint}=tracker(online),before=structuredClone(world.story);
 assert.match(hint.textContent,/Lv\.18.*ตอนนี้ Lv\.15/);
 world.baseXp=levelStart(17);api.update();assert.match(hint.textContent,/Lv\.18.*ตอนนี้ Lv\.17/);
 assert.deepEqual(world.story,before,'refreshing the text must not advance or pay the quest');
 const writes=hint.writes;world.baseXp++;api.update();assert.equal(hint.writes,writes,'ordinary EXP changes must not rebuild a stable tracker');
});
test('online tracker waits for the authoritative next step at the target level',()=>{
 const {api,world,hint,title}=tracker(true);world.baseXp=levelStart(18);api.update();assert.match(hint.textContent,/ตอนนี้ Lv\.18/);assert.match(title.textContent,/ขั้น 1\/5/);
 world.story={...world.story,step:1};api.update();assert.match(hint.textContent,/เดินทางไปโรงสี/);assert.doesNotMatch(hint.textContent,/ตอนนี้/);assert.match(title.textContent,/ขั้น 2\/5/);
 const writes=hint.writes;world.baseXp=levelStart(19);api.update();assert.equal(hint.writes,writes,'unrelated levels need not redraw a travel objective');
});

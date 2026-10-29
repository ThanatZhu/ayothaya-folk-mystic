import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as storyRules from '../story-quests.js';import {baseProgress,awardExperience,levelStart} from '../experience.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {storyReady} from '../story-navigation173.js';
const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));

// Drive the real tracker update function with a tiny DOM; unrelated coach/cinematic work stays inert.
function tracker(online){
 const state=storyRules.retiredStory(),nodes=new Map();
 const node=()=>({writes:0,_text:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},append(){},querySelector:()=>null,
  get textContent(){return this._text;},set textContent(v){this._text=v;this.writes++;}});
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:()=>node(),querySelector:()=>null,querySelectorAll:()=>[],head:{append(){}},body:{append(){}}};
 const world={baseXp:levelStart(15),jobXp:0,story:structuredClone(state),player:{x:0,z:0},mobs:[],notice(){}};
 const env={document,addEventListener(){},localStorage:{getItem:()=>JSON.stringify(state),setItem(){}},sessionStorage:{getItem:()=>null,removeItem(){},setItem(){}},setTimeout(){},performance:{now:()=>100}};
 const deps={...storyRules,storyReady,baseProgress,awardExperience,MONSTER_TYPES,dialogueFor(){},createCoach:()=>({off:true,update(){},setOff(){}}),createQuestCinematics:()=>({observe(){},onTalk(){}})};
 const source=readFileSync(new URL('../story-ui.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export function createStoryUI','function createStoryUI');
 const create=new Function('deps','env',`const {${Object.keys(deps).join(',')}}=deps;const {${Object.keys(env).join(',')}}=env;${source};return createStoryUI;`)(deps,env);
 const game={online,networkStatus:online?'online':'offline',world,walking:false,onEvent(){}};
 const api=create({game,map:{id:'old-orchard',portals:[],npcs:[]},catalog,worldUI:{npcLabel:()=>null}});
 return {api,game,world,hint:nodes.get('quest-hint'),title:nodes.get('quest-title')};
}
// 0.123 chapter 1 is retired: the tracker is a farm-map suggestion that follows the level (story-quests.js farmMapFor)
for(const online of [true,false])test(`the farm suggestion follows the level without touching the story (${online?'online':'offline'})`,()=>{
 const {api,world,title,hint}=tracker(online),before=structuredClone(world.story);
 assert.match(title.textContent,/Lv.15–25/);assert.match(hint.textContent,/เหมาะกับเลเวล/);
 world.baseXp=levelStart(22);api.update();assert.match(title.textContent,/Lv.20–30/);
 assert.deepEqual(world.story,before,'refreshing the text must not advance or pay anything');
 const writes=title.writes;world.baseXp++;api.update();assert.equal(title.writes,writes,'ordinary EXP changes must not rebuild a stable tracker');
});
test('reconnecting hides the suggestion until the current server state is ready',()=>{
 const {api,game,world,title}=tracker(true);
 game.networkStatus='connecting';world.baseXp=levelStart(17);api.update();
 assert.doesNotMatch(title.textContent,/Lv./);
 game.networkStatus='online';api.update();assert.match(title.textContent,/Lv.15–25/);
});
test('every level 1–99 has a farm map, rebirth maps only on the rebirth campaign',()=>{
 for(let lv=1;lv<=99;lv++){
  const m=storyRules.farmMapFor(catalog.maps,lv);assert.ok(m&&lv>=m.levels[0]&&lv<=m.levels[1]&&!m.minRebirth,'Lv.'+lv);
  const r=storyRules.farmMapFor(catalog.maps,lv,{rebirth:1,campaign:'rebirth'});assert.ok(r.minRebirth&&lv>=r.levels[0]&&lv<=r.levels[1],'reborn Lv.'+lv);
  assert.ok(!storyRules.farmMapFor(catalog.maps,lv,{rebirth:0,campaign:'rebirth'}).minRebirth);
 }
});

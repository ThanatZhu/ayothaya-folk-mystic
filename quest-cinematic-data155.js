import {STORY} from './story-quests.js?v=weapon188';
import {STORYBOARDS} from './quest-storyboard160.js?v=weapon188';
import {bountyScene} from './bounty-storyboards163.js?v=163';
export function storyScene(questIndex,stepIndex){
 const quest=STORY[questIndex],step=quest?.steps[stepIndex];if(!step)return null;
 const board=STORYBOARDS[quest.id];if(!board)throw Error('Missing storyboard '+quest.id);
 return {id:`story:${quest.id}:${stepIndex}`,seenId:`story:${quest.id}`,questIndex,stepIndex,title:quest.title,step,
  art:{src:`./assets/story160/${quest.id}.webp`,panels:3,...(board.frames?{frames:board.frames}:{})},captions:[...board.lines]};
}
export function sceneUnlocked(scene,state){return !!scene&&!!state&&(scene.questIndex<state.quest||scene.questIndex===state.quest&&(state.done||scene.stepIndex<=state.step));}
// Only called at actual NPC conversation entry, never by quest updates or route polling.
export function sceneForNPCTalk(state,npc,mapId){
 if(!state||state.done||!npc)return null;
 const quest=STORY[state.quest],step=quest?.steps[state.step];if(!step)return null;
 if(step.type==='talk'){
  if(step.npc!==npc.name||step.mapId!==mapId)return null;
 }else{
  const instructor=quest.id==='t17'&&npc.mentorId;
  if(!instructor&&npc.name!==(step.npc??STORYBOARDS[quest.id].npc))return null;
  if(step.npc&&step.mapId&&step.mapId!==mapId)return null;
 }
 return storyScene(state.quest,state.step);
}
export function taskScene({kind='training',title,goal,monster,leader=false}={}){
 if(kind==='bounty'||kind==='weekly')return bountyScene({title,goal,monster,leader});
 const id=kind==='training'?'t17':monster==='marsh-ape'?'t21':monster==='bog-lantern'?'t20':monster?.startsWith('marsh')?'t19':monster==='lantern'?'t12':'t5';
 const board=STORYBOARDS[id];return {id:kind+':'+title,title:title??'เรื่องเล่าจากอโยธยา',
  art:{src:`./assets/story160/${id}.webp`,panels:3},captions:[board.lines[0],goal??board.lines[1],board.lines[2]]};
}

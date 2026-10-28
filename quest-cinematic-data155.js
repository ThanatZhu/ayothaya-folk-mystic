import {STORY,storyQuests} from './story-quests.js?v=rebirth196';
import {STORYBOARDS} from './quest-storyboard160.js?v=weapon188';
import {bountyScene} from './bounty-storyboards163.js?v=163';
import {REBIRTH_STORY} from './rebirth-content196.js';
import {REBIRTH_BOARDS} from './rebirth-storyboards.js?v=rebirth199';
// rebirth: the owner's chosen triptychs and their captions; a tap shows the whole line, shots drift in a little
const rebirthBoards=Object.fromEntries(REBIRTH_STORY.map(q=>[q.id,{npc:q.steps.find(s=>s.type==='talk')?.npc,...REBIRTH_BOARDS[q.id],tap:'complete',zoom:.05}]));
const boardFor=id=>rebirthBoards[id]??STORYBOARDS[id];
export function storyScene(questIndex,stepIndex,campaign,cycle=1){
 const quest=storyQuests({campaign})[questIndex],step=quest?.steps[stepIndex];if(!step)return null;
 const board=boardFor(quest.id);if(!board)throw Error('Missing storyboard '+quest.id);
 return {campaign,id:`story:${quest.id}:${stepIndex}`,seenId:campaign==='rebirth'?`rebirth:${cycle}:${quest.id}`:`story:${quest.id}`,questIndex,stepIndex,title:quest.title,step,
  ...(board.tap?{tap:board.tap}:{}),art:{src:campaign==='rebirth'?`./assets/rebirth196/story/${quest.id}.webp?v=owner199`:`./assets/story160/${quest.id}.webp`,panels:3,...(board.frames?{frames:board.frames}:{}),...(board.zoom?{zoom:board.zoom}:{})},captions:[...board.lines]};
}
export function sceneUnlocked(scene,state){return !!scene&&!!state&&(scene.campaign??'main')===(state.campaign??'main')&&(scene.questIndex<state.quest||scene.questIndex===state.quest&&(state.done||scene.stepIndex<=state.step));}
// Only called at actual NPC conversation entry, never by quest updates or route polling.
export function sceneForNPCTalk(state,npc,mapId){
 if(!state||state.done||!npc)return null;
 const quest=storyQuests(state)[state.quest],step=quest?.steps[state.step];if(!step)return null;
 if(step.type==='talk'){
  if(step.npc!==npc.name||step.mapId!==mapId)return null;
 }else{
  const instructor=quest.id==='t17'&&npc.mentorId;
  if(!instructor&&npc.name!==(step.npc??boardFor(quest.id).npc))return null;
  if(step.npc&&step.mapId&&step.mapId!==mapId)return null;
 }
 return storyScene(state.quest,state.step,state.campaign,state.cycle);
}
export function taskScene({kind='training',title,goal,monster,leader=false}={}){
 if(kind==='bounty'||kind==='weekly')return bountyScene({title,goal,monster,leader});
 const id=kind==='training'?'t17':monster==='marsh-ape'?'t21':monster==='bog-lantern'?'t20':monster?.startsWith('marsh')?'t19':monster==='lantern'?'t12':'t5';
 const board=STORYBOARDS[id];return {id:kind+':'+title,title:title??'เรื่องเล่าจากอโยธยา',
  art:{src:`./assets/story160/${id}.webp`,panels:3},captions:[board.lines[0],goal??board.lines[1],board.lines[2]]};
}

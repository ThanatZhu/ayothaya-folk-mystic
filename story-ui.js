// Story quest tracker + auto-walk ("กดแล้วเดินไปเอง"). Online: the realm server owns progress and rewards; the client
// only sends questTalk and shows world.story from snapshots. Offline guests keep progress in this browser.
import {STORY_TITLE,currentObjective,storyEvent,normalizeStory,nextHop} from './story-quests.js?v=01';
import {MONSTER_TYPES} from './combat-core.js?v=38';
import {awardExperience} from './experience.js?v=21';

const RESUME='ayothaya-story-autowalk';
const $=id=>document.getElementById(id);

export function createStoryUI({game,worldUI,map,catalog,account}){
 const world=game.world,key='ayothaya-story:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const read=()=>{try{return normalizeStory(JSON.parse(localStorage.getItem(key)));}catch{return normalizeStory(null);}};
 let local=read();
 const state=()=>game.online?normalizeStory(world.story):local;
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(local));}catch{}};

 // Offline: apply the shared rules here and pay rewards into the local world (online the server does both).
 function offline(event){
  if(game.online)return null;
  const r=storyEvent(local,event);if(!r.changed)return r;
  local=r.state;save();
  if(r.reward){world.emit('experience',awardExperience(world,r.reward.baseXp,r.reward.jobXp));world.emit('reward',{coins:r.reward.coins??0,items:r.reward.items??[]});}
  if(r.completed)world.notice('เควสสำเร็จ · '+r.completed.title);
  render();return r;
 }
 game.onEvent(e=>{
  if(e.type==='defeat'&&!game.online){const mob=world.mobs.find(m=>m.id===e.id);const id=mob&&MONSTER_TYPES[mob.type]?.id;if(id)offline({type:'defeat',monster:id,mapId:map.id});}
  if(e.type==='story'){if(e.story)world.story=e.story;if(e.completed)world.notice('เควสสำเร็จ · '+e.completed);render();}
 });
 // Talking to the quest NPC shows the story line instead of their idle chatter.
 worldUI.onTalk=n=>{
  const obj=currentObjective(state());const step=obj?.step;
  if(!step||step.type!=='talk'||step.npc!==n.name||step.mapId!==map.id)return null;
  if(game.online){world.questTalk?.(n.name);return storyEvent(state(),{type:'talk',npc:n.name,mapId:map.id}).say??null;}
  return offline({type:'talk',npc:n.name,mapId:map.id})?.say??null;
 };

 // Tracker panel (own stylesheet, so game.html needs no edit).
 if(!document.querySelector('link[data-story-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='story-ui.css?v=01';css.dataset.storyUi='';document.head.append(css);}
 const panel=document.createElement('section');panel.id='quest-tracker';panel.setAttribute('aria-label','เควสเนื้อเรื่อง');
 panel.innerHTML='<small id="quest-chapter"></small><strong id="quest-title"></strong><span id="quest-hint"></span><button id="quest-go" type="button"></button>';
 document.body.append(panel);
 function hintText(obj){
  const s=obj.step,where=s.mapId!==map.id?' · '+(catalog.maps.find(m=>m.id===s.mapId)?.name??''):'';
  if(s.type==='defeat'){const name=MONSTER_TYPES.find(t=>t.id===s.monster)?.name??s.monster;return `${s.hint} ${name} ${obj.count}/${s.count}${where}`;}
  return s.hint+where;
 }
 let markedNpc=null,shown='';
 function render(){
  const obj=currentObjective(state()),sig=JSON.stringify([state(),game.walking&&walking]);
  if(sig===shown)return;shown=sig;
  $('quest-chapter').textContent=obj?.quest?.chapter??STORY_TITLE;
  $('quest-title').textContent=obj?obj.quest.title+` (${obj.stepNumber}/${obj.steps})`:'จบเนื้อเรื่องที่มีในตอนนี้แล้ว';
  $('quest-hint').textContent=obj?hintText(obj):'รอเนื้อเรื่องบทต่อไปเร็ว ๆ นี้';
  $('quest-go').hidden=!obj;
  $('quest-go').textContent=game.walking&&walking?'■ หยุด':'▶ เดินไป';
  // A gold "!" over the NPC the story wants next.
  const want=obj?.step.type==='talk'&&obj.step.mapId===map.id?obj.step.npc:null;
  if(markedNpc!==want){worldUI.npcLabel(markedNpc)?.classList.remove('quest-npc');worldUI.npcLabel(want)?.classList.add('quest-npc');markedNpc=want;}
 }

 // Auto-walk to the current objective; crosses maps through portals and resumes after the map loads.
 let walking=false;
 function go(){
  const obj=currentObjective(state());if(!obj){world.notice('จบเนื้อเรื่องบทที่ 1 แล้ว');return;}
  const s=obj.step;walking=true;
  const done=()=>{walking=false;render();};
  if(s.mapId!==map.id){
   const hop=nextHop(catalog.maps,map.id,s.mapId),portal=map.portals.find(p=>p.to===hop);
   if(!portal){done();world.notice('ยังหาทางไปไม่เจอ');return;}
   if(map.safe){try{sessionStorage.setItem(RESUME,'1');}catch{}done();worldUI.travelTo(hop);return;} // town: ride straight out of the gate
   game.walkTo({x:portal.x,z:portal.z},{radius:1.2,kind:'quest',onArrive:()=>{try{sessionStorage.setItem(RESUME,'1');}catch{}done();worldUI.travelTo(hop);},onFail:()=>{done();world.notice('เดินไปจุดเดินทางไม่ได้');}});
  }else if(s.type==='talk'){
   if(!worldUI.talkTo(s.npc))world.notice('ไม่พบ '+s.npc+' ในแผนที่นี้');
   walking=game.walking;
  }else if(s.type==='defeat'){
   const index=MONSTER_TYPES.findIndex(t=>t.id===s.monster);
   const near=()=>world.mobs.filter(m=>m.type===index&&m.hp>0).sort((a,b)=>Math.hypot(a.x-world.player.x,a.z-world.player.z)-Math.hypot(b.x-world.player.x,b.z-world.player.z))[0];
   const first=near();if(!first){done();world.notice('รอมอนสเตอร์เกิดใหม่สักครู่');return;}
   game.walkTo(()=>{const m=near();return m&&{x:m.x,z:m.z};},{radius:2.4,kind:'quest',onArrive:()=>{done();const m=near();if(m)world.select(m.id);setTimeout(()=>{if(!world.auto)world.toggleAuto();},150);},onFail:()=>{done();world.notice('เดินไปหามอนสเตอร์ไม่ได้');}});
  }else done();
  render();
 }
 $('quest-go').onclick=()=>{if(walking&&game.walking){game.cancelWalk();walking=false;render();}else go();};
 panel.addEventListener('click',e=>{if(e.target===panel||e.target.closest('#quest-title,#quest-hint'))$('quest-go').click();});

 offline({type:'enter',mapId:map.id});
 render();
 let resume=false;try{resume=sessionStorage.getItem(RESUME)==='1';sessionStorage.removeItem(RESUME);}catch{}
 // Online progress arrives with the first snapshot; give it a moment before resuming the walk on the new map.
 if(resume)setTimeout(go,1600);
 return {update(){if(walking&&!game.walking)walking=false;render();}};
}

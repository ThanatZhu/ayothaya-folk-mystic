// Story quest tracker + auto-walk ("กดแล้วเดินไปเอง"). Online: the realm server owns progress and rewards; the client
// only sends questTalk and shows world.story from snapshots. Offline guests keep progress in this browser.
import {STORY_TITLE,currentObjective,storyEvent,normalizeStory,nextHop,rewardItems,STARTER_WEAPON} from './story-quests.js?v=98';
import {createCoach} from './coach.js?v=104.1';
import {MONSTER_TYPES} from './combat-core.js?v=112.1';
import {awardExperience,baseProgress} from './experience.js?v=105.3';

const RESUME='ayothaya-story-autowalk';
const $=id=>document.getElementById(id);

export function createStoryUI({game,worldUI,map,catalog,account}){
 const baseLevel=()=>baseProgress(game.world).level;
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
  if(r.reward){world.emit('experience',awardExperience(world,r.reward.baseXp,r.reward.jobXp));world.emit('reward',{coins:r.reward.coins??0,items:rewardItems(r.reward,account?.character?.classId??world.profession.id)});}
  if(r.completed)world.notice('เควสสำเร็จ · '+r.completed.title);
  render();return r;
 }
 game.onEvent(e=>{
  if(e.type==='defeat'&&!game.online){const mob=world.mobs.find(m=>m.id===e.id);const id=mob&&MONSTER_TYPES[mob.type]?.id;if(id)offline({type:'defeat',monster:id,mapId:map.id});}
  if(e.type==='storyDo'&&!game.online)offline({type:'do',action:e.action}); // 0.98 offline tutorial actions (craft, pet, shop)
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
 if(!document.querySelector('link[data-story-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='story-ui.css?v=99.2';css.dataset.storyUi='';document.head.append(css);}
 const panel=document.createElement('section');panel.id='quest-tracker';panel.setAttribute('aria-label','เควสเนื้อเรื่อง');
 panel.innerHTML='<button id="quest-coach" type="button" aria-pressed="true" title="ลูกศรแนะนำ"><b>💡</b><span>ลูกศร</span></button><small id="quest-chapter"></small><strong id="quest-title"></strong><span id="quest-hint"></span><em id="quest-how"></em><button id="quest-go" type="button"></button>';
 document.body.append(panel);
 // 0.99 arrows that point at the next button to press, and a welcome card for a brand-new character
 const coach=createCoach({game,account,objective:()=>currentObjective(state()),paused:()=>!!document.querySelector('#welcome-card[open],#job-ready[open],#world-atlas-dialog[open]')||[...document.querySelectorAll('.journey-loading,#travel-loading')].some(e=>!e.classList.contains('leaving')&&e.checkVisibility?.({checkVisibilityCSS:true}))});
 const coachButton=()=>{$('quest-coach').setAttribute('aria-pressed',String(!coach.off));$('quest-coach').title=coach.off?'เปิดลูกศรแนะนำ':'ปิดลูกศรแนะนำ';$('quest-coach').classList.toggle('off',coach.off);};
 $('quest-coach').onclick=e=>{e.stopPropagation();coach.setOff(!coach.off);coachButton();world.notice(coach.off?'ปิดลูกศรแนะนำแล้ว · กด 💡 ในกล่องเควสเพื่อเปิดใหม่':'เปิดลูกศรแนะนำแล้ว');};coachButton();
 const welcomeKey='ayothaya-welcome:'+key;
 function welcome(){
  const s=state();if(s.quest!==0||s.step!==0)return;try{if(localStorage.getItem(welcomeKey))return;localStorage.setItem(welcomeKey,'1');}catch{}
  const card=document.createElement('dialog');card.id='welcome-card';card.setAttribute('aria-labelledby','welcome-title');
  card.innerHTML='<small>ยินดีต้อนรับสู่อโยธยา</small><h2 id="welcome-title">เริ่มการเดินทางของคุณ</h2><ul>'+
   '<li><b>เดิน</b> กด WASD / ปุ่มลูกศร หรือแตะพื้นที่อยากไป · มือถือใช้จอยด้านซ้าย</li>'+
   '<li><b>ตีมอน</b> แตะมอนเพื่อเลือกเป้า แล้วกดปุ่มดาบ (Space) · ปุ่มเลข 1–0 คือสกิล</li>'+
   '<li><b>เควส</b> ดูกล่องเควสมุมขวา กด ▶ เดินไป แล้วตัวละครจะเดินไปเอง</li>'+
   '<li><b>ลูกศรสีทอง</b> จะชี้ปุ่มที่ต้องกดทีละขั้น ปิดได้ที่ 💡 ในกล่องเควส</li></ul><button type="button" id="welcome-go">เริ่มผจญภัย</button>';
  ($('game-shell')??document.body).append(card);card.querySelector('#welcome-go').onclick=()=>card.close();card.addEventListener('close',()=>card.remove());card.showModal();
 }
 setTimeout(welcome,game.online?2500:800); // online progress arrives with the first snapshot
 function hintText(obj){
  const s=obj.step,where=s.mapId!==map.id?' · '+(catalog.maps.find(m=>m.id===s.mapId)?.name??''):'';
  if(s.type==='defeat'){const name=MONSTER_TYPES.find(t=>t.id===s.monster)?.name??s.monster;return `${s.hint} ${name} ${obj.count}/${s.count}${where}`;}
  if(s.type==='level')return `${s.hint} (ตอนนี้ Lv.${baseLevel()})`;
  if(s.type==='do'&&!s.mapId)return s.hint;
  return s.hint+where;
 }
 let markedNpc=null,shown='';
 function render(){
  const obj=currentObjective(state()),sig=JSON.stringify([state(),game.walking&&walking]);
  if(sig===shown)return;shown=sig;
  $('quest-chapter').textContent=obj?.quest?.chapter??STORY_TITLE;
  const stepLabel=obj&&obj.steps>1?` (ขั้น ${obj.stepNumber}/${obj.steps})`:'';
  $('quest-title').textContent=obj?obj.quest.title+stepLabel:'จบเนื้อเรื่องที่มีในตอนนี้แล้ว';
  $('quest-hint').textContent=obj?hintText(obj):'รอเนื้อเรื่องบทต่อไปเร็ว ๆ นี้';
  $('quest-how').textContent=obj?.step.how??'';$('quest-how').hidden=!obj?.step.how;
  $('quest-go').hidden=!obj;
  $('quest-go').textContent=game.walking&&walking?'■ หยุด':'▶ เดินไป';
  // A gold "!" over the NPC the story wants next.
  const want=(obj?.step.type==='talk'||obj?.step.type==='do')&&obj.step.npc&&obj.step.mapId===map.id?obj.step.npc:null;
  if(markedNpc!==want){worldUI.npcLabel(markedNpc)?.classList.remove('quest-npc');worldUI.npcLabel(want)?.classList.add('quest-npc');markedNpc=want;}
 }

 // Auto-walk to the current objective; crosses maps through portals and resumes after the map loads.
 let walking=false;
 function go(){
  const obj=currentObjective(state());if(!obj){world.notice('จบเนื้อเรื่องบทที่ 1 แล้ว');return;}
  const s=obj.step;
  // do / level steps without a place: the tracker already says how; repeat it as a toast
  if((s.type==='do'||s.type==='level')&&!s.mapId){world.notice(s.how??s.hint);return;}
  walking=true;
  const done=()=>{walking=false;render();};
  if(s.mapId!==map.id){
   const hop=nextHop(catalog.maps,map.id,s.mapId),portal=map.portals.find(p=>p.to===hop);
   if(!portal){done();world.notice('ยังหาทางไปไม่เจอ');return;}
   if(map.safe){try{sessionStorage.setItem(RESUME,'1');}catch{}done();worldUI.travelTo(hop);return;} // town: ride straight out of the gate
   game.walkTo({x:portal.x,z:portal.z},{radius:1.2,kind:'quest',onArrive:()=>{try{sessionStorage.setItem(RESUME,'1');}catch{}done();worldUI.travelTo(hop);},onFail:()=>{done();world.notice('เดินไปจุดเดินทางไม่ได้');}});
  }else if(s.type==='talk'||s.type==='do'){
   if(!worldUI.talkTo(s.npc))world.notice('ไม่พบ '+s.npc+' ในแผนที่นี้');
   walking=game.walking;
  }else if(s.type==='defeat'){
   const index=MONSTER_TYPES.findIndex(t=>t.id===s.monster);
   const near=()=>world.mobs.filter(m=>m.type===index&&m.hp>0).sort((a,b)=>Math.hypot(a.x-world.player.x,a.z-world.player.z)-Math.hypot(b.x-world.player.x,b.z-world.player.z))[0];
   const first=near();if(!first){done();world.notice('รอมอนสเตอร์เกิดใหม่สักครู่');return;}
   game.walkTo(()=>{const m=near();return m&&{x:m.x,z:m.z};},{radius:2.4,kind:'quest',onArrive:()=>{done();const m=near();if(m)world.select(m.id);setTimeout(()=>world.setAuto(true,index),150);},onFail:()=>{done();world.notice('เดินไปหามอนสเตอร์ไม่ได้');}});
  }else done();
  render();
 }
 $('quest-go').onclick=()=>{if(walking&&game.walking){game.cancelWalk();walking=false;render();}else go();};
 panel.addEventListener('click',e=>{if(e.target.id==='quest-coach')return;if(e.target===panel||e.target.closest('#quest-title,#quest-hint'))$('quest-go').click();});

 offline({type:'enter',mapId:map.id});
 render();
 let resume=false;try{resume=sessionStorage.getItem(RESUME)==='1';sessionStorage.removeItem(RESUME);}catch{}
 // Online progress arrives with the first snapshot; give it a moment before resuming the walk on the new map.
 if(resume)setTimeout(go,1600);
 // Offline only: do/level steps that are already true finish by themselves (the server does this online).
 let checked=0;
 const api={context:null,update(){if(walking&&!game.walking)walking=false;
  coach.update();
  if(!game.online&&api.context&&performance.now()-checked>1000){checked=performance.now();for(let i=0;i<30&&offline({type:'check',ctx:api.context()})?.changed;i++);}
  render();}};
 return api;
}

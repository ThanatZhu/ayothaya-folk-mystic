// Client side of the ทุ่งนิมิต prologue: plays each cutscene when the realm says the story has reached it, offers the
// teacher's seven paths inside the NPC conversation, keeps the objective in the quest tracker, and walks the player home.
// The realm owns every step (server/prologue-realm.js); this file only shows them and reports what was watched.
import {PROLOGUE_MAP,PROLOGUE_SCENES,TEACHER,TRIAL_CLASSES,OBJECTIVES,TERRACE,PROLOGUE_BOSS,dueScene,inTrial} from './prologue.js?v=2';
import {classPortrait} from './portraits.js?v=surfaces222';
import {getClass} from './classes.js?v=novice174';

const HINTS={
 wake:s=>`ฝึกกับหุ่นฟางและหนูในทุ่ง ${s.kills}/${s.need}`,
 teacher:()=>'ต้นไทรประดับริบบิ้นอยู่ทางตะวันตกของทุ่ง · แตะวิญญาณครูเพื่อคุย',
 trial:s=>`ใช้สกิลของ${getClass(s.classId).name}ได้ทุกท่า · ลานศิลาอยู่ทางเหนือสุดของทุ่ง`,
 arena:()=>'ตราดอกบัวบนลานศิลาเริ่มเรืองแสง',
 boss:()=>'กดสกิล 1–5 และไม้ตายช่อง 6 · อสูรฟางยืนกลางลานศิลา',
 fading:()=>'กำลังกลับสู่อยุธยา…',done:()=>'กำลังกลับสู่อยุธยา…'
};
export function createPrologueUI({game,worldUI,storyUI,map,account,trial:trialParam=null}){
 const world=game.world,here=map.id===PROLOGUE_MAP,asked=new Set(),sent=new Set();
 let playing=null,leaving=false;
 const state=()=>game.online?world.prologue??null:null;
 const loadingScreen=()=>[...document.querySelectorAll('.journey-loading,#travel-loading')].some(e=>!e.classList.contains('leaving')&&e.checkVisibility?.({checkVisibilityCSS:true}));
 const once=(key,fn)=>{if(sent.has(key))return;sent.add(key);fn();};
 function play(id,after){
  if(playing||asked.has(id))return;asked.add(id);playing=id;const base=PROLOGUE_SCENES[id],s=state();
  const hero={...base.hero,classId:base.hero.trial&&s?.classId?s.classId:'novice',gender:account.character.gender,appearance:account.character.appearance??{},equipment:base.hero.trial&&s?.classId?{version:1,weapon:s.classId+'-weapon-crafted',outfit:s.classId+'-outfit-original'}:account.equipment??null};
  dispatchEvent(new CustomEvent('quest-cinematic-request',{detail:{scene:{...base,hero},onDone(){playing=null;world.prologueAction?.({action:'seen',id});after?.();}}}));
 }
 // the teacher's seven paths, as the NPC conversation's own choice buttons
 function choices(){
  const dialog=document.getElementById('npc-dialog'),close=document.getElementById('close-npc');if(!dialog?.open||!close||state()?.stage!=='teacher')return;
  document.querySelectorAll('.prologue-class').forEach(b=>b.remove());
  for(const classId of TRIAL_CLASSES){
   const c=getClass(classId),b=document.createElement('button');b.type='button';b.className='prologue-class';b.dataset.classId=classId;
   const art=document.createElement('img');art.alt='';art.width=art.height=34;classPortrait(classId,account.character.gender).then(src=>{art.src=src;}).catch(()=>{});
   const label=document.createElement('span');label.textContent='ยืมพลัง'+c.name;b.append(art,label);b.title=c.role;
   b.onclick=()=>{document.querySelectorAll('.prologue-class').forEach(x=>{x.disabled=true;});world.prologueAction?.({action:'class',classId});world.notice('วิญญาณครูกำลังมอบพลังของ'+c.name+'…');};
   close.before(b);
  }
 }
 // chained after story-ui's handler (bag-ui replaces afterTalk outright, so that hook would be lost)
 const opened=worldUI.onConversationOpened;worldUI.onConversationOpened=n=>{opened?.(n);if(!here||n.name!==TEACHER||state()?.stage!=='teacher')return;
  const text=document.getElementById('npc-text');if(text)text.textContent='วิญญาณครู: เจ้าผ่านการฝึกแล้ว เลือกวิถีหนึ่งวิถี ข้าจะให้เจ้ายืมพลังของมันไปเผชิญสิ่งที่รออยู่บนลานศิลา';
  // the scene starts only now, after the player has walked up and the conversation is open
  if(!state().seen.includes('teacher'))play('teacher',choices);else choices();};
 // 0.123 owner: every prologue card has a ▶ button that takes the player there (story-ui.js runs it)
 const GO={wake:{kind:'mob',not:PROLOGUE_BOSS.id},teacher:{kind:'npc',npc:TEACHER},trial:{kind:'spot',x:TERRACE.x,z:TERRACE.z+4},boss:{kind:'mob',monster:PROLOGUE_BOSS.id}};
 function objective(){
  const s=state();if(!s)return {chapter:'บทนำ · ทุ่งนิมิต',title:'กำลังเชื่อมต่อกับนิมิต…',hint:'บทนำเล่นได้เมื่อออนไลน์'};
  return {chapter:'บทนำ · ทุ่งนิมิต',title:OBJECTIVES[s.stage]||'นิมิตจบลงแล้ว',hint:(HINTS[s.stage]??(()=>''))(s),go:GO[s.stage]??null};
 }
 if(here&&storyUI){storyUI.override=objective;storyUI.holdWelcome=true;}
 function step(){
  const s=state();if(!s||leaving||loadingScreen())return;
  if(here){
   // the lent class needs its own skill bar and sprite, so the page is opened again with ?trial=<class>
   const stale=inTrial(s)?trialParam!==s.classId:!!trialParam&&(s.stage==='wake'||s.stage==='teacher');
   if(stale){leaving=true;const u=new URL(location.href);if(inTrial(s))u.searchParams.set('trial',s.classId);else u.searchParams.delete('trial');location.replace(u.href);return;}
   const teacher=map.npcs.find(n=>n.name===TEACHER),label=teacher&&worldUI.npcLabel?.(teacher);label?.classList.toggle('quest-npc',s.stage==='teacher');
   if(playing)return;
   const due=dueScene(s,map.id);
   if(due==='dream')play('dream');
   else if(due==='boss')play('boss',()=>once('boss',()=>world.prologueAction?.({action:'boss'})));
   else if(due==='fading')play('fading',()=>once('finish',()=>world.prologueAction?.({action:'finish'})));
   // a reconnect after a scene was already watched picks up where it stopped
   else if(s.stage==='arena'&&s.seen.includes('boss'))once('boss',()=>world.prologueAction?.({action:'boss'}));
   else if(s.stage==='fading'&&s.seen.includes('fading'))once('finish',()=>world.prologueAction?.({action:'finish'}));
   else if(s.stage==='done')once('home',()=>{leaving=true;Promise.resolve(worldUI.travelHome?.()).then(ok=>{if(!ok){leaving=false;sent.delete('home');}});});
   return;
  }
  if(dueScene(s,map.id)==='awake'&&!playing)play('awake',()=>{if(storyUI)storyUI.holdWelcome=false;});
  else if(storyUI&&!playing&&storyUI.holdWelcome&&s.seen.includes('awake'))storyUI.holdWelcome=false;
 }
 if(!here&&storyUI)storyUI.holdWelcome=true;
 // no prologue state (offline, or an old character) releases the welcome card after a moment
 setTimeout(()=>{if(!here&&storyUI&&!state())storyUI.holdWelcome=false;},6000);
 setInterval(step,400);
 return {step,get playing(){return playing;}};
}

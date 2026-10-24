import {createStoryDialogue} from './story-dialogue-ui.js?v=pets125';
// Story quest tracker + auto-walk ("กดแล้วเดินไปเอง"). Online: the realm server owns progress and rewards; the client
// only sends questTalk and shows world.story from snapshots. Offline guests keep progress in this browser.
import {STORY_TITLE,currentObjective,storyEvent,normalizeStory,nextHop,rewardItems,STARTER_WEAPON} from './story-quests.js?v=refine136';
import {createCoach} from './coach.js?v=refine136';
import {MONSTER_TYPES} from './combat-core.js?v=role116';
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
 const dialogue=createStoryDialogue({game,worldUI,objective:()=>currentObjective(state()),state,
  complete(n,index){if(!sameState(index))return;if(game.online)world.questTalk?.(n.name,index);else offline({type:'talk',npc:n.name,mapId:map.id});}
 });
 const sameState=index=>state().quest===index.quest&&state().step===index.step&&!state().done;
 // A normal NPC click opens the story; opening/closing/asking cannot finish a talk step.
 worldUI.onTalk=n=>{
  const step=currentObjective(state())?.step;
  if(step?.type!=='talk'||step.npc!==n.name||step.mapId!==map.id)return null;
  return dialogue.open(n)?{handled:true}:null;
 };

 // Tracker panel (own stylesheet, so game.html needs no edit).
 if(!document.querySelector('link[data-story-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='story-ui.css?v=99.2';css.dataset.storyUi='';document.head.append(css);}
 const panel=document.createElement('section');panel.id='quest-tracker';panel.setAttribute('aria-label','เควสเนื้อเรื่อง');
 panel.innerHTML='<button id="quest-coach" type="button" aria-pressed="true" title="ไกด์"><b aria-hidden="true">💡</b><span>ไกด์</span></button><small id="quest-chapter"></small><strong id="quest-title"></strong><span id="quest-hint"></span><em id="quest-how"></em><button id="quest-go" type="button"></button>';
 document.body.append(panel);
 // 0.99 arrows that point at the next button to press, and a welcome card for a brand-new character
 const coach=createCoach({game,account,objective:()=>currentObjective(state()),paused:()=>!!document.querySelector('#welcome-card[open],#job-ready[open],#world-atlas-dialog[open]')||[...document.querySelectorAll('.journey-loading,#travel-loading')].some(e=>!e.classList.contains('leaving')&&e.checkVisibility?.({checkVisibilityCSS:true}))});
 const coachButton=()=>{$('quest-coach').setAttribute('aria-pressed',String(!coach.off));$('quest-coach').title=coach.off?'เปิดไกด์':'ปิดไกด์';$('quest-coach').classList.toggle('off',coach.off);};
 $('quest-coach').onclick=e=>{e.stopPropagation();coach.setOff(!coach.off);coachButton();world.notice(coach.off?'ปิดไกด์แล้ว · กด 💡 ในกล่องเควสเพื่อเปิดใหม่':'เปิดไกด์แล้ว');};coachButton();
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
 function goButtonLabel(obj){
  if(game.walking&&walking)return '■ หยุด';
  const s=obj?.step;
  if(!s)return '▶ เดินไป';
  if(s.type==='talk'||s.type==='enter')return '▶ เดินไป';
  if(s.type==='defeat')return '▶ ล่ามอน';
  if(s.type==='level')return '▶ ฟาร์มเวล';
  if(s.type==='do'){
   switch(s.action){
    case 'equip':return '▶ สวมใส่';
    case 'skill':return '▶ อัปสกิล';
    case 'auto':return '▶ เปิด AUTO';
    case 'craft':return '▶ คราฟต์';
    case 'card':return '▶ ใส่การ์ด';
    case 'refine':return '▶ ตีบวก';
    case 'shop':return '▶ ร้านค้า';
    case 'job':return '▶ ไปลานครู';
    case 'guild':return '▶ กิลด์';
    case 'duel':return '▶ ท้าดวล';
    default:return '▶ เดินไป';
   }
  }
  return '▶ เดินไป';
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
  $('quest-go').textContent=goButtonLabel(obj);
  // A gold "!" over the NPC the story wants next.
  const want=(obj?.step.type==='talk'||obj?.step.type==='do')&&obj.step.npc&&obj.step.mapId===map.id?obj.step.npc:null;
  if(markedNpc!==want){worldUI.npcLabel(markedNpc)?.classList.remove('quest-npc');worldUI.npcLabel(want)?.classList.add('quest-npc');markedNpc=want;}
 }

 // Auto-walk to the current objective; crosses maps through portals and resumes after the map loads.
 let walking=false;
 function go(){
  const obj=currentObjective(state());if(!obj){world.notice('จบเนื้อเรื่องบทที่ 1 แล้ว');return;}
  const s=obj.step;
  if(s.type==='do'){
   switch(s.action){
    case 'equip':{
     const bagWin=document.getElementById('bag-window');
     const weapon=STARTER_WEAPON[account?.character?.classId??world.profession?.id]??'wrap-novice';
     if(bagWin?.open){
      const wearBtn=document.querySelector('#bag-detail [data-act="wear"]');
      if(wearBtn){wearBtn.click();world.storyCheck?.();return;}
      const it=document.querySelector(`#bag-grid [data-id^="${weapon}"]`)??document.querySelector('#bag-grid [data-id]');
      if(it){it.click();setTimeout(()=>{document.querySelector('#bag-detail [data-act="wear"]')?.click();world.storyCheck?.();},100);return;}
      world.storyCheck?.();
     }else{
      document.getElementById('menu-bag')?.click();
      setTimeout(()=>{
       const it=document.querySelector(`#bag-grid [data-id^="${weapon}"]`)??document.querySelector('#bag-grid [data-id]');
       if(it){it.click();setTimeout(()=>{document.querySelector('#bag-detail [data-act="wear"]')?.click();world.storyCheck?.();},120);}
      },150);
     }
     return;
    }
    case 'skill':{
     const skillWin=document.getElementById('skill-window');
     if(skillWin?.open){
      const btn=document.querySelector('#skill-window .skill-node>button:not(:disabled)');
      if(btn){btn.click();world.storyCheck?.();return;}
      world.notice(s.how??s.hint);
     }else{
      document.getElementById('menu-skills')?.click()||window.dispatchEvent(new CustomEvent('open-skill-window'));
      setTimeout(()=>{
       const btn=document.querySelector('#skill-window .skill-node>button:not(:disabled)');
       if(btn){btn.click();world.storyCheck?.();}
      },200);
     }
     return;
    }
    case 'auto':{
     world.setAuto?.(!world.auto);
     world.storyCheck?.();
     return;
    }
    case 'craft':{
     const craftWin=document.getElementById('craft-window');
     if(craftWin?.open){
      const btn=document.querySelector('#craft-list button[data-out]:not(:disabled)');
      if(btn){btn.click();return;}
      world.notice(s.how??s.hint);
     }else{
      const craftBtn=document.getElementById('bag-craft');
      if(craftBtn)craftBtn.click();
      else{document.getElementById('menu-bag')?.click();setTimeout(()=>document.getElementById('bag-craft')?.click(),150);}
     }
     return;
    }
    case 'card':{
     const statWin=document.getElementById('status-window');
     if(statWin?.open){
      const slot=document.querySelector('#status-window [data-slotcard="weapon"]');
      if(slot){slot.click();return;}
      world.notice(s.how??s.hint);
     }else{
      document.getElementById('menu-status')?.click();
      setTimeout(()=>{document.querySelector('#status-window [data-slotcard="weapon"]')?.click();},150);
     }
     return;
    }
    case 'job':{
     const targetMap='ayutthaya';
     if(map.id===targetMap){
      walking=true;
      const done=()=>{walking=false;render();};
      game.walkTo({x:40,z:-46},{radius:3,kind:'quest',onArrive:()=>{done();document.getElementById('job-ready')?.showModal?.();},onFail:()=>{done();world.notice('เดินไปลานครูไม่ได้');}});
      render();return;
     }
     s.mapId=targetMap;
     break;
    }
    case 'refine':{
     const slotBtn=document.querySelector('#refine-list button[data-slot]:not(:disabled)');
     if(slotBtn){slotBtn.click();world.storyCheck?.();return;}
     const refineBtn=document.getElementById('npc-refine');
     if(refineBtn){refineBtn.click();return;}
     break;
    }
    case 'shop':{
     const dealBtn=document.querySelector('#shop-list button.deal:not(:disabled)');
     if(dealBtn){dealBtn.click();world.storyCheck?.();return;}
     const shopBtn=document.getElementById('npc-shop');
     if(shopBtn){shopBtn.click();return;}
     break;
    }
    case 'guild':{
     document.getElementById('menu-social')?.click();
     setTimeout(()=>{document.querySelector('#social-window [data-tab="guild"]')?.click();},150);
     return;
    }
    case 'duel':{
     document.getElementById('menu-players')?.click()||document.getElementById('online-button')?.click();
     world.notice(s.how??s.hint);
     return;
    }
   }
  }
  if(s.type==='level'){
   const farmMap=s.level<=10?'rice-fields':'old-orchard';
   if(map.id===farmMap){
    world.setAuto?.(true);
    world.notice('เปิด AUTO ฟาร์มเลเวล');
    const near=()=>world.mobs.filter(m=>m.hp>0).sort((a,b)=>Math.hypot(a.x-world.player.x,a.z-world.player.z)-Math.hypot(b.x-world.player.x,b.z-world.player.z))[0];
    const m=near();
    if(m){
     walking=true;
     const done=()=>{walking=false;render();};
     game.walkTo({x:m.x,z:m.z},{radius:2.4,kind:'quest',onArrive:()=>{done();world.select(m.id);setTimeout(()=>world.setAuto?.(true),150);},onFail:()=>{done();}});
     render();
    }
    return;
   }
   s.mapId=farmMap;
  }
  walking=true;
  const done=()=>{walking=false;render();};
  if(s.mapId!==map.id){
   const hop=nextHop(catalog.maps,map.id,s.mapId),portal=map.portals.find(p=>p.to===hop);
   if(!portal){done();world.notice('ยังหาทางไปไม่เจอ');return;}
   if(map.safe){try{sessionStorage.setItem(RESUME,'1');}catch{}done();worldUI.travelTo(hop);return;}
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
 const api={context:null,update(){if(walking&&!game.walking)walking=false;dialogue.update();
  coach.update();
  if(!game.online&&api.context&&performance.now()-checked>1000){checked=performance.now();for(let i=0;i<30&&offline({type:'check',ctx:api.context()})?.changed;i++);}
  render();}};
 return api;
}

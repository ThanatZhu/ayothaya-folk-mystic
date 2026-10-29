import {dialogueFor} from './story-dialogue.js?v=weapon188';
import {createQuestCinematics} from './quest-cinematic155.js?v=rebirth199';
// Story quest tracker + auto-walk ("กดแล้วเดินไปเอง"). Online: the realm server owns progress and rewards; the client
// only sends questTalk and shows world.story from snapshots. Offline guests keep progress in this browser.
import {currentObjective,storyEvent,retiredStory,normalizeStory,normalizeRebirthStory,nextHop,rewardItems,STARTER_WEAPON,farmMapFor} from './story-quests.js?v=farm211';
import {createCoach} from './coach.js?v=weapon188';
import {MONSTER_TYPES} from './combat-core.js?v=novice174';
import {awardExperience,baseProgress} from './experience.js?v=105.3';
import {storyReady} from './story-navigation173.js';

const RESUME='ayothaya-story-autowalk';
const $=id=>document.getElementById(id);

export function createStoryUI({game,worldUI,map,catalog,account}){
 const baseLevel=()=>baseProgress(game.world).level;
 const world=game.world,key='ayothaya-story:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const read=retiredStory;   // 0.123 chapter 1 retired (story-quests.js)
 let local=read(),localRebirth=null;try{localRebirth=JSON.parse(localStorage.getItem(key+':rebirth'));}catch{}
 try{world.storyCampaign=localStorage.getItem(key+':campaign')??undefined;}catch{}
 const isRebirth=()=>world.rebirth>0&&world.storyCampaign!=='main';
 const ready=()=>storyReady(game,account,map.id);
 const state=()=>isRebirth()?normalizeRebirthStory(game.online?world.rebirthStory:localRebirth,world.rebirth):game.online?normalizeStory(world.story):local;
 const save=()=>{try{localStorage.setItem(isRebirth()?key+':rebirth':key,JSON.stringify(isRebirth()?localRebirth:local));}catch{}};

 // Offline: apply the shared rules here and pay rewards into the local world (online the server does both).
 function offline(event){
  if(game.online||game.networkExpected||account?.cloud)return null;
  const r=storyEvent(state(),event);if(!r.changed)return r;
  if(isRebirth()){localRebirth=r.state;world.rebirthStory=r.state;}else local=r.state;save();
  if(r.reward){world.emit('experience',awardExperience(world,r.reward.baseXp,r.reward.jobXp));world.emit('reward',{coins:r.reward.coins??0,items:rewardItems(r.reward,account?.character?.classId??world.profession.id,account?.character?.gender)});}
  if(r.completed)world.notice('เควสสำเร็จ · '+r.completed.title);
  render();return r;
 }
 game.onEvent(e=>{
  if(e.type==='walkIntent'&&e.kind!=='quest')cancelResume();
  if(e.type==='defeat'&&!game.online){const mob=world.mobs.find(m=>m.id===e.id);const id=mob&&MONSTER_TYPES[mob.type]?.id;if(id)offline({type:'defeat',monster:id,mapId:map.id});}
  if(e.type==='storyDo'&&!game.online)offline({type:'do',action:e.action}); // 0.98 offline tutorial actions (craft, pet, shop)
  if(e.type==='story'){if(e.story){if(e.campaign==='rebirth')world.rebirthStory=e.story;else world.story=e.story;}if(e.completed)world.notice('เควสสำเร็จ · '+e.completed);render();}
 });
 const cinematics=createQuestCinematics({game,account,catalog,map,state});
 worldUI.onConversationOpened=n=>{if(ready())cinematics.onTalk(n);};
 const sameState=index=>state().quest===index.quest&&state().step===index.step&&(state().campaign??'main')===(index.campaign??'main')&&state().cycle===index.cycle&&!state().done;
 // A normal NPC click opens the story; opening/closing/asking cannot finish a talk step.
 worldUI.onTalk=n=>{
  if(!ready())return null;
  const obj=currentObjective(state()),step=obj?.step;
  if(step?.type!=='talk'||step.npc!==n.name||step.mapId!==map.id)return null;
  const index={quest:state().quest,step:state().step,...(state().campaign?{campaign:state().campaign,cycle:state().cycle}:{})},data=dialogueFor(obj);
  return {...data,valid:()=>sameState(index),play:()=>cinematics.story(index.quest,index.step),complete(){if(!sameState(index))return;if(game.online)world.questTalk?.(n.name,index);else offline({type:'talk',npc:n.name,mapId:map.id,campaign:state().campaign});}};
 };

 // Tracker panel (own stylesheet, so game.html needs no edit).
 if(!document.querySelector('link[data-story-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='story-ui.css?v=rebirth196';css.dataset.storyUi='';document.head.append(css);}
 const panel=document.createElement('section');panel.id='quest-tracker';panel.setAttribute('aria-label','เควสเนื้อเรื่อง');
 panel.innerHTML='<select id="quest-campaign" aria-label="เลือกเนื้อเรื่อง" hidden><option value="main">เนื้อเรื่องเดิม</option><option value="rebirth">ภาคจุติ · ห้าภพ</option></select><button id="quest-coach" type="button" aria-pressed="true" title="ไกด์"><b aria-hidden="true">💡</b><span>ไกด์</span></button><small id="quest-chapter"></small><strong id="quest-title"></strong><span id="quest-hint"></span><span id="quest-distance" hidden></span><em id="quest-how"></em><button id="quest-go" type="button"></button>';
 document.body.append(panel);
 $('quest-campaign').onchange=e=>{world.storyCampaign=e.target.value;try{localStorage.setItem(key+':campaign',world.storyCampaign);}catch{}cinematics.close();game.cancelWalk?.();walking=false;shown='';render();dispatchEvent(new CustomEvent('rebirth-campaign-change'));};
 // 0.99 arrows that point at the next button to press, and a welcome card for a brand-new character
 const coach=createCoach({game,account,objective:()=>ready()?currentObjective(state()):null,paused:()=>!!document.querySelector('#welcome-card[open],#job-ready[open],#world-atlas-dialog[open]')||[...document.querySelectorAll('.journey-loading,#travel-loading')].some(e=>!e.classList.contains('leaving')&&e.checkVisibility?.({checkVisibilityCSS:true}))});
 const coachButton=()=>{$('quest-coach').setAttribute('aria-pressed',String(!coach.off));$('quest-coach').title=coach.off?'เปิดไกด์':'ปิดไกด์';$('quest-coach').classList.toggle('off',coach.off);};
 $('quest-coach').onclick=e=>{e.stopPropagation();coach.setOff(!coach.off);coachButton();world.notice(coach.off?'ปิดไกด์แล้ว · กด 💡 ในกล่องเควสเพื่อเปิดใหม่':'เปิดไกด์แล้ว');};coachButton();
 const welcomeKey='ayothaya-welcome:'+key;
 function welcome(){
  const s=state();if(s.campaign==='rebirth'||s.quest!==0||s.step!==0)return;try{if(localStorage.getItem(welcomeKey))return;localStorage.setItem(welcomeKey,'1');}catch{}
  const card=document.createElement('dialog');card.id='welcome-card';card.setAttribute('aria-labelledby','welcome-title');
  card.innerHTML='<small>ยินดีต้อนรับสู่อโยธยา</small><h2 id="welcome-title">เริ่มการเดินทางของคุณ</h2><ul>'+
   '<li><b>เดิน</b> กด WASD / ปุ่มลูกศร หรือแตะพื้นที่อยากไป · มือถือใช้จอยด้านซ้าย</li>'+
   '<li><b>ตีมอน</b> แตะมอนเพื่อเลือกเป้า แล้วกดปุ่มดาบ (Space) · ปุ่มเลข 1–0 คือสกิล</li>'+
   '<li><b>เควส</b> เปิดแท็บเควสด้านซ้าย กด ▶ เดินไป แล้วตัวละครจะเดินไปเอง</li>'+
   '<li><b>ลูกศรสีทอง</b> จะชี้ปุ่มที่ต้องกดทีละขั้น ปิดได้ที่ 💡 ในกล่องเควส</li></ul><button type="button" id="welcome-go">เริ่มผจญภัย</button>';
  ($('game-shell')??document.body).append(card);card.querySelector('#welcome-go').onclick=()=>card.close();card.addEventListener('close',()=>card.remove());card.showModal();
 }
 let welcomePending=true;const welcomeAt=performance.now()+2500;
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
    case 'craftWeapon':return '▶ คราฟต์อาวุธ';
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
 const farmHere=()=>farmMapFor(catalog.maps,baseLevel(),{rebirth:world.rebirth,campaign:isRebirth()?'rebirth':'main'});
 // the prologue (prologue-ui.js) can take over the tracker and hold the welcome card back
 const hooks={override:null,holdWelcome:false};
 function render(){
  if(hooks.override){const o=hooks.override(),sig='prologue'+JSON.stringify([o,game.walking&&walking]);if(sig===shown)return;shown=sig;panel.setAttribute('aria-busy','false');$('quest-chapter').textContent=o.chapter;$('quest-title').textContent=o.title;$('quest-hint').textContent=o.hint;$('quest-how').hidden=true;$('quest-distance').hidden=true;$('quest-go').hidden=!o.go;$('quest-go').disabled=false;$('quest-go').textContent=game.walking&&walking?'■ หยุด':o.go?.kind==='mob'?'▶ ไปตี':'▶ เดินไป';return;}
  const story=state(),synced=ready(),obj=synced?currentObjective(story):null;
  const kind=panel.querySelector(':scope>.quest-kind'),kindText=synced&&!obj?'แนะนำฟาร์ม':'เนื้อเรื่อง';if(kind&&kind.textContent!==kindText)kind.textContent=kindText;   // badge from activity-dock.js
  // A level-up below the goal changes EXP, not the quest step. Include the displayed level in the cache.
  const sig=JSON.stringify([synced,story,game.walking&&walking,!obj||obj.step.type==='level'?baseLevel():null]);
  if(sig===shown)return;shown=sig;
  $('quest-go').disabled=!synced;
  panel.setAttribute('aria-busy',String(!synced));
  if(!synced){
   $('quest-chapter').textContent='การเดินทางของคุณ';$('quest-title').textContent='กำลังโหลดเควสจากเซิร์ฟเวอร์…';
   $('quest-hint').textContent='รอข้อมูลเควสล่าสุดก่อนเดินทางต่อ';$('quest-how').hidden=true;$('quest-distance').hidden=true;
   $('quest-go').hidden=false;$('quest-go').textContent='กำลังเชื่อมต่อ…';
   worldUI.npcLabel(markedNpc)?.classList.remove('quest-npc');markedNpc=null;return;
  }
  // 0.123 no story left (chapter 1 is retired, or the rebirth arc is over): suggest where to farm at this level
  const farm=obj?null:farmHere();
  if(farm){
   const here=farm.id===map.id;
   $('quest-chapter').textContent='แนะนำแมพฟาร์ม · Lv.'+baseLevel();$('quest-title').textContent=farm.name+' · Lv.'+farm.levels[0]+'–'+farm.levels[1];
   $('quest-hint').textContent=here?'คุณอยู่ในแมพที่เหมาะกับเลเวลแล้ว':'แมพที่เหมาะกับเลเวลของคุณตอนนี้';
   $('quest-how').textContent=here?'กดเพื่อเดินไปหามอนแล้วเปิด AUTO':'กดเพื่อเดินไปเอง ถึงแล้วเปิด AUTO ให้';$('quest-how').hidden=false;
   $('quest-go').hidden=false;$('quest-go').textContent=game.walking&&walking?'■ หยุด':here?'▶ ฟาร์มเลย':'▶ เดินไป';
   worldUI.npcLabel(markedNpc)?.classList.remove('quest-npc');markedNpc=null;return;
  }
  $('quest-chapter').textContent=obj?.quest?.chapter??'ภาคจุติ · ห้าภพ';
  const stepLabel=obj&&obj.steps>1?` (ขั้น ${obj.stepNumber}/${obj.steps})`:'';
  $('quest-title').textContent=obj?obj.quest.title+stepLabel:isRebirth()?'จบภาคจุติ · ห้าภพแห่งไฟต้นแสง':'จบเนื้อเรื่องที่มีในตอนนี้แล้ว';
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
  if(!ready())return;
  const obj=currentObjective(state()),s=obj?{...obj.step}:{type:'level',farm:farmHere()?.id};if(!obj&&!s.farm)return;
  if(s.type==='do'){
   switch(s.action){
    case 'equip':{
     const bagWin=document.getElementById('bag-window');
     const weapon=STARTER_WEAPON[account?.character?.classId??world.profession?.id]??'starter-wraps';
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
    case 'craftWeapon':{dispatchEvent(new CustomEvent('craft-weapon-tutorial'));world.notice(s.how??s.hint);return;}
    case 'craft':{
     const craftWin=document.getElementById('craft-window');
     if(craftWin?.open){
      const btn=document.querySelector('#craft-list button[data-recipe]:not(:disabled)');
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
   const farmMap=s.farm??farmMapFor(catalog.maps,s.level,{rebirth:world.rebirth}).id;
   if(map.id===farmMap){
    world.setAuto?.(true);
    world.notice('เปิด AUTO ฟาร์มเลเวล');
    const near=()=>world.mobs.filter(m=>m.hp>0).sort((a,b)=>Math.hypot(a.x-world.player.x,a.z-world.player.z)-Math.hypot(b.x-world.player.x,b.z-world.player.z))[0];
    const m=near();
    if(m){
     walking=true;
     const done=()=>{walking=false;render();};
     game.walkTo({x:m.x,z:m.z},{radius:2.4,kind:'quest',mobId:m.id,onArrive:()=>{done();world.select(m.id);setTimeout(()=>world.setAuto?.(true),150);},onFail:()=>{done();}});
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
   const travel=async()=>{try{sessionStorage.setItem(resumeKey,'1');}catch{}done();try{if(await worldUI.travelTo(hop)===false)clearResume();}catch{clearResume();}};
   if(map.safe){travel();return;}
   game.walkTo({x:portal.x,z:portal.z},{radius:1.2,kind:'quest',onArrive:travel,onFail:()=>{done();world.notice('เดินไปจุดเดินทางไม่ได้');}});
  }else if(s.type==='talk'||s.type==='do'){
   if(!worldUI.talkTo(s.npc))world.notice('ไม่พบ '+s.npc+' ในแผนที่นี้');
   walking=game.walking;
  }else if(s.type==='defeat'){
   const index=MONSTER_TYPES.findIndex(t=>t.id===s.monster);
   const near=()=>world.mobs.filter(m=>m.type===index&&m.hp>0).sort((a,b)=>Math.hypot(a.x-world.player.x,a.z-world.player.z)-Math.hypot(b.x-world.player.x,b.z-world.player.z))[0];
   const first=near();if(!first){done();world.notice('รอมอนสเตอร์เกิดใหม่สักครู่');return;}
   game.walkTo(()=>{const m=world.mobs.find(m=>m.id===first.id&&m.hp>0);return m&&{x:m.x,z:m.z};},{radius:2.4,kind:'quest',mobId:first.id,onArrive:()=>{done();const m=near();if(m)world.select(m.id);setTimeout(()=>world.setAuto(true,index),150);},onFail:()=>{done();world.notice('เดินไปหามอนสเตอร์ไม่ได้');}});
  }else done();
  render();
 }
 // 0.123 the prologue's cards walk too: to a monster (then AUTO), the teacher, or the terrace
 function goPrologue(g){
  const done=()=>{walking=false;render();};walking=true;
  if(g.kind==='npc'){if(!worldUI.talkTo(g.npc))world.notice('ไม่พบ '+g.npc+' ในแผนที่นี้');walking=game.walking;render();return;}
  if(g.kind==='spot'){game.walkTo({x:g.x,z:g.z},{radius:1.5,kind:'quest',onArrive:done,onFail:done});render();return;}
  const type=MONSTER_TYPES.findIndex(t=>t.id===(g.monster??g.not)),fits=m=>m.hp>0&&(g.monster?m.type===type:m.type!==type);
  const first=world.mobs.filter(fits).sort((a,b)=>Math.hypot(a.x-world.player.x,a.z-world.player.z)-Math.hypot(b.x-world.player.x,b.z-world.player.z))[0];
  if(!first){done();world.notice('รอมอนสเตอร์เกิดใหม่สักครู่');return;}
  game.walkTo(()=>{const m=world.mobs.find(m=>m.id===first.id&&m.hp>0);return m&&{x:m.x,z:m.z};},{radius:2.4,kind:'quest',mobId:first.id,onArrive:()=>{done();world.select(first.id);setTimeout(()=>world.setAuto?.(true),150);},onFail:done});
  render();
 }
 $('quest-go').onclick=()=>{if(walking&&game.walking){game.cancelWalk();walking=false;render();}else if(hooks.override){const g=hooks.override().go;if(g)goPrologue(g);}else go();};
 panel.addEventListener('click',e=>{if(e.target.closest('#quest-coach,#quest-campaign'))return;if(e.target===panel||e.target.closest('#quest-title,#quest-hint'))$('quest-go').click();});

 offline({type:'enter',mapId:map.id});
 render();
 const resumeKey=RESUME+':'+(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const clearResume=()=>{try{sessionStorage.removeItem(resumeKey);sessionStorage.removeItem(RESUME);}catch{}};
 let resume=false;try{resume=sessionStorage.getItem(resumeKey)==='1'||sessionStorage.getItem(RESUME)==='1';}catch{}
 // Consume only after an authoritative snapshot. A fixed delay races slow joins,
 // frozen rendering and reconnects, sending players toward the first quest.
 const cancelResume=()=>{resume=false;clearResume();};
 addEventListener('keydown',e=>{if(!e.target?.closest?.('input,textarea,select,[contenteditable=true]')&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))cancelResume();},true);
 document.getElementById('joystick')?.addEventListener('pointerdown',cancelResume,{capture:true});
 // Offline only: do/level steps that are already true finish by themselves (the server does this online).
 let checked=0,distanceAt=0;
 function distanceHint(){
  if(!ready()){$('quest-distance').hidden=true;return;}
  if(performance.now()-distanceAt<250)return;distanceAt=performance.now();const obj=currentObjective(state()),step=obj?.step,node=$('quest-distance');let target=null,label='ระยะถึงเป้าหมาย';
  if(step?.mapId&&step.mapId!==map.id){const hop=nextHop(catalog.maps,map.id,step.mapId);target=map.portals.find(p=>p.to===hop);label='ระยะถึงทางออก';}
  else if(step?.npc)target=map.npcs.find(n=>n.name===step.npc);
  else if(step?.type==='defeat'){const type=MONSTER_TYPES.findIndex(t=>t.id===step.monster);target=world.mobs.filter(m=>m.type===type&&m.hp>0).sort((a,b)=>Math.hypot(a.x-world.player.x,a.z-world.player.z)-Math.hypot(b.x-world.player.x,b.z-world.player.z))[0];}
  node.hidden=!target;if(target){const text=label+' '+Math.ceil(Math.hypot(target.x-world.player.x,target.z-world.player.z))+' ม.';if(node.textContent!==text)node.textContent=text;}
 }

 const api={context:null,cinematics,get override(){return hooks.override;},set override(v){hooks.override=v;},get holdWelcome(){return hooks.holdWelcome;},set holdWelcome(v){hooks.holdWelcome=v;},update(){if(walking&&!game.walking)walking=false;cinematics.observe();if(hooks.override){render();return;}
  if(ready()&&!document.hidden){if(resume){resume=false;clearResume();go();}if(welcomePending&&performance.now()>=welcomeAt&&!hooks.holdWelcome&&!cinematics.isOpen){welcomePending=false;welcome();}}
  coach.update();distanceHint();
  if(ready()&&!game.online&&api.context&&performance.now()-checked>1000){checked=performance.now();for(let i=0;i<30&&offline({type:'check',ctx:{...api.context(),mapId:map.id}})?.changed;i++);}
  render();}};
 return api;
}

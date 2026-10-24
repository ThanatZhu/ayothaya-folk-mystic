import {STORY,currentObjective,normalizeStory} from './story-quests.js?v=pets125';
import {STORY_RECAP,storyArt} from './story-dialogue.js?v=pets125';
// 0.60 "ภารกิจ" window: daily bounty board (claim in a town) and the card album. Online the realm server owns both;
// offline guests keep them in localStorage and pay out through the same 'reward' / experience events.
import {itemDef} from './items.js?v=107';
import {MONSTER_TYPES} from './combat-core.js?v=role116';
import {awardExperience} from './experience.js?v=105.3';
import {dailyBounties,normalizeBounty,bountyDefeat,bountyClaim,normalizeAlbum,albumAdd,ALBUM_CARDS,ALBUM_MILESTONES,WEEKLY,normalizeWeekly} from './bounty.js?v=107';
import {iconStyle} from './bag-ui.js?v=107';
import {openHudPanel} from './hud-panels.js?v=34';
const $=id=>document.getElementById(id);
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
const TIER=['ง่าย','กลาง','ยาก','หัวหน้า'];

export function createQuestsUI({game,account,map,bagUI}){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./quests-journal.css?v=139',import.meta.url).href;document.head.append(css);
 const desktop=matchMedia('(min-width:901px) and (pointer:fine)');
 let selectedQuest=null,lastQuest=-1;
 const world=game.world,slot=(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const load=k=>{try{return JSON.parse(localStorage.getItem(k+slot));}catch{return null;}},keep=(k,v)=>{try{localStorage.setItem(k+slot,JSON.stringify(v));}catch{}};
 let localBounty=load('ayothaya-bounty:'),localAlbum=normalizeAlbum(load('ayothaya-album:')),tab='story',shown='';
 const bounty=()=>normalizeBounty(game.online?world.bounty:localBounty,Date.now()),album=()=>normalizeAlbum(game.online?world.album:localAlbum);
 game.onEvent(e=>{
  if(game.online){if(e.type==='album')world.notice(`สมุดการ์ดครบ ${e.count} ใบ · ได้รับรางวัล!`);return;}
  if(e.type==='defeat'){const mob=world.mobs.find(m=>m.id===e.id),id=mob&&MONSTER_TYPES[mob.type]?.id;if(id){const r=bountyDefeat(localBounty,Date.now(),id,mob.leader);if(r.changed){localBounty=r.state;keep('ayothaya-bounty:',localBounty);}}}
  if(e.type==='drop'){const cards=e.items.map(i=>i.id).filter(id=>itemDef(id)?.kind==='card');if(cards.length){const r=albumAdd(localAlbum,cards);if(r.added){localAlbum=r.album;keep('ayothaya-album:',localAlbum);
   for(const m of r.milestones){world.notice(`สมุดการ์ดครบ ${m.count} ใบ · ได้รับรางวัล!`);world.emit('reward',m.reward);}}}}
 });
 function claim(i){
  if(!map.safe)return world.notice('รับรางวัลค่าหัวได้ในเมือง');
  if(game.online)return world.market?.('bountyClaim',{index:i});
  try{const r=bountyClaim(localBounty,Date.now(),i);localBounty=r.state;keep('ayothaya-bounty:',localBounty);world.emit('experience',awardExperience(world,r.reward.baseXp,r.reward.jobXp));world.emit('reward',{coins:r.reward.coins,items:[]});world.notice('รับรางวัลค่าหัวแล้ว');}
  catch(e){world.notice(e.message==='bounty-unfinished'?'ยังล่าไม่ครบ':'รับรางวัลไปแล้ว');}
  render(true);
 }
 const menu=document.createElement('button');menu.id='menu-quests';menu.type='button';menu.title='ภารกิจ';menu.setAttribute('aria-label','ภารกิจประจำวัน และสมุดการ์ด');
 menu.innerHTML='<i>'+icon('card-straw','item-icon menu-item-icon')+'</i><span>ภารกิจ</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menu,$('menu-players')??null);
 const dialog=document.createElement('dialog');dialog.id='quests-window';dialog.setAttribute('aria-labelledby','quests-title');
 dialog.innerHTML='<header><h2 id="quests-title">ภารกิจ</h2><button class="mp-icon" id="quests-close" aria-label="ปิด">×</button></header><div class="social-tabs" role="tablist"><button role="tab" data-qt="story">เนื้อเรื่อง</button><button role="tab" data-qt="bounty">กระดานค่าหัววันนี้</button><button role="tab" data-qt="weekly">รายสัปดาห์</button><button role="tab" data-qt="album">สมุดการ์ด</button></div><div id="quests-body"></div>';
 ($('game-shell')??document.body).append(dialog);
 const open=t=>{tab=t??tab;game.clearInput();openHudPanel(dialog);render(true);};
 menu.onclick=()=>dialog.open?dialog.close():open();
 dialog.querySelector('#quests-close').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-qt]').forEach(b=>b.onclick=()=>{tab=b.dataset.qt;render(true);});
 bagUI.talkHooks.push(n=>{$('npc-bounty')?.remove();if(n.name!=='ขุนอินทร์')return;const b=document.createElement('button');b.id='npc-bounty';b.type='button';b.textContent='📜 กระดานค่าหัวประจำวัน';b.onclick=()=>{$('close-npc').click();open('bounty');};$('close-npc').before(b);});
 const storyState=()=>{if(game.online)return normalizeStory(world.story);try{return normalizeStory(JSON.parse(localStorage.getItem('ayothaya-story:'+slot)));}catch{return normalizeStory(null);}};
 // Browsing a recap never sends a quest action or changes authoritative progress.
 function renderStory(body,state){
  const obj=currentObjective(state),previousScroll=lastQuest===state.quest?(body.querySelector('.quest-journal-list')?.scrollTop??0):0;
  const focused=body.contains(document.activeElement)?document.activeElement?.dataset.questIndex:null;
  if(lastQuest!==state.quest){selectedQuest=state.quest;lastQuest=state.quest;}
  const index=selectedQuest??state.quest,active=index===state.quest,quest=STORY[index];
  body.replaceChildren();
  const layout=document.createElement('div');layout.className='quest-journal-layout';
  const nav=document.createElement('aside');nav.className='quest-journal-nav';
  const summary=document.createElement('button');summary.type='button';summary.className='quest-journal-toggle';summary.textContent='รายการภารกิจ';summary.setAttribute('aria-controls','quest-journal-list');summary.setAttribute('aria-expanded',String(desktop.matches));nav.append(summary);
  const list=document.createElement('nav');list.id='quest-journal-list';list.className='quest-journal-list';list.setAttribute('aria-label','รายการภารกิจ');list.hidden=!desktop.matches;
  summary.onclick=()=>{list.hidden=!list.hidden;summary.setAttribute('aria-expanded',String(!list.hidden));};
  const addQuest=(i,title,label)=>{
   const b=document.createElement('button');b.type='button';b.dataset.questIndex=String(i);b.setAttribute('aria-pressed',String(i===index));
   const status=document.createElement('small');status.textContent=label;
   const name=document.createElement('span');name.textContent=title;b.append(status,name);
   b.onclick=()=>{selectedQuest=i;render(true);if(!desktop.matches)body.querySelector('.quest-journal-detail').focus({preventScroll:true});};list.append(b);
  };
  addQuest(state.quest,obj?.quest.title??'จบเนื้อเรื่องที่มีในตอนนี้แล้ว',obj?'ภารกิจปัจจุบัน':'จบเนื้อเรื่อง');
  for(let i=state.quest-1;i>=0;i--)addQuest(i,STORY[i].title,'สำเร็จแล้ว');
  nav.append(list);layout.append(nav);
  const section=document.createElement('section');section.className='quest-journal-detail story-recap';section.tabIndex=-1;section.setAttribute('aria-labelledby','quest-detail-title');
  const status=document.createElement('small');status.className='quest-journal-state';status.textContent=active?(obj?'ภารกิจปัจจุบัน':'จบเนื้อเรื่อง'):'สำเร็จแล้ว';section.append(status);
  const heading=document.createElement('h3');heading.id='quest-detail-title';heading.textContent=quest?.title??'จบเนื้อเรื่องที่มีในตอนนี้แล้ว';section.append(heading);
  if(quest){const art=storyArt(quest.id,active&&obj?obj.stepNumber:1),image=document.createElement('img');image.src=art.src;image.alt=art.alt;image.className='story-recap-art';image.width=640;image.height=360;image.decoding='async';image.onerror=()=>image.remove();section.append(image);}
  const recap=document.createElement('p');recap.textContent=quest?STORY_RECAP[quest.id]:'รอเนื้อเรื่องบทต่อไปเร็ว ๆ นี้';section.append(recap);
  if(active&&obj){
   const goal=document.createElement('div');goal.className='quest-journal-goal';
   const label=document.createElement('small');label.textContent=`ขั้น ${obj.stepNumber}/${obj.steps}`;
   const hint=document.createElement('p');hint.textContent=obj.step.hint;goal.append(label,hint);
   if(obj.step.count){const progress=document.createElement('small');progress.textContent=`${obj.count}/${obj.step.count}`;goal.append(progress);}
   section.insertBefore(goal,section.querySelector('.story-recap-art')??recap);
  }
  layout.append(section);body.append(layout);list.scrollTop=previousScroll;
  if(focused!=null)list.querySelector(`[data-quest-index="${focused}"]`)?.focus({preventScroll:true});
 }
 desktop.addEventListener('change',()=>{const list=dialog.querySelector('.quest-journal-list');if(list){list.hidden=!desktop.matches;dialog.querySelector('.quest-journal-toggle').setAttribute('aria-expanded',String(desktop.matches));}});
 function render(force=false){
  if(!dialog.open)return;const s=bounty(),al=album(),wk=normalizeWeekly(world.weekly,Date.now()),sig=JSON.stringify([tab,s,al,wk,storyState()]);if(!force&&sig===shown)return;shown=sig;
  dialog.querySelectorAll('[data-qt]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.qt===tab)));
  const body=$('quests-body');dialog.dataset.questTab=tab;
  if(tab==='story'){
   renderStory(body,storyState());
  }else if(tab==='bounty'){
   body.innerHTML=`<p class="social-note">ค่าหัวเปลี่ยนทุกวันตอนเที่ยงคืน · ล่าได้ทุกแผนที่ · รับรางวัลในเมือง${map.safe?'':' (ตอนนี้อยู่นอกเมือง)'}</p><ul class="social-list">`+dailyBounties(Date.now()).map((b,i)=>{
    const n=Math.min(s.progress[i],b.count),done=n>=b.count;
    return `<li class="${s.claimed[i]?'':done?'on':''}"><div><strong>[${TIER[b.tier]}] ล้ม${b.name} ×${b.count}</strong><small>${n}/${b.count} · รางวัล ${b.reward.baseXp} EXP · ${b.reward.coins} เบี้ย</small></div>${s.claimed[i]?'<span class="claimed">รับแล้ว ✔</span>':`<button type="button" data-claim="${i}" ${done&&map.safe?'':'disabled'}>รับรางวัล</button>`}</li>`;}).join('')+'</ul>';
   body.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(+b.dataset.claim));
  }else if(tab==='weekly'){
   // 0.102 weekly quests (online): reset every Monday, claimed in a town
   const loot=r=>[r.coins.toLocaleString('th-TH')+' เบี้ย',...r.items.map(i=>itemDef(i.id).name+' ×'+i.count)].join(' · ');
   body.innerHTML=game.online?`<p class="social-note">ภารกิจใหม่ทุกวันจันทร์ · นับจากทุกแผนที่ · รับรางวัลในเมือง${map.safe?'':' (ตอนนี้อยู่นอกเมือง)'}</p><ul class="social-list">`+WEEKLY.map((q,i)=>{const n=Math.min(wk.progress[i],q.count),done=n>=q.count;
    return `<li class="${wk.claimed[i]?'':done?'on':''}"><div><strong>${q.name}</strong><small>${n}/${q.count} · รางวัล ${loot(q.reward)}</small></div>${wk.claimed[i]?'<span class="claimed">รับแล้ว ✔</span>':`<button type="button" data-wclaim="${i}" ${done&&map.safe?'':'disabled'}>รับรางวัล</button>`}</li>`;}).join('')+'</ul>':'<p class="social-note">ภารกิจรายสัปดาห์ใช้ได้เมื่อเล่นออนไลน์</p>';
   body.querySelectorAll('[data-wclaim]').forEach(b=>b.onclick=()=>{if(!map.safe)return world.notice('รับรางวัลได้ในเมือง');world.market?.('weeklyClaim',{index:+b.dataset.wclaim});});
  }else{
   const next=ALBUM_MILESTONES.find(m=>al.length<m.count);
   body.innerHTML=`<p class="social-note">สะสมการ์ดแล้ว ${al.length}/${ALBUM_CARDS.length} ใบ${next?` · ครบ ${next.count} ใบ รับ ${next.reward.coins} เบี้ย + ${next.reward.items.map(i=>itemDef(i.id).name).join(', ')}`:' · ครบทุกรางวัลแล้ว'}</p><div class="album-grid">`+
    ALBUM_CARDS.map(id=>`<span class="${al.includes(id)?'got':''}" title="${al.includes(id)?itemDef(id).name:'ยังไม่พบ'}">${icon(id)}</span>`).join('')+'</div>';
  }
 }
 return {update(){render();}};
}

import {storyScene} from './quest-cinematic-data155.js?v=rebirth196';
import {normalizeAlbumState,depositAlbumCard,ALBUM_ERRORS} from './card-album.js?v=surfaces222';
import {currentObjective,normalizeStory,storyForWorld,storyQuests,normalizeRebirthStory} from './story-quests.js?v=rebirth196';
import {STORY_RECAP,storyArt} from './story-dialogue.js?v=chuk175';
// 0.60 "ภารกิจ" window: daily bounty board (claim in a town) and the card album. Online the realm server owns both;
// offline guests keep them in localStorage and pay out through the same 'reward' / experience events.
import {itemDef} from './items.js?v=107';
import {MONSTER_TYPES} from './combat-core.js?v=surfaces222';
import {awardExperience} from './experience.js?v=105.3';
import {dailyBounties,normalizeBounty,bountyDefeat,bountyClaim,normalizeAlbum,ALBUM_CARDS,ALBUM_MILESTONES,WEEKLY,normalizeWeekly} from './bounty.js?v=surfaces222';
import {iconStyle} from './bag-ui.js?v=surfaces222';
import {openHudPanel} from './hud-panels.js?v=34';
import {storyReady} from './story-navigation173.js';
const $=id=>document.getElementById(id);
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
// Crop the atlas cell's transparent side gutters without stretching the painted card.
function albumArt(id){
 const def=itemDef(id);
 if(def.monsterCard)return `<img class="album-image" src="assets/cards147/${id.slice(5)}.webp" alt="${def.name}" width="384" height="576" loading="lazy" decoding="async">`;
 const x=(def.icon%6)*256+32,y=Math.floor(def.icon/6)*256;
 return `<svg class="album-image${def.tint==='gold'?' album-awakened':''}" viewBox="${x} ${y} 192 256" aria-label="${def.name}" role="img"><image href="assets/cards45/cards.png" width="1536" height="1024"/></svg>`;
}
const TIER=['ง่าย','กลาง','ยาก','หัวหน้า'];

export function createQuestsUI({game,account,map,bagUI}){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./quests-journal.css?v=story163',import.meta.url).href;document.head.append(css);
 const desktop=matchMedia('(min-width:901px) and (pointer:fine)');
 let selectedQuest=null,lastQuest=-1;addEventListener('rebirth-campaign-change',()=>{selectedQuest=null;lastQuest=-1;shown='';render(true);});
 const world=game.world,slot=(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const load=k=>{try{return JSON.parse(localStorage.getItem(k+slot));}catch{return null;}},keep=(k,v)=>{try{localStorage.setItem(k+slot,JSON.stringify(v));}catch{}};
 let localBounty=load('ayothaya-bounty:'),localAlbum=normalizeAlbumState(load('ayothaya-album-deposits:')??{album:load('ayothaya-album:')}),tab='story',shown='';
 const bounty=()=>normalizeBounty(game.online?world.bounty:localBounty,Date.now()),album=()=>normalizeAlbum(game.online?world.album:localAlbum.album);
 game.onEvent(e=>{
  if(game.online){if(e.type==='album')world.notice(`สมุดการ์ดครบ ${e.count} ใบ · ได้รับรางวัล!`);if(e.type==='notice'&&tab==='album')render(true);return;}
  if(e.type==='defeat'){const mob=world.mobs.find(m=>m.id===e.id),id=mob&&MONSTER_TYPES[mob.type]?.id;if(id){const r=bountyDefeat(localBounty,Date.now(),id,mob.leader);if(r.changed){localBounty=r.state;keep('ayothaya-bounty:',localBounty);}}}

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
 const storyState=()=>{if(!storyReady(game,account,map.id))return null;if(game.online)return storyForWorld(world);try{const rb=world.rebirth>0&&world.storyCampaign!=='main',raw=JSON.parse(localStorage.getItem('ayothaya-story:'+slot+(rb?':rebirth':'')));return rb?normalizeRebirthStory(raw,world.rebirth):normalizeStory(raw);}catch{return normalizeStory(null);}};
 // Browsing a recap never sends a quest action or changes authoritative progress.
 function renderStory(body,state){
  if(!state){body.innerHTML='<p class="social-note" role="status">กำลังโหลดเควสจากเซิร์ฟเวอร์…</p>';return;}
  const STORY=storyQuests(state);
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
  if(quest){const clips=document.createElement('div');clips.className='quest-cinematic-links';const lastStep=active&&obj?state.step:quest.steps.length-1;
   for(const s of [lastStep]){const watch=document.createElement('button');watch.type='button';watch.className='quest-watch';watch.textContent='ดูเรื่องราวเควสนี้';watch.dataset.cinematicStep=s;watch.onclick=()=>dispatchEvent(new CustomEvent('quest-cinematic-request',{detail:{scene:storyScene(index,s,state.campaign,state.cycle)}}));clips.append(watch);}section.append(clips);}
  const recap=document.createElement('p');recap.textContent=quest?(STORY_RECAP[quest.id]??quest.beats?.map(b=>b[0]).join(' · ')):'รอเนื้อเรื่องบทต่อไปเร็ว ๆ นี้';section.append(recap);
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
  if(!dialog.open)return;const s=bounty(),al=album(),wk=normalizeWeekly(world.weekly,Date.now()),sig=JSON.stringify([tab,s,al,wk,storyState(),tab==='album'?bagUI.bag():null,world.albumRewards]);if(!force&&sig===shown)return;shown=sig;
  // 0.123 chapter 1 is retired: the story tab only shows the rebirth arc (the tracker suggests farm maps instead)
  const storyTab=world.rebirth>0&&world.storyCampaign!=='main';if(!storyTab&&tab==='story')tab='bounty';dialog.querySelector('[data-qt="story"]').hidden=!storyTab;
  dialog.querySelectorAll('[data-qt]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.qt===tab)));
  const body=$('quests-body'),scroll=body.scrollTop;dialog.dataset.questTab=tab;
  if(tab==='story'){
   renderStory(body,storyState());
  }else if(tab==='bounty'){
   body.innerHTML=`<p class="social-note">ค่าหัวเปลี่ยนทุกวันตอนเที่ยงคืน · ล่าได้ทุกแผนที่ · รับรางวัลในเมือง${map.safe?'':' (ตอนนี้อยู่นอกเมือง)'}</p><ul class="social-list">`+dailyBounties(Date.now()).map((b,i)=>{
    const n=Math.min(s.progress[i],b.count),done=n>=b.count;
    return `<li class="${s.claimed[i]?'':done?'on':''}"><div class="quest-task-copy"><strong>[${TIER[b.tier]}] ล้ม${b.name} ×${b.count}</strong><div class="quest-task-reward"><small>${n}/${b.count} · รางวัล ${b.reward.baseXp} EXP · ${b.reward.coins} เบี้ย</small></div></div>${s.claimed[i]?'<span class="claimed">รับแล้ว ✔</span>':`<button type="button" data-claim="${i}" ${done&&map.safe?'':'disabled'}>รับรางวัล</button>`}</li>`;}).join('')+'</ul>';
   for(const [i,row]of [...body.querySelectorAll('.social-list li')].entries()){const task=dailyBounties(Date.now())[i],watch=document.createElement('button');watch.type='button';watch.className='quest-watch';watch.textContent='ดูคัตซีน';watch.onclick=()=>dispatchEvent(new CustomEvent('quest-cinematic-request',{detail:{kind:'bounty',title:'กระดานค่าหัว · '+task.name,goal:'ล้ม'+task.name+' '+task.count+' ตัว · รับรางวัลในเมือง',monster:task.monster,leader:!!task.leader}}));row.querySelector('.quest-task-reward').append(watch);}
   body.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(+b.dataset.claim));
  }else if(tab==='weekly'){
   // 0.102 weekly quests (online): reset every Monday, claimed in a town
   const loot=r=>[r.coins.toLocaleString('th-TH')+' เบี้ย',...r.items.map(i=>itemDef(i.id).name+' ×'+i.count)].join(' · ');
   body.innerHTML=game.online?`<p class="social-note">ภารกิจใหม่ทุกวันจันทร์ · นับจากทุกแผนที่ · รับรางวัลในเมือง${map.safe?'':' (ตอนนี้อยู่นอกเมือง)'}</p><ul class="social-list">`+WEEKLY.map((q,i)=>{const n=Math.min(wk.progress[i],q.count),done=n>=q.count;
    return `<li class="${wk.claimed[i]?'':done?'on':''}"><div class="quest-task-copy"><strong>${q.name}</strong><div class="quest-task-reward"><small>${n}/${q.count} · รางวัล ${loot(q.reward)}</small></div></div>${wk.claimed[i]?'<span class="claimed">รับแล้ว ✔</span>':`<button type="button" data-wclaim="${i}" ${done&&map.safe?'':'disabled'}>รับรางวัล</button>`}</li>`;}).join('')+'</ul>':'<p class="social-note">ภารกิจรายสัปดาห์ใช้ได้เมื่อเล่นออนไลน์</p>';
   for(const [i,row]of [...body.querySelectorAll('.social-list li')].entries()){const task=WEEKLY[i],watch=document.createElement('button');watch.type='button';watch.className='quest-watch';watch.textContent='ดูคัตซีน';watch.onclick=()=>dispatchEvent(new CustomEvent('quest-cinematic-request',{detail:{kind:'weekly',title:task.name,goal:task.name+' · รับรางวัลในเมือง',monster:i===2?'marsh-ape':i===1?undefined:'straw',leader:i===1}}));row.querySelector('.quest-task-reward').append(watch);}
   body.querySelectorAll('[data-wclaim]').forEach(b=>b.onclick=()=>{if(!map.safe)return world.notice('รับรางวัลได้ในเมือง');world.market?.('weeklyClaim',{index:+b.dataset.wclaim});});
  }else{
   const paid=game.online?(world.albumRewards??[]):localAlbum.albumRewards;
   const next=ALBUM_MILESTONES.find(m=>!paid.includes(m.count)),bag=bagUI.bag();
   body.innerHTML=`<p class="social-note">สะสมการ์ดแล้ว ${al.length}/${ALBUM_CARDS.length} ใบ${next?` · ครบ ${next.count} ใบ รับ ${next.reward.coins} เบี้ย + ${next.reward.items.map(i=>itemDef(i.id).name).join(', ')}`:' · ครบทุกรางวัลแล้ว'}</p><p class="album-rule">กดฝากการ์ดจากกระเป๋า 1 ใบ เพื่อสะสมการ์ดชนิดนั้น · การ์ดที่ฝากจะถูกใช้ไป</p><div class="album-grid">`+
    ALBUM_CARDS.map(id=>{
     const got=al.includes(id),count=bag.items[id]??0,def=itemDef(id);
     return `<article class="album-entry${got?' got':''}" data-card="${id}"><div class="album-art${got||count?'':' undiscovered'}">${albumArt(id)}</div><strong title="${def.name}">${def.name}</strong><small>${got?'สะสมแล้ว':count?'มีในกระเป๋า '+count+' ใบ':'ยังไม่มีการ์ดในกระเป๋า'}</small><button type="button" data-deposit="${id}"${got||!count?' disabled':''}>${got?'ฝากแล้ว':'ฝากการ์ด 1 ใบ'}</button></article>`;
    }).join('')+'</div>';
   body.querySelectorAll('[data-deposit]').forEach(button=>button.onclick=()=>{
    const card=button.dataset.deposit;
    if(game.online){button.disabled=true;world.market?.('albumDeposit',{card});return;}
    try{const r=depositAlbumCard(localAlbum,bagUI.bag(),card);bagUI.setLocal(r.bag);localAlbum=r.state;keep('ayothaya-album-deposits:',localAlbum);
     world.notice('ฝากการ์ดแล้ว · '+itemDef(card).name);for(const m of r.milestones)world.notice(`สมุดการ์ดครบ ${m.count} ใบ · ได้รับรางวัล!`);
    }catch(e){world.notice(ALBUM_ERRORS[e.message]??e.message);}render(true);
   });
   body.scrollTop=scroll;
  }
 }
 return {update(){render();}};
}

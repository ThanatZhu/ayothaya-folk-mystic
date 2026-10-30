import {createMobileInteractionDock} from './mobile-interaction-dock234.js';
import {createMobileHudFit208} from './mobile-hud-fit208.js?v=fit208';
import {mobileHudMedia} from './hud-mode204.js';
import {createMobileCombatLayout} from './mobile-combat-ui.js?v=fit208';
import {createMobileReferenceUI} from './mobile-reference-ui.js?v=148';
import {createMobileHudEditor} from './mobile-hud-editor.js?v=fit208';
// A single owner for the touch HUD. Reuse live buttons so cooldowns and saved
// hotbar order stay with game-controls / auto-settings rather than a second UI.
export function skillPage(slots,page=0,size=4){
 const pages=Math.max(1,Math.ceil(slots.length/size)),index=((page%pages)+pages)%pages;
 return {index,pages,slots:slots.slice(index*size,(index+1)*size)};
}
export function createMobilePlayUI({clearInput=()=>{},selectTarget=()=>{}}={}){
 const body=document.body,$=id=>document.getElementById(id),query=mobileHudMedia();
 const css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-play-ui.css?v=rail1161d';document.head.append(css);
 const skills=$('skills'),bank=$('skill-bank'),nav=$('game-menu'),toggle=$('menu-toggle'),quest=$('quest-tracker');
 const oldBank=bank?.onclick;let page=0,refreshing=false,skillSignature='',combatLayout=null;
 const online=$('online-button'),onlineHome=document.createComment('online chip home');if(online)online.before(onlineHome);
 const profile=document.querySelector('.player-panel'),channel=$('channel-button'),channelRow=$('hud-channel-row'),dock=$('online-dock'),dockToggle=$('dock-toggle'),attackControls=document.querySelector('.attack-controls');
 const chips=$('hud-chips'),chipsHome=document.createComment('event chips home');if(chips)chips.before(chipsHome);
 const rail=document.createElement('div');rail.id='mobile-status-rail';rail.hidden=true;body.append(rail);
 const events=document.createElement('div');events.id='mobile-event-row';events.hidden=true;body.append(events);
 const onlineCount=document.createElement('span');onlineCount.className='mobile-online-count';onlineCount.setAttribute('aria-hidden','true');online?.append(onlineCount);
 const statusLabels=()=>{
  const label=$('online-label')?.textContent??'',count=label.match(/\d+/)?.[0]??'…';
  if(onlineCount.textContent!==count)onlineCount.textContent=count;
  if(online){online.title=label;online.setAttribute('aria-label',label);}
  chips?.querySelectorAll('button').forEach(b=>{const text=[...b.querySelectorAll('span,b')].map(n=>n.textContent).join(' · ');if(text)b.title=text;const time=b.querySelector('b');if(time)time.dataset.timer=time.textContent.trim().replace(/^(อีก|เหลือ|ถึง|In|Until|to)\s*/i,'').replace(/\s*left$/i,'').replace(/\s*(นาที|min)$/i,'m');});
 };
 if($('online-label'))new MutationObserver(statusLabels).observe($('online-label'),{subtree:true,childList:true,characterData:true});
 if(chips)new MutationObserver(statusLabels).observe(chips,{subtree:true,childList:true,characterData:true});statusLabels();
 const minimap=document.querySelector('.mini-panel');
 const setRailProperty=(name,value)=>{if(body.style.getPropertyValue(name)!==value)body.style.setProperty(name,value);};
 const railSize=()=>{
  const bottom=query.matches?Math.max(profile?.getBoundingClientRect().bottom??0,rail.getBoundingClientRect().bottom):0;
  setRailProperty('--mobile-profile-bottom',bottom+'px');
  // 0.116.1 the event icons can wrap to a second row: the target bar, quest panel and notices start below them
  const iconsBottom=query.matches?Math.max(0,...[rail,events].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect()).filter(r=>r.height).map(r=>r.bottom)):0;
  setRailProperty('--mobile-rail-bottom',iconsBottom+'px');if(!minimap)return;
  const r=minimap.getBoundingClientRect();setRailProperty('--events-top',(r.bottom+8)+'px');
  const channelBounds=channel?.getBoundingClientRect(),profileEnd=Math.max(profile?.getBoundingClientRect().right??0,channelBounds?.right??0),discordLeft=r.left-52;
  for(const [name,value] of Object.entries({'--mobile-map-bottom':r.bottom,'--mobile-map-left':r.left,'--mobile-map-right':innerWidth-r.right,'--mobile-map-width':r.width,'--mobile-discord-left':discordLeft,'--mobile-event-width':Math.max(44,discordLeft-profileEnd-12)}))setRailProperty(name,value+'px');
  // Use the real map bounds; reserve space only for event icons beside the button.
  const eventEdges=[...chips?.children??[]].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect())
   .filter(e=>e.width&&e.left>=r.left&&e.left<r.right&&e.top<r.bottom+52&&e.bottom>r.bottom+8).map(e=>e.left-6);
  const end=Math.min(r.right-4,...eventEdges);
  setRailProperty('--channel-map-left',(r.left+4)+'px');
  setRailProperty('--channel-map-width',Math.min(144,Math.max(44,end-r.left-4))+'px');
 };
 // Defer geometry writes out of ResizeObserver delivery, especially during Safari rotation.
 let railFrame=0;const requestRailSize=()=>{if(!railFrame)railFrame=requestAnimationFrame(()=>{railFrame=0;railSize();});};
 const railObserver=new ResizeObserver(requestRailSize);for(const node of [rail,events,minimap].filter(Boolean))railObserver.observe(node);
 const arrows='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 12a11 11 0 0 0-19-4L4 12m0-7v7h7M6 20a11 11 0 0 0 19 4l3-4m0 7v-7h-7"/></svg>';
 if(dockToggle){const image=document.createElement('img');image.className='chat-drawer-art';image.src='./assets/ui-mobile/chat-drawer-v1.png';image.alt='';image.width=64;image.height=64;dockToggle.append(image);}
 const buffs=$('ailment-row'),arrangeBuffs=()=>{if(buffs)buffs.dataset.dense=String(buffs.children.length>12);};
 if(buffs){new MutationObserver(arrangeBuffs).observe(buffs,{childList:true});arrangeBuffs();}
 const backdrop=document.createElement('button');backdrop.id='mobile-menu-backdrop';backdrop.hidden=true;backdrop.type='button';backdrop.setAttribute('aria-label','ปิดเมนูและกลับเข้าเกม');body.append(backdrop);
 backdrop.onclick=()=>toggle?.click();
 const panelBlock=document.createElement('div');panelBlock.id='mobile-panel-backdrop';panelBlock.hidden=true;panelBlock.setAttribute('aria-hidden','true');body.append(panelBlock);
 panelBlock.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
 const summary=document.createElement('button');summary.id='mobile-quest-summary';summary.type='button';summary.setAttribute('aria-expanded','false');summary.setAttribute('aria-controls','quest-tracker');summary.innerHTML='<i aria-hidden="true"></i>';
 const summaryHome=document.createComment('quest summary home');if(quest){quest.before(summaryHome,summary);quest.classList.add('mobile-quest-details');}
 const closeQuest=()=>{body.classList.remove('mobile-quest-open');summary.setAttribute('aria-expanded','false');};
 summary.onclick=()=>{const open=body.classList.toggle('mobile-quest-open');summary.setAttribute('aria-expanded',String(open));if(open)clearInput();};
 quest?.querySelector('#quest-go')?.addEventListener('click',closeQuest);
 const updateSummary=()=>{const text=$('quest-hint')?.textContent?.trim()||$('quest-title')?.textContent?.trim()||'ดูภารกิจ';summary.title=text;summary.setAttribute('aria-label','รายละเอียดภารกิจ: '+text);};
 if(quest){new MutationObserver(updateSummary).observe(quest,{subtree:true,childList:true,characterData:true});updateSummary();}
 function refresh(){
  if(refreshing)return;refreshing=true;
  body.classList.toggle('mobile-play',query.matches);
  if(query.matches)body.dataset.skillBank='all';
  rail.hidden=!query.matches;events.hidden=!query.matches;
  if(query.matches){if(summary.parentElement!==rail)rail.prepend(summary);if(online&&online.parentElement!==rail)rail.append(online);if(chips&&chips.parentElement!==events)events.append(chips);}
  else{if(summaryHome.parentElement)summaryHome.after(summary);if(online&&onlineHome.parentElement)onlineHome.after(online);if(chips&&chipsHome.parentElement)chipsHome.after(chips);}
  if(channel){if(query.matches&&profile)profile.append(channel);else channelRow?.append(channel);}
  if(bank){if(query.matches&&skills&&bank.parentElement!==skills)skills.append(bank);else if(!query.matches&&attackControls&&bank.parentElement!==attackControls)attackControls.prepend(bank);}
  const buttons=[...skills?.querySelectorAll('.skill')??[]],available=buttons.map((b,i)=>!b.hidden?i:null).filter(i=>i!==null),selection=skillPage(available,page);page=selection.index;
  skillSignature=buttons.map(b=>b.hidden?'0':'1').join('');
  const unit=Math.max(40,Math.min(76,(innerHeight>innerWidth?innerWidth*.12:innerHeight*.108)));body.style.setProperty('--ref-unit',unit+'px');const arc=[[.54,3.2],[1.06,2.05],[2.02,1.15],[3.305,.74]].map(([x,y])=>[x*unit,y*unit]);
  buttons.forEach((b,i)=>{const off=query.matches&&!selection.slots.includes(i);if(b.hasAttribute('data-mobile-away')!==off)b.toggleAttribute('data-mobile-away',off);const pos=selection.slots.indexOf(i);if(pos>=0){b.style.setProperty('--arc-x',arc[pos][0]+'px');b.style.setProperty('--arc-y',arc[pos][1]+'px');}});
  skills?.setAttribute('aria-label',query.matches?`สกิลชุด ${page+1} จาก ${selection.pages}`:'สกิลทั้งหมด');
  if(bank){if(query.matches){if(!bank.querySelector('svg'))bank.innerHTML=arrows;}else bank.textContent='สกิล 1–5 ⇄';bank.setAttribute('aria-label',query.matches?`สลับชุดสกิล ชุด ${page+1} จาก ${selection.pages}`:'แสดงสกิล 6 ถึง 0');}
  railSize();overlay();combatLayout?.refresh();refreshing=false;dispatchEvent(new Event('mobile-hud-refreshed'));
 }
 if(bank)bank.onclick=e=>{if(query.matches){e.stopPropagation();page++;refresh();clearInput();}else oldBank?.call(bank,e);};
 if(skills)new MutationObserver(records=>{if(records.some(r=>r.type==='childList'&&r.target===skills)||[...skills.querySelectorAll('.skill')].map(b=>b.hidden?'0':'1').join('')!==skillSignature)refresh();}).observe(skills,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 let blocked=false;
 function overlay(){
  const menu=query.matches&&nav?.classList.contains('phone-open'),panel=query.matches&&!!document.querySelector('dialog[open]:not([data-compact-hud]),#npc-dialog:not([hidden]),#account-panel:not([hidden]),#channel-popover:not([hidden])'),chat=query.matches&&dock&&!dock.classList.contains('collapsed');
  if(backdrop.hidden!==!menu)backdrop.hidden=!menu;if(panelBlock.hidden!==!(panel||chat))panelBlock.hidden=!(panel||chat);body.classList.toggle('mobile-menu-open',!!menu);body.classList.toggle('mobile-panel-open',!!panel);body.classList.toggle('mobile-chat-open',!!chat);
  const next=!!(menu||panel||chat);if(next&&!blocked){clearInput();closeQuest();}blocked=next;
  if(dockToggle&&dock){const expanded=!dock.classList.contains('collapsed');dockToggle.setAttribute('aria-label',expanded?'ย่อแชต':'เปิดแชต');dockToggle.setAttribute('aria-expanded',String(expanded));}
 }
 if(nav)new MutationObserver(overlay).observe(nav,{attributes:true,attributeFilter:['class']});
 if(dock)new MutationObserver(overlay).observe(dock,{attributes:true,attributeFilter:['class']});
 new MutationObserver(records=>{if(records.some(({target})=>target.tagName==='DIALOG'||['npc-dialog','account-panel','channel-popover'].includes(target.id)))overlay();}).observe(body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});
 addEventListener('hud-panel-opening',()=>{closeQuest();if(nav?.classList.contains('phone-open'))toggle?.click();});
 addEventListener('keydown',e=>{if(e.code==='Escape'){if(nav?.classList.contains('phone-open'))toggle?.click();if(query.matches&&dock&&!dock.classList.contains('collapsed'))dockToggle?.click();if(query.matches&&$('channel-popover'))$('channel-popover').hidden=true;closeQuest();}});
 // Swallow HUD gestures before they can become a world tap or a camera drag.
 for(const type of ['pointerdown','pointerup','click'])body.addEventListener(type,e=>{if(query.matches&&e.target.closest?.('#game-menu,#menu-toggle,#mobile-menu-backdrop,#mobile-status-rail,#hud-right,dialog,#online-dock,#channel-popover'))e.stopPropagation();});
 addEventListener('resize',refresh);window.visualViewport?.addEventListener('resize',refresh);
 query.addEventListener('change',()=>{page=0;closeQuest();refresh();});
 document.addEventListener('pointerdown',e=>{if(query.matches&&body.classList.contains('mobile-quest-open')&&!e.target.closest?.('#hud-right,#mobile-quest-summary'))closeQuest();},{passive:true});
 refresh();createMobileReferenceUI({clearInput,selectTarget});combatLayout=createMobileCombatLayout();combatLayout.refresh();const hudEditor=createMobileHudEditor({clearInput});const hudFit=createMobileHudFit208();createMobileInteractionDock();return {refresh,hudEditor,hudFit};
}

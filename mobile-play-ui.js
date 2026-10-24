// A single owner for the touch HUD. Reuse live buttons so cooldowns and saved
// hotbar order stay with game-controls / auto-settings rather than a second UI.
export function skillPage(slots,page=0,size=4){
 const pages=Math.max(1,Math.ceil(slots.length/size)),index=((page%pages)+pages)%pages;
 return {index,pages,slots:slots.slice(index*size,(index+1)*size)};
}
export function createMobilePlayUI({clearInput=()=>{}}={}){
 const body=document.body,$=id=>document.getElementById(id),query=matchMedia('(any-pointer:coarse),(max-width:900px),(max-height:600px)');
 const css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-play-ui.css?v=square119';document.head.append(css);
 const skills=$('skills'),bank=$('skill-bank'),nav=$('game-menu'),toggle=$('menu-toggle'),quest=$('quest-tracker');
 const emptySlots=Array.from({length:4},()=>{const b=document.createElement('button');b.type='button';b.className='mobile-skill-empty';b.disabled=true;b.hidden=true;b.setAttribute('aria-label','ช่องสกิลว่าง');skills?.append(b);return b;});
 const oldBank=bank?.onclick;let page=0,refreshing=false,skillSignature='';
 const online=$('online-button'),onlineHome=document.createComment('online chip home');if(online)online.before(onlineHome);
 const profile=document.querySelector('.player-panel'),channel=$('channel-button'),channelRow=$('hud-channel-row'),dock=$('online-dock'),dockToggle=$('dock-toggle'),attackControls=document.querySelector('.attack-controls');
 const arrows='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 12a11 11 0 0 0-19-4L4 12m0-7v7h7M6 20a11 11 0 0 0 19 4l3-4m0 7v-7h-7"/></svg>';
 if(dockToggle){const image=document.createElement('img');image.className='chat-drawer-art';image.src='./assets/ui-mobile/chat-drawer-v1.png';image.alt='';image.width=64;image.height=64;dockToggle.append(image);}
 const buffs=$('ailment-row'),arrangeBuffs=()=>{if(buffs)buffs.dataset.dense=String(buffs.children.length>12);};
 if(buffs){new MutationObserver(arrangeBuffs).observe(buffs,{childList:true});arrangeBuffs();}
 const backdrop=document.createElement('button');backdrop.id='mobile-menu-backdrop';backdrop.hidden=true;backdrop.type='button';backdrop.setAttribute('aria-label','ปิดเมนูและกลับเข้าเกม');body.append(backdrop);
 backdrop.onclick=()=>toggle?.click();
 const panelBlock=document.createElement('div');panelBlock.id='mobile-panel-backdrop';panelBlock.hidden=true;panelBlock.setAttribute('aria-hidden','true');body.append(panelBlock);
 panelBlock.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
 const summary=document.createElement('button');summary.id='mobile-quest-summary';summary.type='button';summary.setAttribute('aria-expanded','false');summary.setAttribute('aria-controls','quest-tracker');summary.innerHTML='<i aria-hidden="true"></i>';
 if(quest){quest.before(summary);quest.classList.add('mobile-quest-details');}
 const closeQuest=()=>{body.classList.remove('mobile-quest-open');summary.setAttribute('aria-expanded','false');};
 summary.onclick=()=>{const open=body.classList.toggle('mobile-quest-open');summary.setAttribute('aria-expanded',String(open));if(open)clearInput();};
 quest?.querySelector('#quest-go')?.addEventListener('click',closeQuest);
 const updateSummary=()=>{const text=$('quest-hint')?.textContent?.trim()||$('quest-title')?.textContent?.trim()||'ดูภารกิจ';summary.title=text;summary.setAttribute('aria-label','รายละเอียดภารกิจ: '+text);};
 if(quest){new MutationObserver(updateSummary).observe(quest,{subtree:true,childList:true,characterData:true});updateSummary();}
 function refresh(){
  if(refreshing)return;refreshing=true;
  body.classList.toggle('mobile-play',query.matches);
  if(query.matches)body.dataset.skillBank='all';
  if(online){if(query.matches&&nav&&online.parentElement!==nav)nav.append(online);else if(!query.matches&&onlineHome.parentElement&&online.previousSibling!==onlineHome)onlineHome.after(online);}
  if(channel){if(query.matches&&profile)profile.append(channel);else channelRow?.append(channel);}
  if(bank){if(query.matches&&skills&&bank.parentElement!==skills)skills.append(bank);else if(!query.matches&&attackControls&&bank.parentElement!==attackControls)attackControls.prepend(bank);}
  const buttons=[...skills?.querySelectorAll('.skill')??[]],available=buttons.map((b,i)=>!b.hidden?i:null).filter(i=>i!==null),selection=skillPage(available,page);page=selection.index;
  skillSignature=buttons.map(b=>b.hidden?'0':'1').join('');
  const arc=[[0,124],[18,58],[82,10],[158,22]];
  buttons.forEach((b,i)=>{const off=query.matches&&!selection.slots.includes(i);if(b.hasAttribute('data-mobile-away')!==off)b.toggleAttribute('data-mobile-away',off);const pos=selection.slots.indexOf(i);if(pos>=0){b.style.setProperty('--arc-x',arc[pos][0]+'px');b.style.setProperty('--arc-y',arc[pos][1]+'px');}});
  emptySlots.forEach((b,i)=>{b.hidden=!query.matches||i<selection.slots.length;b.style.setProperty('--arc-x',arc[i][0]+'px');b.style.setProperty('--arc-y',arc[i][1]+'px');});
  skills?.setAttribute('aria-label',query.matches?`สกิลชุด ${page+1} จาก ${selection.pages}`:'สกิลทั้งหมด');
  if(bank){if(query.matches){if(!bank.querySelector('svg'))bank.innerHTML=arrows;}else bank.textContent='สกิล 1–5 ⇄';bank.setAttribute('aria-label',query.matches?`สลับชุดสกิล ชุด ${page+1} จาก ${selection.pages}`:'แสดงสกิล 6 ถึง 0');}
  overlay();refreshing=false;
 }
 if(bank)bank.onclick=e=>{if(query.matches){e.stopPropagation();page++;refresh();clearInput();}else oldBank?.call(bank,e);};
 if(skills)new MutationObserver(()=>{if([...skills.querySelectorAll('.skill')].map(b=>b.hidden?'0':'1').join('')!==skillSignature)refresh();}).observe(skills,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 let blocked=false;
 function overlay(){
  const menu=query.matches&&nav?.classList.contains('phone-open'),panel=query.matches&&!!document.querySelector('dialog[open],#npc-dialog:not([hidden]),#account-panel:not([hidden]),#channel-popover:not([hidden])'),chat=query.matches&&dock&&!dock.classList.contains('collapsed');
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
 for(const type of ['pointerdown','pointerup','click'])body.addEventListener(type,e=>{if(query.matches&&e.target.closest?.('#game-menu,#menu-toggle,#mobile-menu-backdrop,#hud-right,dialog,#online-dock,#channel-popover'))e.stopPropagation();});
 query.addEventListener('change',()=>{page=0;closeQuest();refresh();});
 document.addEventListener('pointerdown',e=>{if(query.matches&&body.classList.contains('mobile-quest-open')&&!e.target.closest?.('#hud-right'))closeQuest();},{passive:true});
 refresh();return {refresh};
}

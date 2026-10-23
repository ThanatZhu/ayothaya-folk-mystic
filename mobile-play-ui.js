// A single owner for the touch HUD. Reuse live buttons so cooldowns and saved
// hotbar order stay with game-controls / auto-settings rather than a second UI.
export function skillPage(slots,page=0,size=5){
 const pages=Math.max(1,Math.ceil(slots.length/size)),index=((page%pages)+pages)%pages;
 return {index,pages,slots:slots.slice(index*size,(index+1)*size)};
}
export function createMobilePlayUI({clearInput=()=>{}}={}){
 const body=document.body,$=id=>document.getElementById(id),query=matchMedia('(any-pointer:coarse),(max-width:900px),(max-height:600px)');
 const css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-play-ui.css?v=1';document.head.append(css);
 const skills=$('skills'),bank=$('skill-bank'),nav=$('game-menu'),toggle=$('menu-toggle'),quest=$('quest-tracker');
 const oldBank=bank?.onclick;let page=0,refreshing=false,skillSignature='';
 const online=$('online-button'),onlineHome=document.createComment('online chip home');if(online)online.before(onlineHome);
 const backdrop=document.createElement('button');backdrop.id='mobile-menu-backdrop';backdrop.hidden=true;backdrop.type='button';backdrop.setAttribute('aria-label','ปิดเมนูและกลับเข้าเกม');body.append(backdrop);
 backdrop.onclick=()=>toggle?.click();
 const panelBlock=document.createElement('div');panelBlock.id='mobile-panel-backdrop';panelBlock.hidden=true;panelBlock.setAttribute('aria-hidden','true');body.append(panelBlock);
 panelBlock.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
 const summary=document.createElement('button');summary.id='mobile-quest-summary';summary.type='button';summary.setAttribute('aria-expanded','false');summary.setAttribute('aria-controls','quest-tracker');summary.innerHTML='<span></span><b aria-hidden="true">⌄</b>';
 if(quest){quest.before(summary);quest.classList.add('mobile-quest-details');}
 const closeQuest=()=>{body.classList.remove('mobile-quest-open');summary.setAttribute('aria-expanded','false');};
 summary.onclick=()=>{const open=body.classList.toggle('mobile-quest-open');summary.setAttribute('aria-expanded',String(open));if(open)clearInput();};
 quest?.querySelector('#quest-go')?.addEventListener('click',closeQuest);
 const updateSummary=()=>{const text=$('quest-hint')?.textContent?.trim()||$('quest-title')?.textContent?.trim()||'ดูภารกิจ';summary.querySelector('span').textContent=text;summary.title=text;summary.setAttribute('aria-label','รายละเอียดภารกิจ: '+text);};
 if(quest){new MutationObserver(updateSummary).observe(quest,{subtree:true,childList:true,characterData:true});updateSummary();}
 function refresh(){
  if(refreshing)return;refreshing=true;
  body.classList.toggle('mobile-play',query.matches);
  if(query.matches)body.dataset.skillBank='all';
  if(online){if(query.matches&&nav&&online.parentElement!==nav)nav.append(online);else if(!query.matches&&onlineHome.parentElement&&online.previousSibling!==onlineHome)onlineHome.after(online);}
  const buttons=[...skills?.querySelectorAll('.skill')??[]],available=buttons.map((b,i)=>!b.hidden?i:null).filter(i=>i!==null),selection=skillPage(available,page);page=selection.index;
  skillSignature=buttons.map(b=>b.hidden?'0':'1').join('');
  buttons.forEach((b,i)=>{const off=query.matches&&!selection.slots.includes(i);if(b.hasAttribute('data-mobile-away')!==off)b.toggleAttribute('data-mobile-away',off);});
  skills?.setAttribute('aria-label',query.matches?`สกิลชุด ${page+1} จาก ${selection.pages}`:'สกิลทั้งหมด');
  if(bank){bank.textContent=query.matches?`ชุด ${page+1}/${selection.pages} ⇄`:'สกิล 1–5 ⇄';bank.setAttribute('aria-label',query.matches?`สลับชุดสกิล ชุด ${page+1} จาก ${selection.pages}`:'แสดงสกิล 6 ถึง 0');}
  overlay();refreshing=false;
 }
 if(bank)bank.onclick=e=>{if(query.matches){e.stopPropagation();page++;refresh();clearInput();}else oldBank?.call(bank,e);};
 if(skills)new MutationObserver(()=>{if([...skills.querySelectorAll('.skill')].map(b=>b.hidden?'0':'1').join('')!==skillSignature)refresh();}).observe(skills,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 let blocked=false;
 function overlay(){
  const menu=query.matches&&nav?.classList.contains('phone-open'),panel=query.matches&&!!document.querySelector('dialog[open],#npc-dialog:not([hidden]),#account-panel:not([hidden])');
  if(backdrop.hidden!==!menu)backdrop.hidden=!menu;if(panelBlock.hidden!==!panel)panelBlock.hidden=!panel;body.classList.toggle('mobile-menu-open',!!menu);body.classList.toggle('mobile-panel-open',!!panel);
  const next=!!(menu||panel);if(next&&!blocked){clearInput();closeQuest();}blocked=next;
 }
 if(nav)new MutationObserver(overlay).observe(nav,{attributes:true,attributeFilter:['class']});
 new MutationObserver(records=>{if(records.some(({target})=>target.tagName==='DIALOG'||target.id==='npc-dialog'||target.id==='account-panel'))overlay();}).observe(body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});
 addEventListener('hud-panel-opening',()=>{closeQuest();if(nav?.classList.contains('phone-open'))toggle?.click();});
 addEventListener('keydown',e=>{if(e.code==='Escape'){if(nav?.classList.contains('phone-open'))toggle?.click();closeQuest();}});
 // Swallow HUD gestures before they can become a world tap or a camera drag.
 for(const type of ['pointerdown','pointerup','click'])body.addEventListener(type,e=>{if(query.matches&&e.target.closest?.('#game-menu,#menu-toggle,#mobile-menu-backdrop,#hud-right,dialog,#online-dock'))e.stopPropagation();});
 query.addEventListener('change',()=>{page=0;closeQuest();refresh();});
 document.addEventListener('pointerdown',e=>{if(query.matches&&body.classList.contains('mobile-quest-open')&&!e.target.closest?.('#hud-right'))closeQuest();},{passive:true});
 refresh();return {refresh};
}

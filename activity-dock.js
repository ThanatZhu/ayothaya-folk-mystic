import {mobileHudMedia} from './hud-mode204.js';
const hit=(a,b,gap=6)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
// Prefer a free left column. Tiny landscapes use a modal only while expanded.
export function planActivityDock({width,height,left=0,top=0,obstacles=[],touch=false,expanded=true}){
 const edge=10,right=left+width,bottom=top+height,navH=touch?44:222;
 const find=(w,minH,maxH)=>{
  const xs=[left+edge,left+126,...obstacles.map(r=>r.right+8)].filter(x=>x+w<=right-edge&&x<left+width*.58);
  const ys=[top+edge,...obstacles.map(r=>r.bottom+8)].sort((a,b)=>a-b);
  for(const x of xs)for(const y of ys){if(y<top+edge||y+minH>bottom-edge)continue;const r={left:x,right:x+w,top:y,bottom:y+minH};if(obstacles.some(b=>hit(r,b)))continue;
   const limit=Math.min(bottom-edge,...obstacles.filter(b=>b.left<r.right+6&&b.right>r.left-6&&b.top>=r.bottom).map(b=>b.top-8));
   return {left:x,top:y,width:w,maxHeight:Math.min(maxH,limit-y),horizontal:touch,overlay:false};
  }return null;
 };
 if(expanded){for(const w of touch?[280,232]:[350,310]){const p=find(Math.min(w,width-20),touch?142:navH,touch?242:330);if(p)return p;}}
 const rail=find(touch?156:84,touch?44:navH,touch?44:navH)??find(104,44,44);
 return {...(rail??{left:left+edge,top:top+edge,width:104,maxHeight:44}),horizontal:touch||!rail||rail.width===104,small:!rail||rail.width===104,overlay:expanded};
}

export function createActivityDock({game,partyUI}){
 const $=id=>document.getElementById(id),body=document.body,quest=$('quest-tracker'),party=$('party-frame'),trial=$('training-journal');if(!quest||!party)return;
 const css=document.createElement('link');css.rel='stylesheet';css.href='./activity-dock.css?v=hud204';document.head.append(css);
 const root=document.createElement('section');root.id='activity-dock';root.setAttribute('aria-label','เควสและปาร์ตี้');root.innerHTML='<nav role="tablist" aria-label="เควสและปาร์ตี้"><button type="button" role="tab" id="activity-quest-tab" aria-controls="activity-quest-pane" data-activity="quest"><i class="activity-quest-icon" aria-hidden="true"></i><span>เควส</span></button><button type="button" role="tab" id="activity-party-tab" aria-controls="activity-party-pane" data-activity="party"><i class="activity-party-icon" aria-hidden="true"></i><span>ปาร์ตี้</span><b id="activity-party-count" hidden></b></button><button type="button" id="activity-fold" aria-label="ย่อเควสและปาร์ตี้" aria-expanded="true">‹</button></nav><div id="activity-content"><section id="activity-quest-pane" role="tabpanel" aria-labelledby="activity-quest-tab"><div class="activity-heading"><small>การเดินทางของคุณ</small><button type="button" id="activity-journal">สมุดเควส</button></div></section><section id="activity-party-pane" role="tabpanel" aria-labelledby="activity-party-tab" hidden><div id="activity-party-empty"><small>เพื่อนร่วมทาง</small><h3>ออกผจญภัยด้วยกัน</h3><p>ชวนเพื่อนในแนล เริ่มปาร์ตี้เมื่อเพื่อนตอบรับ · สูงสุด 5 คน</p><button type="button" id="activity-create-party"><i class="activity-party-icon" aria-hidden="true"></i><span>สร้างปาร์ตี้</span><b aria-hidden="true">+</b></button><button type="button" id="activity-find-party">หาเพื่อนร่วมทาง</button><small id="activity-party-note"></small></div></section></div>';
 const home=document.createComment('quest and party dock');($('game-shell')??body).append(home,root);$('activity-quest-pane').append(quest);if(trial)$('activity-quest-pane').append(trial);$('activity-party-pane').append(party);quest.classList.remove('folded');party.removeAttribute('data-layout-hidden');party.dataset.compact='false';
 // 0.122 ROX-style quest cards: each quest is its own card with a kind badge (real text, so it translates)
 const badge=(card,kind,text)=>{if(!card||card.querySelector(':scope>.quest-kind'))return;const b=document.createElement('b');b.className='quest-kind';b.dataset.kind=kind;b.textContent=text;card.prepend(b);};
 badge(quest,'story','เนื้อเรื่อง');badge(trial,'job','บททดสอบอาชีพ');
 $('activity-content').tabIndex=0;$('activity-content').setAttribute('role','region');$('activity-content').setAttribute('aria-label',root.getAttribute('aria-label'));
 body.classList.add('activity-dock-ready');
 const modal=document.createElement('dialog');modal.id='activity-overlay';modal.setAttribute('aria-label','เควสและปาร์ตี้');($('game-shell')??body).append(modal);
 let selected='quest',collapsed=false,scheduled=0,lastParty='',allowOverlay=false;
 const key='ayothaya-activity-dock138:'+ (mobileHudMedia().matches?'touch142':'desktop');try{const saved=JSON.parse(localStorage.getItem(key));if(saved){selected=saved.tab==='party'?'party':'quest';collapsed=!!saved.collapsed;}}catch{}
 const rect=node=>{if(node?.id==='online-dock'&&node.classList.contains('desktop-chat-overlay')&&!mobileHudMedia().matches)return null;if(!node||node.hidden||getComputedStyle(node).visibility==='hidden'||!node.getClientRects().length)return null;const r=node.getBoundingClientRect();return r.width&&r.height?{left:r.left,right:r.right,top:r.top,bottom:r.bottom}:null;};
 function layout(){scheduled=0;if(body.classList.contains('mobile-play')){if(modal.open)modal.close();if(root.parentElement===modal)home.after(root);root.dataset.horizontal='false';root.dataset.small='false';root.dataset.overlay='false';return;}if(modal.open&&!collapsed)return;const v=visualViewport,obstacles=[...document.querySelectorAll('.player-panel,#ailment-row,#online-button,#mobile-status-rail,#joystick,#quick-slots,#online-dock,#desktop-actionbar,#actionbar-combat,.combat-controls,.mini-panel,#game-menu,#menu-toggle,#hud-right,.target-panel,#rebirth-btn,#mobile-discord,#mobile-bag-shortcut')].map(rect).filter(Boolean);
  const p=planActivityDock({width:v?.width??innerWidth,height:v?.height??innerHeight,left:v?.offsetLeft??0,top:v?.offsetTop??0,obstacles,touch:body.classList.contains('mobile-play'),expanded:!collapsed});
  if(p.overlay&&!collapsed&&!allowOverlay){collapsed=true;render();return;}allowOverlay=false;
  root.dataset.horizontal=String(p.horizontal);root.dataset.small=String(!!p.small);root.dataset.overlay=String(p.overlay);
  for(const [name,value]of Object.entries({left:p.left+'px',top:p.top+'px',width:p.width+'px','--activity-height':p.maxHeight+'px'}))if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value);
  if(p.overlay&&!collapsed){if(root.parentElement!==modal)modal.append(root);if(!modal.open){game.clearInput();modal.showModal();}}
  else{if(modal.open)modal.close();if(root.parentElement===modal)home.after(root);}
 }
 function request(){if(!scheduled)scheduled=requestAnimationFrame(layout);}
 function render(){root.dataset.collapsed=String(collapsed);for(const name of ['quest','party']){const tab=$('activity-'+name+'-tab');tab.setAttribute('aria-selected',String(selected===name));tab.setAttribute('aria-expanded',String(!collapsed&&selected===name));$('activity-'+name+'-pane').hidden=selected!==name;}
  $('activity-content').hidden=collapsed;$('activity-fold').textContent=collapsed?'›':'‹';$('activity-fold').setAttribute('aria-expanded',String(!collapsed));$('activity-fold').setAttribute('aria-label',collapsed?'เปิดเควสและปาร์ตี้':'ย่อเควสและปาร์ตี้');
  try{localStorage.setItem(key,JSON.stringify({tab:selected,collapsed}));}catch{}request();
 }
 function choose(name){game.clearInput();collapsed=selected===name?!collapsed:false;selected=name;allowOverlay=!collapsed;render();$('activity-content').scrollTop=0;}
 for(const tab of root.querySelectorAll('[data-activity]')){tab.onclick=()=>choose(tab.dataset.activity);tab.onkeydown=e=>{if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();selected=e.key==='Home'?'quest':e.key==='End'?'party':selected==='quest'?'party':'quest';collapsed=false;render();$('activity-'+selected+'-tab').focus();}};}
 $('activity-fold').onclick=()=>{collapsed=!collapsed;allowOverlay=!collapsed;render();};$('activity-journal').onclick=()=>$('menu-quests')?.click();
 $('activity-create-party').onclick=()=>partyUI?.openParty('invite');$('activity-find-party').onclick=()=>partyUI?.openParty('all');
 function partyState(){const state=partyUI?.partyState??{},empty=!state.party,count=state.party?.members.length??0,signature=JSON.stringify([empty,count,state.online]);if(signature===lastParty)return;lastParty=signature;$('activity-party-empty').hidden=!empty;$('activity-party-count').hidden=!count;$('activity-party-count').textContent=String(count);$('activity-create-party').disabled=$('activity-find-party').disabled=!state.online;$('activity-party-note').textContent=state.online?'':'เชื่อมต่อออนไลน์เพื่อชวนเพื่อน';request();}
 const observer=new MutationObserver(()=>{partyState();request();});observer.observe(party,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true});if($('online-button'))observer.observe($('online-button'),{attributes:true,attributeFilter:['data-state']});
 const resize=new ResizeObserver(request);for(const node of [root,...document.querySelectorAll('.player-panel,#ailment-row,#mobile-status-rail,#online-button,#online-dock,#hud-right,#quick-slots,.combat-controls')])resize.observe(node);
 const move=new MutationObserver(request);move.observe(body,{attributes:true,attributeFilter:['class','style']});move.observe(document.documentElement,{attributes:true,attributeFilter:['style']});
 modal.addEventListener('cancel',e=>{e.preventDefault();collapsed=true;render();});modal.addEventListener('click',e=>{if(e.target===modal){collapsed=true;render();}});
 addEventListener('hud-panel-opening',()=>{if(modal.open){collapsed=true;render();}});addEventListener('keydown',e=>{if(e.key==='Escape'&&!collapsed&&!document.querySelector('dialog[open]')){collapsed=true;render();}});
 for(const type of ['pointerdown','pointerup','click'])root.addEventListener(type,e=>e.stopPropagation());
 addEventListener('resize',request);visualViewport?.addEventListener('resize',request);visualViewport?.addEventListener('scroll',request);document.fonts?.ready.then(request);css.onload=request;partyState();render();
 return {refresh:request};
}

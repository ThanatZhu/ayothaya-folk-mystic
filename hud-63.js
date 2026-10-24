// 0.66 HUD layout pass: groups the existing live HUD (DOM/canvas made by the other modules) into a standard MMORPG
// arrangement and adds the wood-gold-jade frames (assets/ui63/frames) as pointer-events:none decoration.
// Nothing here replaces a control: buttons, shortcuts and data stay owned by their modules.
// 0.67 follows the approved desktop mockup (outputs/ui-hud63-desktop-mockup.png): four main buttons + เมนู.
// 0.70.1 owner: the market gets its own button; character (tap the portrait), players (the online chip) and chat
// (the chat box) are reachable elsewhere, so those three buttons are hidden.
import {createMobilePlayUI} from './mobile-play-ui.js?v=painted131';
const PRIMARY=['menu-bag','menu-skills','menu-quests','menu-market','menu-rank'];
const SECONDARY=['menu-social','menu-status','menu-pet'];
const HIDDEN=['menu-profile','menu-players','menu-chat'];
const store=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch{}return null;};
export function createHud63({game}={}){
 const $=id=>document.getElementById(id),body=document.body;
 const link=document.createElement('link');link.rel='stylesheet';link.href='./hud-63.css?v=112.4';document.head.append(link); // last sheet wins ties
 body.classList.add('hud63');
 const minimalStyle=document.createElement('link');minimalStyle.rel='stylesheet';minimalStyle.href='./minimal-combat-hud.css?v=shadow119';document.head.append(minimalStyle);
 const mobileStyle=document.createElement('link');mobileStyle.rel='stylesheet';mobileStyle.href='./mobile-hud-stability.css?v=4';document.head.append(mobileStyle);
 const deco=(parent,cls)=>{if(!parent||parent.querySelector(':scope>.'+cls))return;const d=document.createElement('i');d.className='hud63-frame '+cls;d.setAttribute('aria-hidden','true');parent.prepend(d);};
 const profile=document.querySelector('.player-panel');deco(profile,'f-profile');
 if(profile)new ResizeObserver(()=>document.documentElement.style.setProperty('--profile-height',profile.getBoundingClientRect().height+'px')).observe(profile);
 if($('ailment-row'))new ResizeObserver(()=>document.documentElement.style.setProperty('--status-height',$('ailment-row').getBoundingClientRect().height+'px')).observe($('ailment-row'));
 deco(document.querySelector('.mini-panel'),'f-minimap');
 // The minimap plaque shows the area name only; the channel is already in the coordinates line.
 const title=document.querySelector('.field-map-title');if(title)title.textContent=title.textContent.split(' · ')[0];
 // Right column under the minimap: quest tracker, then the timed-event chips, so nothing floats over the field.
 const right=document.createElement('div');right.id='hud-right';body.append(right);
 const quest=$('quest-tracker'),chips=$('hud-chips');if(quest)right.append(quest);if(chips)right.append(chips);
 if($('war-line'))right.append($('war-line')); // war status stays available without a selected enemy
 if(quest){
  const fold=document.createElement('button');fold.type='button';fold.id='quest-fold';fold.setAttribute('aria-label','ย่อหรือขยายรายการภารกิจ');
  const compact=matchMedia('(pointer:coarse),(max-width:900px),(max-height:600px)').matches,key='ayothaya-quest-fold68:'+(compact?'phone':'desktop'),saved=store(key);
  const set=v=>{quest.classList.toggle('folded',v);fold.textContent=v?'▸':'▾';fold.setAttribute('aria-expanded',String(!v));store(key,v?'1':'0');};
  set(saved==='1'); // 0.68 the list is compact now, so it starts open everywhere
  fold.onclick=e=>{e.stopPropagation();set(!quest.classList.contains('folded'));};quest.append(fold);
 }
 // Main menu: most used first, the rest behind "เพิ่มเติม"; on phones the whole menu sits behind one 44 px button.
 const nav=$('game-menu');
 if(nav){
  const market=document.createElement('button');market.type='button';market.id='menu-market';market.title='ตลาดกลาง';market.setAttribute('aria-label','ตลาดกลาง');
  market.innerHTML='<i aria-hidden="true"></i><span>ตลาด</span>';market.onclick=()=>$('open-market-board')?.click();nav.append(market);
  const rank=document.createElement('button');rank.type='button';rank.id='menu-rank';rank.title='อันดับค่าพลัง';rank.setAttribute('aria-label','อันดับค่าพลัง');
  rank.innerHTML='<i aria-hidden="true"></i><span>อันดับ</span>';rank.onclick=()=>window.__ayothayaRank?.open();nav.append(rank);
  for(const id of HIDDEN){const b=$(id);if(b){b.hidden=true;b.classList.add('hud63-hidden');}}
  for(const id of PRIMARY){const b=$(id);if(b)nav.append(b);}
  const more=document.createElement('button');more.type='button';more.id='menu-more';more.setAttribute('aria-expanded','false');more.setAttribute('aria-label','เมนูเพิ่มเติม');more.title='เพิ่มเติม';
  more.innerHTML='<i aria-hidden="true"></i><span>เมนู</span>';more.title='เมนู';nav.append(more);
  const drawer=document.createElement('div');drawer.id='menu-drawer';drawer.setAttribute('role','group');drawer.setAttribute('aria-label','เมนูรอง');nav.append(drawer);
  for(const id of SECONDARY){const b=$(id);if(b)drawer.append(b);}
  const toggle=document.createElement('button');toggle.type='button';toggle.id='menu-toggle';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','เปิดเมนู');toggle.innerHTML='<b aria-hidden="true">☰</b><span>เมนู</span>';
  nav.before(toggle);
  const open=(el,v)=>{el.setAttribute('aria-expanded',String(v));};
  more.onclick=e=>{e.stopPropagation();const v=!nav.classList.contains('more-open');nav.classList.toggle('more-open',v);open(more,v);};
  toggle.onclick=e=>{e.stopPropagation();const v=!nav.classList.contains('phone-open');nav.classList.toggle('phone-open',v);open(toggle,v);};
  // Picking an entry (or clicking elsewhere) closes the drawer/panel; the button's own action still runs.
  nav.addEventListener('click',e=>{if(e.target.closest('button')&&e.target.closest('button')!==more){nav.classList.remove('more-open','phone-open');open(more,false);open(toggle,false);}});
  addEventListener('pointerdown',e=>{if(!e.target.closest('#game-menu,#menu-toggle')){nav.classList.remove('more-open','phone-open');open(more,false);open(toggle,false);}});
  addEventListener('keydown',e=>{if(e.code==='Escape'){nav.classList.remove('more-open','phone-open');open(more,false);open(toggle,false);}});
 }
 // Desktop skill bar: one row of equal slots instead of the touch wheel (the wheel stays on touch screens).
 const bar=matchMedia('not all'); // 0.71: the straight desktop hotbar is retired; every screen uses the phone skill wheel
 // Desktop: potions sit at the start of the hotbar row and AUTO becomes a small toggle at the bottom right.
 const cc=document.querySelector('.combat-controls'),ac=document.querySelector('.attack-controls'),auto=$('auto-control')??$('auto-attack'),quick=$('quick-slots');
 const applyBar=()=>{body.classList.toggle('hud63-bar',bar.matches);
  if(bar.matches){if(quick&&cc&&quick.parentElement!==cc)cc.prepend(quick);if(auto&&auto.parentElement!==body)body.append(auto);}
  else{if(quick&&quick.parentElement!==body)body.append(quick);if(auto&&ac&&auto.parentElement!==ac)ac.prepend(auto);}};bar.addEventListener('change',applyBar);applyBar();
 // 0.70.1 phones: while typing in chat the on-screen keyboard covers the bottom of the screen, so the chat box moves
 // to the top of the part that is still visible; when typing ends the page snaps back to its normal size and place.
 const text=$('online-text'),vv=window.visualViewport;
 if(text){text.setAttribute('autocomplete','off');text.setAttribute('autocorrect','off');text.setAttribute('enterkeyhint','send');}
 const place=()=>{if(!body.classList.contains('chat-typing'))return;document.documentElement.style.setProperty('--vv-top',(vv?.offsetTop??0)+'px');document.documentElement.style.setProperty('--vv-h',(vv?.height??innerHeight)+'px');};
 const touch=matchMedia('(pointer:coarse)');
 document.addEventListener('focusin',e=>{if(touch.matches&&e.target===text){body.classList.add('chat-typing');place();}});
 document.addEventListener('focusout',e=>{if(e.target!==text)return;body.classList.remove('chat-typing');
  // iOS leaves the page scrolled/zoomed after the keyboard closes: restore the original view.
  setTimeout(()=>{window.scrollTo(0,0);document.scrollingElement&&(document.scrollingElement.scrollTop=0);dispatchEvent(new Event('resize'));},80);});
 vv?.addEventListener('resize',place);vv?.addEventListener('scroll',place);
 // The touch HUD owns event and channel placement; keep their desktop home stable.
 const channel=$('channel-button');
 const channelRow=document.createElement('div');channelRow.id='hud-channel-row';if(channel)channelRow.append(channel);
 right.prepend(channelRow);
 const mobileUI=createMobilePlayUI({clearInput:()=>game?.clearInput?.()});
 return {mobileUI};
}

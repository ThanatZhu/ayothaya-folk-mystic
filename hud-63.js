// 0.66 HUD layout pass: groups the existing live HUD (DOM/canvas made by the other modules) into a standard MMORPG
// arrangement and adds the wood-gold-jade frames (assets/ui63/frames) as pointer-events:none decoration.
// Nothing here replaces a control: buttons, shortcuts and data stay owned by their modules.
// 0.67 follows the approved desktop mockup (outputs/ui-hud63-desktop-mockup.png): four main buttons + เมนู.
const PRIMARY=['menu-profile','menu-bag','menu-skills','menu-quests'];
const SECONDARY=['menu-social','menu-status','menu-pet','menu-players','menu-chat'];
const store=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch{}return null;};
export function createHud63(){
 const $=id=>document.getElementById(id),body=document.body;
 const link=document.createElement('link');link.rel='stylesheet';link.href='./hud-63.css?v=68.1';document.head.append(link); // last sheet wins ties
 body.classList.add('hud63');
 const deco=(parent,cls)=>{if(!parent||parent.querySelector(':scope>.'+cls))return;const d=document.createElement('i');d.className='hud63-frame '+cls;d.setAttribute('aria-hidden','true');parent.prepend(d);};
 deco(document.querySelector('.player-panel'),'f-profile');
 deco(document.querySelector('.mini-panel'),'f-minimap');
 // The minimap plaque shows the area name only; the channel is already in the coordinates line.
 const title=document.querySelector('.field-map-title');if(title)title.textContent=title.textContent.split(' · ')[0];
 // Right column under the minimap: quest tracker, then the timed-event chips, so nothing floats over the field.
 const right=document.createElement('div');right.id='hud-right';body.append(right);
 const quest=$('quest-tracker'),chips=$('hud-chips');if(quest)right.append(quest);if(chips)right.append(chips);
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
 const bar=matchMedia('(pointer:fine) and (min-width:901px) and (min-height:601px)');
 // Desktop: potions sit at the start of the hotbar row and AUTO becomes a small toggle at the bottom right.
 const cc=document.querySelector('.combat-controls'),ac=document.querySelector('.attack-controls'),auto=$('auto-attack'),quick=$('quick-slots');
 const applyBar=()=>{body.classList.toggle('hud63-bar',bar.matches);
  if(bar.matches){if(quick&&cc&&quick.parentElement!==cc)cc.prepend(quick);if(auto&&auto.parentElement!==body)body.append(auto);}
  else{if(quick&&quick.parentElement!==body)body.append(quick);if(auto&&ac&&auto.parentElement!==ac)ac.prepend(auto);}};bar.addEventListener('change',applyBar);applyBar();
 return {};
}

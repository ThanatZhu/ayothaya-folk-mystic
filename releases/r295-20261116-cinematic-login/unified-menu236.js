// Owner-approved menu skin. No game state, event interception or animation loop.
export const MENU_CANDIDATES236='dialog,[data-hud-panel],[role="dialog"],#online-dock,#menu-drawer,#game-menu.phone-open,#welcome-card,#equipment-panel,#channel-popover,#account-panel .account-card,#controls-editor,#player-menu,.mp-popover';
const EXCLUDED236='#gacha-window,#pet-window,.gacha-overlay,.gacha-rates-panel,.gacha-overlay-surface,.gacha-overlay-dialog,.gacha-overlay-card,#item-hover221,#boss-live-meter,#orientation-gate';
export function isMenuSurface236(el){
 if(!(el instanceof HTMLElement)||el.id==='account-panel'||el.closest(EXCLUDED236)||el.closest('[data-menu-theme="preserve"]'))return false;
 if(/cutscene|cinematic|victory|prologue|journey-loading|story-scene|story-gallery/i.test(el.id))return false;
 return el.matches(MENU_CANDIDATES236);
}
export function installUnifiedMenus236(){
 if(globalThis.__unifiedMenus236)return globalThis.__unifiedMenus236;
 const link=document.createElement('link');link.id='unified-menu236';link.rel='stylesheet';link.href=new URL('./unified-menu236.css',import.meta.url).href;document.head.append(link);
 const scrolling=new WeakSet();
 function pin(el){const skin=el.querySelector(':scope > .menu-skin236');if(skin)skin.style.translate=`${el.scrollLeft}px ${el.scrollTop}px`;}
 function paint(el){
  if(!isMenuSurface236(el)){if(el?.id==='game-menu'&&el.classList.contains('unified-menu236')){el.classList.remove('unified-menu236');el.querySelector(':scope > .menu-skin236')?.remove();}return;}
  if(!el.classList.contains('unified-menu236'))el.classList.add('unified-menu236');
  if(!el.querySelector(':scope > .menu-skin236')){
   const skin=document.createElement('div');skin.className='menu-skin236';skin.setAttribute('aria-hidden','true');skin.inert=true;el.append(skin);pin(el);
  }
  if(el.id==='menu-drawer')el.toggleAttribute('data-menu-contents236',getComputedStyle(el).display==='contents');
  if(!scrolling.has(el)){scrolling.add(el);el.addEventListener('scroll',()=>pin(el),{passive:true});}
 }
 function scan(root=document){
  if(root instanceof HTMLElement)paint(root);
  root.querySelectorAll?.(MENU_CANDIDATES236).forEach(paint);
 }
 addEventListener('hud-panel-opening',e=>paint(document.getElementById(e.detail)));
 document.addEventListener('beforetoggle',e=>{if(e.newState==='open')paint(e.target);},true);
 // Handle lazily-created dialogs and a dialog whose contents were replaced.
 // Ignore text updates and our own decoration nodes; no per-frame full DOM scan.
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='attributes'){if(record.attributeName!=='class'||['online-dock','game-menu'].includes(record.target.id))paint(record.target);continue;}
   if(record.target instanceof HTMLElement&&record.target.matches('.unified-menu236')&&!record.target.querySelector(':scope > .menu-skin236'))paint(record.target);
   for(const node of record.addedNodes)if(node instanceof HTMLElement&&!node.classList.contains('menu-skin236'))scan(node);
  }
 });
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open','data-hud-panel','role','class']});
 const refreshNav=()=>{paint(document.getElementById('menu-drawer'));paint(document.getElementById('game-menu'));};
 addEventListener('resize',()=>requestAnimationFrame(refreshNav));
 document.addEventListener('load',e=>{if(e.target instanceof HTMLLinkElement&&e.target.rel==='stylesheet')refreshNav();},true);
 scan();const api={paint,scan};globalThis.__unifiedMenus236=api;return api;
}

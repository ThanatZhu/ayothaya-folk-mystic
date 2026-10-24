// Desktop presentation for the existing chat transport and message history.
export function createDesktopChat({shell,dock,game,setCollapsed}){
 const query=matchMedia('(min-width:901px) and (pointer:fine)'),input=dock.querySelector('#online-text');
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./desktop-chat-ui.css?v=channel144',import.meta.url).href;document.head.append(css);
 const heading=document.createElement('div');heading.className='desktop-chat-heading';
 heading.innerHTML='<div><small>AYOTHAYA</small><h2 id="desktop-chat-title">สนทนา</h2></div><button type="button" id="desktop-chat-close" aria-label="ปิดแชต">×</button>';dock.prepend(heading);
 const launcher=document.createElement('button');launcher.type='button';launcher.id='desktop-chat-launcher';launcher.hidden=true;
 launcher.setAttribute('aria-label','เปิดแชต · Enter');launcher.setAttribute('aria-controls','online-dock');launcher.setAttribute('aria-expanded','false');
 launcher.innerHTML='<img src="assets/ui-chat140/chat.webp" width="64" height="64" alt=""><kbd>Enter</kbd><b class="desktop-chat-unread" hidden></b>';shell.append(launcher);
 dock.classList.add('desktop-chat-drawer','desktop-chat-overlay');
 const topLayer=typeof dock.showPopover==='function';
 function sync(){
  const expanded=!dock.classList.contains('collapsed');launcher.hidden=!query.matches||dock.hidden;
  if(topLayer){
   if(query.matches){
    if(!dock.hasAttribute('popover'))dock.setAttribute('popover','manual');
    if(expanded&&!dock.hidden){if(!dock.matches(':popover-open'))dock.showPopover();}
    else if(dock.matches(':popover-open'))dock.hidePopover();
   }else{if(dock.matches(':popover-open'))dock.hidePopover();dock.removeAttribute('popover');}
  }
  launcher.setAttribute('aria-expanded',String(expanded));launcher.setAttribute('aria-label',expanded?'ปิดแชต':'เปิดแชต · Enter');
  const unread=dock.querySelector('#dock-unread'),badge=launcher.querySelector('b');badge.textContent=unread.textContent;badge.hidden=!unread.textContent||unread.hidden||expanded;
 }
 function close(){if(!query.matches)return;input.blur();setCollapsed(true);sync();game.clearInput();}
 function open(focus=true){
  if(!query.matches||dock.hidden||document.querySelector('dialog:modal'))return;
  // Chat floats above the existing HUD; opening it never closes or reflows a panel.
  game.clearInput();setCollapsed(false);sync();if(focus)input.focus({preventScroll:true});
 }
 launcher.onclick=()=>dock.classList.contains('collapsed')?open():close();
 heading.querySelector('button').onclick=()=>{close();launcher.focus({preventScroll:true});};
 input.addEventListener('focus',()=>{if(query.matches)open(false);});
 dock.querySelector('#dock-toggle')?.addEventListener('click',sync);
 // Close the overlay first; Escape must not also close a window underneath it.
 addEventListener('keydown',e=>{if(e.key==='Escape'&&query.matches&&!dock.classList.contains('collapsed')){e.preventDefault();e.stopImmediatePropagation();close();}},true);
 addEventListener('hud-panel-opening',e=>{if(e.detail!=='online-dock')close();});
 for(const type of ['pointerdown','pointerup','click']){
  launcher.addEventListener(type,e=>e.stopPropagation());dock.addEventListener(type,e=>e.stopPropagation());
 }
 new MutationObserver(sync).observe(dock,{attributes:true,attributeFilter:['hidden','class']});
 new MutationObserver(sync).observe(dock.querySelector('#dock-unread'),{attributes:true,childList:true,subtree:true,characterData:true});
 query.addEventListener('change',()=>{input.blur();setCollapsed(true);sync();});
 if(query.matches)setCollapsed(true);sync();
 return {open,close,desktop:()=>query.matches};
}

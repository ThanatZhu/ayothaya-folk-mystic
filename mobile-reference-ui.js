// Reuse the existing chat, menu, bag and AUTO owners. Only their presentation changes.
export function createMobileReferenceUI({clearInput}){
 const $=id=>document.getElementById(id),body=document.body,toggle=$('menu-toggle'),nav=$('game-menu'),chat=$('online-dock'),chatToggle=$('dock-toggle');
 const css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-reference-ui.css?v=139';document.head.append(css);css.onload=()=>dispatchEvent(new Event('resize'));body.classList.add('mobile-reference-ready');
 const discord=document.createElement('a');discord.id='mobile-discord';discord.href='https://discord.gg/Be9WwsX6';discord.target='_blank';discord.rel='noopener noreferrer';discord.setAttribute('aria-label','เข้าร่วม Discord');discord.title='Discord';discord.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5c3.5-1 6.5-1 10 0l.7 1.5c1.4 2.7 2.4 5.5 2.8 9.5-1.6 1.3-3.1 2.1-4.8 2.5l-1-1.7 1.3-.7c-2.8.9-5.2.9-8 0l1.3.7-1 1.7c-1.7-.4-3.2-1.2-4.8-2.5.4-4 1.4-6.8 2.8-9.5L7 4.5Z"/><ellipse cx="8.5" cy="11.5" rx="1.4" ry="1.8"/><ellipse cx="15.5" cy="11.5" rx="1.4" ry="1.8"/></svg><span>Discord</span>';
 const bag=document.createElement('button');bag.id='mobile-bag-shortcut';bag.type='button';bag.setAttribute('aria-label','เปิดกระเป๋า');bag.innerHTML='<i aria-hidden="true"></i><span>กระเป๋า</span>';bag.onclick=()=>{$('menu-bag')?.click();clearInput();};
 ($('game-shell')??body).append(discord,bag);
 if(toggle){toggle.innerHTML='<b class="mobile-menu-arrow" aria-hidden="true">‹</b><span>เมนู</span>';toggle.setAttribute('aria-label','เปิดเมนูด้านขวา');toggle.setAttribute('aria-controls','game-menu');toggle.addEventListener('click',()=>{if(nav?.classList.contains('phone-open')&&!chat?.classList.contains('collapsed'))chatToggle?.click();});}
 chatToggle?.addEventListener('click',()=>{if(!chat.classList.contains('collapsed')&&nav?.classList.contains('phone-open'))toggle?.click();});
 // Existing state remains authoritative; the arrow reflects whether the tray is open.
 function sync(){const open=!!nav?.classList.contains('phone-open');toggle?.setAttribute('aria-label',open?'ปิดเมนูด้านขวา':'เปิดเมนูด้านขวา');const arrow=toggle?.querySelector('.mobile-menu-arrow');if(arrow)arrow.textContent=open?'›':'‹';}
 if(nav)new MutationObserver(sync).observe(nav,{attributes:true,attributeFilter:['class']});sync();
 for(const node of [discord,bag])for(const type of ['pointerdown','pointerup','click'])node.addEventListener(type,e=>e.stopPropagation());
}

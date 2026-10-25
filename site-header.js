// Shared public navigation. It does not load gameplay, auth or account data.
const header=document.querySelector('.site-masthead'),nav=header?.querySelector('#site-nav'),toggle=header?.querySelector('#nav-toggle');
if(header&&nav&&toggle){
 const close=(focus=false)=>{const wasOpen=toggle.getAttribute('aria-expanded')==='true';nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');if(focus&&wasOpen)toggle.focus();};
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 document.addEventListener('click',e=>{if(!header.contains(e.target))close();});
 addEventListener('keydown',e=>{if(e.key==='Escape')close(true);});
 addEventListener('hashchange',()=>close());addEventListener('resize',()=>{if(innerWidth>1000)close();});
 for(const link of nav.querySelectorAll('a')){const url=new URL(link.href);if(url.origin===location.origin&&!url.hash&&url.pathname===location.pathname)link.setAttribute('aria-current','page');}
 header.querySelector('[data-lang-toggle]').addEventListener('click',e=>{
  // Updating the URL preserves the equipment class/level and avoids a stale lang query overriding the choice.
  e.stopPropagation();const url=new URL(location.href),language=globalThis.I18N?.lang??document.documentElement.lang,next=language==='en'?'th':'en';
  try{localStorage.setItem('ayothaya.lang',next);}catch{}
  url.searchParams.set('lang',next);location.assign(url.href);
 });
 const discord=nav.querySelector('[data-discord]');if(discord)for(const link of document.querySelectorAll('[data-discord]')){link.href=discord.href;link.hidden=false;}
 const measure=()=>document.documentElement.style.setProperty('--site-header-height',Math.ceil(header.getBoundingClientRect().height)+'px');
 new ResizeObserver(measure).observe(header);measure();
}

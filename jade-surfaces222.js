// Shared illustrated surfaces. Authored frames draw their edges, never their old dark center.
const ART_SCENE=/^(?:pet-window|gacha-window)$|cutscene|cinematic|victory|prologue|journey-loading/i;
export function installJadeSurfaces(){
 if(globalThis.__jadeSurfaces222)return globalThis.__jadeSurfaces222;
 const link=document.createElement('link');link.rel='stylesheet';link.href='jade-surfaces222.css?v=surfaces222-inset1';link.id='jade-surfaces222';document.head.append(link);
 const framed=new WeakSet();
 function paint(el){
  if(!(el instanceof HTMLElement)||ART_SCENE.test(el.id)||['item-hover221','boss-live-meter','npc-dialog','mentor-panel'].includes(el.id)||el.matches('.npc-conversation'))return;
  el.classList.add('jade-surface222');el.dataset.jadeSurface=/craft|refine|card|shop|store|market|auction|storage|farm-utility/i.test(el.id)?'paper':'silk';
  const pseudo=/^(?:craft-window|card-slot-window|mail-window|boss-browser)$/.test(el.id)||el.matches('dialog.npc-conversation');
  el.dataset.jadePseudo=String(pseudo);
  el.style.setProperty('background-image',pseudo?'none':el.dataset.jadeSurface==='paper'?'var(--jade-paper222)':'var(--jade-silk222)','important');
  el.style.setProperty('background-color',pseudo?'transparent':'#174b38','important');
  el.style.setProperty('background-size','cover','important');
  el.style.setProperty('background-position','center','important');
  el.style.setProperty('background-repeat','no-repeat','important');
  // Clip only the backing; ornate border art and focus rings may extend outside.
  el.style.setProperty('background-clip','padding-box','important');
  el.style.setProperty('background-origin','padding-box','important');
  const style=getComputedStyle(el),slice=style.borderImageSlice;
  if(style.borderImageSource!=='none'&&slice.includes('fill')){el.style.setProperty('border-image-slice',slice.replace(/\bfill\b/g,'').trim(),'important');framed.add(el);}
 }
 function scan(reset=false){for(const el of document.querySelectorAll('dialog,[data-hud-panel],#npc-dialog,#online-dock.desktop-chat-drawer,.gacha-rates-panel,.gacha-overlay-surface,.gacha-overlay-dialog,.gacha-overlay-card')){if(reset&&framed.has(el))el.style.removeProperty('border-image-slice');paint(el);}}
 addEventListener('hud-panel-opening',e=>paint(document.getElementById(e.detail)));
 document.addEventListener('beforetoggle',e=>{if(e.target instanceof HTMLElement&&e.newState==='open'&&(e.target instanceof HTMLDialogElement||e.target.hasAttribute('popover')))paint(e.target);},true);
 document.addEventListener('load',e=>{if(e.target instanceof HTMLLinkElement&&e.target.rel==='stylesheet')scan();},true);
 addEventListener('resize',()=>scan(true));if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan(),{once:true});else scan();
 const api={paint,scan};globalThis.__jadeSurfaces222=api;return api;
}
installJadeSurfaces();

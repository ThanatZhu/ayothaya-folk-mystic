export function needsLandscape({width,height,coarse=false,touchPoints=0}){
 return height>width&&(coarse||touchPoints>0||width<=800);
}

// 0.66 the game page passes allowPortrait: hud-63 has a portrait layout; the lobby keeps asking for landscape.
export function createLandscapeGuard({onChange=()=>{},allowPortrait=false}={}){
 const gate=document.getElementById('orientation-gate'),hint=document.getElementById('orientation-hint');
 const root=document.documentElement,layout=document.querySelector('.lobby-layout'),header=document.querySelector('.lobby-header');
 let fitFrame=0;
 function fitViewport(){
  fitFrame=0;
  const mobile=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0||innerWidth<=1000||innerHeight<=600;
  root.classList.toggle('mobile-viewport',mobile);
  const height=Math.min(innerHeight,window.visualViewport?.height??innerHeight);
  root.style.setProperty('--visible-height',`${height}px`);
  root.classList.toggle('lobby-short',height<=360);
  root.classList.toggle('keyboard-open',mobile&&document.activeElement?.matches('input,textarea')&&height<innerHeight*.8);
  if(!layout||blocked)return;
  const top=(header?.getBoundingClientRect().height??0)+2;
  const bottom=parseFloat(getComputedStyle(root).getPropertyValue('--safe-bottom'))||0;
  const available=Math.max(1,height-top-bottom-6);
  root.style.setProperty('--lobby-height',`${available}px`);
  // Reflow / scroll inside the usable viewport. Scaling a whole lobby shrinks
  // touch targets and makes canvas feet drift relative to CSS decoration.
  root.style.setProperty('--lobby-scale','1');
  root.style.setProperty('--lobby-top',`${top}px`);
 }
 function scheduleFit(){if(!fitFrame)fitFrame=requestAnimationFrame(fitViewport);}
 if(layout){
  const observer=new ResizeObserver(scheduleFit);observer.observe(layout);if(header)observer.observe(header);
  new MutationObserver(scheduleFit).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
  document.fonts?.ready.then(scheduleFit);
 }
 window.visualViewport?.addEventListener('resize',scheduleFit);
 window.visualViewport?.addEventListener('scroll',()=>{if(root.classList.contains('mobile-viewport'))window.scrollTo(0,0);});
 document.addEventListener('focusin',scheduleFit);document.addEventListener('focusout',scheduleFit);
 let blocked=false;
 function update(){
  const next=!allowPortrait&&needsLandscape({width:innerWidth,height:innerHeight,coarse:matchMedia('(any-pointer: coarse)').matches,touchPoints:navigator.maxTouchPoints});
  if(next!==blocked){blocked=next;onChange(blocked);}
  document.documentElement.classList.toggle('portrait-blocked',blocked);
  if(blocked&&!gate.open)gate.showModal();
  if(!blocked&&gate.open)gate.close();
  scheduleFit();
 }
 gate.addEventListener('cancel',e=>e.preventDefault());
 gate.addEventListener('close',()=>{if(blocked&&!gate.open)gate.showModal();});
 // Keep keyboard shortcuts from opening another dialog above the orientation gate.
 addEventListener('keydown',e=>{if(blocked){if(e.code==='Escape')e.preventDefault();e.stopImmediatePropagation();}},true);
 async function enterFullscreen(){
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}
  try{if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}
  hint.textContent='หากจอยังไม่หมุน ให้ปิดล็อกการหมุนหน้าจอแล้วหมุนเครื่องเป็นแนวนอน';
  update();
 }
 document.getElementById('rotate-fullscreen').onclick=enterFullscreen;
 const fullscreenButton=document.getElementById('enter-fullscreen');if(fullscreenButton)fullscreenButton.onclick=enterFullscreen;
 addEventListener('resize',update);addEventListener('orientationchange',update);document.addEventListener('fullscreenchange',update);
 update();return {get blocked(){return blocked;},update};
}

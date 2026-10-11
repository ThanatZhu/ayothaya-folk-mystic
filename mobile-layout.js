export function needsLandscape({width,height,coarse=false,touchPoints=0}){
 return height>width&&(coarse||touchPoints>0||width<=800);
}

export function createLandscapeGuard({onChange=()=>{}}={}){
 const gate=document.getElementById('orientation-gate'),hint=document.getElementById('orientation-hint');
 const root=document.documentElement,layout=document.querySelector('.lobby-layout'),header=document.querySelector('.lobby-header');
 let fitFrame=0;
 function fitViewport(){
  fitFrame=0;
  const mobile=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0||innerWidth<=1000||innerHeight<=600;
  root.classList.toggle('mobile-viewport',mobile);
  if(!mobile){root.classList.remove('keyboard-open');return;}
  const height=Math.min(innerHeight,window.visualViewport?.height??innerHeight);
  root.style.setProperty('--visible-height',`${height}px`);
  root.classList.toggle('keyboard-open',document.activeElement?.matches('input,textarea')&&height<innerHeight*.8);
  if(!layout||blocked)return;
  const top=(header?.getBoundingClientRect().height??0)+2;
  const bottom=parseFloat(getComputedStyle(root).getPropertyValue('--safe-bottom'))||0;
  const available=Math.max(1,height-top-bottom-6);
  const scale=Math.min(1,available/Math.max(1,layout.offsetHeight,layout.scrollHeight));
  root.style.setProperty('--lobby-scale',String(scale));
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
  const next=needsLandscape({width:innerWidth,height:innerHeight,coarse:matchMedia('(any-pointer: coarse)').matches,touchPoints:navigator.maxTouchPoints});
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
 document.getElementById('enter-fullscreen').onclick=enterFullscreen;
 addEventListener('resize',update);addEventListener('orientationchange',update);document.addEventListener('fullscreenchange',update);
 update();return {get blocked(){return blocked;},update};
}

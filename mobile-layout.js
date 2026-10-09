export function needsLandscape({width,height,coarse=false,touchPoints=0}){
 return height>width&&(coarse||touchPoints>0||width<=800);
}

export function createLandscapeGuard({onChange=()=>{}}={}){
 const gate=document.getElementById('orientation-gate'),hint=document.getElementById('orientation-hint');
 let blocked=false;
 function update(){
  const next=needsLandscape({width:innerWidth,height:innerHeight,coarse:matchMedia('(any-pointer: coarse)').matches,touchPoints:navigator.maxTouchPoints});
  if(next!==blocked){blocked=next;onChange(blocked);}
  document.documentElement.classList.toggle('portrait-blocked',blocked);
  if(blocked&&!gate.open)gate.showModal();
  if(!blocked&&gate.open)gate.close();
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

// Capture on the stable list, never on a button that rendering may replace.
// Wait for the authoritative stat to change before sending the next increment.
export function bindStatHold(root,{read,raise,enabled,delay=350,interval=150}){
 let active=null,timer=null;
 const stop=()=>{clearTimeout(timer);timer=null;active=null;};
 function tick(){
  if(!active||!enabled())return stop();
  const state=read(active.stat);
  if(!state.allowed)return stop();
  if(active.waiting!==null&&state.value===active.waiting){
   if(Date.now()-active.sentAt>2000)return stop();
   timer=setTimeout(tick,interval);return;
  }
  active.waiting=state.value;active.sentAt=Date.now();
  if(raise(active.stat)===false)return stop();
  timer=setTimeout(tick,interval);
 }
 root.addEventListener('pointerdown',e=>{
  const button=e.target.closest('[data-stat]');
  if(active||e.button!==0||!button||button.disabled||!enabled())return;
  e.preventDefault();const stat=button.dataset.stat,state=read(stat);
  if(!state.allowed)return;
  active={stat,pointer:e.pointerId,waiting:state.value,sentAt:Date.now()};
  root.setPointerCapture?.(e.pointerId);
  if(raise(stat)===false)return stop();
  timer=setTimeout(tick,delay);
 });
 root.addEventListener('click',e=>{
  const button=e.target.closest('[data-stat]');
  if(button){e.preventDefault();if(e.detail===0&&!button.disabled&&enabled())raise(button.dataset.stat);}
 });
 root.addEventListener('contextmenu',e=>{if(e.target.closest('[data-stat]'))e.preventDefault();});
 document.addEventListener('pointermove',e=>{
  if(!active||e.pointerId!==active.pointer)return;
  const b=root.querySelector('[data-stat="'+active.stat+'"]'),r=b?.getBoundingClientRect();
  if(!r||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)stop();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,e=>{if(e.pointerId===active?.pointer)stop();});
 window.addEventListener('blur',stop);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 return {stop,update(){if(active&&(!enabled()||!read(active.stat).allowed))stop();}};
}

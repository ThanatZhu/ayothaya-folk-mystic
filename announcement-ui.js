import {createAnnouncementQueue} from './announcement-state.js?v=149';

export function announce(text,options={}){
 dispatchEvent(new CustomEvent('realm-announcement',{detail:{text,...options}}));
}
export function createAnnouncementUI(shell){
 const style=document.createElement('link');style.rel='stylesheet';style.href='announcement-ui.css?v=149';document.head.append(style);
 const ribbon=document.createElement('aside');ribbon.id='realm-announcement';ribbon.hidden=true;
 ribbon.innerHTML='<img class="announcement-owl" src="assets/ui-announce149/owl.webp" alt="" draggable="false"><div class="announcement-window"><span class="announcement-text" aria-hidden="true"></span></div><span class="announcement-accessible" role="status" aria-live="polite" aria-atomic="true"></span>';
 shell.append(ribbon);
 const queue=createAnnouncementQueue(),text=ribbon.querySelector('.announcement-text'),viewport=ribbon.querySelector('.announcement-window'),status=ribbon.querySelector('[role=status]'),reduced=matchMedia('(prefers-reduced-motion:reduce)'),compact=matchMedia('(pointer:coarse),(max-width:900px)');
 let current=null,x=0,elapsed=0,last=0,frame=0,layoutAt=0;
 function layout(){
  const r=ribbon.getBoundingClientRect(),owl=ribbon.querySelector('img').getBoundingClientRect();let left=16,right=innerWidth-16;
  const overlaps=b=>b.width&&b.height&&b.top<Math.max(r.bottom,owl.bottom)+6&&b.bottom>Math.min(r.top,owl.top)-6;
  const activity=document.getElementById('activity-content')?.getBoundingClientRect(),mini=document.querySelector('.mini-panel')?.getBoundingClientRect();
  if(activity&&overlaps(activity))left=Math.max(left,activity.right+28);
  if(mini&&overlaps(mini))right=Math.min(right,mini.left-12);
  const width=Math.min(innerWidth*(compact.matches ? .5 : .52),1000,Math.max(100,right-left));
  const start=Math.max(left,Math.min((innerWidth-width)/2,right-width));
  ribbon.style.width=width+'px';ribbon.style.left=(start+width/2)+'px';
 }
 function start(){
  current=queue.next();if(!current){ribbon.hidden=true;frame=0;return;}
  text.textContent=current.text;status.textContent=current.text;ribbon.hidden=false;
  ribbon.classList.toggle('still',reduced.matches);layout();x=viewport.clientWidth+8;elapsed=0;last=0;layoutAt=0;
  text.style.transform=reduced.matches?'none':`translateX(${x}px)`;
  frame=requestAnimationFrame(tick);
 }
 function tick(time){
  const dt=last?Math.max(0,Math.min(.1,(time-last)/1000)):0;last=time;
  if(time>=layoutAt){layout();layoutAt=time+250;}
  if(!document.hidden){
   elapsed+=dt;
   if(reduced.matches){
    if(elapsed>Math.max(6,Array.from(current.text).length*.12)){start();return;}
   }else{
    x-=dt*(innerWidth<=900?68:82);text.style.transform=`translateX(${x}px)`;
    if(x < -text.offsetWidth-12){start();return;}
   }
  }
  frame=requestAnimationFrame(tick);
 }
 const receive=({detail})=>{if(queue.push(detail)&&!current)start();};
 const motion=()=>{ribbon.classList.toggle('still',reduced.matches);elapsed=0;x=viewport.clientWidth+8;text.style.transform=reduced.matches?'none':`translateX(${x}px)`;};
 addEventListener('realm-announcement',receive);reduced.addEventListener('change',motion);
 return {dispose(){cancelAnimationFrame(frame);removeEventListener('realm-announcement',receive);reduced.removeEventListener('change',motion);ribbon.remove();style.remove();}};
}

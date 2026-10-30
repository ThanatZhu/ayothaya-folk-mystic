import {mobileHudScale208} from './mobile-hud-scale208.js';
// Scale only DOM HUD widgets; the canvas, world labels and pointer projection stay in world pixels.
export function createMobileHudFit208(){
 const body=document.body,css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-hud-fit208.css?v=fit208';document.head.append(css);
 const fields=['position','inset','left','right','top','bottom','transform','translate','margin','width','height','max-height','--activity-height','zoom'],managed=new Map(),scaled=new Set();let frame=0;
 const $=id=>document.getElementById(id),rect=n=>n?.getBoundingClientRect(),set=(n,k,v)=>{if(n&&n.style.getPropertyValue(k)!==v)n.style.setProperty(k,v,'important');};
 function own(n){if(n&&!managed.has(n))managed.set(n,Object.fromEntries(fields.map(k=>[k,{value:n.style.getPropertyValue(k),priority:n.style.getPropertyPriority(k)}])));}
 function restore(){for(const n of scaled)delete n.dataset.hudScale208;scaled.clear();for(const[n,old]of managed){delete n.dataset.hudScale208;for(const[k,p]of Object.entries(old))p.value?n.style.setProperty(k,p.value,p.priority):n.style.removeProperty(k);}managed.clear();}
 function refresh(){
  const s=body.classList.contains('mobile-play')?mobileHudScale208({width:innerWidth,height:innerHeight}):1;body.style.setProperty('--mobile-ui-scale208',s);body.style.setProperty('--mobile-fit-hit208',(s<1?32:44)+'px');
  if(s>=.999){delete body.dataset.hudFit208;restore();dispatchEvent(new Event('mobile-hud-fitted208'));return;}
  body.dataset.hudFit208='';for(const n of document.querySelectorAll('dialog[open]')){own(n);set(n,'zoom',String(n.id==='shop-window'||n.classList.contains('npc-conversation')?1:s));}const w=innerWidth,h=innerHeight,style=getComputedStyle(body),safe=k=>parseFloat(style.getPropertyValue(k))||0,l=Math.max(6,safe('--hud-safe-left')),r=Math.max(6,safe('--hud-safe-right')),t=Math.max(6,safe('--hud-safe-top')),b=Math.max(6,safe('--hud-safe-bottom'));
  function place(n,x,y,{width,height}={}){if(!n)return;own(n);n.dataset.hudScale208='';for(const[k,v]of Object.entries({position:'fixed',inset:'auto',left:x/s+'px',top:y/s+'px',right:'auto',bottom:'auto',transform:'none',translate:'none',margin:'0'}))set(n,k,v);if(width!=null)set(n,'width',width/s+'px');if(height!=null)set(n,'height',height/s+'px');}
  const profile=document.querySelector('.player-panel'),map=document.querySelector('.mini-panel');place(profile,l,t);place(map,w-r-(rect(map)?.width||64*s),t);const p=rect(profile),m=rect(map);if(!p||!m)return;
  place($('ailment-row'),l,p.bottom+4*s);const discordW=44*s;place($('mobile-discord'),m.left-discordW-6*s,t);const discord=rect($('mobile-discord')),channel=rect($('channel-button')),eventsRight=(discord?.left??m.left)-5*s,eventsLeft=(channel?.right??p.right)+6*s;
  place($('mobile-event-row'),eventsLeft,t,{width:Math.max(32*s,eventsRight-eventsLeft)});
  const menuY=m.bottom+5*s;place($('menu-toggle'),m.right-44*s,menuY);place($('mobile-bag-shortcut'),m.right-98*s,menuY);
  const joystick=$('joystick');if(joystick){joystick.dataset.hudScale208='';scaled.add(joystick);}
  const joy=rect(joystick),activity=$('activity-dock'),activityTop=Math.max(p.bottom+24*s,76*s);place(activity,l,activityTop);if(activity){const available=Math.max(70,(joy?.top??h-100)-activityTop-8);set(activity,'--activity-height',available/s+'px');set(activity,'max-height',available/s+'px');}
  const chatW=Math.min(420,Math.max(168,w*.3))*s,chatH=Math.min(90,Math.max(40,h*.14))*s,chatX=(w-chatW)/2,chatY=h-b-chatH;
  const dock=$('online-dock');if(dock?.classList.contains('collapsed'))place(dock,chatX,chatY,{width:chatW,height:chatH});else if(dock){own(dock);dock.dataset.hudScale208='';for(const k of fields){const prior=managed.get(dock)[k];prior.value?dock.style.setProperty(k,prior.value,prior.priority):dock.style.removeProperty(k);}}
  if(dock&&!dock.classList.contains('collapsed')){const d=rect(dock);place($('mobile-chat-back'),d.right-3*s,d.top+d.height/2-30*s);}
  place($('channel-popover'),l,p.bottom+4*s);
  place($('mobile-chat-peek'),chatX,chatY,{width:chatW,height:chatH});const toolsY=chatY-51*s;place($('emote-open'),chatX,toolsY);place($('run-toggle'),chatX+50*s,toolsY);const auto=$('auto-control');if(auto){auto.dataset.hudScale208='';scaled.add(auto);}
  place($('interact'),w/2-52*s,h-b-chatH-106*s);const target=document.querySelector('.target-panel');place(target,Math.max(p.right+8*s,w*.36),Math.max(t+52*s,rect($('mobile-event-row'))?.bottom+4*s||0),{width:Math.max(100*s,w*.24)});
  const ribbon=$('realm-announcement');if(ribbon){own(ribbon);ribbon.dataset.hudScale208='';set(ribbon,'top',Math.max(t+70*s,h*.3)/s+'px');}
  for(const id of ['notice']){const n=$(id);place(n,w*.34,Math.max(t+70*s,h*.3),{width:w*.34});}
  const nav=$('game-menu');if(nav?.classList.contains('phone-open')){place(nav,w-r-278*s,menuY+54*s,{width:278*s});set(nav,'max-height',Math.max(80,h-menuY-60*s-b)/s+'px');}
  dispatchEvent(new Event('mobile-hud-fitted208'));
 }
 const request=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);};new MutationObserver(records=>{if(records.some(r=>r.target.tagName==='DIALOG'))request();}).observe(body,{subtree:true,attributes:true,attributeFilter:['open']});css.onload=request;addEventListener('resize',request);addEventListener('mobile-hud-refreshed',request);window.visualViewport?.addEventListener('resize',request);
 for(const n of [$('game-menu'),$('online-dock')].filter(Boolean))new MutationObserver(request).observe(n,{attributes:true,attributeFilter:['class']});
 for(const n of [document.querySelector('.player-panel'),document.querySelector('.mini-panel')].filter(Boolean))new ResizeObserver(request).observe(n);
 refresh();return {refresh};
}

const intersects=(a,b,gap=0)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
// Screen-space planning. CSS zoom is applied only when committing the chosen rectangle.
export function planMobileInteraction({width,height,buttonWidth,buttonHeight,safe={left:8,right:8,top:8,bottom:8},obstacles=[],preferred,gap=6}){
 const left=safe.left??8,top=safe.top??8,right=width-(safe.right??8),bottom=height-(safe.bottom??8),w=Math.min(buttonWidth,right-left),h=Math.min(buttonHeight,bottom-top);
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),want=preferred??{x:(width-w)/2,y:height*.6};
 const xs=[clamp(want.x,left,right-w),left,right-w,...obstacles.flatMap(r=>[r.right+gap,r.left-w-gap])];
 const ys=[clamp(want.y,top,bottom-h),top,bottom-h,...obstacles.flatMap(r=>[r.bottom+gap,r.top-h-gap])];
 let best=null;for(const x of xs)for(const y of ys){if(x<left||y<top||x+w>right+.01||y+h>bottom+.01)continue;
  const box={left:x,top:y,right:x+w,bottom:y+h,width:w,height:h};if(obstacles.some(r=>intersects(box,r,gap)))continue;
  const cost=(x-want.x)**2+(y-want.y)**2*1.6;if(!best||cost<best.cost)best={...box,cost};
 }
 return best;
}
let installed;
export function createMobileInteractionDock(){
 if(installed)return installed;const body=document.body,button=document.getElementById('interact');if(!button)return;
 const fields=['position','inset','left','top','right','bottom','transform','translate','margin','zoom','z-index','width','max-width'],original=Object.fromEntries(fields.map(k=>[k,{value:button.style.getPropertyValue(k),priority:button.style.getPropertyPriority(k)}]));
 const set=(key,value)=>{if(button.style.getPropertyValue(key)!==value)button.style.setProperty(key,value,'important');};
 const rect=n=>{if(!n||n.hidden||!n.getClientRects().length)return null;const style=getComputedStyle(n),r=n.getBoundingClientRect();if(style.visibility==='hidden'||style.display==='none'||r.width===0||r.height===0)return null;return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
 let frame=0,owned=false,lastSignature='';
 function refresh(){frame=0;if(!body.classList.contains('mobile-play')){if(owned)for(const[k,p]of Object.entries(original))p.value?button.style.setProperty(k,p.value,p.priority):button.style.removeProperty(k);owned=false;delete button.dataset.mobileInteraction234;return;}
  if(button.hidden||getComputedStyle(button).visibility==='hidden')return;
  const scale=parseFloat(getComputedStyle(body).getPropertyValue('--mobile-ui-scale208'))||1;set('zoom',String(scale));const actionWidth=button.dataset.kind==='portal'?'190px':'104px';set('width',actionWidth);set('max-width',actionWidth);let size=rect(button);if(!size)return;
  const css=getComputedStyle(body),safeEdge=k=>Math.max(8,parseFloat(css.getPropertyValue(k))||0),safe={left:safeEdge('--hud-safe-left'),right:safeEdge('--hud-safe-right'),top:safeEdge('--hud-safe-top'),bottom:safeEdge('--hud-safe-bottom')};
  const selectors=['#activity-dock','.player-panel','.mini-panel','#mobile-event-row','#mobile-discord','#menu-toggle','#mobile-bag-shortcut','#joystick','#emote-open','#run-toggle','#auto-control','#online-dock','#mobile-chat-peek','#attack','#skill-bank','#mobile-target-next','#skills .skill:not([hidden]):not([data-mobile-away])','.target-panel'];
  const obstacles=[...document.querySelectorAll(selectors.join(','))].map(rect).filter(Boolean);
  const tools=[...document.querySelectorAll('#emote-open,#run-toggle,#online-dock.collapsed,#mobile-chat-peek')].map(rect).filter(Boolean),toolsTop=Math.min(innerHeight-safe.bottom,...tools.map(r=>r.top));
  const preferred={x:(innerWidth-size.width)/2,y:Math.min(innerHeight*.62,toolsTop-size.height-8*scale)};
  const plan=planMobileInteraction({width:innerWidth,height:innerHeight,buttonWidth:size.width,buttonHeight:size.height,safe,obstacles,preferred,gap:6*scale});
  // On unusually crowded layouts keep the action in front, within the central safe area.
  const x=plan?.left??Math.max(safe.left,Math.min(innerWidth-safe.right-size.width,preferred.x)),y=plan?.top??Math.max(safe.top,Math.min(innerHeight-safe.bottom-size.height,preferred.y));
  for(const[k,v]of Object.entries({position:'fixed',inset:'auto',left:x/scale+'px',top:y/scale+'px',right:'auto',bottom:'auto',transform:'none',translate:'none',margin:'0','z-index':'25'}))set(k,v);
  button.dataset.mobileInteraction234=plan?'clear':'crowded';owned=true;
 }
 const request=()=>{if(!frame)frame=requestAnimationFrame(refresh);};
 for(const event of ['resize','mobile-hud-refreshed','mobile-hud-fitted208'])addEventListener(event,request);window.visualViewport?.addEventListener('resize',request);
 const watch=new ResizeObserver(request);for(const node of [button,document.getElementById('activity-dock'),document.getElementById('online-dock')].filter(Boolean))watch.observe(node);
 new MutationObserver(()=>{const signature=[button.hidden,button.textContent,button.dataset.kind,body.classList.contains('mobile-play'),body.classList.contains('mobile-panel-open'),body.classList.contains('mobile-chat-open'),body.classList.contains('mobile-menu-open')].join('|');if(signature!==lastSignature){lastSignature=signature;request();}}).observe(body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','data-kind']});
 request();installed={refresh:request};return installed;
}

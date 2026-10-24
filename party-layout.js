const overlapsX=(a,b,gap=0)=>a.left<b.right+gap&&a.right>b.left-gap;
export function planPartyLayout({viewport,profile,above=[],obstacles=[],count=1,touch=false}){
 const gap=8,width=Math.min(240,Math.max(160,profile?.width??190),viewport.width-2*gap),header=touch?44:36,chrome=header+44+30,row=touch?40:34;
 const left=viewport.left??0,top=viewport.top??0,right=left+viewport.width,bottom=top+viewport.height;
 const preferred=Math.max(left+gap,Math.min(profile?.left??left+gap,right-width-gap));
 const xs=[preferred,profile?.right+gap,right-width-gap].filter((x,i,a)=>Number.isFinite(x)&&x>=left+gap&&x+width<=right-gap&&a.indexOf(x)===i);
 const upper=[...(profile?[profile]:[]),...above],all=[...upper,...obstacles];
 let compact=null;
 for(const x of xs){
  const column={left:x,right:x+width},start=x===preferred?Math.max(top+gap,...upper.filter(r=>overlapsX(column,r)).map(r=>r.bottom+gap)):top+gap;
  const blocks=all.filter(r=>overlapsX(column,r,gap)&&r.bottom>start&&r.top<bottom).sort((a,b)=>a.top-b.top);
  const spaces=[];let y=start;
  for(const block of blocks){if(block.top-gap>y)spaces.push({top:y,bottom:block.top-gap});y=Math.max(y,block.bottom+gap);}
  if(y<bottom-gap)spaces.push({top:y,bottom:bottom-gap});
  for(const space of spaces){const height=Math.floor(space.bottom-space.top);if(height>=chrome+row)return {left:x,top:Math.ceil(space.top),width,compact:false,membersHeight:Math.min(Math.max(1,count)*row,height-chrome),maxHeight:height};if(!compact&&height>=header+18)compact={left:x,top:Math.ceil(space.top),width,compact:true,membersHeight:0,maxHeight:height};}
 }
 return compact??{hidden:true};
}
// One owner measures actual rectangles. Buff wrapping, reconnect labels and viewport
// changes must not compete with the old fixed top offsets in the legacy HUD sheets.
export function createPartyLayout({frame,getCount}){
 let scheduled=0,disposed=false;
 const visible=node=>{if(!node||node.hidden||getComputedStyle(node).visibility==='hidden')return null;const r=node.getBoundingClientRect();return r.width&&r.height?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null;};
 const rect=id=>visible(document.getElementById(id));
 function refresh(){scheduled=0;if(disposed)return;watch();if(frame.hidden)return;const profile=visible(document.querySelector('.player-panel')),view=window.visualViewport;
  const viewport={left:view?.offsetLeft??0,top:view?.offsetTop??0,width:view?.width??innerWidth,height:view?.height??innerHeight},above=['ailment-row','online-button','mobile-status-rail'].map(rect).filter(Boolean);
  const obstacles=[...document.querySelectorAll('#joystick,#channel-button,#online-dock,#quick-slots,#desktop-actionbar,.combat-controls,#hud-right,.mini-panel,.target-panel,#game-menu,#menu-toggle')].map(visible).filter(Boolean);
  const plan=planPartyLayout({viewport,profile,above,obstacles,count:getCount(),touch:document.body.classList.contains('mobile-play')});frame.toggleAttribute('data-layout-hidden',!!plan.hidden);if(plan.hidden)return;
  frame.dataset.compact=String(plan.compact);
  for(const [key,value] of Object.entries({left:plan.left+'px',top:plan.top+'px',width:plan.width+'px',maxHeight:plan.maxHeight+'px'})){const property=key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());if(frame.style.getPropertyValue(property)!==value)frame.style.setProperty(property,value,'important');}
  frame.style.setProperty('--party-members-height',plan.membersHeight+'px');
 }
 const request=()=>{if(!scheduled&&!disposed)scheduled=requestAnimationFrame(refresh);};
 const observer=new ResizeObserver(request),observed=new Set();function watch(){for(const node of [frame,...document.querySelectorAll('.player-panel,#ailment-row,#online-button,#mobile-status-rail,#joystick,#channel-button,#online-dock,#quick-slots,#desktop-actionbar,.combat-controls,#hud-right,.mini-panel,#game-menu')])if(!observed.has(node)){observed.add(node);observer.observe(node);}}watch();const additions=new MutationObserver(request);additions.observe(document.body,{childList:true});
 // HUD resize observers publish CSS offsets after animation-frame callbacks.
 // Re-measure those offsets in the same mutation checkpoint, before painting.
 const mutations=new MutationObserver(refresh);mutations.observe(document.body,{attributes:true,attributeFilter:['class','style']});mutations.observe(document.documentElement,{attributes:true,attributeFilter:['style']});for(const node of document.querySelectorAll('#game-menu,#online-button,#online-dock,.target-panel'))mutations.observe(node,{attributes:true,attributeFilter:['class','hidden']});
 addEventListener('resize',request);window.visualViewport?.addEventListener('resize',request);window.visualViewport?.addEventListener('scroll',request);document.fonts?.ready.then(request);
 request();return {refresh,request,dispose(){disposed=true;if(scheduled)cancelAnimationFrame(scheduled);observer.disconnect();additions.disconnect();mutations.disconnect();removeEventListener('resize',request);window.visualViewport?.removeEventListener('resize',request);window.visualViewport?.removeEventListener('scroll',request);}};
}

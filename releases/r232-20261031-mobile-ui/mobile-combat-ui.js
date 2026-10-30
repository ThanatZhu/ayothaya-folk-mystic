import {standardCombatLayout} from './mobile-combat-layout.js?v=fit208';
export function createMobileCombatLayout(){
 const css=document.createElement('style');css.textContent='html body.mobile-play :is(.skill,#attack,#skill-bank,#mobile-target-next,.mobile-combat-hit){-webkit-tap-highlight-color:transparent}html body.mobile-play .mobile-combat-rail{display:none!important}html body.mobile-play .mobile-combat-hit{display:block!important;position:absolute!important;inset:auto!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:max(var(--mobile-fit-hit208,44px),100%)!important;height:max(var(--mobile-fit-hit208,44px),100%)!important;border-radius:50%;background:transparent!important;pointer-events:auto;z-index:4}';document.head.append(css);
 const fields=['position','inset','left','right','top','bottom','width','height','min-width','min-height','max-width','max-height','box-sizing','margin','transform','translate','scale','overflow'],managed=new Map();
 function restore(node){const old=managed.get(node);if(!old)return;node.querySelector('.mobile-combat-hit')?.remove();for(const key of fields){const p=old[key];p.value?node.style.setProperty(key,p.value,p.priority):node.style.removeProperty(key);}managed.delete(node);}
 function place(node,r){
  if(!managed.has(node))managed.set(node,Object.fromEntries(fields.map(k=>[k,{value:node.style.getPropertyValue(k),priority:node.style.getPropertyPriority(k)}])));
  const values={position:'fixed',inset:'auto',left:r.x+'px',top:r.y+'px',right:'auto',bottom:'auto',width:r.width+'px',height:r.height+'px','min-width':'0px','min-height':'0px','max-width':'none','max-height':'none','box-sizing':'border-box',margin:'0px',transform:'none',translate:'none',scale:'none',overflow:'visible'};
  for(const [k,v]of Object.entries(values))if(node.style.getPropertyValue(k)!==v)node.style.setProperty(k,v,'important');
  if(!node.querySelector('.mobile-combat-hit')){const hit=document.createElement('i');hit.className='mobile-combat-hit';hit.setAttribute('aria-hidden','true');node.append(hit);}
 }
 function refresh(){
  if(!document.body.classList.contains('mobile-play')){for(const n of [...managed.keys()])restore(n);return;}
  const shell=document.getElementById('game-shell')?.getBoundingClientRect(),viewport={width:innerWidth,height:Math.min(innerHeight,shell?.height||innerHeight)},layout=standardCombatLayout(viewport);
  const slots=[...document.querySelectorAll('#skills .skill:not([hidden]):not([data-mobile-away])')],nodes=slots.slice(0,4).map((node,i)=>({node,id:'skill-'+(i+1)}));
  for(const [id,selector]of [['attack','#attack'],['swap','#skill-bank'],['target','#mobile-target-next']]){const node=document.querySelector(selector);if(node)nodes.push({id,node});}
  const active=new Set(nodes.map(c=>c.node));for(const node of [...managed.keys()])if(!active.has(node))restore(node);
  for(const {node,id}of nodes)place(node,layout.controls[id]);
 }
 // Mobile browser chrome/orientation can update the game viewport after the window resize handler.
 // Observe the actual game area so an old height cannot leave the whole cluster shifted.
 let frame=0;const request=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);};
 const shell=document.getElementById('game-shell');if(shell&&typeof ResizeObserver!=='undefined')new ResizeObserver(request).observe(shell);
 addEventListener('resize',request);window.visualViewport?.addEventListener('resize',request);
 return {refresh};
}

// Mouse only. Near a live monster the pointer pulls onto it as crossed swords, and a click lands on that monster;
// over an NPC it becomes a speech bubble. Elsewhere the normal pointer stays.
import * as THREE from './vendor/build/three.module.js';

const REACH=64,PULL=26,SWORDS='assets/ui-view/cursor-swords.svg',TALK='assets/ui-view/cursor-talk.svg';
// The closest point within reach of the mouse, or null.
export function nearestTarget(points,x,y,reach=REACH){
 let best=null,bestDistance=reach;
 for(const p of points){const d=Math.hypot(p.x-x,p.y-y);if(d<=bestDistance){best=p;bestDistance=d;}}
 return best;
}
export function createTargetCursor({canvas,camera,sprites,alive,pickNpc,busy}){
 const icon=document.createElement('img');icon.id='target-cursor';icon.alt='';icon.hidden=true;document.body.append(icon);
 const point=new THREE.Vector3();let mouse=null,lock=null,x=0,y=0,shown=null;
 function show(src){if(shown===src)return;shown=src;if(src)icon.src=src;icon.hidden=!src;canvas.style.cursor=src?'none':'';}
 canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')mouse={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointerleave',()=>{mouse=null;lock=null;show(null);});
 function monsters(){
  return sprites().flatMap((sprite,i)=>{
   if(!alive(i)||!sprite.visible)return [];
   point.copy(sprite.position);point.y+=sprite.scale.y*(.5-(sprite.center?.y??.5));point.project(camera);
   return [{x:(point.x+1)/2*innerWidth,y:(1-point.y)/2*innerHeight}];
  });
 }
 return {
  update(dt){
   if(!mouse||busy()){lock=null;show(null);return;}
   lock=nearestTarget(monsters(),mouse.x,mouse.y);
   const talk=!lock&&pickNpc(mouse.x,mouse.y);
   if(!lock&&!talk){show(null);return;}
   const goal=lock??mouse,follow=lock&&shown===SWORDS?1-Math.exp(-dt*PULL):1;
   x+=(goal.x-x)*follow;y+=(goal.y-y)*follow;show(lock?SWORDS:TALK);
   icon.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;
  },
  // Where a click really goes: the monster the pointer has pulled onto.
  aim(clickX,clickY){return lock??{x:clickX,y:clickY};}
 };
}

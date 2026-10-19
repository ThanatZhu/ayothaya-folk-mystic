// Click-to-move / auto-walk (Ragnarok style). Turns a destination into the same world-space direction the joystick
// produces, so one code path drives offline play, client prediction and the online server input (no protocol change).
import {findPath,lineClear,walkable} from './combat-core.js?v=94';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const RADIUS=.32; // same body radius findPath plans with

// A tap can land on a roof or the river: walk to the closest standable point instead.
export function nearestWalkable(p,nav,maxRadius=4){
 if(walkable(p.x,p.z,RADIUS,nav))return {x:p.x,z:p.z};
 for(let r=.25;r<=maxRadius;r+=.25)for(let i=0;i<24;i++){
  const a=i/24*Math.PI*2,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
  if(walkable(x,z,RADIUS,nav))return {x,z};
 }
 return null;
}

export function planRoute(from,goal,nav){
 if(lineClear(from,goal,nav))return [{x:goal.x,z:goal.z}];
 const path=findPath(from,goal,nav);
 if(!path.length)return null;
 path.push({x:goal.x,z:goal.z});
 return path;
}

// target: {x,z} or a function returning one (a walking NPC). radius: stop distance. onArrive / onFail: callbacks.
export function createRouteWalker(getNav){
 let route=null;
 const fail=reason=>{const r=route;route=null;r?.onFail?.(reason);return null;};
 return {
  get active(){return !!route;},
  get goal(){return route?route.target():null;},
  get kind(){return route?.kind??null;},
  go(target,{radius=.18,onArrive=null,onFail=null,kind='ground'}={}){
   const fn=typeof target==='function'?target:()=>target;
   route={target:fn,radius,onArrive,onFail,kind,path:null,planned:null,last:null,stuck:0,replans:0};
  },
  cancel(){route=null;},
  // Returns a unit world-space direction {x,z} for this frame, or null when idle / arrived.
  step(player,dt){
   if(!route)return null;
   const goal=route.target();if(!goal)return fail('gone');
   if(dist(player,goal)<=route.radius){const r=route;route=null;r.onArrive?.();return null;}
   const nav=getNav();
   if(!route.path||dist(goal,route.planned)>.8){
    const stand=nearestWalkable(goal,nav);if(!stand)return fail('blocked');
    route.path=planRoute(player,stand,nav);route.planned={x:goal.x,z:goal.z};
    if(!route.path)return fail('no-path');
   }
   while(route.path.length>1&&dist(player,route.path[0])<.22)route.path.shift();
   const next=route.path[0];
   // Arrived at the reachable end of the route but still outside radius (goal itself not standable): done.
   if(route.path.length===1&&dist(player,next)<.12){const r=route;route=null;r.onArrive?.();return null;}
   // Stuck against something (another body, a moving NPC): re-plan a few times, then give up.
   if(route.last&&dt>0){const moved=dist(player,route.last);route.stuck=moved<.004?route.stuck+dt:0;}
   route.last={x:player.x,z:player.z};
   if(route.stuck>.7){route.stuck=0;route.path=null;if(++route.replans>3)return fail('stuck');}
   const d=dist(player,next)||1;
   return {x:(next.x-player.x)/d,z:(next.z-player.z)/d};
  },
 };
}

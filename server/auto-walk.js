import {held} from '../ailments.js';
import {createRouteWalker,nearestWalkable,planRoute} from '../route-walk.js';
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,80}$/.test(id);
export function cancelWalk(p,reason='manual'){
 p.routeWalker?.cancel();if(p.walkRoute?.status==='walking')p.walkRoute={...p.walkRoute,status:'cancelled',reason};
}
export function startWalk(p,m,runEnabled=false){
 if(!validId(m.id)||m.mapId!==p.room.map.id||!Number.isFinite(m.x)||!Number.isFinite(m.z)||Math.abs(m.x)>10000||Math.abs(m.z)>10000||!Number.isFinite(m.radius??.18))throw Error('invalid-walk');
 if(p.world.player.hp<=0)throw Error('defeated');
 if(m.run!==undefined&&typeof m.run!=='boolean')throw Error('invalid-walk');
 const radius=Math.max(.12,Math.min(3,m.radius??.18)),goal={x:m.x,z:m.z},nav=p.room.map.nav,stand=nearestWalkable(goal,nav);
 if(!stand||!planRoute(p.world.player,stand,nav))throw Error('walk-blocked');
 const target=()=>{if(typeof m.npc==='string')return p.room.map.npcs?.find(n=>n.name===m.npc)??null;if(Number.isInteger(m.mob))return p.room.mobs.find(a=>a.id===m.mob&&a.hp>0)??null;return goal;};
 if(!target())throw Error('walk-target-gone');
 p.routeWalker??=createRouteWalker(()=>p.room.map.nav);
 p.walkRoute={id:m.id,mapId:m.mapId,goal,radius,kind:['quest','npc','map','portal','ground'].includes(m.kind)?m.kind:'ground',status:'walking',run:runEnabled===true&&m.run===true,...(typeof m.npc==='string'?{npc:m.npc}:{}),...(Number.isInteger(m.mob)?{mob:m.mob}:{})};
 p.world.auto=false;p.world.path=[];p.input={x:0,z:0,attack:false,run:false};p.world.clearEmote();
 const id=m.id;p.routeWalker.go(target,{radius,kind:p.walkRoute.kind,onArrive:()=>{if(p.walkRoute?.id===id)p.walkRoute={...p.walkRoute,status:'arrived'};},onFail:reason=>{if(p.walkRoute?.id===id)p.walkRoute={...p.walkRoute,status:'failed',reason};}});
 return p.walkRoute;
}
export function setWalkPace(p,m,runEnabled=false){
 if(!validId(m.id)||typeof m.run!=='boolean')throw Error('invalid-walk');
 if(!p.routeWalker?.active||p.walkRoute?.id!==m.id||p.walkRoute.status!=='walking')return false;
 p.walkRoute={...p.walkRoute,run:runEnabled===true&&m.run};return true;
}
export function walkInput(p,dt){
 if(!p.routeWalker?.active)return p.input;
 if(p.world.player.hp<=0){cancelWalk(p,'defeated');return p.input;}
 // Timed crowd control may hold the body; keep the destination and do not count it as a blocked path.
 const run=p.walkRoute?.run===true,dir=p.routeWalker.step(p.world.player,held(p.world.status)?0:dt,p.world.walkSpeed(run)*dt);return dir?{...p.input,...dir,run}:p.input;
}
export const walkView=p=>p.walkRoute?{...p.walkRoute}:null;
export const walkSave=p=>p.routeWalker?.active?{...p.walkRoute,x:p.walkRoute.goal.x,z:p.walkRoute.goal.z}:null;

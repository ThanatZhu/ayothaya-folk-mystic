import {sampleRoute} from './citizen-routes.js?v=40';
export function createCitizenMotion(n,time){return {time,pose:sampleRoute(n.route,time,n),distance:0,front:true,flip:false};}
export function stepCitizenMotion(state,n,dt,{rightX,rightZ,viewX,viewZ}){
 const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0)),previous=state.pose;
 if(!n.talking){state.time+=step;state.pose=sampleRoute(n.route,state.time,n);state.distance+=Math.hypot(state.pose.x-previous.x,state.pose.z-previous.z);}
 const pose=state.pose,side=pose.dx*rightX+pose.dz*rightZ,toward=pose.dx*viewX+pose.dz*viewZ;
 // Orthographic camera basis, not camera-to-NPC position. Hysteresis prevents side-on flicker.
 if(pose.moving&&!n.talking){if(toward>.16)state.front=true;else if(toward<-.16)state.front=false;}
 else state.front=true;
 // Source front steps face screen-left; source back steps face screen-right.
 if(Math.abs(side)>.12)state.flip=state.front?side>0:side<0;
 const frame=n.talking?1:pose.moving?(state.front?2:4)+(Math.floor(state.distance/.26)%2):0;
 return {...pose,moving:pose.moving&&!n.talking,frame,flip:state.flip};
}

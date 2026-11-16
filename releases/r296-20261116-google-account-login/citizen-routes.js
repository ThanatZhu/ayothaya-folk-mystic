// Deterministic ambient schedules: clients share a wall-clock origin and route data.
// A conversation pauses only that visitor's visual NPC; no gameplay authority depends on pedestrians.
export function routeDuration(route,speed=1.05,pause=2.5){return route.reduce((s,p,i)=>{const n=route[(i+1)%route.length];return s+(p.rest?pause:0)+Math.hypot(n.x-p.x,n.z-p.z)/speed;},0);}
export function sampleRoute(route,time,{speed=1.05,pause=2.5}={}){
 const duration=routeDuration(route,speed,pause);let t=((time%duration)+duration)%duration;
 for(let i=0;i<route.length;i++){const p=route[i],n=route[(i+1)%route.length],dx=n.x-p.x,dz=n.z-p.z,d=Math.hypot(dx,dz),walk=d/speed;
  const rest=p.rest?pause:0;if(t<rest)return {...p,moving:false,dx:d?dx/d:0,dz:d?dz/d:1};t-=rest;
  if(t<walk){const k=t/walk;return {x:p.x+dx*k,z:p.z+dz*k,moving:true,dx:dx/d,dz:dz/d};}t-=walk;
 }return {...route[0],moving:false,dx:0,dz:1};
}

// Stops the follow camera short of the map edge, so the empty land beyond the map stays off screen.
// The screen rectangle is turned on the ground by the camera's azimuth; `margin` lets a little of the edge show near corners.
export function cameraFocus(x,z,bounds,{halfWidth,halfDepth,azimuth,margin=.75}){
 if(!bounds)return {x,z};
 const c=Math.abs(Math.cos(azimuth)),s=Math.abs(Math.sin(azimuth)),reachX=(c*halfWidth+s*halfDepth)*margin,reachZ=(s*halfWidth+c*halfDepth)*margin;
 const fit=(v,start,size,reach)=>reach>=size/2?start+size/2:Math.max(start+reach,Math.min(start+size-reach,v));
 return {x:fit(x,bounds.x,bounds.w,reachX),z:fit(z,bounds.z,bounds.d,reachZ)};
}

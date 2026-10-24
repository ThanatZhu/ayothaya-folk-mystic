export const FORGE_DURATION=2100,FORGE_TIMEOUT=15000;
const poses=[[0,0],[150,1],[300,2],[520,3],[660,4],[830,5],[1050,6],[1190,4],[1360,5],[1570,6],[1750,7]];
export function forgePose(elapsed){
 let frame=0;for(const [at,index] of poses)if(elapsed>=at)frame=index;
 return {frame,impact:[520,1050,1570].some(at=>elapsed>=at&&elapsed<at+140)};
}
// A local presentation gate, never a roll. Each result belongs to exactly one
// request, and remains hidden until the authored hammer sequence has finished.
export function createRefineSequence(){
 let active=null;
 return {
  get active(){return active;},
  start(attempt,now){if(active)return false;active={...attempt,at:now,response:null};return true;},
  receive(event){if(!active||active.response||event.attempt!==active.attempt||event.slot&&event.slot!==active.slot)return false;active.response={...event};return true;},
  tick(now){if(!active)return null;
   if(active.response&&(active.response.code||now-active.at>=FORGE_DURATION)){const result={...active,...active.response};active=null;return result;}
   if(now-active.at>=FORGE_TIMEOUT){const result={...active,unconfirmed:true};active=null;return result;}
   return null;
  }
 };
}

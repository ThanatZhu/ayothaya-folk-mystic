// Shared action rules for local prediction, remote avatars and the realm server.
// A cosmetic sleeping pose is separate from status.sleep (the combat ailment).
export const CHARACTER_ACTIONS=Object.freeze(['idle','walk','run','sit','sleep']);
export const POSTURE_ACTIONS=Object.freeze(['sit','sleep']);
export const EMOTE_ACTIONS=Object.freeze(['idle','bow','celebrate','guard','sit','sleep']);
export const EMOTE_SECONDS=4;
export const RUN_MULTIPLIER=1.35;
// 0.106 reviewed run clips are live. The host explicitly opts in to the server
// gate too; an input packet cannot enable a realm whose gate is closed.
export const GAMEPLAY_RUN_ENABLED=true;
export const POSTURE_TRANSITIONS=Object.freeze({sitDown:'sit',standUp:'idle'});

export function animationClipDuration(clip){
 return clip?.frameDurations?.reduce((sum,value)=>sum+value,0)??(clip?.frames?.length??0)/Math.max(.01,clip?.fps??1);
}
// Desired game states remain idle/sit. The renderer owns only the short visual
// transition, so movement, attacks and hits can interrupt it on the next draw.
export function createPosturePlayback(){
 let requested=null,settled='idle',transition=null,lastTime=0;
 const target=mode=>POSTURE_TRANSITIONS[mode]??mode;
 function reset(){requested=null;settled='idle';transition=null;lastTime=0;}
 function sample(mode,time=0,{clips={},reduced=false}={}){
  const now=Number.isFinite(time)?Math.max(0,time):0,wanted=target(mode);
  const valid=name=>!!clips[name]?.frames?.length&&animationClipDuration(clips[name])>0;
  if(reduced){requested=mode;settled=wanted;transition=null;lastTime=now;return {mode:wanted,time:now,transition:false};}
  const changed=mode!==requested,rewound=!changed&&now<lastTime;
  if(changed||rewound){
   const previous=transition,previousProgress=previous?Math.max(0,Math.min(1,(lastTime-previous.start)/previous.duration)):1;
   let action=Object.hasOwn(POSTURE_TRANSITIONS,mode)?mode:
    previous&&previous.to!==wanted&&wanted==='sit'?'sitDown':
    wanted==='sit'&&settled!=='sit'?'sitDown':
    wanted==='idle'&&(settled==='sit'||previous?.to==='sit')?'standUp':null;
   // Reversing midway follows the matching point in the reverse authored clip.
   const reversing=previous&&action&&previous.to!==wanted&&['sit','idle'].includes(wanted);
   if(action&&valid(action)){
    const duration=animationClipDuration(clips[action]),offset=reversing?(1-previousProgress)*duration:0;
    transition={action,to:wanted,start:now-offset,duration};
   }else{transition=null;settled=wanted;}
   requested=mode;
  }
  lastTime=now;
  if(transition&&!valid(transition.action)){settled=transition.to;transition=null;}
  if(transition){
   const elapsed=Math.max(0,now-transition.start);
   if(elapsed<transition.duration)return {mode:transition.action,time:elapsed,transition:true};
   settled=transition.to;transition=null;
  }
  return {mode:settled,time:now,transition:false};
 }
 return {sample,reset};
}

export function canonicalAction(action){return action==='rest'?'sit':action;}
export function isPosture(action){return POSTURE_ACTIONS.includes(canonicalAction(action));}
export function activeEmote(emote,time=0){
 if(!emote||!Number.isFinite(emote.time))return null;
 const name=canonicalAction(emote.name);
 if(!EMOTE_ACTIONS.includes(name)||name==='idle')return null;
 return isPosture(name)||Math.max(0,time-emote.time)<EMOTE_SECONDS?{name,time:emote.time}:null;
}
export function actionChoice({moving=false,running=false,emote=null,time=0,hit=false,cast=false,attack=false,dead=false,guard=false}={}){
 if(dead)return 'idle';
 if(hit)return 'hit';
 if(cast)return typeof cast==='string'?cast:'cast';
 if(attack)return 'attack';
 // Motion always wins over an older network posture, including interpolation.
 if(moving)return running?'run':'walk';
 return activeEmote(emote,time)?.name??(guard?'guard':'idle');
}
export function supportsCharacterAction(action,supports){
 const name=canonicalAction(action);
 if(!['run','sit','sleep'].includes(name))return EMOTE_ACTIONS.includes(name)||name==='walk';
 return typeof supports==='function'&&supports(name)===true;
}
export function movementSpeed(base,run=false){return base*(run===true?RUN_MULTIPLIER:1);}

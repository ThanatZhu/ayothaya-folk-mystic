// Shared action rules for local prediction, remote avatars and the realm server.
// A cosmetic sleeping pose is separate from status.sleep (the combat ailment).
export const CHARACTER_ACTIONS=Object.freeze(['idle','walk','run','sit','sleep']);
export const POSTURE_ACTIONS=Object.freeze(['sit','sleep']);
export const EMOTE_ACTIONS=Object.freeze(['idle','bow','celebrate','guard','sit','sleep']);
export const EMOTE_SECONDS=4;
export const RUN_MULTIPLIER=1.35;

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

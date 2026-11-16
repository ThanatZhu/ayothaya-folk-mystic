import {attackDuration} from './combat-timing.js';
export function lobbyPose(time,classId,reduced=false){
 if(reduced)return {mode:'idle',time:0};
 const attack=attackDuration(classId),cycle=3.2+attack*2+.65,t=time%cycle;
 if(t<3.2)return {mode:'run',time:t};
 if(t<3.2+attack*2)return {mode:'attack',time:(t-3.2)%attack,variant:Math.floor((t-3.2)/attack)};
 return {mode:'idle',time:t};
}
export async function fetchCharacterPreviews(connection,url){
 const token=await connection.auth.currentUser.getIdToken();
 const target=new URL(url.replace(/^ws/,'http'));target.pathname='/character/previews';target.search='';
 const response=await fetch(target,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('preview-unavailable');
 const result=await response.json();if(result.schema!==1||!Array.isArray(result.characters))throw Error('preview-schema');
 return new Map(result.characters.map(s=>[s.slotId,s]));
}
export function previewStatus(s){return {who:{classId:s.character.classId,level:s.level,reborn:s.rebirth,pet:s.pet,food:s.food},stats:s.stats,gear:s.gear,points:s.points,derived:s.derived};}

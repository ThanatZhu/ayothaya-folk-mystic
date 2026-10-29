import {createRiggedSprite} from './rigged-sprite.js?v=gait220';
import {loadDirectionalArt} from './directional-sprite.js?v=size1';
import {createDirectionalActor} from './directional-actor.js?v=size1';
import {stableViewDirection} from './directional-motion.js';
import {normalizeEquipment,equipmentAppearance} from './equipment.js?v=41';
import {validateAppearance} from './appearance-state.js';
import {customizeAtlas} from './character-appearance.js?v=41';

// Keep the original equipment renderer available when a custom silhouette has
// no directional artwork. Never replace an equipped special weapon with a basic one.
export function directionalCompatibility(classId,appearance={},equipment=null){
 const gear=normalizeEquipment(equipment,classId),a=validateAppearance(appearance);
 if(gear.weapon.endsWith('-crafted'))return 'weapon';
 if(['garment','hair','hairColor','eyes'].some(k=>a[k]!=='original')||a.beard!=='none'||a.tattoo!=='none')return 'appearance';
 return null;
}

export function createPaintedAvatar(texture,options={}){
 const mesh=createRiggedSprite(texture,options),base={pose:mesh.userData.pose,setRig:mesh.userData.setRig,
  setEquipment:mesh.userData.setEquipment,setAppearance:mesh.userData.setAppearance,dispose:mesh.userData.dispose};
 let classId=options.classId??'novice',gender=options.gender??'male',appearance=options.appearance??{},equipment=options.equipment??null;
 const loadArt=options.directionalArtLoader??loadDirectionalArt;
 let actor=null,generation=0,disposed=false,preparing=false,pending=null,wanted=options.directional!==false,explicitFrame=false,context={direction:'S',mode:'idle',time:0};
 function visible(){
  const authoredWalk=context.mode==='walk'&&mesh.userData.supportsAuthoredAction('walk');
  const paintedAction=explicitFrame||authoredWalk||['attack','cast','guard','hit','dash','run','sit','sleep','rest','sitDown','standUp'].includes(context.mode)||mesh.userData.lifeTransition;
  const active=!!(!paintedAction&&!disposed&&!preparing&&wanted&&actor&&!mesh.userData.directionalReason);
  mesh.material.visible=!active;if(actor)actor.visible=active;
  mesh.userData.directionalActive=active;return active;
 }
 async function prepare(){
  const token=++generation,id=classId,g=gender;
  preparing=true;mesh.userData.directionalReady=false;
  mesh.userData.directionalReason=directionalCompatibility(id,appearance,equipment);visible();
  if(mesh.userData.directionalReason){preparing=false;return false;}
  try{
   const original=await loadArt(id);if(token!==generation||disposed)return false;
   const a=equipmentAppearance(appearance,equipment,id);let art=original;
   if(a.outfit&&a.outfit!=='original'){
    const frames={};for(const sex of ['male','female']){frames[sex]={};for(const [d,c] of Object.entries(original.frames[sex]))
     frames[sex][d]=customizeAtlas(c,{outfit:a.outfit},id,{columns:1,rows:1,anchors:[[50,38]]});}
    art={...original,frames};
   }
   // In-world actors are much smaller than the portrait lab. Keep enough mesh
   // density for rigid face/weapon masks without posing the showcase grid per player.
   const next=createDirectionalActor(art,{classId:id,gender:g,columns:32,rows:40});
   if(actor){mesh.remove(actor);actor.userData.dispose();}actor=next;mesh.add(actor);
   preparing=false;mesh.userData.directionalReady=true;mesh.userData.directionalError=null;visible();return true;
  }catch(error){if(token!==generation||disposed)return false;
   preparing=false;mesh.userData.directionalError=error.message;mesh.userData.directionalReason='load';visible();console.warn('Directional art unavailable; keeping original equipped artwork',error);return false;
  }
 }
 function requestPreparation(){pending=prepare();return pending;}
 const baseReady=mesh.userData.ready;
 mesh.userData.directionalReady=false;
 mesh.userData.setDirectional=value=>{wanted=!!value;if(!wanted)return Promise.resolve(visible());if(preparing)return pending.then(()=>visible());return actor&&!mesh.userData.directionalReason?Promise.resolve(visible()):requestPreparation();};
 mesh.userData.setFacing=(face,azimuth,options={})=>{context={...context,...options,direction:stableViewDirection(face,azimuth,context.direction)};};
 mesh.userData.pose=(pose={},flip=false)=>{
  explicitFrame=pose.profileFrame===true;
  // Direct pose callers (preview/NPCs) may not call setFacing first. The authored
  // action still decides when to leave the optional directional mesh.
  if(typeof pose.mode==='string')context={...context,mode:pose.mode,time:pose.time??context.time,phase:pose.phase,reduced:pose.reduced??false};
  // Update the base posture state even while the optional directional actor is
  // visible. Leaving sit for idle must finish standUp before returning to it.
  mesh.userData.directional=false;base.pose({...pose,viewDirection:context.direction},flip);
  if(visible()){
   actor.material.color.copy(mesh.material.color);
   actor.userData.pose(pose,context);
  }
 };
 mesh.userData.setRig=(id,g)=>{classId=id;gender=g;const load=base.setRig(id,g);return mesh.userData.ready=Promise.all([load,requestPreparation()]);};
 mesh.userData.setEquipment=async gear=>{const changed=await base.setEquipment(gear);if(!changed||disposed)return false;equipment=gear;await requestPreparation();return true;};
 // The base appearance setter calls the wrapped setRig, which refreshes both views.
 mesh.userData.setAppearance=a=>{appearance=a;return base.setAppearance(a);};
 mesh.userData.dispose=()=>{if(disposed)return;disposed=true;generation++;actor?.userData.dispose();visible();base.dispose();};
 mesh.userData.ready=Promise.all([baseReady,requestPreparation()]);
 return mesh;
}

import {paintedAttack224,warmPaintedAttacks224} from './painted-attack224.js';
import {loadPaintedGait220,gaitFits220,gaitFrame220} from './painted-gait220.js';
import {FRAME_SIZE,FRAME_FOOT,LOGICAL_SIZE} from './character-size.js?v=size1';
import * as THREE from './vendor/build/three.module.js';
import {loadPaintedCharacter} from './painted-character.js?v=size1';
import {FRAME_COUNT} from './animation-frames.js?v=37';
import {loadLifeArt,lifeFrameAt,mapFrames,builtFrames} from './character-life-art.js?v=106.0';
import {createPosturePlayback} from './character-action-state.js?v=106.0';
import {poseTexture,poseScale,posesFit} from './skill-pose-art.js?v=pose119';
// Complete painted silhouettes: no mesh cuts through anatomical joints.
export function createRiggedSprite(texture,{classId='novice',gender='male',appearance={},equipment=null,paintedArtLoader=loadPaintedCharacter,lifeArtLoader=loadLifeArt,gaitArtLoader=loadPaintedGait220,attackArtSampler=paintedAttack224,preloadAttackArt=false}={}){
 const geometry=new THREE.PlaneGeometry(1,1);geometry.translate(0,.5,0);
 const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.45,transparent:false,depthWrite:true,side:THREE.DoubleSide,color:'#fff1da'});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
 const posture=createPosturePlayback();let transitionFlip=null;
 let frames=null,life=null,gait=null,version=0,disposed=false,currentClass=classId,currentGender=gender,loadedGender=gender,currentAppearance=appearance,loadedClass=null,appearanceDirty=false,poseFit=false;
 const textureFor=cell=>{const t=new THREE.CanvasTexture(cell);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;};
 function release(){
  // Idle/sit/sleep clips can reuse the same canvas and therefore GPU texture.
  const owned=new Set(frames?Object.values(frames).flat():[]);
  if(life)for(const art of Object.values(life))if(art)for(const clip of Object.values(art.clips))for(const texture of builtFrames(clip.frames))owned.add(texture);
  owned.forEach(t=>t.dispose());frames=null;life=null;gait=null;
 }
 // 0.122 only the gender on screen: the other one doubled every hero's canvases (setRig reloads on a change)
 async function loadLife(id,look,gear,shown){
  return {[shown]:await lifeArtLoader(`${id}-${shown}`,{classId:id,appearance:look,equipment:gear})};
 }
 function textures(art){
  if(!art)return null;
  const converted=new Map(),convert=cell=>{if(!converted.has(cell))converted.set(cell,textureFor(cell));return converted.get(cell);};
  return {...art,clips:Object.fromEntries(Object.entries(art.clips).map(([name,clip])=>[name,{...clip,frames:mapFrames(clip.frames,convert)}]))};
 }
 function install(art,newLife,id,gear,shown,newGait=null){
  const next={[shown]:(art[shown]??[]).map(textureFor)};
  const nextLife=newLife&&Object.fromEntries(Object.entries(newLife).map(([key,value])=>[key,textures(value)]));
  release();frames=next;life=nextLife;gait=newGait;loadedClass=id;loadedGender=shown;appearanceDirty=false;poseFit=posesFit(id,currentAppearance,gear);
  material.map=frames[loadedGender][Math.min(mesh.userData.artFrame??0,frames[loadedGender].length-1)];
  if(preloadAttackArt&&poseFit)void warmPaintedAttacks224(id,shown);
  mesh.userData.artReady=true;mesh.userData.lifeAction=null;delete mesh.userData.artError;
 }
 async function artwork(id,look,gear){
  const shown=currentGender,[art,result,nextGait]=await Promise.all([paintedArtLoader(id,look,gear),loadLife(id,look,gear,shown).then(value=>({value}),error=>({error})),
   gaitFits220(id,shown,look,gear)?Promise.resolve().then(()=>gaitArtLoader(id,shown)).then(value=>({value}),error=>({error})):Promise.resolve({value:null})]);
  return {art,shown,newLife:result.value??null,lifeError:result.error?.message??null,newGait:nextGait.value??null,gaitError:nextGait.error?.message??null};
 }

 const activeGait=()=>loadedClass===currentClass&&loadedGender===currentGender&&!appearanceDirty&&poseFit?gait:null;
 mesh.userData.usesAuthoredGround=mode=>!!activeGait()?.clips[mode]||(mode==='attack'&&!!mesh.userData.attackArt224);
 mesh.userData.supportsAuthoredAction=action=>!!activeGait()?.clips[action]||!!life?.[loadedGender]?.clips[action]?.frames.length;
 mesh.userData.supportsAction=action=>['idle','walk'].includes(action)||mesh.userData.supportsAuthoredAction(action);
 mesh.userData.setRig=(id,g)=>{
  if(disposed)return Promise.resolve(false);
  currentGender=g;
  if(id===currentClass&&id===loadedClass&&g===loadedGender&&frames&&!appearanceDirty)return mesh.userData.ready;
  currentClass=id;const token=++version;mesh.userData.artReady=!!frames;delete mesh.userData.artError;
  if(typeof document==='undefined'&&paintedArtLoader===loadPaintedCharacter)return mesh.userData.ready=Promise.resolve(false);
  mesh.userData.ready=artwork(id,currentAppearance,equipment).then(({art,shown,newLife,lifeError,newGait,gaitError})=>{
   if(disposed||token!==version)return false;
   install(art,newLife,id,equipment,shown,newGait);mesh.userData.lifeError=lifeError;mesh.userData.gaitError=gaitError;
   return shown===currentGender||mesh.userData.setRig(currentClass,currentGender); // switched back while loading
  }).catch(error=>{if(disposed||token!==version)return false;mesh.userData.artError=error.message;console.error('Character animation artwork failed',id,error);return false;});
  return mesh.userData.ready;
 };
 mesh.userData.setAppearance=a=>{currentAppearance=a;appearanceDirty=true;return mesh.userData.setRig(currentClass,currentGender);};
 // Load before swapping: a failed asset request must not leave a half-equipped hero.
 mesh.userData.setEquipment=async value=>{
  if(disposed)return false;
  const token=++version;
  const id=currentClass,{art,shown,newLife,lifeError,newGait,gaitError}=await artwork(id,currentAppearance,value);
  if(disposed||token!==version)return false;
  install(art,newLife,id,value,shown,newGait);equipment=value;mesh.userData.lifeError=lifeError;mesh.userData.gaitError=gaitError;return true;
 };
 mesh.userData.rigType='painted-frames';
 mesh.onBeforeRender=(_r,_s,camera)=>{mesh.quaternion.copy(camera.quaternion);mesh.updateMatrixWorld();};
 mesh.userData.pose=(pose,flip=false)=>{
  if(disposed)return;
  const requested=pose.mode==='rest'?'sit':pose.mode??'idle';
  const resolved=posture.sample(requested,pose.time??0,{clips:life?.[loadedGender]?.clips??{},reduced:pose.reduced});
  const action=resolved.mode,clip=life?.[loadedGender]?.clips[action];
  if(resolved.transition){transitionFlip??=flip;flip=transitionFlip;}else transitionFlip=null;
  const clipDuration=clip?.frameDurations?.reduce((a,b)=>a+b,0)??(clip?.frames.length??0)/(clip?.fps??1);
  const clipTime=action==='attack'&&Number.isFinite(pose.actionPhase)?Math.min(.999999,Math.max(0,pose.actionPhase))*clipDuration:['run','walk'].includes(action)&&Number.isFinite(pose.phase)?(((pose.phase%1)+1)%1)*clipDuration:resolved.time;
  const lifeIndex=pose.profileFrame?-1:lifeFrameAt(clip,clipTime,pose.reduced);
  let frame=Math.max(0,Math.min(FRAME_COUNT-1,Math.round(pose.artFrame??0)));
  // Front/back walk only where that art exists; otherwise the side cycle (with its left/right flip).
  // A class without front/back art: walking falls back to the side cycle, standing to the original idle frame.
  const missing=frames&&frame>=frames[loadedGender].length;if(missing)frame=pose.stand?0:12+(frame-12)%8;
  if(frame>=20&&lifeIndex<0)flip=false; // front/back walk art is drawn facing the camera / away from it
  // 0.119 a skill with its own pose sheet draws it; until it loads, or for gear the sheet cannot show, the class frames play.
  const skill=pose.skillArt,art=skill&&poseFit&&frames&&!mesh.userData.directional&&loadedClass===currentClass?poseTexture(skill.id,currentClass,currentGender,skill.frame):null;
  const basic=action==='attack'&&pose.basicAttack224&&poseFit&&loadedClass===currentClass&&loadedGender===currentGender&&!appearanceDirty?attackArtSampler(currentClass,currentGender,{...pose,mode:action}):null;
  mesh.userData.attackArt224=basic?{variant:basic.variant,direction:basic.direction,frame:basic.frame,castId:basic.castId,tier:basic.tier}:null;
  const selected=!pose.profileFrame&&!resolved.transition&&!mesh.userData.directional&&activeGait()?gaitFrame220({mode:action,phase:pose.phase,time:resolved.time,direction:pose.viewDirection,reduced:pose.reduced}):null;
  const gaitTexture=selected?activeGait().clips[action]?.frames[selected.direction]?.[selected.index]:null;
  mesh.userData.paintedGait217=gaitTexture?selected:null;mesh.userData.paintedGait220=mesh.userData.paintedGait217;
  if(gaitTexture||basic)flip=false; // All eight camera-relative views are authored in the atlas.
  mesh.userData.skillArt=art?skill.id:null;
  if(!mesh.userData.directional&&frames){
   material.map=basic?.texture??gaitTexture??art??(lifeIndex>=0?clip.frames[lifeIndex]:frames[loadedGender][frame]);
   mesh.userData.artFrame=frame;mesh.userData.lifeAction=lifeIndex>=0?action:null;mesh.userData.lifeFrame=lifeIndex;mesh.userData.lifeTransition=resolved.transition;
  }
  // Pose cells share the 320 frame and its ground anchor; their scale brings the standing body to the class frames' height.
  const painted=frames&&!mesh.userData.directional,size=art?poseScale(skill.id,currentGender):1,extent=basic?basic.extent:gaitTexture?activeGait().extent:painted?size*FRAME_SIZE/LOGICAL_SIZE:1;
  const positions=geometry.attributes.position,foot=basic?basic.footV*extent:gaitTexture?activeGait().footV*extent:mesh.userData.directional?(mesh.userData.footV??1):painted?size*FRAME_FOOT/LOGICAL_SIZE:1;
  // A sub-pixel breath about the planted contact; no joint cuts, moving bag or gait deformation.
  const breath=pose.reduced?1:['idle','sit','sleep','rest'].includes(action)?1+Math.sin((pose.time??0)*Math.PI*2/(action==='sleep'?4.8:4.1))*.0025:1;
  positions.setXYZ(0,(flip?.5:-.5)*extent,foot*breath,0);positions.setXYZ(1,(flip?-.5:.5)*extent,foot*breath,0);
  positions.setXYZ(2,(flip?.5:-.5)*extent,(foot-extent)*breath,0);positions.setXYZ(3,(flip?-.5:.5)*extent,(foot-extent)*breath,0);// Cosmetic weight transfer follows facing, while combat position and hit range stay unchanged.
  if(currentClass==='novice'&&!pose.reduced&&!basic){const dx=(pose.paintOffsetX??0)*(flip?-1:1),dy=pose.paintOffsetY??0;for(let i=0;i<positions.count;i++)positions.setXYZ(i,positions.getX(i)+dx,positions.getY(i)+dy,0);}
  positions.needsUpdate=true;
 };
 mesh.userData.dispose=()=>{if(disposed)return;disposed=true;version++;release();geometry.dispose();material.dispose();};
 mesh.userData.setRig(classId,gender);return mesh;
}

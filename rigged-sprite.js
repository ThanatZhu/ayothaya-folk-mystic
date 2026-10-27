import {FRAME_SIZE,FRAME_FOOT,LOGICAL_SIZE} from './character-size.js?v=size1';
import * as THREE from './vendor/build/three.module.js';
import {loadPaintedCharacter} from './painted-character.js?v=size1';
import {FRAME_COUNT} from './animation-frames.js?v=37';
import {loadLifeArt,lifeFrameAt} from './character-life-art.js?v=106.0';
import {createPosturePlayback} from './character-action-state.js?v=106.0';
import {poseTexture,poseScale,posesFit} from './skill-pose-art.js?v=pose119';
// Complete painted silhouettes: no mesh cuts through anatomical joints.
export function createRiggedSprite(texture,{classId='novice',gender='male',appearance={},equipment=null,paintedArtLoader=loadPaintedCharacter,lifeArtLoader=loadLifeArt}={}){
 const geometry=new THREE.PlaneGeometry(1,1);geometry.translate(0,.5,0);
 const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.45,transparent:false,depthWrite:true,side:THREE.DoubleSide,color:'#fff1da'});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
 const posture=createPosturePlayback();let transitionFlip=null;
 let frames=null,life=null,version=0,disposed=false,currentClass=classId,currentGender=gender,currentAppearance=appearance,loadedClass=null,appearanceDirty=false,poseFit=false;
 const textureFor=cell=>{const t=new THREE.CanvasTexture(cell);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;};
 function release(){
  // Idle/sit/sleep clips can reuse the same canvas and therefore GPU texture.
  const owned=new Set(frames?Object.values(frames).flat():[]);
  if(life)for(const art of Object.values(life))if(art)for(const clip of Object.values(art.clips))for(const texture of clip.frames)owned.add(texture);
  owned.forEach(t=>t.dispose());frames=null;life=null;
 }
 async function loadLife(id,look,gear){
  return Object.fromEntries(await Promise.all(['male','female'].map(async gender=>{
   const art=await lifeArtLoader(`${id}-${gender}`,{classId:id,appearance:look,equipment:gear});
   return [gender,art];
  })));
 }
 function textures(art){
  if(!art)return null;
  const converted=new Map(),convert=cell=>{if(!converted.has(cell))converted.set(cell,textureFor(cell));return converted.get(cell);};
  return {...art,clips:Object.fromEntries(Object.entries(art.clips).map(([name,clip])=>[name,{...clip,frames:clip.frames.map(convert)}]))};
 }
 function install(art,newLife,id,gear=equipment){
  const next=Object.fromEntries(Object.entries(art).map(([key,cells])=>[key,cells.map(textureFor)]));
  const nextLife=newLife&&Object.fromEntries(Object.entries(newLife).map(([key,value])=>[key,textures(value)]));
  release();frames=next;life=nextLife;loadedClass=id;appearanceDirty=false;poseFit=posesFit(id,currentAppearance,gear);
  material.map=frames[currentGender][Math.min(mesh.userData.artFrame??0,frames[currentGender].length-1)];
  mesh.userData.artReady=true;mesh.userData.lifeAction=null;delete mesh.userData.artError;
 }
 async function artwork(id,look,gear){
  const [art,result]=await Promise.all([paintedArtLoader(id,look,gear),loadLife(id,look,gear).then(value=>({value}),error=>({error}))]);
  return {art,newLife:result.value??null,lifeError:result.error?.message??null};
 }
 mesh.userData.supportsAuthoredAction=action=>!!life?.[currentGender]?.clips[action]?.frames.length;
 mesh.userData.supportsAction=action=>['idle','walk'].includes(action)||mesh.userData.supportsAuthoredAction(action);
 mesh.userData.setRig=(id,g)=>{
  if(disposed)return Promise.resolve(false);
  currentGender=g;
  if(id===currentClass&&id===loadedClass&&frames&&!appearanceDirty)return mesh.userData.ready;
  currentClass=id;const token=++version;mesh.userData.artReady=!!frames;delete mesh.userData.artError;
  if(typeof document==='undefined'&&paintedArtLoader===loadPaintedCharacter)return mesh.userData.ready=Promise.resolve(false);
  mesh.userData.ready=artwork(id,currentAppearance,equipment).then(({art,newLife,lifeError})=>{
   if(disposed||token!==version)return false;
   install(art,newLife,id);mesh.userData.lifeError=lifeError;return true;
  }).catch(error=>{if(disposed||token!==version)return false;mesh.userData.artError=error.message;console.error('Character animation artwork failed',id,error);return false;});
  return mesh.userData.ready;
 };
 mesh.userData.setAppearance=a=>{currentAppearance=a;appearanceDirty=true;return mesh.userData.setRig(currentClass,currentGender);};
 // Load before swapping: a failed asset request must not leave a half-equipped hero.
 mesh.userData.setEquipment=async value=>{
  if(disposed)return false;
  const token=++version;
  const id=currentClass,{art,newLife,lifeError}=await artwork(id,currentAppearance,value);
  if(disposed||token!==version)return false;
  install(art,newLife,id,value);equipment=value;mesh.userData.lifeError=lifeError;return true;
 };
 mesh.userData.rigType='painted-frames';
 mesh.onBeforeRender=(_r,_s,camera)=>{mesh.quaternion.copy(camera.quaternion);mesh.updateMatrixWorld();};
 mesh.userData.pose=(pose,flip=false)=>{
  if(disposed)return;
  const requested=pose.mode==='rest'?'sit':pose.mode??'idle';
  const resolved=posture.sample(requested,pose.time??0,{clips:life?.[currentGender]?.clips??{},reduced:pose.reduced});
  const action=resolved.mode,clip=life?.[currentGender]?.clips[action];
  if(resolved.transition){transitionFlip??=flip;flip=transitionFlip;}else transitionFlip=null;
  const clipDuration=clip?.frameDurations?.reduce((a,b)=>a+b,0)??(clip?.frames.length??0)/(clip?.fps??1);
  const clipTime=action==='attack'&&Number.isFinite(pose.actionPhase)?Math.min(.999999,Math.max(0,pose.actionPhase))*clipDuration:['run','walk'].includes(action)&&Number.isFinite(pose.phase)?(((pose.phase%1)+1)%1)*clipDuration:resolved.time;
  const lifeIndex=pose.profileFrame?-1:lifeFrameAt(clip,clipTime,pose.reduced);
  let frame=Math.max(0,Math.min(FRAME_COUNT-1,Math.round(pose.artFrame??0)));
  // Front/back walk only where that art exists; otherwise the side cycle (with its left/right flip).
  // A class without front/back art: walking falls back to the side cycle, standing to the original idle frame.
  const missing=frames&&frame>=frames[currentGender].length;if(missing)frame=pose.stand?0:12+(frame-12)%8;
  if(frame>=20&&lifeIndex<0)flip=false; // front/back walk art is drawn facing the camera / away from it
  // 0.119 a skill with its own pose sheet draws it; until it loads, or for gear the sheet cannot show, the class frames play.
  const skill=pose.skillArt,art=skill&&poseFit&&frames&&!mesh.userData.directional&&loadedClass===currentClass?poseTexture(skill.id,currentClass,currentGender,skill.frame):null;
  mesh.userData.skillArt=art?skill.id:null;
  if(!mesh.userData.directional&&frames){
   material.map=art??(lifeIndex>=0?clip.frames[lifeIndex]:frames[currentGender][frame]);
   mesh.userData.artFrame=frame;mesh.userData.lifeAction=lifeIndex>=0?action:null;mesh.userData.lifeFrame=lifeIndex;mesh.userData.lifeTransition=resolved.transition;
  }
  // Pose cells share the 320 frame and its ground anchor; their scale brings the standing body to the class frames' height.
  const painted=frames&&!mesh.userData.directional,size=art?poseScale(skill.id,currentGender):1,extent=painted?size*FRAME_SIZE/LOGICAL_SIZE:1;
  const positions=geometry.attributes.position,foot=mesh.userData.directional?(mesh.userData.footV??1):painted?size*FRAME_FOOT/LOGICAL_SIZE:1;
  // A sub-pixel breath about the planted contact; no joint cuts, moving bag or gait deformation.
  const breath=pose.reduced?1:['idle','sit','sleep','rest'].includes(action)?1+Math.sin((pose.time??0)*Math.PI*2/(action==='sleep'?4.8:4.1))*.0025:1;
  positions.setXYZ(0,(flip?.5:-.5)*extent,foot*breath,0);positions.setXYZ(1,(flip?-.5:.5)*extent,foot*breath,0);
  positions.setXYZ(2,(flip?.5:-.5)*extent,(foot-extent)*breath,0);positions.setXYZ(3,(flip?-.5:.5)*extent,(foot-extent)*breath,0);// Cosmetic weight transfer follows facing, while combat position and hit range stay unchanged.
  if(currentClass==='novice'&&!pose.reduced){const dx=(pose.paintOffsetX??0)*(flip?-1:1),dy=pose.paintOffsetY??0;for(let i=0;i<positions.count;i++)positions.setXYZ(i,positions.getX(i)+dx,positions.getY(i)+dy,0);}
  positions.needsUpdate=true;
 };
 mesh.userData.dispose=()=>{if(disposed)return;disposed=true;version++;release();geometry.dispose();material.dispose();};
 mesh.userData.setRig(classId,gender);return mesh;
}

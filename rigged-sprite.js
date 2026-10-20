import {FRAME_SIZE,FRAME_FOOT,LOGICAL_SIZE} from './character-size.js?v=size1';
import * as THREE from './vendor/build/three.module.js';
import {loadPaintedCharacter} from './painted-character.js?v=size1';
import {FRAME_COUNT} from './animation-frames.js?v=37';
// Complete painted silhouettes: no mesh cuts through anatomical joints.
export function createRiggedSprite(texture,{classId='novice',gender='male',appearance={},equipment=null}={}){
 const geometry=new THREE.PlaneGeometry(1,1);geometry.translate(0,.5,0);
 const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.45,transparent:false,depthWrite:true,side:THREE.DoubleSide,color:'#fff1da'});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
 let frames=null,version=0,disposed=false,currentClass=classId,currentGender=gender,currentAppearance=appearance;
 function release(){if(frames)Object.values(frames).flat().forEach(t=>t.dispose());frames=null;}
 mesh.userData.setRig=(id,g)=>{
  currentGender=g;
  if(id===currentClass&&frames)return mesh.userData.ready;
  currentClass=id;const token=++version;release();mesh.userData.artReady=false;delete mesh.userData.artError;
  if(typeof document==='undefined')return Promise.resolve();
  mesh.userData.ready=loadPaintedCharacter(id,currentAppearance,equipment).then(art=>{
   if(disposed||token!==version)return;
   frames=Object.fromEntries(Object.entries(art).map(([key,cells])=>[key,cells.map(cell=>{
    const t=new THREE.CanvasTexture(cell);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;
   })]));mesh.userData.artReady=true;
  }).catch(error=>{mesh.userData.artError=error.message;console.error('Character animation artwork failed',id,error);});
  return mesh.userData.ready;
 };
 mesh.userData.setAppearance=a=>{currentAppearance=a;release();return mesh.userData.setRig(currentClass,currentGender);};
 // Load before swapping: a failed asset request must not leave a half-equipped hero.
 mesh.userData.setEquipment=async value=>{
  const token=++version;
  const art=await loadPaintedCharacter(currentClass,currentAppearance,value);
  if(disposed||token!==version)return false;
  const next=Object.fromEntries(Object.entries(art).map(([key,cells])=>[key,cells.map(cell=>{
   const t=new THREE.CanvasTexture(cell);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;
  })]));
  release();frames=next;equipment=value;material.map=frames[currentGender][mesh.userData.artFrame??0];mesh.userData.artReady=true;return true;
 };
 mesh.userData.rigType='painted-frames';
 mesh.onBeforeRender=(_r,_s,camera)=>{mesh.quaternion.copy(camera.quaternion);mesh.updateMatrixWorld();};
 mesh.userData.pose=(pose,flip=false)=>{
  let frame=Math.max(0,Math.min(FRAME_COUNT-1,Math.round(pose.artFrame??0)));
  // Front/back walk only where that art exists; otherwise the side cycle (with its left/right flip).
  // A class without front/back art: walking falls back to the side cycle, standing to the original idle frame.
  const missing=frames&&frame>=frames[currentGender].length;if(missing)frame=pose.stand?0:12+(frame-12)%8;
  if(frame>=20)flip=false; // front/back walk art is drawn facing the camera / away from it
  if(!mesh.userData.directional&&frames){material.map=frames[currentGender][frame];mesh.userData.artFrame=frame;}
  const painted=frames&&!mesh.userData.directional,extent=painted?FRAME_SIZE/LOGICAL_SIZE:1;
  const positions=geometry.attributes.position,foot=mesh.userData.directional?(mesh.userData.footV??1):painted?FRAME_FOOT/LOGICAL_SIZE:1;
  positions.setXYZ(0,(flip?.5:-.5)*extent,foot,0);positions.setXYZ(1,(flip?-.5:.5)*extent,foot,0);
  positions.setXYZ(2,(flip?.5:-.5)*extent,foot-extent,0);positions.setXYZ(3,(flip?-.5:.5)*extent,foot-extent,0);positions.needsUpdate=true;
 };
 mesh.userData.dispose=()=>{disposed=true;version++;release();geometry.dispose();material.dispose();};
 mesh.userData.setRig(classId,gender);return mesh;
}

import * as THREE from './vendor/build/three.module.js';
import {loadPaintedCharacter} from './painted-character.js?v=37';
import {FRAME_COUNT} from './animation-frames.js?v=37';
// Complete painted silhouettes: no mesh cuts through anatomical joints.
export function createRiggedSprite(texture,{classId='novice',gender='male',appearance={}}={}){
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
  mesh.userData.ready=loadPaintedCharacter(id,currentAppearance).then(art=>{
   if(disposed||token!==version)return;
   frames=Object.fromEntries(Object.entries(art).map(([key,cells])=>[key,cells.map(cell=>{
    const t=new THREE.CanvasTexture(cell);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;
   })]));mesh.userData.artReady=true;
  }).catch(error=>{mesh.userData.artError=error.message;console.error('Character animation artwork failed',id,error);});
  return mesh.userData.ready;
 };
 mesh.userData.setAppearance=a=>{currentAppearance=a;release();return mesh.userData.setRig(currentClass,currentGender);};
 mesh.userData.rigType='painted-frames';
 mesh.onBeforeRender=(_r,_s,camera)=>{mesh.quaternion.copy(camera.quaternion);mesh.updateMatrixWorld();};
 mesh.userData.pose=(pose,flip=false)=>{
  const frame=Math.max(0,Math.min(FRAME_COUNT-1,Math.round(pose.artFrame??0)));
  if(!mesh.userData.directional&&frames){material.map=frames[currentGender][frame];mesh.userData.artFrame=frame;}
  const positions=geometry.attributes.position,foot=mesh.userData.directional?(mesh.userData.footV??1):frames?244/256:1;
  positions.setXYZ(0,flip?.5:-.5,foot,0);positions.setXYZ(1,flip?-.5:.5,foot,0);
  positions.setXYZ(2,flip?.5:-.5,foot-1,0);positions.setXYZ(3,flip?-.5:.5,foot-1,0);positions.needsUpdate=true;
 };
 mesh.userData.dispose=()=>{disposed=true;version++;release();geometry.dispose();material.dispose();};
 mesh.userData.setRig(classId,gender);return mesh;
}

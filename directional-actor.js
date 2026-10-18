import * as THREE from './vendor/build/three.module.js';
import {DIRECTIONS} from './directional-sprite.js';
import {directionalRigDefinition,directionalSkinWeights,directionalPose,sampleDirectionalRig,directionalRigPoint,stableViewDirection} from './directional-motion.js';

// One connected textured mesh. The original PNGs and their UVs are never edited.
// Each view has its own skeleton/masks; view changes select real rear/side art.
export function createDirectionalActor(art,{classId='novice',gender='male',direction='S',color='#fff1da',columns=48,rows=56,bodyScale=210/256/(172/192),billboard=true}={}){
 if(!art?.frames||!DIRECTIONS.includes(direction))throw new Error('directional-actor-art');
 columns=Math.max(16,Math.min(96,Math.floor(columns)));rows=Math.max(20,Math.min(112,Math.floor(rows)));
 if(!Number.isFinite(columns)||!Number.isFinite(rows)||!Number.isFinite(bodyScale)||bodyScale<=0)throw new Error('directional-actor-size');
 const footV=art.footV??(art.manifest?.anchor?.[1]??180)/(art.manifest?.cell??192);
 const geometry=new THREE.PlaneGeometry(1,1,columns,rows),position=geometry.attributes.position,uv=geometry.attributes.uv;
 const source=Array.from({length:position.count},(_,i)=>[uv.getX(i),1-uv.getY(i)]);
 const material=new THREE.MeshBasicMaterial({alphaTest:.45,transparent:false,depthWrite:true,side:THREE.DoubleSide,color});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
 const textures=new Map(),rigs=new Map();let disposed=false,currentGender=gender,currentDirection=direction;
 function select(g,d){
  const canvas=art.frames[g]?.[d];if(!canvas)throw new Error('directional-actor-missing-view:'+g+'/'+d);
  const key=g+'/'+d;
  if(!textures.has(key)){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;textures.set(key,t);}
  if(!rigs.has(key)){const rig=directionalRigDefinition(classId,g,d,art.manifest?.frames?.[g]?.[d]?.rig??{});rigs.set(key,{rig,weights:source.map(([u,v])=>directionalSkinWeights(rig,u,v))});}
  currentGender=g;currentDirection=d;material.map=textures.get(key);mesh.userData.direction=d;mesh.userData.gender=g;return rigs.get(key);
 }
 function renderPose(input={},options={}){
  if(disposed)return false;
  const selected=select(options.gender??currentGender,options.direction??currentDirection);
  const pose=directionalPose({classId,direction:currentDirection,...options,pose:options.usePose===false?null:input});
  const matrices=sampleDirectionalRig(selected.rig,pose);
  for(let i=0;i<source.length;i++){const [u,v]=source[i],q=directionalRigPoint(u,v,selected.weights[i],matrices);position.setXYZ(i,(q.x-.5)*bodyScale,(footV-q.y)*bodyScale,0);}
  position.needsUpdate=true;mesh.userData.lastPose=pose;return true;
 }
 mesh.userData.rigType='directional-rig';mesh.userData.classId=classId;mesh.userData.directional=true;mesh.userData.footV=footV;mesh.userData.bodyScale=bodyScale;mesh.userData.artReady=true;
 mesh.userData.pose=(pose={},options={})=>renderPose(pose,typeof options==='object'?options:{});
 mesh.userData.update=(options={})=>{
  const d=options.direction??stableViewDirection(options.face,options.azimuth,currentDirection);
  return renderPose(options.pose??{}, {...options,direction:d,usePose:!!options.pose});
 };
 mesh.userData.setGender=value=>renderPose({}, {gender:value,reduced:true});
 mesh.userData.setDirection=value=>renderPose({}, {direction:value,reduced:true});
 mesh.userData.dispose=()=>{if(disposed)return;disposed=true;for(const t of textures.values())t.dispose();textures.clear();rigs.clear();geometry.dispose();material.dispose();};
 const worldCamera=new THREE.Quaternion(),worldParent=new THREE.Quaternion();
 mesh.onBeforeRender=(_renderer,_scene,camera)=>{if(!billboard)return;camera.getWorldQuaternion(worldCamera);if(mesh.parent){mesh.parent.getWorldQuaternion(worldParent);mesh.quaternion.copy(worldParent).invert().multiply(worldCamera);}else mesh.quaternion.copy(worldCamera);mesh.updateMatrixWorld();};
 renderPose({}, {reduced:true});return mesh;
}

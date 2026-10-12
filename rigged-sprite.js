import * as THREE from 'three';
import {deformPoint} from './character-motion.js?v=15';
export function createRiggedSprite(texture){
 const geometry=new THREE.PlaneGeometry(1,1,16,24),base=geometry.attributes.position.array.slice();
 const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.45,transparent:false,depthWrite:true,side:THREE.DoubleSide,color:'#fff1da'});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
 mesh.onBeforeRender=(_r,_s,camera)=>{mesh.quaternion.copy(camera.quaternion);mesh.updateMatrixWorld();};
 mesh.userData.pose=(pose,flip=false)=>{
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const u=base[i*3]+.5,v=.5-base[i*3+1],q=deformPoint(u,v,pose);
   positions.setXYZ(i,(q.x-.5)*(flip?-1:1),(mesh.userData.footV??1)-q.y,0);
  }
  positions.needsUpdate=true;
 };
 return mesh;
}

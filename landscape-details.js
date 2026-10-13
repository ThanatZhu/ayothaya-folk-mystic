import * as THREE from 'three';

export function roadDistance(x,z,map){
 let distance=Infinity;
 for(const r of map.roads??[]){const [ax,az]=r.a,[bx,bz]=r.b,dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));distance=Math.min(distance,Math.hypot(x-ax-t*dx,z-az-t*dz)-r.width/2);}
 for(const [px,pz,rx,rz] of map.plazas??[])distance=Math.min(distance,(Math.hypot((x-px)/rx,(z-pz)/rz)-1)*Math.min(rx,rz));
 return distance;
}
export function createLandscapeDetails({scene,map}){
 let seed=2114;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const spots=[];const {x:bx,z:bz,w,d}=map.bounds;
 for(let tries=0;tries<22000&&spots.length<720;tries++){
  const x=bx+random()*w,z=bz+random()*d,edge=roadDistance(x,z,map);
  if(z>4.2||z<-104||x<-61||x>61||edge<.15||edge>2.5)continue;
  if(map.waterAreas.some(a=>x>a.x-.8&&x<a.x+a.w+.8&&z>a.z-.8&&z<a.z+a.d+.8))continue;
  if(map.nav.obstacles.some(a=>x>a.x-.5&&x<a.x+a.w+.5&&z>a.z-.5&&z<a.z+a.d+.5))continue;
  spots.push({x,z,size:.5+random()*.6});
 }
 const stoneGeometry=new THREE.DodecahedronGeometry(1,0);
 const stones=new THREE.InstancedMesh(stoneGeometry,new THREE.MeshStandardMaterial({color:'#b3aa8b',roughness:.96}),spots.length*2);
 stones.name='Weathered stones along path shoulders';stones.castShadow=true;stones.receiveShadow=true;
 const grassGeometry=new THREE.BufferGeometry();
 grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.08,0,0,.08,0,0,.03,.24,.02,0,.5,.07],3));grassGeometry.setIndex([0,1,2,0,2,3]);grassGeometry.computeVertexNormals();
 const time={value:0},grassMaterial=new THREE.MeshLambertMaterial({color:'#879859',side:THREE.DoubleSide});
 grassMaterial.onBeforeCompile=s=>{s.uniforms.meadowTime=time;s.vertexShader='uniform float meadowTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=position.y*position.y*.14*sin(meadowTime*1.2+instanceMatrix[3].x*.3+instanceMatrix[3].z*.4);');};grassMaterial.customProgramCacheKey=()=> 'roadside-grass21';
 const grass=new THREE.InstancedMesh(grassGeometry,grassMaterial,spots.length*6);grass.name='Windblown roadside tufts';grass.receiveShadow=true;
 const dummy=new THREE.Object3D(),color=new THREE.Color();let si=0,gi=0;
 for(const {x,z,size} of spots){
  for(let j=0;j<2;j++){dummy.position.set(x+(random()-.5)*.6,.065,z+(random()-.5)*.6);dummy.rotation.set(random()*.5,random()*6.28,random()*.3);dummy.scale.set(.12*size,.07*size,.18*size);dummy.updateMatrix();stones.setMatrixAt(si,dummy.matrix);stones.setColorAt(si++,color.setHSL(.10,.10,.65+random()*.25));}
  for(let j=0;j<6;j++){dummy.position.set(x+(random()-.5)*.45,.065,z+(random()-.5)*.45);dummy.rotation.set(0,random()*6.28,0);dummy.scale.setScalar(size*(.75+random()*.4));dummy.updateMatrix();grass.setMatrixAt(gi,dummy.matrix);grass.setColorAt(gi++,color.setHSL(.20+random()*.03,.26,.62+random()*.22));}
 }
 for(const mesh of [stones,grass]){mesh.computeBoundingSphere();scene.add(mesh);}
 return {update:t=>{time.value=t;}};
}

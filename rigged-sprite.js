import * as THREE from './vendor/build/three.module.js';
import {rigDefinition,skinWeights,sampleRig,jointBackings,boneLayer} from './character-rig.js?v=36';
export function createRiggedSprite(texture,{classId='novice',gender='male'}={}){
 // Duplicate the triangle vertices at anatomical boundaries. A sleeve/weapon
 // can overlap the torso without stretching a connecting strip of chest pixels.
 const grid=new THREE.PlaneGeometry(1,1,48,56),geometry=grid.toNonIndexed(),base=geometry.attributes.position.array.slice();grid.dispose();
 const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.45,transparent:false,depthWrite:true,side:THREE.DoubleSide,color:'#fff1da'});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
 let rig,weights,backings=[],backingBase=[],lastMap=null;
 const backingGeometry=new THREE.BufferGeometry(),backingMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),backing=new THREE.Mesh(backingGeometry,backingMaterial);backing.frustumCulled=false;mesh.add(backing);
 mesh.userData.setRig=(id,g)=>{rig=rigDefinition(id,g);weights=[];for(let i=0;i<base.length;i+=9){const u=(base[i]+base[i+3]+base[i+6])/3+.5,v=.5-(base[i+1]+base[i+4]+base[i+7])/3,w=skinWeights(rig,u,v).sort((a,b)=>b[1]-a[1])[0][0];weights.push(w);}
  backings=jointBackings(rig);backingBase=[];const vertices=[];
  for(const [index,s] of backings.entries()){
   const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,angle=Math.atan2(dy,dx),points=[];
   for(let i=0;i<=8;i++){const r=angle-Math.PI/2+Math.PI*i/8;points.push({x:s.b.x+Math.cos(r)*s.r,y:s.b.y+Math.sin(r)*s.r});}
   for(let i=0;i<=8;i++){const r=angle+Math.PI/2+Math.PI*i/8;points.push({x:s.a.x+Math.cos(r)*s.r,y:s.a.y+Math.sin(r)*s.r});}
   const center={x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2};
   for(let i=0;i<points.length;i++)for(const p of [center,points[i],points[(i+1)%points.length]]){backingBase.push({...p,index});vertices.push(0,0,0);}
  }
  backingGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));backingGeometry.setAttribute('color',new THREE.Float32BufferAttribute(vertices,3));lastMap=null;
 };
 mesh.userData.setRig(classId,gender);
 mesh.userData.rigType='articulated-2d';
 mesh.onBeforeRender=(_r,_s,camera)=>{mesh.quaternion.copy(camera.quaternion);mesh.updateMatrixWorld();};
 mesh.userData.pose=(pose,flip=false)=>{
  const positions=geometry.attributes.position,matrices=sampleRig(rig,pose);
  for(let i=0;i<positions.count;i++){
   const u=base[i*3]+.5,v=.5-base[i*3+1],m=matrices[weights[Math.floor(i/3)]],x=mesh.userData.directional?u:m[0]*u+m[2]*v+m[4],y=mesh.userData.directional?v:m[1]*u+m[3]*v+m[5];
   positions.setXYZ(i,(x-.5)*(flip?-1:1),(mesh.userData.footV??1)-y,mesh.userData.directional?0:boneLayer(weights[Math.floor(i/3)])*.001);
  }
  positions.needsUpdate=true;
  backing.visible=!mesh.userData.directional;
  if(material.map!==lastMap&&material.map?.image&&typeof document!=='undefined'){
   lastMap=material.map;const image=lastMap.image,c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,c.width,c.height).data,colors=backingGeometry.attributes.color;
   const palette=backings.map(s=>{let rgb=s.skin?[.74,.43,.24]:[.33,.28,.23],weight=0,sum=[0,0,0];const x=Math.round(s.sample.x*c.width),y=Math.round(s.sample.y*c.height);
    for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const k=((y+j)*c.width+x+i)*4;if(pixels[k+3]>180){weight++;for(let n=0;n<3;n++)sum[n]+=pixels[k+n]/255;}}if(weight)rgb=sum.map(v=>v/weight);return new THREE.Color(...rgb).convertSRGBToLinear();});
   backingBase.forEach((p,i)=>{const color=palette[p.index];colors.setXYZ(i,color.r,color.g,color.b);});colors.needsUpdate=true;
  }
  const bp=backingGeometry.attributes.position;
  backingBase.forEach((p,i)=>{const m=matrices[backings[p.index].bone],x=m[0]*p.x+m[2]*p.y+m[4],y=m[1]*p.x+m[3]*p.y+m[5];bp.setXYZ(i,(x-.5)*(flip?-1:1),(mesh.userData.footV??1)-y,-.002);});bp.needsUpdate=true;
  mesh.userData.joints=matrices;
 };
 mesh.userData.dispose=()=>{geometry.dispose();material.dispose();backingGeometry.dispose();backingMaterial.dispose();};
 return mesh;
}

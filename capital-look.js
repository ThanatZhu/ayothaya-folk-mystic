import * as THREE from 'three';

// World-space materials preserve soft path boundaries at every camera angle.
export function createCapitalLook({map,atlas,frame}){
 const tile=rect=>{const t=frame(atlas.image,rect,true);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=4;return t;};
 const grass=tile([0,0,.5,.5]),earth=tile([.5,0,.5,.5]),leaves=tile([0,.5,.5,.5]),roof=tile([.5,.5,.5,.5]);
 const time={value:0};
 const f=v=>Number(v).toFixed(3);
 const ground=new THREE.MeshLambertMaterial({color:'#fffef1'});ground.name='ground19';
 const roads=map.roads.map(r=>`d=min(d,segment19(p,vec2(${r.a.map(f)}),vec2(${r.b.map(f)}))-${f(r.width/2)});`).join('\n');
 const plazas=map.plazas.map(([x,z,rx,rz])=>`d=min(d,(length((p-vec2(${f(x)},${f(z)}))/vec2(${f(rx)},${f(rz)}))-1.)*${f(Math.min(rx,rz))});`).join('\n');
 ground.onBeforeCompile=s=>{
  s.uniforms.capitalGrass={value:grass};s.uniforms.capitalEarth={value:earth};
  s.vertexShader='varying vec2 vCapitalXZ;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCapitalXZ=(modelMatrix*vec4(transformed,1.)).xz;');
  s.fragmentShader=`varying vec2 vCapitalXZ;
   uniform sampler2D capitalGrass;uniform sampler2D capitalEarth;
   float hash19(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise19(vec2 p){vec2 i=floor(p),q=fract(p);q=q*q*(3.-2.*q);return mix(mix(hash19(i),hash19(i+vec2(1.,0.)),q.x),mix(hash19(i+vec2(0.,1.)),hash19(i+1.),q.x),q.y);}
   float segment19(vec2 p,vec2 a,vec2 b){vec2 q=p-a,v=b-a;return length(q-v*clamp(dot(q,v)/dot(v,v),0.,1.));}
   `+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=vCapitalXZ;float d=1000.;${roads}${plazas}
   float edge=noise19(p*.65)*1.35+noise19(p*2.1)*.25-.65;
   float meadow=smoothstep(-.65,.8,d+edge);
   vec3 g=texture2D(capitalGrass,p/8.).rgb;
   g=mix(g,texture2D(capitalGrass,vec2(-p.y,p.x)/13.+.17).rgb,.30);
   vec3 e=texture2D(capitalEarth,p/7.).rgb*vec3(.98,1.04,1.14);e=mix(e,vec3(.76,.74,.62),.12);
   float grain=noise19(p*17.);float patches=noise19(p*.7);
   e*=.95+.10*grain;
   e=mix(e,e*vec3(.80,.82,.79),smoothstep(.62,.84,patches)*.28);
   // Fine embedded aggregate and broken dirt edges, never a tiled checkerboard.
   float pebble=smoothstep(.82,.95,noise19(p*8.5));
   e=mix(e,vec3(.70,.66,.55),pebble*.21);
   diffuseColor.rgb*=mix(e,g,meadow)*( .92+.13*noise19(p*.13));
  `);
 };ground.customProgramCacheKey=()=> 'capital-ground21';
 function canopy(name){
  const m=new THREE.MeshLambertMaterial({map:leaves,color:name.endsWith('dark')?'#b6c897':name.endsWith('light')?'#f1f5c3':'#dce9ae'});m.name=name;
  m.onBeforeCompile=s=>{s.uniforms.capitalTime=time;s.vertexShader='uniform float capitalTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=.055*max(0.,transformed.y-2.)*sin(capitalTime*.85+transformed.z*.27+transformed.x*.13);');};
  m.customProgramCacheKey=()=> 'capital-canopy19';return m;
 }
 return {ground,roof,crownTexture:leaves,canopy,update:t=>{time.value=t;}};
}

// Intersecting foliage boughs give trees a porous silhouette and real shadows when orbiting.
export function createCapitalTrees({scene,map,texture,crownTexture}){
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
 const trees=map.plants.filter(p=>['canopy19','shrub19'].includes(p[0])),count=trees.length*32;
 const material=new THREE.MeshLambertMaterial({map:texture,color:'#e4e6bb',alphaTest:.5,side:THREE.DoubleSide});
 const clock={value:0};material.onBeforeCompile=s=>{s.uniforms.treeTime=clock;s.vertexShader='uniform float treeTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  transformed.x+=.035*(position.y+.5)*sin(treeTime*1.15+instanceMatrix[3].x*.3+instanceMatrix[3].z*.2);
 `);};material.customProgramCacheKey=()=> 'capital-bough20';
 const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,count);mesh.name='Spring foliage';mesh.castShadow=true;mesh.receiveShadow=true;
 // Rounded textured lobes form a solid crown beneath small leaf-edge cards.
 // Instancing keeps geometry shared across the whole city, including shrubs.
 const crownGeometry=new THREE.SphereGeometry(1,16,10),vertices=crownGeometry.attributes.position;
 for(let v=0;v<vertices.count;v++){
  const x=vertices.getX(v),y=vertices.getY(v),z=vertices.getZ(v),r=1+.075*Math.sin(x*13+z*9)*Math.cos(y*12-z*6);
  vertices.setXYZ(v,x*r,y*r,z*r);
 }
 crownGeometry.computeVertexNormals();
 const core=new THREE.InstancedMesh(crownGeometry,new THREE.MeshLambertMaterial({map:crownTexture,color:'#d2d5a6'}),trees.length*7);
 core.name='Layered tree crowns';core.castShadow=true;core.receiveShadow=true;
 const tall=trees.filter(p=>p[0]==='canopy19');
 const branches=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.12,1,7),new THREE.MeshLambertMaterial({color:'#705638'}),tall.length*12);
 branches.name='Branch forks and surface roots';branches.castShadow=true;branches.receiveShadow=true;
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),aPoint=new THREE.Vector3(),bPoint=new THREE.Vector3(),direction=new THREE.Vector3();let i=0,c=0,b=0;
 const shade=new THREE.Color();
 function limb(ax,ay,az,bx,by,bz,s){
  aPoint.set(ax,ay,az);bPoint.set(bx,by,bz);direction.subVectors(bPoint,aPoint);
  dummy.position.copy(aPoint).add(bPoint).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());dummy.scale.set(s,direction.length(),s);dummy.updateMatrix();branches.setMatrixAt(b++,dummy.matrix);
 }
 for(const [kind,x,z,w] of trees){const scale=w/6,seed=Math.sin(x*12.9+z*7.7),base=kind==='shrub19'?3.2:4.7;
  for(let j=0;j<7;j++){
   const a=j*2.39996+seed,r=j===0?0:1.45*scale;
   dummy.position.set(x+Math.cos(a)*r,(base+(j===0?1.15:.2+Math.sin(j*4.1)*.25))*scale,z+Math.sin(a)*r);
   dummy.rotation.set(.12*Math.sin(j),a,.13*Math.cos(j));dummy.scale.set((1.35+.2*Math.sin(j))*scale,1.04*scale,(1.22+.1*Math.cos(j))*scale);dummy.updateMatrix();core.setMatrixAt(c,dummy.matrix);core.setColorAt(c++,shade.setHSL(.21+seed*.01,.18,.81+j*.012));
  }
  for(let j=0;j<32;j++){
   const a=j*2.39996+seed,ring=j<10?1.15:2.2,r=ring*scale;
   dummy.position.set(x+Math.cos(a)*r,(base+(j<10?1.65:.2)+Math.sin(j*7.1)*.43)*scale,z+Math.sin(a)*r);
   dummy.rotation.set(-.5+Math.sin(j*2.1)*.65,a,Math.sin(j*3.1)*.42);
   dummy.scale.set((1.6+.25*Math.sin(j))*scale,1.45*scale,1);dummy.updateMatrix();mesh.setMatrixAt(i++,dummy.matrix);
  }
  if(kind==='canopy19')for(let j=0;j<6;j++){
   const a=j*1.0472+seed,dx=Math.cos(a),dz=Math.sin(a);
   limb(x,.27*scale,z,x+dx*.52*scale,.06,z+dz*.52*scale,scale*.85);
   limb(x+dx*.8*scale,3.8*scale,z+dz*.8*scale,x+dx*2.2*scale,5.1*scale,z+dz*2.2*scale,scale*.85);
  }
 }
 for(const item of [mesh,core,branches]){item.computeBoundingSphere();scene.add(item);}
 return {update:t=>{clock.value=t;}};
}

export function createCapitalProps({scene,map}){
 if(map.id!=='ayutthaya')return;
 // Same pottery positions and footprints as build_capital19.py; only replace their art.
 const sites=[[-11,-3],[10,-4],[31,-18],[53,-41],[-38,-37],[-20,-73],[20,-84]];
 const profile=[[.01,0],[.15,0],[.22,.08],[.27,.22],[.25,.34],[.18,.43],[.17,.48],[.20,.49],[.20,.53],[.16,.53],[.145,.48],[.15,.44]].map(p=>new THREE.Vector2(...p));
 const pottery=new THREE.InstancedMesh(new THREE.LatheGeometry(profile,24),new THREE.MeshStandardMaterial({color:'#b38762',roughness:.84,side:THREE.DoubleSide}),sites.length*2);
 pottery.name='Terracotta market jars';pottery.castShadow=true;pottery.receiveShadow=true;
 const inside=new THREE.InstancedMesh(new THREE.CircleGeometry(.15,24),new THREE.MeshLambertMaterial({color:'#30291f'}),sites.length*2);
 const dummy=new THREE.Object3D(),color=new THREE.Color();let n=0;
 for(const [x,z] of sites)for(const dx of [0,.65]){
  dummy.position.set(x+dx,.06,z);dummy.rotation.set(0,(x+z)*.2,0);dummy.scale.setScalar(1);dummy.updateMatrix();pottery.setMatrixAt(n,dummy.matrix);pottery.setColorAt(n,color.setHSL(.065+dx*.04,.22,.68+dx*.15));
  dummy.position.y=.42;dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();inside.setMatrixAt(n++,dummy.matrix);
 }
 // Sparse flowering clumps around shrub footprints, leaving every walking lane clear.
 const shrubs=map.plants.filter(p=>p[0]==='shrub19');
 const blades=new THREE.InstancedMesh(new THREE.ConeGeometry(.055,.48,4),new THREE.MeshLambertMaterial({color:'#698249'}),shrubs.length*18);
 const flowers=new THREE.InstancedMesh(new THREE.SphereGeometry(.075,6,4),new THREE.MeshLambertMaterial({color:'#f7dcb1'}),shrubs.length*9);let leaf=0,flower=0;
 for(const [,x,z] of shrubs)for(let j=0;j<18;j++){
  const a=j*2.39996+x,r=.6+(j%3)*.13,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
  dummy.position.set(px,.20+(j%3)*.025,pz);dummy.rotation.set(Math.sin(a)*.25,a,Math.cos(a)*.25);dummy.scale.set(1,1+(j%3)*.15,1);dummy.updateMatrix();blades.setMatrixAt(leaf++,dummy.matrix);
  if(j%2===0){dummy.position.y=.45+(j%3)*.065;dummy.scale.set(1.2,.6,1.2);dummy.updateMatrix();flowers.setMatrixAt(flower,dummy.matrix);flowers.setColorAt(flower++,color.set(j%4===0?'#ffccac':'#f3dfe9'));}
 }
 for(const object of [pottery,inside,blades,flowers]){object.computeBoundingSphere();scene.add(object);}
}

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
   diffuseColor.rgb*=mix(e,g,meadow)*( .92+.13*noise19(p*.13));
  `);
 };ground.customProgramCacheKey=()=> 'capital-ground19';
 function canopy(name){
  const m=new THREE.MeshLambertMaterial({map:leaves,color:name.endsWith('dark')?'#b6c897':name.endsWith('light')?'#f1f5c3':'#dce9ae'});m.name=name;
  m.onBeforeCompile=s=>{s.uniforms.capitalTime=time;s.vertexShader='uniform float capitalTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=.055*max(0.,transformed.y-2.)*sin(capitalTime*.85+transformed.z*.27+transformed.x*.13);');};
  m.customProgramCacheKey=()=> 'capital-canopy19';return m;
 }
 return {ground,roof,canopy,update:t=>{time.value=t;}};
}

// Intersecting foliage boughs give trees a porous silhouette and real shadows when orbiting.
export function createCapitalTrees({scene,map,texture}){
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
 const trees=map.plants.filter(p=>['canopy19','shrub19'].includes(p[0])),count=trees.length*18;
 const material=new THREE.MeshLambertMaterial({map:texture,color:'#f1f8da',alphaTest:.42,side:THREE.DoubleSide,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.13});
 const clock={value:0};material.onBeforeCompile=s=>{s.uniforms.treeTime=clock;s.vertexShader='uniform float treeTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  transformed.x+=.035*(position.y+.5)*sin(treeTime*1.15+instanceMatrix[3].x*.3+instanceMatrix[3].z*.2);
 `);};material.customProgramCacheKey=()=> 'capital-bough19';
 const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,count);mesh.name='Spring foliage';mesh.castShadow=true;mesh.receiveShadow=true;
 const dummy=new THREE.Object3D();let i=0;
 for(const [,x,z,w] of trees){const scale=w/6;
  for(let j=0;j<18;j++){
   const a=j*2.39996,r=(j<6?1.0:2.05)*scale;
   dummy.position.set(x+Math.cos(a)*r,(j<6?5.7:4.7)*scale+Math.sin(j*7.1)*.3*scale,z+Math.sin(a)*r);
   dummy.rotation.set(-.16+Math.sin(j*2.1)*.3,a,Math.sin(j*3.1)*.22);
   dummy.scale.set(3.1*scale,2.5*scale,1);dummy.updateMatrix();mesh.setMatrixAt(i++,dummy.matrix);
  }
 }
 mesh.computeBoundingSphere();scene.add(mesh);return {update:t=>{clock.value=t;}};
}

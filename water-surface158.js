import * as THREE from './vendor/build/three.module.js';

export const isWaterMaterial=m=>/(^|[_\s])(?:water|paddy_water|trough_water|waterfall)(?:\.\d+)?$/i.test(m?.name??'');
export function waterProfile(map={},name='water'){
 const still=/paddy|trough/.test(name)||['lotus-marsh','ruined-temple','naga-cave','mill-cellar'].includes(map.id);
 const fall=/waterfall/.test(name),night=['night','cave','cellar'].includes(map.mood)||map.procedural==='mill';
 const area=[...(map.waterAreas??[])].sort((a,b)=>b.w*b.d-a.w*a.d)[0];
 return {kind:fall?'waterfall':still?'pool':'river',speed:fall?1.45:still?.055:.32,
  direction:fall?[0,-1]:area?.w>area?.d?[1,0]:[0,-1],
  ripple:fall?.1:still?.035:.065,foam:fall?.13:still?.025:.065,
  sky:night?'#7aabb7':map.mood==='dusk'?'#a1bab1':'#c4dfd6'};
}

// Chamfer distance in metres, computed once on load, not once per frame.
export function shoreDistances(mask,width,height,dx=1,dz=1){
 const d=new Float32Array(width*height),diag=Math.hypot(dx,dz);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)d[y*width+x]=!mask[y*width+x]?0:x===0||y===0||x===width-1||y===height-1?Math.min(dx,dz)*.5:1e6;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;if(x)d[i]=Math.min(d[i],d[i-1]+dx);if(y)d[i]=Math.min(d[i],d[i-width]+dz);
  if(x&&y)d[i]=Math.min(d[i],d[i-width-1]+diag);if(x+1<width&&y)d[i]=Math.min(d[i],d[i-width+1]+diag);
 }
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
  const i=y*width+x;if(x+1<width)d[i]=Math.min(d[i],d[i+1]+dx);if(y+1<height)d[i]=Math.min(d[i],d[i+width]+dz);
  if(x+1<width&&y+1<height)d[i]=Math.min(d[i],d[i+width+1]+diag);if(x&&y+1<height)d[i]=Math.min(d[i],d[i+width-1]+diag);
 }return d;
}

function shoreField(meshes,map,profile,mobile){
 const box=new THREE.Box3(),v=new THREE.Vector3();
 for(const mesh of meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);box.expandByPoint(v);}}
 const sx=Math.max(.01,box.max.x-box.min.x),sz=Math.max(.01,box.max.z-box.min.z),max=mobile?192:256;
 const w=Math.max(8,Math.round(max*sx/Math.max(sx,sz))),h=Math.max(8,Math.round(max*sz/Math.max(sx,sz))),data=new Uint8Array(w*h*4),mask=new Uint8Array(w*h);
 if(typeof document!=='undefined'&&profile.kind!=='waterfall'){
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';
  for(const mesh of meshes){const p=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count??p.count;
   g.beginPath();for(let i=0;i<count;i+=3){for(let j=0;j<3;j++){v.fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);const x=(v.x-box.min.x)/sx*w,y=(v.z-box.min.z)/sz*h;if(j)g.lineTo(x,y);else g.moveTo(x,y);}g.closePath();}g.fill();
  }
  const pixels=g.getImageData(0,0,w,h).data;for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3]>80?1:0;
 }else mask.fill(1);
 const distances=shoreDistances(mask,w,h,sx/w,sz/h),areas=map.waterAreas??[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,wx=box.min.x+(x+.5)*sx/w,wz=box.min.z+(y+.5)*sz/h;
  let dir=profile.direction,best=Infinity;
  if(profile.kind==='river')for(const a of areas){
   const distance=Math.hypot(Math.max(a.x-wx,0,wx-a.x-a.w),Math.max(a.z-wz,0,wz-a.z-a.d));
   const score=distance+(distance===0?Math.min(a.w,a.d)*.0001:0);
   if(score<best){best=score;dir=a.w>a.d?[1,0]:[0,-1];}
  }
  data[i*4]=profile.kind==='waterfall'?255:Math.round(Math.min(1,distances[i]/4)*255);
  data[i*4+1]=Math.round((dir[0]*.5+.5)*255);data[i*4+2]=Math.round((dir[1]*.5+.5)*255);data[i*4+3]=255;
 }
 const texture=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
 return {texture,extent:new THREE.Vector4(box.min.x,box.min.z,sx,sz)};
}

const fragmentPars=`
 uniform float waterClock158,waterOn158,waterSpeed158,waterRipple158,waterFoam158,waterFall158;
 uniform vec4 waterExtent158;uniform vec3 waterSky158;uniform sampler2D waterShore158;varying vec3 waterWorld158;
 vec4 waterField158(){return texture2D(waterShore158,(waterWorld158.xz-waterExtent158.xy)/waterExtent158.zw);}
 vec3 waterWaves158(vec2 p,vec2 flow,float speed){
  vec2 side=vec2(-flow.y,flow.x),q=p-flow*waterClock158*speed;float across=dot(q,side)*.73;
  vec2 k1=vec2(.43,.71)*.83,k2=vec2(-.65,.38)*1.3;
  float curl=sin(dot(q,k1))*.8+sin(dot(q,k2))*.35;
  vec2 curlGrad=cos(dot(q,k1))*k1*.8+cos(dot(q,k2))*k2*.35;
  float a=dot(q,flow)*3.4+sin(across)*.65+curl;
  float b=dot(q,flow)*7.3+dot(q,side)*2.1+curl*.6;
  vec2 gradient=cos(a)*(flow*3.4+side*.4745*cos(across)+curlGrad)*.48+cos(b)*(flow*7.3+side*2.1+curlGrad*.6)*.12;
  return vec3(gradient,sin(a)*.48+sin(b)*.12);
 }
`;

// Shader-only surface motion: never shifts a shared texture atlas and never
// changes water geometry, collision, navigation, bridges or water height.
export function createWaterSurface({model,map={},clock={value:0},enabled=true,mobile=globalThis.matchMedia?.('(pointer:coarse)').matches??false}){
 model.updateMatrixWorld(true);const groups=new Map(),states=[],on={value:enabled?1:0};
 model.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material??[]))if(isWaterMaterial(m)){if(!groups.has(m))groups.set(m,[]);groups.get(m).push(o);o.castShadow=false;o.receiveShadow=true;}});
 for(const [material,meshes] of groups){
  const profile=waterProfile(map,material.name),field=shoreField(meshes,map,profile,mobile),before=material.onBeforeCompile,key=material.customProgramCacheKey();
  const original={roughness:material.roughness,metalness:material.metalness};
  const uniforms={waterClock158:clock,waterOn158:on,waterSpeed158:{value:profile.speed},waterRipple158:{value:profile.ripple},waterFoam158:{value:profile.foam},waterFall158:{value:profile.kind==='waterfall'?1:0},waterExtent158:{value:field.extent},waterShore158:{value:field.texture},waterSky158:{value:new THREE.Color(profile.sky)}};
  material.onBeforeCompile=(s,r)=>{
   before.call(material,s,r);Object.assign(s.uniforms,uniforms);
   s.vertexShader='varying vec3 waterWorld158;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterWorld158=(modelMatrix*vec4(transformed,1.)).xyz;');
   s.fragmentShader=fragmentPars+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec4 field158=waterField158();vec2 flow158=normalize(field158.gb*2.-1.);
    vec3 worldNormal158=inverseTransformDirection(nonPerturbedNormal,viewMatrix);
    float vertical158=waterFall158*(1.-smoothstep(.25,.7,abs(worldNormal158.y)));
    vec3 across158=abs(worldNormal158.y)>.95?vec3(1.,0.,0.):normalize(vec3(worldNormal158.z,0.,-worldNormal158.x));
    vec2 pos158=mix(waterWorld158.xz,vec2(dot(waterWorld158,across158),waterWorld158.y),vertical158);
    if(vertical158>.5)flow158=vec2(0.,-1.);
    float speed158=mix(min(waterSpeed158,.32),waterSpeed158,vertical158);
    vec3 waves158=waterWaves158(pos158,flow158,speed158);
    vec3 perturb158=mix(vec3(-waves158.x,0.,-waves158.y),-waves158.x*across158+vec3(0.,-waves158.y,0.),vertical158);
    normal=normalize(normal+mat3(viewMatrix)*perturb158*waterRipple158*waterOn158);`);
   s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
    float shore158=1.-smoothstep(.12,.85,field158.r*4.);
    float swell158=.5+.5*waves158.z/.6;
    float crest158=pow(clamp(swell158,0.,1.),14.);
    float fresnel158=pow(1.-clamp(dot(normal,geometryViewDir),0.,1.),3.);
    vec3 wet158=outgoingLight*(.93+waves158.z*.065);
    wet158=mix(wet158,waterSky158,.035+fresnel158*.20);
    wet158+=waterSky158*(crest158*.025+shore158*waterFoam158*(.35+.65*swell158));
    outgoingLight=mix(outgoingLight,wet158,waterOn158);
    #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>key+'-water158';material.needsUpdate=true;
  states.push({material,profile,field,uniforms,original,before,key});
 }
 function setEnabled(value){on.value=value?1:0;for(const s of states){if(s.original.roughness!==undefined)s.material.roughness=value?.2:s.original.roughness;if(s.original.metalness!==undefined)s.material.metalness=value?.03:s.original.metalness;}}
 setEnabled(enabled);
 let disposed=false;
 return {states,clock,setEnabled,get count(){return states.length;},dispose(){if(disposed)return;disposed=true;for(const s of states){s.field.texture.dispose();s.material.onBeforeCompile=s.before;s.material.customProgramCacheKey=()=>s.key;Object.assign(s.material,s.original);s.material.needsUpdate=true;}}};
}

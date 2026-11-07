// Draws gear-shadow.js colours as a rising aura: the character's own frame, blurred outward and pulled upward by moving
// noise. It shares the character's plane, so it follows every frame, flip and foot position by itself.
import * as THREE from './vendor/build/three.module.js';

const RAINBOW_SPEED=.25,LOOKS={set:{reach:.125,seed:0,strength:1},weapon:{reach:.08,seed:7.3,strength:.95}};
const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const fragmentShader=`varying vec2 vUv;uniform sampler2D map;uniform vec3 tint;uniform float time,reach,seed,strength;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float body(vec2 uv){float sum=0.;for(int i=0;i<24;i++){float a=float(i)*2.39996,r=sqrt((float(i)+.5)/24.)*reach;sum+=step(.5,texture2D(map,uv+vec2(cos(a),sin(a))*r).a);}return sum/24.;}
void main(){
 float rise=time*3.,low=noise(vec2(vUv.x*11.+seed,vUv.y*5.-rise)),high=noise(vec2(vUv.x*30.-seed,vUv.y*12.-rise*2.2));
 float flame=low*.68+high*.32;
 // Sample below this point so the shape licks upward, further the higher the flame.
 vec2 uv=vUv+vec2((low-.5)*.05,-.03-flame*flame*.42);
 float g=body(uv);if(g<.02)discard;
 float a=smoothstep(.03,.4,g)*smoothstep(.3,.56,flame+g*.55)*strength;
 float core=smoothstep(.45,1.,g);
 gl_FragColor=vec4(mix(tint,vec3(1.),core*.35)*1.35,a*.92);
}`;
export function attachGearShadow(sprite){
 const layers=new Map(),hide=key=>{const m=layers.get(key);if(m)m.visible=false;};
 const still=globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
 function layer(key){
  if(layers.has(key))return layers.get(key);
  const look=LOOKS[key],material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader,fragmentShader,
   uniforms:{map:{value:null},tint:{value:new THREE.Color()},time:{value:0},reach:{value:look.reach},seed:{value:look.seed},strength:{value:look.strength}}});
  const mesh=new THREE.Mesh(sprite.geometry,material);mesh.frustumCulled=false;mesh.position.z=-.01;
  mesh.onBeforeRender=()=>{
   const u=material.uniforms,now=performance.now()/1000;u.map.value=sprite.material.map;if(!still)u.time.value=now%1000;
   if(mesh.userData.rainbow)u.tint.value.setHSL((now*RAINBOW_SPEED)%1,.9,.6);
  };
  sprite.add(mesh);layers.set(key,mesh);return mesh;
 }
 sprite.userData.setGearShadow=({weapon=null,set=null}={})=>{
  // The same colour twice reads as one aura.
  for(const [key,color] of [['set',set],['weapon',weapon===set?null:weapon]]){
   if(!color){hide(key);continue;}
   const mesh=layer(key);mesh.visible=true;mesh.userData.rainbow=color==='rainbow';
   if(color!=='rainbow')mesh.material.uniforms.tint.value.set(color);
  }
 };
 const dispose=sprite.userData.dispose;
 sprite.userData.dispose=()=>{for(const mesh of layers.values())mesh.material.dispose();dispose?.();};
 return sprite;
}

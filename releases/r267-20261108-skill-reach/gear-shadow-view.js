// Draws gear-shadow.js colours as a rising aura: the character's own frame, blurred outward and pulled upward by moving
// noise. It shares the character's plane, so it follows every frame, flip and foot position by itself.
import * as THREE from './vendor/build/three.module.js';

const GROW=1.7,LOOKS={set:{reach:.125,seed:0,strength:1},weapon:{reach:.08,seed:7.3,strength:.95}};
// Flames reach past the character's frame, so the aura's plane is stretched around the frame's middle and fades out before its edge.
const vertexShader='varying vec2 vUv;varying vec2 vEdge;uniform vec3 middle;uniform float grow;void main(){vEdge=uv;vUv=(uv-.5)*grow+.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(middle+(position-middle)*grow,1.);}';
const fragmentShader=`varying vec2 vUv;varying vec2 vEdge;uniform sampler2D map;uniform vec3 tint;uniform float time,reach,seed,strength,rainbow;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float body(vec2 uv){float sum=0.;for(int i=0;i<24;i++){float a=float(i)*2.39996,r=sqrt((float(i)+.5)/24.)*reach;vec2 at=uv+vec2(cos(a)*1.6,sin(a)*.75)*r;if(at.x>0.&&at.x<1.&&at.y>0.&&at.y<1.)sum+=step(.5,texture2D(map,at).a);}return sum/24.;}
void main(){
 float rise=time*3.,low=noise(vec2(vUv.x*11.+seed,vUv.y*5.-rise)),high=noise(vec2(vUv.x*30.-seed,vUv.y*12.-rise*2.2));
 float flame=low*.68+high*.32;
 // Sample below this point so the shape licks upward, further the higher the flame.
 vec2 uv=vUv+vec2((low-.5)*.09,-.015-flame*flame*.2);
 float g=body(uv);if(g<.02)discard;
 float fade=smoothstep(0.,.14,vEdge.x)*smoothstep(1.,.86,vEdge.x)*smoothstep(1.,.72,vEdge.y)*smoothstep(0.,.1,vEdge.y);
 float a=smoothstep(.03,.4,g)*smoothstep(.3,.56,flame+g*.55)*strength*fade;
 float core=smoothstep(.45,1.,g);
 vec3 bands=.5+.5*cos(6.283*(time*.25-vUv.y*1.2+vec3(0.,.33,.67)));
 gl_FragColor=vec4(mix(mix(tint,bands,rainbow),vec3(1.),core*.35)*1.35,a*.92);
}`;
export function attachGearShadow(sprite){
 const layers=new Map(),hide=key=>{const m=layers.get(key);if(m)m.visible=false;};
 const still=globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
 function layer(key){
  if(layers.has(key))return layers.get(key);
  const look=LOOKS[key],material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader,fragmentShader,
   uniforms:{map:{value:null},tint:{value:new THREE.Color()},middle:{value:new THREE.Vector3()},grow:{value:GROW},rainbow:{value:0},time:{value:0},reach:{value:look.reach},seed:{value:look.seed},strength:{value:look.strength}}});
  const mesh=new THREE.Mesh(sprite.geometry,material);mesh.frustumCulled=false;mesh.position.z=-.01;
  mesh.onBeforeRender=()=>{
   const u=material.uniforms,now=performance.now()/1000,p=sprite.geometry.attributes.position;u.map.value=sprite.material.map;u.middle.value.set((p.getX(0)+p.getX(3))/2,(p.getY(0)+p.getY(3))/2,0);if(!still)u.time.value=now%1000;
  };
  sprite.add(mesh);layers.set(key,mesh);return mesh;
 }
 sprite.userData.setGearShadow=({weapon=null,set=null}={})=>{
  // The same colour twice reads as one aura.
  for(const [key,color] of [['set',set],['weapon',weapon===set?null:weapon]]){
   if(!color){hide(key);continue;}
   const mesh=layer(key);mesh.visible=true;mesh.material.uniforms.rainbow.value=color==='rainbow'?1:0;
   if(color!=='rainbow')mesh.material.uniforms.tint.value.set(color);
  }
 };
 const dispose=sprite.userData.dispose;
 sprite.userData.dispose=()=>{for(const mesh of layers.values())mesh.material.dispose();dispose?.();};
 return sprite;
}

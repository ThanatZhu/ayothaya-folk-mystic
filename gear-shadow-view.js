// Draws gear-shadow.js colours: flat copies of the character's own frame, a little to each side and behind it.
// They share the character's plane, so they follow every frame, flip and foot position by themselves.
import * as THREE from './vendor/build/three.module.js';

const OFFSET={set:[-.032,-.012],weapon:[.032,.012]},RAINBOW_SPEED=.25;
const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const fragmentShader='varying vec2 vUv;uniform sampler2D map;uniform vec3 tint;void main(){if(texture2D(map,vUv).a<.5)discard;gl_FragColor=vec4(tint,.78);}';
export function attachGearShadow(sprite){
 const layers=new Map(),hide=key=>{const m=layers.get(key);if(m)m.visible=false;};
 function layer(key){
  if(layers.has(key))return layers.get(key);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{map:{value:null},tint:{value:new THREE.Color()}},vertexShader,fragmentShader});
  const mesh=new THREE.Mesh(sprite.geometry,material);mesh.frustumCulled=false;mesh.position.set(...OFFSET[key],-.01);
  mesh.onBeforeRender=()=>{
   material.uniforms.map.value=sprite.material.map;
   if(mesh.userData.rainbow)material.uniforms.tint.value.setHSL((performance.now()/1000*RAINBOW_SPEED)%1,.9,.6);
  };
  sprite.add(mesh);layers.set(key,mesh);return mesh;
 }
 sprite.userData.setGearShadow=({weapon=null,set=null}={})=>{
  // The same colour twice reads as one shadow.
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

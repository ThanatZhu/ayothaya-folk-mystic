import * as THREE from 'three';
// 0.103.3 the city's roofs are one batched mesh per material, so a single building cannot fade. Instead every scene
// material drops its fragments above the player's head inside a 3.8 m tube from the player toward the camera, so
// someone standing on a raised floor (the sala deck) is seen under the roof, not drawn over it.
// 0.103.5 the outer half of the tube fades out through a dither (opaque materials cannot alpha-blend).
export function createRoofCutaway(model){
 const cut={value:new THREE.Vector4(0,0,0,0)},seen=new Set();
 model.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat()){
  if(seen.has(m))continue;seen.add(m);const before=m.onBeforeCompile;
  m.onBeforeCompile=(s,r)=>{before?.call(m,s,r);s.uniforms.roofCut=cut;
   s.vertexShader='varying vec3 vRoofCut;\n'+s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec4 roofCutP=vec4(transformed,1.);
    #ifdef USE_INSTANCING
    roofCutP=instanceMatrix*roofCutP;
    #endif
    vRoofCut=(modelMatrix*roofCutP).xyz;`);
   s.fragmentShader='uniform vec4 roofCut;varying vec3 vRoofCut;\n'+s.fragmentShader.replace('void main() {',`void main() {
    if(roofCut.w>0.&&vRoofCut.y>roofCut.y+1.9){vec3 pa=vRoofCut-roofCut.xyz,ba=normalize(cameraPosition-roofCut.xyz);float t=dot(pa,ba);if(t>0.){float keep=smoothstep(roofCut.w*.45,roofCut.w,length(pa-ba*t));if(fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))>keep)discard;}}`);
  };m.needsUpdate=true;
 }});
 // floor = ground height under the player; the cut is only on while standing on a raised floor.
 return {update(x,floor,z){cut.value.set(x,floor,z,floor>1?3.8:0);}};
}

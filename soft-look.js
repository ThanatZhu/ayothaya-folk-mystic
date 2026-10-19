import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// Soft "miniature diorama" finish, applied after tone mapping (display-referred colours):
// a sharp band around the player with gentle tilt-shift blur above and below (0.82: wider band, half the blur, so
// signs and labels near the screen edges stay readable), lifted shadows,
// slightly lower contrast, warm highlights and a light vignette.
const SoftLookShader={
 uniforms:{tDiffuse:{value:null},resolution:{value:new THREE.Vector2(1,1)},focus:{value:.48},band:{value:.3},blur:{value:1.3},warmth:{value:.05},vignette:{value:.32}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 resolution;uniform float focus,band,blur,warmth,vignette;varying vec2 vUv;
 void main(){
  vec3 c=texture2D(tDiffuse,vUv).rgb;
  float amount=smoothstep(band,band+.34,abs(vUv.y-focus))*blur;
  if(amount>.05){
   vec2 px=amount/resolution;vec3 sum=c;
   for(int i=0;i<12;i++){float a=float(i)*2.39996,r=sqrt(float(i)+.5)/3.46;sum+=texture2D(tDiffuse,vUv+vec2(cos(a),sin(a))*r*px*2.).rgb;}
   c=sum/13.;
  }
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=c*.93+.04;
  c+=vec3(warmth,warmth*.5,-warmth*.4)*smoothstep(.4,1.,l);
  vec2 d=vUv-.5;c*=1.-vignette*dot(d,d)*1.5;
  gl_FragColor=vec4(c,1.);
 }`
};
const KEY='ayothaya-graphics';
function preferred(){try{const v=localStorage.getItem(KEY);if(v==='high'||v==='low')return v==='high';}catch{}return !matchMedia('(pointer:coarse)').matches;}

export function createSoftLook({renderer,scene,camera}){
 const composer=new EffectComposer(renderer);
 composer.addPass(new RenderPass(scene,camera));
 // Only genuinely bright pixels (lanterns, flames, skill effects) glow.
 const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.28,.5,.9);composer.addPass(bloom);
 composer.addPass(new OutputPass());
 const look=new ShaderPass(SoftLookShader);composer.addPass(look);
 let enabled=preferred();
 function setSize(width,height){const ratio=renderer.getPixelRatio();composer.setPixelRatio(ratio);composer.setSize(width,height);look.uniforms.resolution.value.set(width*ratio,height*ratio);}
 return {
  get enabled(){return enabled;},
  setEnabled(value){enabled=!!value;try{localStorage.setItem(KEY,enabled?'high':'low');}catch{}},
  setSize,
  render(){if(enabled)composer.render();else renderer.render(scene,camera);}
 };
}

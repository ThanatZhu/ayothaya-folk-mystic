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
 uniforms:{tDiffuse:{value:null},resolution:{value:new THREE.Vector2(1,1)},focus:{value:.48},band:{value:.3},blur:{value:1.3},warmth:{value:.05},vignette:{value:.32},contrast:{value:.93},lift:{value:.04},saturation:{value:1}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 resolution;uniform float focus,band,blur,warmth,vignette,contrast,lift,saturation;varying vec2 vUv;
 void main(){
  vec3 c=texture2D(tDiffuse,vUv).rgb;
  float amount=smoothstep(band,band+.34,abs(vUv.y-focus))*blur;
  if(amount>.05){
   vec2 px=amount/resolution;vec3 sum=c;
   for(int i=0;i<12;i++){float a=float(i)*2.39996,r=sqrt(float(i)+.5)/3.46;sum+=texture2D(tDiffuse,vUv+vec2(cos(a),sin(a))*r*px*2.).rgb;}
   c=sum/13.;
  }
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=mix(vec3(l),c,saturation)*contrast+lift;
  c+=vec3(warmth,warmth*.5,-warmth*.4)*smoothstep(.4,1.,l);
  vec2 d=vUv-.5;c*=1.-vignette*dot(d,d)*1.5;
  gl_FragColor=vec4(c,1.);
 }`
};
const KEY='ayothaya-graphics';
function preferred(){try{const v=localStorage.getItem(KEY);if(v==='high'||v==='low')return v==='high';}catch{}return !matchMedia('(pointer:coarse)').matches;}

// 0.120.1 characters and monsters (layer 1, game-controls.js xray) draw with the scenery like everything else, so
// railings, posts, trunks, walls and roofs in front of them cover them. Wherever something hides a character, that
// part comes back as a faint jade silhouette (drawn only where the scenery is nearer than the sprite), so nobody is
// lost behind a roof or a crown. (0.116.5 drew characters over all scenery: they stood in front of the railings.)
export const ACTOR_LAYER=1;
const GHOST=new THREE.Color('#b8eee0'),ghosts=new WeakMap();
function ghostOf(m){
 let g=ghosts.get(m);
 if(!g){const o={map:m.map,color:GHOST,transparent:true,opacity:.5,alphaTest:.2,depthWrite:false,depthFunc:THREE.GreaterDepth,fog:false,toneMapped:false};
  g=m.isSpriteMaterial?new THREE.SpriteMaterial(o):new THREE.MeshBasicMaterial({...o,side:m.side});ghosts.set(m,g);}
 g.map=m.map;if(m.isSpriteMaterial)g.rotation=m.rotation;return g;
}
export function createSoftLook({renderer,scene,camera,finish=null,mobile=false}){
 let lightsAt=-1e9,actorsAt=-1e9,actors=[];
 function silhouettes(draw){
  const now=performance.now();
  if(now-lightsAt>2000){lightsAt=now;scene.traverse(o=>{if(o.isLight)o.layers.enable(ACTOR_LAYER);});}   // lights must reach the actor pass
  if(now-actorsAt>250){actorsAt=now;actors=[];scene.traverse(o=>{if(o.material&&!Array.isArray(o.material)&&o.layers.isEnabled(ACTOR_LAYER))actors.push(o);});}
  const swapped=[];
  for(const o of actors){const m=o.material;
   // shadow blobs, rings and labels (transparent or always on top) have no silhouette
   if(m.transparent||m.depthTest===false){if(o.visible){o.visible=false;swapped.push([o,null]);}continue;}
   o.material=ghostOf(m);swapped.push([o,m]);}
  const mask=camera.layers.mask,bg=scene.background,shadowAuto=renderer.shadowMap.autoUpdate,shadowDirty=renderer.shadowMap.needsUpdate;camera.layers.set(ACTOR_LAYER);scene.background=null;
  // The scenery pass already rendered this frame's shadows. The ghost overlay
  // must reuse them instead of redrawing the entire shadow map with ghost materials.
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
  try{draw();}finally{renderer.shadowMap.autoUpdate=shadowAuto;renderer.shadowMap.needsUpdate=shadowDirty;camera.layers.mask=mask;scene.background=bg;for(const [o,m] of swapped){if(m)o.material=m;else o.visible=true;}}
 }
 class SilhouettePass extends RenderPass{
  constructor(){super(scene,camera);this.clear=false;this.clearDepth=false;}
  render(...a){silhouettes(()=>super.render(...a));}
 }
 const composer=new EffectComposer(renderer);
 composer.addPass(new RenderPass(scene,camera));composer.addPass(new SilhouettePass());
 // Only genuinely bright pixels (lanterns, flames, skill effects) glow.
 const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),finish?.bloom??.28,.5,finish?.threshold??.9);bloom.enabled=!mobile;composer.addPass(bloom);
 composer.addPass(new OutputPass());
 const look=new ShaderPass(SoftLookShader);composer.addPass(look);
 if(finish)for(const key of ['blur','warmth','vignette','contrast','lift','saturation'])if(Number.isFinite(finish[key]))look.uniforms[key].value=finish[key];
 let enabled=preferred();
 function setSize(width,height){const ratio=renderer.getPixelRatio();composer.setPixelRatio(ratio);composer.setSize(width,height);look.uniforms.resolution.value.set(width*ratio,height*ratio);}
 return {
  get enabled(){return enabled;},
  get bloomEnabled(){return bloom.enabled;},
  setPerformanceBudget(budget){bloom.enabled=!mobile&&budget==='full';},
  setEnabled(value){enabled=!!value;try{localStorage.setItem(KEY,enabled?'high':'low');}catch{}},
  setSize,
  render(){if(enabled)return composer.render();renderer.render(scene,camera);const auto=renderer.autoClear;renderer.autoClear=false;silhouettes(()=>renderer.render(scene,camera));renderer.autoClear=auto;}
 };
}

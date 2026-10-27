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

// 0.116.5 characters and monsters (layer 1, game-controls.js xray) are drawn a second time after the scenery with the
// depth buffer cleared: tree crowns, roofs and rocks in front of the camera no longer hide them, while each
// character's own parts, and characters among themselves, still sort by depth.
export const ACTOR_LAYER=1;
// 0.120.1 low props in front of a character still cover it (railings, fences, low walls, posts, crates, small rocks):
// their depth goes back into the cleared buffer before the actor pass. Only solid pieces whose top is below head
// height (1.9 m) join, so tree crowns, roofs, house walls and big boulders keep showing the character through them.
export const OCCLUDER_LAYER=2;
// ground, plants and anything walked on (decks, floors, treads, bunds): a sprite's feet reach a little below its anchor
const NOT_OCCLUDER=/ground|terrain|water|grass|meadow|path|track|road|court|paving|shoulder|moss|leaf|leaves|foliage|reed|lotus|rice|flower|shadow|decal|deck|floor|tread|stair|step|soil|foundation|bund|dock|pier|platform|plinth/i;
export function markOccluders(root){
 root.updateMatrixWorld(true);const box=new THREE.Box3();let n=0;
 root.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||NOT_OCCLUDER.test(o.name))return;
  const ms=[].concat(o.material);if(ms.some(m=>!m||m.transparent||m.alphaTest>0||m.depthWrite===false))return;
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
  if(box.max.y<=1.9&&box.max.y-box.min.y>.12){o.layers.enable(OCCLUDER_LAYER);n++;}
 });
 return n;
}
const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false});
export function createSoftLook({renderer,scene,camera,finish=null,mobile=false}){
 let lightsAt=-1e9;
 function withLayer(layer,draw,override=null){
  const mask=camera.layers.mask,bg=scene.background,ov=scene.overrideMaterial;
  camera.layers.set(layer);scene.background=null;scene.overrideMaterial=override;try{draw();}finally{camera.layers.mask=mask;scene.background=bg;scene.overrideMaterial=ov;}
 }
 function actorsOnly(draw){
  if(performance.now()-lightsAt>2000){lightsAt=performance.now();scene.traverse(o=>{if(o.isLight)o.layers.enable(ACTOR_LAYER);});}   // lights must reach the actor pass
  withLayer(ACTOR_LAYER,draw);
 }
 class ActorPass extends RenderPass{
  constructor(){super(scene,camera);this.clear=false;}
  render(...a){
   this.clearDepth=true;withLayer(OCCLUDER_LAYER,()=>super.render(...a),depthOnly);
   this.clearDepth=false;actorsOnly(()=>super.render(...a));
  }
 }
 const composer=new EffectComposer(renderer);
 composer.addPass(new RenderPass(scene,camera));composer.addPass(new ActorPass());
 // Only genuinely bright pixels (lanterns, flames, skill effects) glow.
 const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),finish?.bloom??.28,.5,finish?.threshold??.9);bloom.enabled=!mobile;composer.addPass(bloom);
 composer.addPass(new OutputPass());
 const look=new ShaderPass(SoftLookShader);composer.addPass(look);
 if(finish)for(const key of ['blur','warmth','vignette','contrast','lift','saturation'])if(Number.isFinite(finish[key]))look.uniforms[key].value=finish[key];
 let enabled=preferred();
 function setSize(width,height){const ratio=renderer.getPixelRatio();composer.setPixelRatio(ratio);composer.setSize(width,height);look.uniforms.resolution.value.set(width*ratio,height*ratio);}
 return {
  get enabled(){return enabled;},
  setEnabled(value){enabled=!!value;try{localStorage.setItem(KEY,enabled?'high':'low');}catch{}},
  setSize,
  render(){if(enabled)return composer.render();renderer.render(scene,camera);const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();withLayer(OCCLUDER_LAYER,()=>renderer.render(scene,camera),depthOnly);actorsOnly(()=>renderer.render(scene,camera));renderer.autoClear=auto;}
 };
}

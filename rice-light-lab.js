import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {prepareSceneV2,disposeScene,MOODS} from './scene-v2.js?v=water158';
import {createMeadow} from './meadow.js?v=108';
import {applyRiceLight,addMeadowContacts,enableMeadowShadows,enableActorShadows} from './rice-light156.js?v=shadow160';
import {groundHeight} from './combat-core.js?v=novice174';
import {createPaintedAvatar} from './painted-avatar.js?v=pose119';
import {atlasCell} from './sprite-motion.js';
import {baselineShader} from './rice-light-baseline156.js?v=156';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const mobile=params.get('quality')==='mobile'||(!params.has('quality')&&matchMedia('(pointer:coarse)').matches);
$('quality').value=mobile?'mobile':'desktop';
$('quality').onchange=()=>{params.set('quality',$('quality').value);location.search=params;};
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.5));renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.16;
renderer.info.autoReset=false;
$('stage').prepend(renderer.domElement);
const camera=new THREE.OrthographicCamera(-20,20,15,-15,.1,700);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;
controls.minPolarAngle=controls.maxPolarAngle=Math.atan2(Math.hypot(23,28),24);controls.minZoom=.65;controls.maxZoom=2.7;
const scenes=[],views={path:[0,35],bridge:[13,3],grove:[-43,5]};
let split=.5,paused=matchMedia('(prefers-reduced-motion:reduce)').matches,time=0,measuring=null,ready=false,disposed=false,avatarMotion=false;
function focus(name){const [x,z]=views[name]??views.path;controls.target.set(x,1,z);camera.position.set(x+23,28,z+28);camera.zoom=1.25;camera.updateProjectionMatrix();controls.update();for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===name));}
focus(params.get('view')??'path');
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>focus(b.dataset.view);
function updateMotion(){const b=$('motion');b.textContent=paused?'เปิดลม':'หยุดลม';b.setAttribute('aria-pressed',String(paused));}
$('motion').onclick=()=>{paused=!paused;updateMotion();};updateMotion();
function setAvatarMotion(value){avatarMotion=!!value;$('walk').setAttribute('aria-pressed',String(avatarMotion));$('walk').textContent=avatarMotion?'หยุดเดิน':'ลองเดิน';}
$('walk').onclick=()=>{setAvatarMotion(!avatarMotion);if(avatarMotion){paused=false;updateMotion();}};
$('split').oninput=()=>{split=+$('split').value/100;$('divider').style.left=split*100+'%';document.querySelector('.before').hidden=split===0;document.querySelector('.after').hidden=split===1;};
const dividerUniforms={before:{value:null},after:{value:null},split:{value:.5}};
const screenScene=new THREE.Scene(),screenCamera=new THREE.Camera();
const screenMaterial=new THREE.ShaderMaterial({uniforms:dividerUniforms,depthTest:false,depthWrite:false,toneMapped:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:'varying vec2 vUv;uniform sampler2D before,after;uniform float split;void main(){if(vUv.x<split)gl_FragColor=texture2D(before,vUv);else gl_FragColor=texture2D(after,vUv);}'});
screenScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),screenMaterial));
const grade={uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 vUv;uniform sampler2D tDiffuse;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
 float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,.94);
 c+=vec3(.012,.006,-.006)*smoothstep(.35,.95,l);
 vec2 d=vUv-.5;c*=1.-.14*dot(d,d);gl_FragColor=vec4(c,1.);}`};
function size(){const w=innerWidth,h=innerHeight,a=w/h,hh=Math.max(12.8,18.2/a);camera.left=-hh*a;camera.right=hh*a;camera.top=hh;camera.bottom=-hh;camera.updateProjectionMatrix();renderer.setSize(w,h,false);for(const v of scenes){v.composer.setSize(w,h);for(const p of v.composer.passes)if(p.uniforms?.resolution)p.uniforms.resolution.value.set(w*renderer.getPixelRatio(),h*renderer.getPixelRatio());}}
addEventListener('resize',size);size();
function cloneModel(root){const copy=root.clone(true),materials=new Map();copy.traverse(o=>{if(!o.isMesh)return;const clone=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});return copy;}
function frame(image){const [x,y,w,h]=atlasCell('male',0),c=document.createElement('canvas');c.width=image.width*w;c.height=image.height*h;c.getContext('2d').drawImage(image,image.width*x,image.height*y,c.width,c.height,0,0,c.width,c.height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function footShade(scene){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,3,32,32,31);r.addColorStop(0,'#152b2299');r.addColorStop(1,'#152b2200');g.fillStyle=r;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c),m=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.85),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,opacity:.7}));m.rotation.x=-Math.PI/2;scene.add(m);return m;}
const shadowPoint=new THREE.Vector3();
function followSun(v){const p=controls.target,texel=64/v.sun.shadow.mapSize.x;v.sun.position.copy(p).add(v.offset);v.sun.target.position.set(p.x,0,p.z);v.sun.updateMatrixWorld();v.sun.target.updateMatrixWorld();v.sun.shadow.updateMatrices(v.sun);shadowPoint.set(p.x,0,p.z).applyMatrix4(v.sun.shadow.camera.matrixWorldInverse);const dx=Math.round(shadowPoint.x/texel)*texel-shadowPoint.x,dy=Math.round(shadowPoint.y/texel)*texel-shadowPoint.y;shadowPoint.set(dx,dy,0).applyQuaternion(v.sun.shadow.camera.quaternion);v.sun.position.add(shadowPoint);v.sun.target.position.add(shadowPoint);}
function renderView(v,dt){renderer.shadowMap.type=v.warm?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
 v.motion.update(paused?0:dt);v.meadow.update(time);followSun(v);
 const p=controls.target,x=p.x+(avatarMotion?Math.sin(time*1.2)*2.4:0),z=p.z+(avatarMotion?Math.cos(time*1.2)*.6:0),y=groundHeight(v.map.nav,x,z);v.hero.position.set(x,y+.04,z);v.foot.position.set(x,y+.028,z);
 v.hero.userData.pose({mode:avatarMotion?'walk':'idle',time:paused?0:time,phase:time*2.5,artFrame:avatarMotion?12+Math.floor(time*10)%8:0});v.hero.quaternion.copy(camera.quaternion);v.actorShadows?.update();
 renderer.info.reset();v.composer.render(dt);return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
function draw(dt){controls.update();if(!paused)time+=dt;
 const active=measuring===null?scenes.filter(v=>v.warm?split<1:split>0):[scenes[measuring]];
 for(const v of active)renderView(v,dt);
 dividerUniforms.before.value=scenes[0].composer.readBuffer.texture;dividerUniforms.after.value=scenes[1].composer.readBuffer.texture;
 dividerUniforms.split.value=measuring===null?split:measuring===0?1:0;
 renderer.setRenderTarget(null);renderer.render(screenScene,screenCamera);
}
try{
 const [catalog,gltf,art]=await Promise.all([
  fetch('./maps/world.json?v=world125').then(r=>{if(!r.ok)throw Error('map '+r.status);return r.json();}),
  new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('./vendor/addons/libs/draco/')).loadAsync('./maps/v7/rice-fields.glb?v=maps178'),
  new THREE.TextureLoader().loadAsync('./assets/classes/novice-18.png')
 ]);
 const map=catalog.maps.find(m=>m.id==='rice-fields');
 // Frame a real tree from the authored scene rather than an assumed map point.
 let treeDistance=Infinity;const point=new THREE.Vector3();gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(o=>{if(!o.isMesh||!/^Organic[ _]tree[ _]trunks/.test(o.name))return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(point.y>.16)continue;const d=(point.x+20)**2+(point.z-46)**2;if(d<treeDistance){treeDistance=d;views.grove=[point.x-2,point.z+3];}}});
 if(params.get('view')==='grove')focus('grove');
 for(const warm of [false,true]){
  const scene=new THREE.Scene(),model=cloneModel(gltf.scene),motion=prepareSceneV2({scene,model,map,waterEnabled:warm});scene.add(model);
  const hemi=new THREE.HemisphereLight(...MOODS.day.hemi),sun=new THREE.DirectionalLight(...MOODS.day.sun);scene.add(hemi,sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.5,far:85});sun.shadow.bias=-.0005;sun.shadow.normalBias=.05;sun.shadow.radius=4;sun.shadow.intensity=.84;
  const profile=warm?applyRiceLight({scene,model,sun,hemi,mobile}):{offset:new THREE.Vector3(-14,25,12)};
  const meadow=createMeadow({scene,map,model,quality:mobile?'low':'high'});
  const contact=warm?addMeadowContacts({scene,meadow,map,mobile}):null;
  if(warm){const m=meadow.group.children[0]?.material;if(m){const compile=m.onBeforeCompile;m.onBeforeCompile=(s,r)=>{compile.call(m,s,r);s.vertexShader='varying float meadowRoot156;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmeadowRoot156=smoothstep(.03,.8,position.y);');s.fragmentShader='varying float meadowRoot156;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(.72,.78,.63),vec3(1.02,1.01,.98),meadowRoot156);');};m.customProgramCacheKey=()=>'meadow75-rice156';}}
  const hero=createPaintedAvatar(frame(art.image),{directional:false,classId:'novice',gender:'male'});hero.scale.setScalar(2.1);scene.add(hero);const foot=footShade(scene);
  // Three's alpha-tested depth pass uses the current painted frame and posed
  // geometry, so a face/weapon silhouette casts instead of the whole quad.
  const actorShadows=warm?enableActorShadows(hero):null;
  const meadowShadows=warm?enableMeadowShadows(meadow):null;
  const composer=new EffectComposer(renderer);composer.renderToScreen=false;composer.addPass(new RenderPass(scene,camera));
  // Match the live desktop's existing bloom/finish in the baseline; the phone
  // preview deliberately omits all bloom and blur on BOTH sides.
  if(!mobile)composer.addPass(new UnrealBloomPass(new THREE.Vector2(256,256),warm?.12:.28,.5,warm?1.1:.9));
  composer.addPass(new OutputPass());
  if(warm)composer.addPass(new ShaderPass(grade));
  else if(!mobile)composer.addPass(new ShaderPass(baselineShader));
  scenes.push({scene,model,motion,meadow,meadowShadows,actorShadows,contact,sun,hemi,hero,foot,composer,map,offset:profile.offset,warm});
 }
 size();ready=true;$('status').textContent=mobile?'โหมดมือถือ · เงา 1024 · ไม่มีบลูมหรือเบลอ':'โหมดคอม · เงา 2048 · บลูมบางเฉพาะจุดสว่าง';
 let last=performance.now();renderer.setAnimationLoop(ms=>{if(disposed||document.hidden)return;const dt=Math.min(.08,Math.max(0,(ms-last)/1000));last=ms;if(measuring!==null)return;draw(dt);});
}catch(error){$('status').textContent='โหลดฉากไม่สำเร็จ: '+error.message;console.error(error);}

async function measure({samples=90}={}){
 if(!ready||measuring!==null)return null;
 $('measure').disabled=true;const wasPaused=paused;paused=true;const results=[];
 const gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 try{
  for(let index=0;index<2;index++){
   measuring=index;$('status').textContent='กำลังวัด '+(index?'แสงใหม่':'แสงเดิม')+'…';
   const cpu=[],intervals=[],queries=[],gpu=[];let previous=null,stats;
   for(let frame=0;frame<samples+30;frame++){
    const stamp=await new Promise(requestAnimationFrame);if(previous!==null&&frame>=30)intervals.push(stamp-previous);previous=stamp;
    const query=ext&&frame>=30?gl.createQuery():null;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
    const start=performance.now();stats=renderView(scenes[index],0);const elapsed=performance.now()-start;
    if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);queries.push(query);}
    if(frame>=30)cpu.push(elapsed);
    dividerUniforms.before.value=scenes[0].composer.readBuffer.texture;dividerUniforms.after.value=scenes[1].composer.readBuffer.texture;dividerUniforms.split.value=index?0:1;renderer.setRenderTarget(null);renderer.render(screenScene,screenCamera);
    for(let i=queries.length-1;i>=0;i--)if(gl.getQueryParameter(queries[i],gl.QUERY_RESULT_AVAILABLE)){
     if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(queries[i],gl.QUERY_RESULT)/1e6);gl.deleteQuery(queries[i]);queries.splice(i,1);
    }
   }
   for(const q of queries)gl.deleteQuery(q);
   const percentile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]:null;
   results.push({profile:index?'warm':'original',samples:cpu.length,cpuMedianMs:percentile(cpu,.5),cpuP95Ms:percentile(cpu,.95),gpuMedianMs:percentile(gpu,.5),frameMedianMs:percentile(intervals,.5),...stats});
  }
  const fmt=r=>r.gpuMedianMs!=null?'GPU '+r.gpuMedianMs.toFixed(1):'CPU '+r.cpuMedianMs.toFixed(1);
  $('status').textContent=`ฉากเดี่ยวขนาดเท่ากัน · เดิม ${fmt(results[0])} ms → ใหม่ ${fmt(results[1])} ms`;
  return {quality:mobile?'mobile':'desktop',viewport:[innerWidth,innerHeight],pixelRatio:renderer.getPixelRatio(),renderer:gl.getParameter(gl.RENDERER),results};
 }finally{measuring=null;paused=wasPaused;$('measure').disabled=false;}
}
$('measure').onclick=()=>measure();
// Review-only controls/diagnostics; no game state, wallet, login or server I/O.
window.__riceLight={get ready(){return ready;},get scenes(){return scenes;},renderer,camera,controls,measure,focus,
 setSplit(value){$('split').value=Math.max(0,Math.min(100,value));$('split').oninput();},
 setAvatarMotion,renderOnce(){draw(0);},
 setPaused(value){paused=!!value;updateMotion();}};
addEventListener('pagehide',()=>{disposed=true;renderer.setAnimationLoop(null);controls.dispose();for(const v of scenes){v.contact?.dispose();v.actorShadows?.dispose();v.hero.userData.dispose();v.meadowShadows?.dispose();v.model.traverse(o=>o.customDepthMaterial?.dispose());v.meadow.dispose();v.composer.passes.forEach(p=>p.dispose?.());v.composer.dispose();disposeScene(v.scene);}screenScene.children[0].geometry.dispose();screenMaterial.dispose();renderer.dispose();},{once:true});

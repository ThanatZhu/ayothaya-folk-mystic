import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {prepareSceneV2,disposeScene,MOODS,moodOf} from './scene-v2.js?v=water158';
import {createMeadow,MEADOW_MAPS} from './meadow.js?v=108';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),quality=params.get('quality')??(matchMedia('(pointer:coarse)').matches?'mobile':'desktop');
$('quality').value=quality;$('quality').onchange=()=>{params.set('quality',$('quality').value);location.search=params;};
let paused=matchMedia('(prefers-reduced-motion:reduce)').matches,on=true,forcedTime=null,ready=false;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='desktop'?1.5:1));renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.16;renderer.info.autoReset=false;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-25,25,18,-18,.1,700),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=true;controls.maxPolarAngle=Math.PI*.43;controls.minZoom=.5;controls.maxZoom=6;
function size(){const a=innerWidth/innerHeight,h=Math.max(12.8,18.2/a);camera.left=-h*a;camera.right=h*a;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);}addEventListener('resize',size);size();
let motion,meadow,sun,map;
function focus(x,y,z,zoom=1.5){controls.target.set(x,y,z);camera.position.set(x+23,y+29,z+28);camera.zoom=zoom;camera.updateProjectionMatrix();controls.update();sun.position.set(x-14,25+y,z+12);sun.target.position.set(x,y,z);}
function render(dt=0){if(!ready)return;const t=motion.update(paused?0:dt);if(forcedTime!==null)motion.water.clock.value=forcedTime;meadow?.update(t);controls.update();renderer.info.reset();renderer.render(scene,camera);}
try{
 const catalog=await fetch('./maps/world.json?v=world125').then(r=>r.json());map=catalog.maps.find(m=>m.id===params.get('map'))??catalog.maps.find(m=>m.id==='rice-fields');
 for(const m of catalog.maps){const o=document.createElement('option');o.value=m.id;o.textContent=m.name;$('map').append(o);}$('map').value=map.id;$('map').onchange=()=>{params.set('map',$('map').value);location.search=params;};
 const gltf=await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('./vendor/addons/libs/draco/')).loadAsync('./'+map.scene+'?v=62');
 motion=prepareSceneV2({scene,model:gltf.scene,map});scene.add(gltf.scene);const mood=MOODS[moodOf(map)];scene.add(new THREE.HemisphereLight(...mood.hemi));sun=new THREE.DirectionalLight(...mood.sun);sun.castShadow=quality!=='low';sun.shadow.mapSize.set(quality==='desktop'?2048:1024,quality==='desktop'?2048:1024);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:.5,far:90});sun.shadow.normalBias=.05;sun.shadow.bias=-.0005;sun.shadow.intensity=.84;scene.add(sun,sun.target);
 if(MEADOW_MAPS.has(map.id))meadow=createMeadow({scene,map,model:gltf.scene,quality:quality==='desktop'?'high':'low'});
 if(quality==='low'){
  const converted=new Map();gltf.scene.traverse(o=>{if(!o.isMesh||!o.material.isMeshStandardMaterial)return;const s=o.material;if(!converted.has(s)){const m=new THREE.MeshLambertMaterial();for(const k of ['name','map','color','alphaTest','side','vertexColors','emissive','emissiveMap','emissiveIntensity','transparent','opacity','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','depthWrite'])m[k]=s[k];m.onBeforeCompile=s.onBeforeCompile;m.customProgramCacheKey=s.customProgramCacheKey;converted.set(s,m);}o.material=converted.get(s);});
 }
 const states=motion.water.states,river=states.find(s=>s.profile.kind==='river')??states.find(s=>s.profile.kind!=='waterfall')??states[0],area=map.waterAreas?.[0];
 const ext=river?.field.extent;
 let x=ext?ext.x+ext.z/2:map.spawn.x,z=ext?ext.y+ext.w/2:map.spawn.z;
 if(area&&Math.max(area.w,area.d)>40&&Math.min(area.w,area.d)<30){x=area.x+area.w/2;z=area.z+area.d/2;}
 focus(x,0,z,ext&&Math.max(ext.z,ext.w)<8?3.5:1.5);
 const fall=states.find(s=>s.profile.kind==='waterfall');if(fall){$('fall').hidden=false;$('fall').onclick=()=>{
  const mesh=gltf.scene.getObjectsByProperty('isMesh',true).find(o=>o.material.name==='waterfall'),b=new THREE.Box3().setFromObject(mesh),p=new THREE.Vector3(),sum=new THREE.Vector3(),pos=mesh.geometry.attributes.position;let count=0;
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);if(p.y>b.max.y-.2){sum.add(p);count++;}}
  if(count)sum.divideScalar(count);else b.getCenter(sum);focus(sum.x,(b.min.y+b.max.y)/2,sum.z,1.5);
 };}
 $('status').textContent=map.name+' · '+states.length+' ผิวน้ำ · '+(quality==='low'?'วัสดุเบา ไม่มีเงา':quality==='mobile'?'คลื่นแบบเบาสำหรับมือถือ':'ผิวน้ำพร้อมแสงสะท้อน');
 ready=true;let last=performance.now();renderer.setAnimationLoop(ms=>{const dt=Math.min(.08,(ms-last)/1000);last=ms;if(!document.hidden)render(dt);});
}catch(e){$('status').textContent='โหลดไม่สำเร็จ: '+e.message;console.error(e);}
function setEnabled(value){on=!!value;motion?.water.setEnabled(on);$('effect').setAttribute('aria-pressed',String(on));$('effect').textContent=on?'น้ำแบบใหม่':'น้ำแบบเดิม';}
$('effect').onclick=()=>setEnabled(!on);
function setPaused(value){paused=!!value;$('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'เปิดน้ำไหล':'หยุดน้ำ';}
$('pause').onclick=()=>setPaused(!paused);setPaused(paused);
window.__waterLab={get ready(){return ready;},get motion(){return motion;},get map(){return map;},renderer,scene,camera,controls,render,setEnabled,setPaused,setTime(t){forcedTime=t;}};
addEventListener('pagehide',e=>{if(e.persisted)return;renderer.setAnimationLoop(null);controls.dispose();meadow?.dispose();disposeScene(scene);renderer.dispose();},{once:true});

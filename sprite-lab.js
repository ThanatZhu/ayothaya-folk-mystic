import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {CLASSES,NOVICE,getClass,className,classSkills} from './classes.js?v=73';
import {DIRECTIONS,loadDirectionalArt} from './directional-sprite.js?v=63';
import {createDirectionalActor} from './directional-actor.js?v=63';
import {stableViewDirection} from './directional-motion.js';
import {SKILLS,screenDirection,groundHeight} from './combat-core.js?v=72.1';
import {attackDuration} from './character-motion.js?v=37';
import {skillTrack,skillPose} from './skill-choreography.js?v=37';
import {createSkillEffects} from './skill-effects.js?v=74';
import {applySkillArt} from './skill-art.js?v=21';
import {prepareSceneV2,disposeScene} from './scene-v2.js?v=71.2';
const $=id=>document.getElementById(id),labels={S:'หน้า',SE:'หน้าขวา',E:'ขวา',NE:'หลังขวา',N:'หลัง',NW:'หลังซ้าย',W:'ซ้าย',SW:'หน้าซ้าย'};
try{
 const requested=new URLSearchParams(location.search).get('class');
 let classId=[NOVICE,...CLASSES].some(c=>c.id===requested)?requested:'swordsman',gender='male',art,hero;
 let face={x:0,z:1},direction='S',mode='idle',skillIndex=0,time=0,playing=true,lastMs=null,selectionVersion=0,environmentVersion=0,currentEnvironment='studio',groundY=0,mapRoot=null,mapMotion=null,effect=null;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#293d37');scene.fog=new THREE.Fog('#293d37',14,34);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-label','ตัวละครภาพวาดในฉากสามมิติ');$('stage').append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(33,1,.08,180);camera.position.set(0,3.25,6.7);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.95,0);controls.enablePan=false;controls.minDistance=4;controls.maxDistance=11;controls.minPolarAngle=.9;controls.maxPolarAngle=1.42;controls.update();
 const hemi=new THREE.HemisphereLight('#fff5dd','#748267',2.1);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#ffe2ba',2.6);sun.position.set(-7,10,5);scene.add(sun);
 const studio=new THREE.Group();scene.add(studio);
 const floor=new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.75,.18,80),new THREE.MeshStandardMaterial({color:'#657362',roughness:.95}));floor.position.y=-.10;studio.add(floor);
 for(const radius of [2.85,3.4]){const rim=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.015,96),new THREE.MeshBasicMaterial({color:'#bfa875',side:THREE.DoubleSide,transparent:true,opacity:.6}));rim.rotation.x=-Math.PI/2;rim.position.y=.002;studio.add(rim);}
 const grid=new THREE.GridHelper(6,12,'#a9ad87','#83917c');grid.position.y=.003;grid.material.transparent=true;grid.material.opacity=.13;studio.add(grid);
 const marker=new THREE.Mesh(new THREE.RingGeometry(.29,.32,48),new THREE.MeshBasicMaterial({color:'#dfc28a',side:THREE.DoubleSide,transparent:true,opacity:.7}));marker.rotation.x=-Math.PI/2;scene.add(marker);
 const target=new THREE.Mesh(new THREE.RingGeometry(.22,.255,40),new THREE.MeshBasicMaterial({color:'#edc0a1',side:THREE.DoubleSide,transparent:true,opacity:.65}));target.rotation.x=-Math.PI/2;scene.add(target);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(64,64,4,64,64,62);gradient.addColorStop(0,'rgba(8,20,17,.38)');gradient.addColorStop(1,'rgba(8,20,17,0)');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
 const shadowTexture=new THREE.CanvasTexture(shadowCanvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.6),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 const effects=createSkillEffects(scene),reducedQuery=matchMedia('(prefers-reduced-motion:reduce)');$('reduced-fx').checked=reducedQuery.matches;
 const reduced=()=>$('reduced-fx').checked;
 const duration=()=>mode==='skill'?skillTrack(classId,skillIndex).duration+.45:mode==='attack'?attackDuration(classId)+.4:3;
 const destination=()=>({x:face.x*2.15,y:groundY,z:face.z*2.15});
 function rebuildEffect(){effects.clear();effect=null;if(!$('fx-enabled').checked||!['attack','skill'].includes(mode))return;
  const track=mode==='skill'?skillTrack(classId,skillIndex):{...skillTrack(classId,0),duration:attackDuration(classId),strikes:[.42]};
  effect=effects.create(track,{from:{x:0,y:groundY,z:0},to:destination(),groundY,direction:face,color:getClass(classId).color,skillIndex:mode==='skill'?skillIndex:null,reduced:reduced(),quality:matchMedia('(pointer:coarse)').matches||innerHeight<500?'low':'high'});
 }
 function replay(){time=0;playing=true;$('replay').textContent='พัก';rebuildEffect();}
 function describe(){const skills=classSkills(classId,SKILLS),track=skillTrack(classId,skillIndex);
  $('skill-title').textContent=mode==='skill'?skills[skillIndex].name:({idle:'ยืนพัก',walk:'เดิน',attack:'โจมตีปกติ'}[mode]);
  $('skill-description').textContent=mode==='skill'?track.label:mode==='walk'?'ขยับแขน ขา และถ่ายน้ำหนักจากภาพ 8 ทิศ':mode==='attack'?'ดูจังหวะออกอาวุธและเอฟเฟกต์ประจำอาชีพ':'ลากฉากเพื่อหมุนกล้อง หรือเลือกทิศจากภาพด้านข้าง';
  for(const b of $('skills').children)b.setAttribute('aria-pressed',String(mode==='skill'&&Number(b.dataset.skill)===skillIndex));
 }
 function setMode(value){mode=value;$('motion-mode').value=mode;describe();replay();}
 function redraw(){
  $('class-title').textContent=className(classId,gender)+'แห่งอโยธยา';
  for(const b of document.querySelectorAll('[data-gender]')){b.textContent=classId==='acolyte'?(b.dataset.gender==='male'?'พระ':'แม่ชี'):(b.dataset.gender==='male'?'ชาย':'หญิง');b.setAttribute('aria-pressed',String(b.dataset.gender===gender));}
  for(const b of $('directions').children){const ctx=b.querySelector('canvas').getContext('2d');ctx.clearRect(0,0,192,192);ctx.drawImage(art.frames[gender][b.dataset.direction],0,0);}
  const skills=classSkills(classId,SKILLS);$('skills').replaceChildren();
  skills.forEach((skill,i)=>{const b=document.createElement('button');b.type='button';b.dataset.skill=i;b.title=skill.name;const icon=document.createElement('strong');icon.textContent=String(i+1);const name=document.createElement('span');name.textContent=skill.name;b.append(icon,name);b.onclick=()=>{skillIndex=i;setMode('skill');};$('skills').append(b);});
  applySkillArt([...$('skills').children],classId);describe();
 }
 for(const c of [NOVICE,...CLASSES]){const o=document.createElement('option');o.value=c.id;o.textContent=c.icon+' '+c.name;$('profession').append(o);}$('profession').value=classId;
 for(const d of DIRECTIONS){const b=document.createElement('button');b.type='button';b.dataset.direction=d;b.setAttribute('aria-label','หัน'+labels[d]);const c=document.createElement('canvas');c.width=c.height=192;const label=document.createElement('span');label.textContent=labels[d];b.append(c,label);b.onclick=()=>{const angle=DIRECTIONS.indexOf(d)*Math.PI/4;face=screenDirection(Math.sin(angle),-Math.cos(angle),controls.getAzimuthalAngle());direction=d;rebuildEffect();};$('directions').append(b);}
 async function selectClass(id){const version=++selectionVersion;$('status').textContent='กำลังเตรียม '+className(id,gender)+'…';$('stage').setAttribute('aria-busy','true');
  try{const next=await loadDirectionalArt(id);if(version!==selectionVersion)return;const nextHero=createDirectionalActor(next,{classId:id,gender,direction});nextHero.scale.setScalar(2.8);if(hero){scene.remove(hero);hero.userData.dispose();}hero=nextHero;art=next;classId=id;scene.add(hero);redraw();replay();$('status').textContent='พร้อมลอง · 8 อาชีพ · 16 รูปลักษณ์ · 128 มุม';const url=new URL(location.href);url.searchParams.set('class',classId);history.replaceState(null,'',url);}
  catch(error){if(version!==selectionVersion)return;console.error(error);$('profession').value=classId;$('status').textContent='โหลดภาพไม่สำเร็จ ลองเลือกอีกครั้ง';}
  finally{if(version===selectionVersion)$('stage').removeAttribute('aria-busy');}
 }
 $('profession').onchange=()=>selectClass($('profession').value);
 for(const b of document.querySelectorAll('[data-gender]'))b.onclick=()=>{gender=b.dataset.gender;hero?.userData.setGender(gender);if(art)redraw();};
 $('motion-mode').onchange=()=>setMode($('motion-mode').value);
 $('replay').onclick=()=>{playing=!playing;if(playing&&time>=duration())time=0;$('replay').textContent=playing?'พัก':'เล่นต่อ';};
 $('scrub').oninput=()=>{playing=false;$('replay').textContent='เล่นต่อ';time=Number($('scrub').value)/1000*duration();};
 $('fx-enabled').onchange=rebuildEffect;$('reduced-fx').onchange=rebuildEffect;
 function turn(delta){const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));s.theta+=delta;camera.position.setFromSpherical(s).add(controls.target);controls.update();}
 $('camera-left').onclick=()=>turn(-Math.PI/4);$('camera-right').onclick=()=>turn(Math.PI/4);$('camera-home').onclick=()=>{controls.target.set(0,groundY+.95,0);camera.position.set(0,groundY+3.25,6.7);controls.update();face={x:0,z:1};rebuildEffect();};
 addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey||e.repeat||e.target.closest('input,select,textarea'))return;if(e.code==='KeyQ')turn(-Math.PI/4);if(e.code==='KeyE')turn(Math.PI/4);if(e.code==='Space'){e.preventDefault();$('replay').click();}});
 const draco=new DRACOLoader().setDecoderPath('./vendor/addons/libs/draco/'),loader=new GLTFLoader().setDRACOLoader(draco);
 $('environment').onchange=async()=>{const value=$('environment').value,version=++environmentVersion;$('status').textContent='กำลังโหลดฉาก…';
  try{let next=null,nextMap=null;if(value!=='studio'){const world=await fetch('./maps/world.json').then(r=>{if(!r.ok)throw new Error('world');return r.json();});nextMap=world.maps.find(m=>m.id===value);next=(await loader.loadAsync(nextMap.scene)).scene;if(version!==environmentVersion){disposeScene(next);return;}}
   if(mapRoot){scene.remove(mapRoot);disposeScene(mapRoot);mapRoot=null;}mapMotion=null;studio.visible=!next;groundY=0;
   if(next){mapRoot=next;next.position.set(-nextMap.spawn.x,0,-nextMap.spawn.z);scene.add(next);mapMotion=prepareSceneV2({scene,model:next,map:nextMap});groundY=groundHeight(nextMap.nav,nextMap.spawn.x,nextMap.spawn.z);}
   else{scene.background=new THREE.Color('#293d37');scene.fog=new THREE.Fog('#293d37',14,34);}
   currentEnvironment=value;$('camera-home').click();$('status').textContent=value==='studio'?'ฉากฝึกพร้อมลอง':'ฉาก 3D จริงจากเกม · '+nextMap.name;
  }catch(error){if(version!==environmentVersion)return;console.error(error);$('environment').value=currentEnvironment;$('status').textContent='โหลดฉากไม่สำเร็จ ยังลองตัวละครต่อได้';}
 };
 const resize=()=>{const {width,height}=$('stage').getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe($('stage'));resize();
 await selectClass(classId);let metricTime=0;
 renderer.setAnimationLoop(ms=>{const dt=lastMs===null?0:Math.min(.05,(ms-lastMs)/1000);lastMs=ms;if(document.hidden)return;controls.update();mapMotion?.update(dt);
  if(playing){time+=dt*Number($('speed').value||1);if(time>duration()){if($('loop').checked){time%=duration();rebuildEffect();}else{time=duration();playing=false;$('replay').textContent='เล่นต่อ';}}}
  direction=stableViewDirection(face,controls.getAzimuthalAngle(),direction);
  if(hero){const options={direction,mode,time,phase:time*1.15,reduced:reduced()};if(mode==='skill')hero.userData.pose(skillPose(classId,skillIndex,time,{reduced:reduced()}),options);else hero.userData.update(options);hero.position.set(0,groundY+.035,0);}
  effect?.sample(time,camera);marker.position.set(0,groundY+.009,0);shadow.position.set(0,groundY+.012,0);const to=destination();target.position.set(to.x,groundY+.009,to.z);marker.visible=target.visible=$('guides')?.checked??true;
  $('scrub').value=String(Math.round(time/duration()*1000));$('phase').textContent=time.toFixed(2)+' / '+duration().toFixed(2)+' วินาที';
  $('facing').textContent=className(classId,gender)+' · '+labels[direction]+' · '+direction;for(const b of $('directions').children)b.setAttribute('aria-pressed',String(b.dataset.direction===direction));
  renderer.render(scene,camera);metricTime+=dt;if(metricTime>.4){metricTime=0;$('metrics').textContent=renderer.info.render.calls+' draw calls · '+renderer.info.memory.textures+' textures';}
 });
 // Read-only local diagnostics; no account or gameplay data.
 if(['localhost','127.0.0.1'].includes(location.hostname))Object.defineProperty(window,'__characterLab',{value:{get state(){return {classId,gender,direction,mode,skillIndex,time,playing,groundY,effects:effects.count,geometry:renderer.info.memory.geometries,textures:renderer.info.memory.textures};},get actor(){return hero;},camera,scene,renderer}});
 addEventListener('pagehide',event=>{if(event.persisted)return;renderer.setAnimationLoop(null);effects.dispose();hero?.userData.dispose();if(mapRoot)disposeScene(mapRoot);disposeScene(studio);shadowTexture.dispose();shadow.geometry.dispose();shadow.material.dispose();marker.geometry.dispose();marker.material.dispose();target.geometry.dispose();target.material.dispose();controls.dispose();draco.dispose();renderer.dispose();});
}catch(error){console.error(error);document.body.classList.add('error');$('status').textContent='เปิดห้องลองไม่ได้ กรุณารีเฟรชเพื่อลองใหม่';}

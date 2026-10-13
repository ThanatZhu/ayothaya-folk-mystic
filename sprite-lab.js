import {CLASSES,isClass,className} from './classes.js?v=18';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {DIRECTIONS,viewDirection,loadDirectionalArt} from './directional-sprite.js?v=17';
import {screenDirection} from './combat-core.js?v=21';
import {createRiggedSprite} from './rigged-sprite.js?v=16';
import {characterMotion} from './character-motion.js?v=15';
const $=id=>document.getElementById(id),labels={S:'หน้า',SE:'หน้าขวา',E:'ขวา',NE:'หลังขวา',N:'หลัง',NW:'หลังซ้าย',W:'ซ้าย',SW:'หน้าซ้าย'};
try{
 const requested=new URLSearchParams(location.search).get('class');
 let classId=CLASSES.some(c=>c.id===requested)?requested:'shaman',art=await loadDirectionalArt(classId),selectionVersion=0;
 for(const c of CLASSES){const o=document.createElement('option');o.value=c.id;o.textContent=c.icon+' '+c.name;$('profession').append(o);}
 $('profession').value=classId;
 const scene=new THREE.Scene();scene.fog=new THREE.Fog('#30432f',10,28);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;$('stage').append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(32,1,.1,60);camera.position.set(0,3.3,7.5);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.1,0);controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=controls.maxPolarAngle=1.285;controls.update();
 scene.add(new THREE.AmbientLight('#fff1d4',2));const sun=new THREE.DirectionalLight('#fff0d0',2);sun.position.set(-4,6,5);scene.add(sun);
 const floor=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.65,.15,64),new THREE.MeshLambertMaterial({color:'#5b6043'}));floor.position.y=-.09;scene.add(floor);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.34,.37,48),new THREE.MeshBasicMaterial({color:'#d9b868',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.006;scene.add(ring);
 const guides=new THREE.GridHelper(5,10,'#a69361','#697353');guides.position.y=.004;guides.material.transparent=true;guides.material.opacity=.3;scene.add(guides);
 function makeTextures(next){const result={};for(const g of ['male','female']){result[g]={};for(const d of DIRECTIONS){const t=new THREE.CanvasTexture(next.frames[g][d]);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;result[g][d]=t;}}return result;}
 let textures=makeTextures(art);
 const hero=createRiggedSprite(textures.male.S);hero.userData.footV=art.footV;hero.scale.set(2.6,2.6,1);scene.add(hero);
 let gender='male',face={x:0,z:1},lastDirection='',lastGender='',elapsed=0,lastTime=null;const reduced=matchMedia('(prefers-reduced-motion:reduce)');if(reduced.matches)$('breathe').checked=false;
 for(const d of DIRECTIONS){const b=document.createElement('button');b.type='button';b.dataset.direction=d;b.setAttribute('aria-label','หัน'+labels[d]);b.setAttribute('aria-pressed','false');const c=document.createElement('canvas');c.width=c.height=192;b.append(c);const label=document.createElement('span');label.textContent=labels[d];b.append(label);b.onclick=()=>{const angle=DIRECTIONS.indexOf(d)*Math.PI/4;face=screenDirection(Math.sin(angle),-Math.cos(angle),controls.getAzimuthalAngle());};$('directions').append(b);}
 function redraw(){$('class-title').textContent=className(classId,gender)+'แห่งอโยธยา';for(const b of document.querySelectorAll('[data-gender]'))b.textContent=classId==='acolyte'?(b.dataset.gender==='male'?'พระ':'แม่ชี'):(b.dataset.gender==='male'?'ชาย':'หญิง');for(const b of $('directions').children){const ctx=b.querySelector('canvas').getContext('2d');ctx.clearRect(0,0,192,192);ctx.drawImage(art.frames[gender][b.dataset.direction],0,0);}}
 for(const b of document.querySelectorAll('[data-gender]'))b.onclick=()=>{gender=b.dataset.gender;document.querySelectorAll('[data-gender]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));redraw();};redraw();
 $('profession').onchange=async()=>{
  const nextClass=$('profession').value,version=++selectionVersion;
  $('status').textContent='กำลังโหลด '+className(nextClass,gender)+'…';$('stage').setAttribute('aria-busy','true');
  try{
   const next=await loadDirectionalArt(nextClass);if(version!==selectionVersion)return;
   const nextTextures=makeTextures(next),previous=textures;
   art=next;textures=nextTextures;classId=nextClass;hero.userData.footV=art.footV;
   hero.material.map=textures[gender][viewDirection(face,controls.getAzimuthalAngle())];
   for(const row of Object.values(previous))for(const texture of Object.values(row))texture.dispose();
   lastDirection='';redraw();ready();
   const url=new URL(location.href);url.searchParams.set('class',classId);history.replaceState(null,'',url);
  }catch(error){if(version!==selectionVersion)return;console.error(error);$('profession').value=classId;$('status').textContent='โหลดอาชีพนี้ไม่สำเร็จ ลองเลือกอีกครั้งได้';}
  finally{if(version===selectionVersion)$('stage').removeAttribute('aria-busy');}
 };
 function ready(){$('status').textContent='พร้อมลอง · 7 อาชีพ / 112 ภาพ · ไม่ต้องล็อกอิน';}
 function turn(delta){const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);s.theta+=delta;camera.position.setFromSpherical(s).add(controls.target);controls.update();}
 $('camera-left').onclick=()=>turn(-Math.PI/4);$('camera-right').onclick=()=>turn(Math.PI/4);$('camera-home').onclick=()=>{camera.position.set(0,3.3,7.5);controls.update();face={x:0,z:1};};
 addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey||e.repeat||e.target.closest('input,select,textarea'))return;if(e.code==='KeyQ')turn(-Math.PI/4);if(e.code==='KeyE')turn(Math.PI/4);});
 $('guides').onchange=()=>{guides.visible=ring.visible=$('guides').checked;};
 const resize=()=>{const {width,height}=$('stage').getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe($('stage'));resize();
 renderer.setAnimationLoop(ms=>{const dt=lastTime===null?0:Math.min(.05,(ms-lastTime)/1000);lastTime=ms;if(document.hidden)return;elapsed+=dt;controls.update();const d=viewDirection(face,controls.getAzimuthalAngle());hero.material.map=textures[gender][d];hero.userData.pose(characterMotion({time:elapsed,classId,reduced:reduced.matches||!$('breathe').checked}));if(d!==lastDirection||gender!==lastGender){lastDirection=d;lastGender=gender;$('facing').textContent=(className(classId,gender)+(classId==='acolyte'?'':gender==='male'?'ชาย':'หญิง'))+' · '+labels[d]+' · '+d;for(const b of $('directions').children)b.setAttribute('aria-pressed',String(b.dataset.direction===d));}renderer.render(scene,camera);});
 ready();
}catch(error){console.error(error);document.body.classList.add('error');$('status').textContent='เปิดห้องลองไม่ได้ กรุณารีเฟรชเพื่อลองใหม่';}

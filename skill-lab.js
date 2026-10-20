import * as THREE from 'three';
import {CLASSES,NOVICE,atlasPath,classSkills,className} from './classes.js?v=101';
import {SKILLS} from './combat-core.js?v=101';
import {skillTrack,skillPose} from './skill-choreography.js?v=101';
import {createRiggedSprite} from './rigged-sprite.js?v=41.2';
import {createSkillEffects} from './skill-effects.js?v=74';
import {characterMotion,attackDuration} from './character-motion.js?v=37';
import {applySkillArt} from './skill-art.js?v=101';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion:reduce)');
try{
 const all=[NOVICE,...CLASSES],requested=new URLSearchParams(location.search).get('class');
 let demoMode='skill';
 let classId=all.some(c=>c.id===requested)?requested:'boxer',gender='male',index=0,textures=null,loadVersion=0,loading=true,flip=false,time=0,playing=false,previous=null,fx=null;
 for(const c of all){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;$('profession').append(o);}$('profession').value=classId;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,40);camera.position.set(0,3.8,9);camera.lookAt(0,1.2,0);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;$('stage').append(renderer.domElement);
 scene.add(new THREE.HemisphereLight('#ffe5b5','#263e32',2.5));
 const floor=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.65,.18,64),new THREE.MeshLambertMaterial({color:'#797354'}));floor.position.y=-.13;scene.add(floor);
 for(const radius of [1.6,2.3]){const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.014,80),new THREE.MeshBasicMaterial({color:'#c4ad75',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.025;scene.add(ring);}
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.4,40),new THREE.MeshBasicMaterial({color:'#17271d',transparent:true,opacity:.4,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.4,.65,1);shadow.position.y=-.015;scene.add(shadow);
 const hero=createRiggedSprite(null);hero.scale.set(3.2,3.2,1);scene.add(hero);const effects=createSkillEffects(scene);
 async function load(id){
  const version=++loadVersion;loading=true;playing=false;$('status').textContent='กำลังโหลด '+className(id,gender)+'…';$('stage').setAttribute('aria-busy','true');
  try{
   const image=new Image();image.src=atlasPath(id);await image.decode();if(version!==loadVersion)return;
   const next={};for(const [g,row] of [['male',0],['female',1]])next[g]=Array.from({length:4},(_,col)=>{const c=document.createElement('canvas');c.width=Math.round(image.width/4);c.height=Math.round(image.height/2);c.getContext('2d').drawImage(image,col*image.width/4,row*image.height/2,image.width/4,image.height/2,0,0,c.width,c.height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;return t;});
   if(textures)Object.values(textures).flat().forEach(t=>t.dispose());textures=next;classId=id;await hero.userData.setRig(classId,gender);if(version!==loadVersion)return;if(hero.userData.artError)throw new Error(hero.userData.artError);loading=false;redraw();replay();
   $('status').textContent='พร้อมลอง · เลือกสกิล หรือกด 1–9 / 0';history.replaceState(null,'','?class='+id);
  }catch(error){console.error(error);if(version===loadVersion){loading=!textures;$('profession').value=classId;$('status').textContent='โหลดภาพไม่สำเร็จ ลองเลือกอาชีพอีกครั้ง';}}
  finally{if(version===loadVersion)$('stage').removeAttribute('aria-busy');}
 }
 function resetEffect(){
  effects.clear();if(!['skill','attack'].includes(demoMode)){fx=null;return;}
  const basic=demoMode==='attack';
  const track=basic?{...skillTrack(classId,0),duration:attackDuration(classId),strikes:[.42]}:skillTrack(classId,index);
  fx=effects.create(track,{skillIndex:basic?null:index,from:{x:0,z:0},to:{x:flip?-1.4:1.4,z:0},color:all.find(c=>c.id===classId).color,reduced:reduced.matches});
 }
 function replay(){if(loading)return;time=0;playing=!reduced.matches;resetEffect();if(reduced.matches)time=(demoMode==='skill'?skillTrack(classId,index).duration:demoMode==='attack'?attackDuration(classId):1.5)*.47;$('replay').textContent=playing?'Ⅱ หยุด':'▶ เล่นท่า';document.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed','false'));}
 function info(){const skill=classSkills(classId,SKILLS)[index],track=skillTrack(classId,index);$('title').textContent=skill.name;$('description').textContent=track.label;$('duration').textContent=(demoMode==='skill'?track.duration:demoMode==='attack'?attackDuration(classId):1.5).toFixed(2)+' วินาที';for(const b of $('skills').children)b.setAttribute('aria-pressed',String(Number(b.dataset.index)===index));}
 function redraw(){
  $('skills').replaceChildren();const buttons=classSkills(classId,SKILLS).map((s,i)=>{const b=document.createElement('button');b.type='button';b.dataset.index=i;b.setAttribute('aria-label','สกิล '+s.key+' '+s.name);const icon=document.createElement('strong'),label=document.createElement('span'),key=document.createElement('kbd');icon.textContent=s.icon;key.textContent=s.key;label.append(key,document.createTextNode(s.name));b.append(icon,label);b.onclick=()=>{if(loading)return;index=i;demoMode='skill';$('motion-mode').value='skill';info();replay();};$('skills').append(b);return b;});applySkillArt(buttons,classId);info();
  for(const b of document.querySelectorAll('[data-gender]')){b.textContent=classId==='acolyte'?(b.dataset.gender==='male'?'พระ':'แม่ชี'):(b.dataset.gender==='male'?'ชาย':'หญิง');b.setAttribute('aria-pressed',String(b.dataset.gender===gender));}
 }
 $('scrub').oninput=()=>{playing=false;const d=demoMode==='skill'?skillTrack(classId,index).duration:demoMode==='attack'?attackDuration(classId):1.5;time=d*Number($('scrub').value)/1000;$('replay').textContent='▶ เล่นท่า';};
 $('motion-mode').onchange=()=>{demoMode=$('motion-mode').value;info();if(demoMode!=='skill'){$('title').textContent=$('motion-mode').selectedOptions[0].textContent;$('description').textContent='ภาพท่าเต็มตัวชุดใหม่ · จังหวะเดิน 8 เฟรม';}replay();};
 $('profession').onchange=()=>load($('profession').value);
 for(const b of document.querySelectorAll('[data-gender]'))b.onclick=()=>{gender=b.dataset.gender;hero.userData.setRig(classId,gender);if(!loading){redraw();replay();}};
 $('replay').onclick=()=>{if(loading)return;if(playing){playing=false;$('replay').textContent='▶ เล่นท่า';}else{replay();playing=true;$('replay').textContent='Ⅱ หยุด';}};
 $('flip').onclick=()=>{flip=!flip;$('flip').setAttribute('aria-pressed',String(flip));$('flip').textContent=flip?'หันขวา ⇄':'หันซ้าย ⇄';if(!loading)resetEffect();};
 for(const b of document.querySelectorAll('[data-phase]'))b.onclick=()=>{if(loading)return;playing=false;time=(demoMode==='skill'?skillTrack(classId,index).duration:demoMode==='attack'?attackDuration(classId):1.5)*Number(b.dataset.phase);$('replay').textContent='▶ เล่นท่า';document.querySelectorAll('[data-phase]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));};
 addEventListener('keydown',e=>{if(loading||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,button'))return;if(/^Digit[0-9]$/.test(e.code)){e.preventDefault();index=(Number(e.code.slice(-1))+9)%10;demoMode='skill';$('motion-mode').value='skill';info();replay();}});
 reduced.addEventListener('change',()=>{if(!loading)replay();});
 new ResizeObserver(()=>{const r=$('stage').getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe($('stage'));
 renderer.setAnimationLoop(ms=>{
  const dt=previous===null?0:Math.min(.05,(ms-previous)/1000);previous=ms;if(document.hidden||loading||!textures)return;
  const track=demoMode==='skill'?skillTrack(classId,index):{duration:demoMode==='attack'?attackDuration(classId):1.5};if(playing){time+=dt*Number($('speed').value);if(time>track.duration+(['walk','idle'].includes(demoMode)?0:.65)){if($('loop').checked)time=0;else{time=track.duration;playing=false;$('replay').textContent='↻ เล่นอีกครั้ง';}}}
  const pose=demoMode==='skill'?skillPose(classId,index,time,{reduced:reduced.matches}):characterMotion({classId,mode:demoMode,time,reduced:reduced.matches});$('scrub').value=Math.min(1000,time/track.duration*1000);hero.material.map=textures[gender][0];hero.userData.pose(pose,flip);hero.position.set(pose.x*(flip?-1:1),pose.y,0);shadow.position.x=hero.position.x;shadow.material.opacity=.4-pose.y*.6;
  fx?.sample(time,camera);$('progress').value=Math.min(1,time/track.duration);$('phase').textContent=time===0?'ตั้งต้น':time/track.duration<.25?'เตรียมท่า':time/track.duration<.82?'ออกสกิล':time<track.duration?'คืนหลัก':'จบท่า';renderer.render(scene,camera);
 });
 await load(classId);
}catch(error){console.error(error);$('status').textContent='เปิดลานฝึกไม่ได้ กรุณารีเฟรชเพื่อลองใหม่';}

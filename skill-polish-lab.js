import * as THREE from './vendor/build/three.module.js';
import {createRiggedSprite} from './rigged-sprite.js?v=pose119';
import {loadPaintedCharacter} from './painted-character.js?v=size1';
import {loadLifeArt,lifeFrameAt} from './character-life-art.js?v=106.0';
import {CLIPS,sampleClip,atlasUv} from './assets/skill-polish/timing.js';
import {createPaintedVfx} from './assets/skill-polish/painted-vfx.js';
import {createRoleVfx,createRooster} from './assets/skills-next/vfx.js';
import {skillById} from './assets/skills-next/catalog.js';
const $=id=>document.getElementById(id),media=matchMedia('(prefers-reduced-motion:reduce)'),url=new URL(location.href);
let id=CLIPS[url.searchParams.get('clip')]?url.searchParams.get('clip'):'sword',time=0,playing=false,previous=0,loading=true,generation=0,old=false,oldTime=0,hitStop=0,disposed=false,painted,friendArt=null;
const scene=new THREE.Scene();scene.background=new THREE.Color('#3c4d34');scene.fog=new THREE.Fog('#3c4d34',25,55);
const camera=new THREE.OrthographicCamera(-8,8,4.5,-4.5,.1,100);camera.position.set(0,11,15);camera.lookAt(0,.8,0);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;$('stage').append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff4d5','#657050',1.6));const sun=new THREE.DirectionalLight('#fff0c5',1.15);sun.position.set(-4,10,6);scene.add(sun);
const ownedTextures=[],ownedMaterials=[],ownedGeometry=[];
const loader=new THREE.TextureLoader();
const groundMap=await loader.loadAsync('./assets/capital-materials19.png');groundMap.colorSpace=THREE.SRGBColorSpace;groundMap.generateMipmaps=false;groundMap.minFilter=THREE.LinearFilter;ownedTextures.push(groundMap);
const groundMat=new THREE.MeshLambertMaterial({color:'#e4e3d0'});ownedMaterials.push(groundMat);
groundMat.onBeforeCompile=shader=>{
 shader.uniforms.terrainAtlas={value:groundMap};shader.vertexShader='varying vec2 groundXZ;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundXZ=(modelMatrix*vec4(transformed,1.)).xz;');
 shader.fragmentShader='varying vec2 groundXZ;uniform sampler2D terrainAtlas;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=groundXZ;float edge=sin(p.x*.65)*.35+sin(p.y*1.2+p.x)*.25;
 float meadow=smoothstep(3.3,5.7,length(p*vec2(.72,1.))+edge);
 vec3 grass=texture2D(terrainAtlas,vec2(.005,.505)+fract(p/6.)*.49).rgb;
 vec3 dirt=texture2D(terrainAtlas,vec2(.505,.505)+fract(p/7.)*.49).rgb;
 diffuseColor.rgb*=mix(dirt,grass,meadow)*.8;
 `);
};
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.04;scene.add(ground);ownedGeometry.push(ground.geometry);
const hero=createRiggedSprite(null,{classId:CLIPS[id].classId});hero.scale.set(2.5,2.5,1);hero.visible=false;scene.add(hero);
const monsterMap=await loader.loadAsync('./assets/monsters.png');monsterMap.colorSpace=THREE.SRGBColorSpace;monsterMap.repeat.set(.5,.5);monsterMap.offset.set(0,.5);ownedTextures.push(monsterMap);
const monsterMaterial=new THREE.SpriteMaterial({map:monsterMap,alphaTest:.18,depthWrite:true});ownedMaterials.push(monsterMaterial);const monster=new THREE.Sprite(monsterMaterial);monster.center.set(.5,.12);monster.scale.setScalar(2.8);scene.add(monster);
const friendMaterial=new THREE.SpriteMaterial({transparent:true,alphaTest:.35,depthWrite:true});ownedMaterials.push(friendMaterial);const friend=new THREE.Sprite(friendMaterial);friend.center.set(.5,44/320);friend.scale.setScalar(3.125);friend.visible=false;scene.add(friend);
const oldRooster=createRooster();scene.add(oldRooster);oldRooster.visible=false;
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const shadowCtx=shadowCanvas.getContext('2d'),shade=shadowCtx.createRadialGradient(32,32,2,32,32,30);shade.addColorStop(0,'#1a231bc0');shade.addColorStop(.45,'#1a231b65');shade.addColorStop(1,'#1a231b00');shadowCtx.fillStyle=shade;shadowCtx.fillRect(0,0,64,64);const shadowTex=new THREE.CanvasTexture(shadowCanvas);ownedTextures.push(shadowTex);
const shadows=Array.from({length:3},()=>{const mat=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity:.5}),geo=new THREE.PlaneGeometry(1,1),m=new THREE.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.position.y=.005;scene.add(m);ownedMaterials.push(mat);ownedGeometry.push(geo);return m;});
// Sparse grass at the edge of the earth patch keeps the action readable.
const grassGeo=new THREE.PlaneGeometry(.055,.36),grassMat=new THREE.MeshLambertMaterial({color:'#84945c',side:THREE.DoubleSide});ownedGeometry.push(grassGeo);ownedMaterials.push(grassMat);const grass=new THREE.InstancedMesh(grassGeo,grassMat,120),dummy=new THREE.Object3D();for(let i=0;i<120;i++){const a=i*2.399,r=6.3+(Math.sin(i*33)+1)*1.2;dummy.position.set(Math.cos(a)*r,.12,Math.sin(a)*r*.8);dummy.rotation.set(0,i*.7,Math.sin(i*5)*.22);dummy.scale.setScalar(.5+(Math.sin(i*8)+1)*.5);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}scene.add(grass);
const oldFx=createRoleVfx(scene),oldSkill=()=>skillById(CLIPS[id].skillId);
const textureCache=new Map();
function texture(canvas){if(!textureCache.has(canvas)){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;textureCache.set(canvas,t);}return textureCache.get(canvas);}
function friendFrame(sample){
 const clip=friendArt.life?.clips[sample.targetMode];if(clip){const index=lifeFrameAt(clip,sample.targetTime,$('reduced').checked);return texture(clip.frames[index]);}return texture(friendArt.idle);
}
function poseHero(sample){hero.userData.pose({mode:'cast',time:sample.time,artFrame:sample.frame,reduced:$('reduced').checked},false);hero.position.set(sample.heroX,0,0);}
function stepOld(t,rebuild=false){
 if(rebuild||t<oldTime){oldFx.clear();oldTime=-.001;}
 const clip=CLIPS[id],events=[{at:.2,charge:true},{at:clip.impacts[0],charge:false}],skill=oldSkill();let cursor=Math.max(0,oldTime);
 for(const e of events)if(e.at>oldTime&&e.at<=t){oldFx.update(Math.max(0,e.at-cursor));oldFx.burst(skill,{x:-2,z:0},{x:1.55,z:0},id==='sword'?'#ffbf63':id==='rooster'?'#a5db84':'#ffe3a0',e.charge);cursor=e.at;}
 oldFx.update(Math.max(0,t-cursor));oldTime=t;
}
function setTime(next){time=Math.max(0,Math.min(CLIPS[id].duration,next));hitStop=0;if(old)stepOld(time,true);renderSample();}
function setMode(value){old=value;$('painted').setAttribute('aria-pressed',String(!old));$('original').setAttribute('aria-pressed',String(old));$('version-tag').textContent=old?'ชุดเรขาคณิตเดิม':'เอฟเฟกต์วาดใหม่';oldFx.clear();oldTime=-.001;oldFx.configure({quality:$('quality').value,reduced:$('reduced').checked});if(old)stepOld(time,true);renderSample();}
function updatePlay(){ $('play').textContent=playing?'Ⅱ หยุด':'▶ เล่นท่า'; }
async function choose(next){
 if(!CLIPS[next])return;const token=++generation;id=next;time=0;playing=false;hitStop=0;loading=true;hero.visible=false;oldFx.clear();oldTime=-.001;document.body.dataset.ready='loading';const clip=CLIPS[id];
 $('clip-title').textContent=$('panel-title').textContent=clip.title;$('class-name').textContent=clip.tag;$('job-name').textContent=clip.tag;$('description').textContent=clip.description;$('target-name').textContent=id==='lotus'?'เพื่อนร่วมทาง':'หมูป่าทดลอง';$('target-hud').classList.toggle('healing',id==='lotus');
 document.querySelectorAll('[data-clip]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.clip===id)));$('beats').replaceChildren(...clip.beats.map(beat=>{const b=document.createElement('button');b.type='button';b.textContent=beat.name;b.dataset.time=beat.time;b.onclick=()=>{playing=false;setTime(beat.time);updatePlay();};return b;}));$('status').textContent='กำลังเตรียมภาพตัวละคร…';updatePlay();history.replaceState(null,'',`?clip=${id}`);
 try{
  await hero.userData.setRig(clip.classId,$('gender').value);if(token!==generation)return;if(hero.userData.artError)throw new Error(hero.userData.artError);hero.material.needsUpdate=true;hero.visible=true;loading=false;playing=!$('reduced').checked;updatePlay();document.body.dataset.ready='true';$('status').textContent='พร้อมดู · เลื่อนแถบเพื่อหยุดตรวจจังหวะ หรือกดเปรียบเทียบชุดเดิม';if(old)stepOld(0,true);renderSample();
 }catch(error){console.error(error);if(token===generation){$('status').textContent='โหลดภาพไม่สำเร็จ: '+error.message;document.body.dataset.ready='error';loading=false;}}
}
function resize(){const r=$('stage').getBoundingClientRect();if(!r.width||!r.height)return;const h=9/Number($('zoom').value);camera.left=-h*r.width/r.height/2;camera.right=-camera.left;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);}
const observer=new ResizeObserver(resize);observer.observe($('stage'));
const point=new THREE.Vector3();
function renderSample(){
 if(loading||!painted||disposed)return;const reduced=$('reduced').checked,s=sampleClip(id,time,{reduced});poseHero(s);monster.visible=id!=='lotus';friend.visible=id==='lotus';monster.position.set(s.targetX,.02,0);monster.material.color.setRGB(1,1-s.reaction*.25,1-s.reaction*.4);if(friend.visible){friend.material.map=friendFrame(s);friend.position.set(1.55,.02,0);}
 painted.sample(s,{old,quality:$('quality').value,reduced});oldRooster.visible=old&&id==='rooster';if(oldRooster.visible){oldRooster.position.set(s.roosterX,s.roosterY,0);oldRooster.scale.setScalar(1.2);oldRooster.userData.animate(time,true);}
 shadows[0].position.set(s.heroX,.007,0);shadows[0].scale.set(1.45,.7,1);shadows[1].position.set(s.targetX,.009,0);shadows[1].scale.set(id==='lotus'&&s.hp===0?1.8:1.4,.75,1);shadows[2].visible=id==='rooster';shadows[2].position.set(s.roosterX,.008,-.08);shadows[2].scale.set(.75,.4,1);shadows[2].material.opacity=.45-s.roosterY*.5;
 const force=$('shake').checked&&!reduced?s.shake:0,dx=Math.sin(time*117)*force,dy=Math.cos(time*93)*force*.55;camera.position.x+=dx;camera.position.y+=dy;camera.updateMatrixWorld();
 point.set(s.targetX,2.15,0).project(camera);const r=$('stage').getBoundingClientRect();$('target-hud').style.left=`${Math.max(50,Math.min(r.width-50,(point.x+1)*r.width/2))}px`;$('target-hud').style.top=`${Math.max(80,(-point.y+1)*r.height/2-28)}px`;
 renderer.render(scene,camera);camera.position.x-=dx;camera.position.y-=dy;
 $('phase').textContent=s.phase;$('time').textContent=time.toFixed(2)+' s';$('scrub').value=Math.min(1000,time/CLIPS[id].duration*1000);$('health').textContent=s.hp+' / 700';
 $('target-hud').querySelector('b').style.width=s.hp/700*100+'%';for(const b of $('beats').children)b.setAttribute('aria-pressed',String(Math.abs(time-Number(b.dataset.time))<.08));
}
for(const b of document.querySelectorAll('[data-clip]'))b.onclick=()=>choose(b.dataset.clip);
$('scrub').oninput=()=>{playing=false;setTime(Number($('scrub').value)/1000*CLIPS[id].duration);updatePlay();};$('play').onclick=()=>{if(loading)return;if(time>=CLIPS[id].duration){setTime(0);}playing=!playing;updatePlay();};$('restart').onclick=()=>{if(loading)return;setTime(0);playing=true;updatePlay();};$('painted').onclick=()=>setMode(false);$('original').onclick=()=>setMode(true);$('zoom').onchange=()=>{resize();renderSample();};$('gender').onchange=()=>choose(id);
for(const k of ['quality','reduced'])$(k).onchange=()=>setMode(old);$('shake').onchange=renderSample;media.addEventListener('change',event=>{$('reduced').checked=event.matches;if(event.matches){playing=false;updatePlay();}setMode(old);});$('reduced').checked=media.matches;
renderer.setAnimationLoop(ms=>{const rawDt=previous?Math.min(.05,(ms-previous)/1000):0;previous=ms;if(document.hidden||loading||disposed)return;if(playing){if(hitStop>0)hitStop=Math.max(0,hitStop-rawDt);else{let next=time+rawDt*Number($('speed').value);const impact=CLIPS[id].impacts.find(at=>time<at&&next>=at);if(impact&&id!=='lotus'&&!$('reduced').checked){next=impact+.001;hitStop=id==='sword'?.045:.03;}if(next>CLIPS[id].duration+.6){if($('loop').checked){next=0;oldFx.clear();oldTime=-.001;}else{next=CLIPS[id].duration;playing=false;updatePlay();}}time=next;}}if(old)stepOld(time);renderSample();});
try{
 const [fx,art,life]=await Promise.all([createPaintedVfx(scene),loadPaintedCharacter('acolyte'),loadLifeArt('acolyte-female',{classId:'acolyte'})]);painted=fx;friendArt={idle:art.female[0],life};friend.material.map=texture(friendArt.idle);friend.material.needsUpdate=true;await choose(id);
}catch(error){console.error(error);$('status').textContent='โหลดภาพเอฟเฟกต์ไม่สำเร็จ: '+error.message;document.body.dataset.ready='error';}
function dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);observer.disconnect();hero.userData.dispose();painted?.dispose();oldFx.dispose();oldRooster.userData.dispose();ownedTextures.forEach(t=>t.dispose());textureCache.forEach(t=>t.dispose());ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());renderer.dispose();}
addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
window.__skillPolish={choose,seek:t=>{playing=false;setTime(t);updatePlay();},setMode,get state(){return {id,time,old,playing,sample:sampleClip(id,time,{reduced:$('reduced').checked})};},get metrics(){return {textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,oldEffects:oldFx.count};}};

import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAmbientMotion} from './ambient-motion.js';
import {createGame} from './game-controls.js';
import {createWorldUI} from './world-ui.js';
import {resolveMap} from './world-state.js';
import {createLandscapeGuard} from './mobile-layout.js';
const $=id=>document.getElementById(id),loader=new THREE.TextureLoader();
// Sample source atlas cells at runtime; original generated PNGs remain intact.
function frame(image,rect,repeat=false){
 const [x,y,w,h]=rect,c=document.createElement('canvas');c.width=Math.round(image.width*w);c.height=Math.round(image.height*h);
 c.getContext('2d').drawImage(image,Math.round(image.width*x),Math.round(image.height*y),c.width,c.height,0,0,c.width,c.height);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;
 if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
let gameHandle=null;
const landscape=createLandscapeGuard({onChange:()=>gameHandle?.clearInput()});
try {
 const response=await fetch('./maps/world.json');if(!response.ok)throw new Error('โหลดข้อมูลเมืองไม่ได้');
 const catalog=await response.json(),map=resolveMap(catalog,new URLSearchParams(location.search).get('map'));
 let worldUI=null,overview=false;

 const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false});renderer.setPixelRatio(1);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 renderer.domElement.setAttribute('aria-label',map.name+' · ฉากเมืองหมุนกล้องได้ เดินด้วย WASD หรือจอยสัมผัส');document.getElementById('game-shell').prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(map.id==='phitsanulok'?'#424e43':map.id==='nakhon'?'#485752':'#494b3d');
 const camera=new THREE.OrthographicCamera(-20,20,15,-15,.1,140),initial=new THREE.Vector3(25,27,31),target=new THREE.Vector3(0,1,-1.3);camera.position.copy(initial);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.1;controls.enablePan=false;
 controls.minPolarAngle=controls.maxPolarAngle=Math.atan2(Math.hypot(23,28),24);controls.minZoom=.65;controls.maxZoom=2.7;controls.rotateSpeed=.6;controls.update();
 scene.add(new THREE.HemisphereLight('#f0eddc','#6b7557',1.8));
 const sun=new THREE.DirectionalLight('#fff0d7',1.25);sun.position.set(-8,20,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.5,far:70});sun.shadow.bias=-.0003;sun.shadow.normalBias=.02;scene.add(sun);
 let rotating=null;
 function resize(){const a=innerWidth/innerHeight,h=Math.max(12.8,18.2/a);camera.left=-h*a;camera.right=h*a;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(Math.round(innerWidth/.95),Math.round(innerHeight/.95),false);}
 function turn(direction){rotating={from:controls.getAzimuthalAngle(),delta:direction*Math.PI/4,start:performance.now(),radius:camera.position.distanceTo(controls.target),polar:controls.getPolarAngle()};}
 function zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.65,2.7);camera.updateProjectionMatrix();}
 $('left').onclick=()=>turn(-1);$('right').onclick=()=>turn(1);$('in').onclick=()=>zoom(1.18);$('out').onclick=()=>zoom(1/1.18);
 $('reset').onclick=()=>{rotating=null;camera.position.copy(initial);camera.zoom=1;controls.target.copy(target);camera.updateProjectionMatrix();controls.update();};
 controls.addEventListener('start',()=>{rotating=null;});addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;if(e.code==='KeyQ')turn(-1);if(e.code==='KeyE')turn(1);});addEventListener('resize',resize);resize();
 const [gltf,materials,flora,people,monsters,worldMaterials,regionalFlora]=await Promise.all([new GLTFLoader().loadAsync('./'+map.model),loader.loadAsync('./assets/materials.png'),loader.loadAsync('./assets/flora.png'),loader.loadAsync('./assets/people.png'),loader.loadAsync('./assets/monsters.png'),loader.loadAsync('./assets/world-materials-05.png'),loader.loadAsync('./assets/regional-flora-05.png')]);
 const tiles={wood:frame(materials.image,[0,0,.5,.5],true),roof:frame(materials.image,[.5,0,.5,.5],true),sand:frame(materials.image,[0,.5,.5,.5],true),grass:frame(materials.image,[.5,.5,.5,.5],true)},cache=new Map();
 for(const [key,rect] of Object.entries({brick:[0,0,.5,.5],plaster:[.5,0,.5,.5],paving:[0,.5,.5,.5],meadow:[.5,.5,.5,.5]}))tiles[key]=frame(worldMaterials.image,rect,true);
 gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=!/Water|River water|Terrain|soil|fragment/.test(o.name);o.receiveShadow=true;const name=o.material.name.replace(/\.\d+$/,'');
  if(!cache.has(name)){const key=name.startsWith('wood')?'wood':name.startsWith('roof')?'roof':name==='sand'?'sand':name==='grass'?'grass':tiles[name]?name:null;
   const m=key?new THREE.MeshLambertMaterial({map:tiles[key],color:name==='wood_dark'?'#a89b83':name==='wood_gold'?'#f4d7a1':name==='roof_dark'?'#e2ceb2':key==='sand'?'#e0ded2':key==='plaster'?'#d6d0bd':key==='brick'?'#c7a184':'#eee0c7',side:THREE.DoubleSide}):new THREE.MeshLambertMaterial({color:o.material.color,side:THREE.DoubleSide});
   m.name=name;if(key){m.emissiveMap=tiles[key];m.emissive.set('#ffffff');m.emissiveIntensity=key==='roof'?.17:key==='wood'?.09:0;}
   if(name==='amber'||name==='flame'){m.color.set('#ffbc5d');m.emissive.set('#ff7c12');m.emissiveIntensity=name==='flame'?1.3:.7;}if(name==='water')m.color.set('#355f59');cache.set(name,m);
  }o.material=cache.get(name);
 }});scene.add(gltf.scene);
 const botanic={tree:frame(flora.image,[0,0,.558,.612]),banana:frame(flora.image,[.56,0,.44,.602]),hedge:frame(flora.image,[0,.68,.55,.30]),pots:frame(flora.image,[.587,.608,.409,.386])};
 for(const [i,kind] of ['forest','palm','bamboo','rice'].entries())botanic[kind]=frame(regionalFlora.image,[(i%2)*.5,Math.floor(i/2)*.5,.5,.5]);
 const personTextures=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]].map(r=>frame(people.image,r));
 const shadowMat=new THREE.MeshBasicMaterial({color:'#273325',transparent:true,opacity:.18,depthWrite:false});
 function shadow(x,y,r){const m=new THREE.Mesh(new THREE.CircleGeometry(r,24),shadowMat);m.rotation.x=-Math.PI/2;m.position.set(x,.072,-y);m.scale.y=.64;scene.add(m);return m;}
 function sprite(tex,x,y,w,h,z=.05){const m=new THREE.SpriteMaterial({map:tex,alphaTest:.45,transparent:false,depthWrite:true,color:'#fff1da'}),s=new THREE.Sprite(m);s.center.set(.5,0);s.position.set(x,z,-y);s.scale.set(w,h,1);scene.add(s);return s;}
 const plants=[],characters=[];
 function plant(kind,x,y,w,h,flip=false){const s=sprite(botanic[kind],x,y,w,h);if(flip){s.material.map=botanic[kind].clone();s.material.map.repeat.x=-1;s.material.map.offset.x=1;}plants.push({sprite:s,kind});return s;}
 for(const [kind,x,z,w,h,flip] of map.plants){plant(kind,x,-z,w,h,flip);if(kind==='tree')shadow(x,-z,w*.3);}
 const heroHeight=1.8;
 characters.push({sprite:sprite(personTextures[0],map.spawn.x,-map.spawn.z,heroHeight,heroHeight,.06),shadow:shadow(map.spawn.x,-map.spawn.z,.45),height:heroHeight});
 for(const n of map.npcs){const h=1.65;characters.push({sprite:sprite(personTextures[n.texture],n.x,-n.z,h,h,.06),shadow:shadow(n.x,-n.z,.4),height:h});}
 const flames=[];for(const [x,z] of [[-4,3.3],[4,3.3],[-7,-7],[7,-7]]){const l=new THREE.PointLight('#ffb53f',6,3.3,1.6);l.position.set(x,1.6,z);scene.add(l);flames.push(l);}
 const geo=new THREE.BufferGeometry(),positions=new Float32Array(90);let seed=2026;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 for(let i=0;i<30;i++){positions[i*3]=-16+rnd()*32;positions[i*3+1]=.4+rnd()*4;positions[i*3+2]=-20+rnd()*20;}geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const motes=new THREE.Points(geo,new THREE.PointsMaterial({color:'#ffe29a',size:.038,transparent:true,opacity:.7}));scene.add(motes);
 const motion=createAmbientMotion({scene,world:gltf.scene,waterMaterial:cache.get('water'),plants,characters:characters.slice(1),leafSources:map.leafSources});
 const monsterTextures=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]].map(r=>frame(monsters.image,r));
 const game=createGame({scene,camera,controls,canvas:renderer.domElement,hero:characters[0],monsterTextures,sprite,shadow,cancelCameraTurn:()=>{rotating=null;},config:map,isPaused:()=>landscape.blocked||overview||(worldUI?.paused??false)});gameHandle=game;
 function toggleOverview(){
  overview=!overview;game.clearInput();rotating=null;
  const offset=camera.position.clone().sub(controls.target);
  controls.target.set(overview?0:game.world.player.x,1,overview?-8:game.world.player.z);camera.position.copy(controls.target).add(offset);camera.zoom=overview?.75:(innerWidth<700?1.6:1.05);camera.updateProjectionMatrix();controls.update();
  $('overview').textContent=overview?'V · กลับหาผู้เล่น':'V · ดูทั้งเมือง';$('overview').setAttribute('aria-pressed',String(overview));
 }
 $('overview').onclick=toggleOverview;
 addEventListener('keydown',e=>{if(e.code==='KeyV'&&!e.repeat&&!worldUI?.paused&&!e.ctrlKey&&!e.metaKey)toggleOverview();});
 const resetCamera=$('reset').onclick;$('reset').onclick=()=>{overview=false;$('overview').textContent='V · ดูทั้งเมือง';$('overview').setAttribute('aria-pressed','false');resetCamera();};
 worldUI=createWorldUI({catalog,map,game,scene,camera});
 $('motion').onclick=()=>{const playing=motion.toggle();$('motion').textContent=playing?'หยุดลมและน้ำ':'เล่นลมและน้ำ';$('motion').setAttribute('aria-pressed',String(!playing));};
 $('load').remove();document.querySelectorAll('.camera-panel button,.attack-controls button').forEach(b=>b.disabled=false);
 let lastMs=null;
 renderer.setAnimationLoop(ms=>{
  if(rotating){const t=Math.min(1,(performance.now()-rotating.start)/350),ease=t*t*(3-2*t),angle=rotating.from+rotating.delta*ease;camera.position.setFromSphericalCoords(rotating.radius,rotating.polar,angle).add(controls.target);if(t===1)rotating=null;}
  const dt=lastMs===null?0:(ms-lastMs)/1000;lastMs=ms;const t=motion.update(document.hidden||landscape.blocked?0:dt);game.update(dt);worldUI.update(t);
  flames.forEach((l,i)=>l.intensity=5.5+Math.sin(t*5+i*3)*.7);motes.position.y=Math.sin(t*.5)*.08;controls.update();$('angle').textContent=`มุมกล้อง ${Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()))}° · ซูม ${Math.round(camera.zoom*100)}%`;renderer.render(scene,camera);
 });
}catch(error){console.error(error);$('status').textContent='เปิดฉากไม่สำเร็จ';let failure=$('load');if(!failure){failure=document.createElement('div');failure.id='load';document.body.append(failure);}failure.classList.add('error');failure.textContent='เปิดฉากไม่ได้: '+error.message;}

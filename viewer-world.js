import {drawCharacterFrame} from './character-size.js?v=41.2';
import {getLoadingScreen} from './loading-screen.js?v=39';
import {createFrontierScene} from './frontier-scene.js?v=38';
import {loadMonsterFrames} from './monster-art.js?v=38';
import {createMultiplayer} from './multiplayer-ui.js?v=41.2';
import {createEquipmentUI} from './equipment-ui.js?v=41.2';
import {createCityLife,clearCourtTrees} from './city-life.js?v=42.1';
import {createGameMenu} from './game-menu.js?v=34';
import {createSkillWindow} from './skill-window.js?v=34';
import {createMmoHud} from './mmo-hud.js?v=32';
import {createSoftLook} from './soft-look.js?v=29';
import {createLandscapeDetails} from './landscape-details.js?v=38';
import {createCapitalLook,createCapitalTrees,createCapitalProps,paintify} from './capital-look.js?v=38';
import {loadDirectionalArt} from './directional-sprite.js?v=17';
import {createRiggedSprite} from './rigged-sprite.js?v=41.2';
import {customizeAtlas} from './character-appearance.js?v=41';
import {jobFor} from './advancement.js?v=21';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAmbientMotion} from './ambient-motion.js?v=21';
import {createGame} from './game-controls.js?v=41';
import {atlasPath,className} from './classes.js?v=18';
import {atlasCell} from './sprite-motion.js';
import {createWorldUI} from './world-ui.js?v=42.1';
import {createStoryUI} from './story-ui.js?v=02';
import {createBagUI} from './bag-ui.js?v=03';
import {createStatusUI} from './status-ui.js?v=02';
import {createRefineUI} from './refine-ui.js?v=01';
import {createMarketUI} from './market-ui.js?v=01';
import {createSocialUI} from './social-ui.js?v=01';
import {createLifeUI} from './life-ui.js?v=01';
import {resolveMap} from './world-state.js?v=21';
import {createLandscapeGuard} from './mobile-layout.js?v=11';
import {prepareCloud} from './cloud-save.js?v=41';
import {captureSave,applySave} from './save-state.js?v=21';
const $=id=>document.getElementById(id),loading=getLoadingScreen(),loader=new THREE.TextureLoader();
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
 const response=await fetch('./maps/world.json?v=41');if(!response.ok)throw new Error('โหลดข้อมูลเมืองไม่ได้');
 const catalog=await response.json();loading.stage(1);
 const account=await prepareCloud(catalog);if(!account.character)throw new Error('Character save unavailable');
 const map=resolveMap(catalog,account.data?.mapId||new URLSearchParams(location.search).get('map'));
 loading.theme(map.id);loading.stage(2);
 history.replaceState(null,'','?server='+account.serverId+'&map='+encodeURIComponent(map.id));
 let worldUI=null,multiplayer=null,overview=false;

 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.16;
 renderer.domElement.setAttribute('aria-label',map.name+' · ฉากเมืองหมุนกล้องได้ เดินด้วย WASD หรือจอยสัมผัส');document.getElementById('game-shell').prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d3dcc4');scene.fog=new THREE.Fog('#d9dfcb',62,150); // soft haze toward the far (top) edge
 const camera=new THREE.OrthographicCamera(-20,20,15,-15,.1,700),initial=new THREE.Vector3(25,27,31),target=new THREE.Vector3(0,1,-1.3);camera.position.copy(initial);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.1;controls.enablePan=false;
 controls.minPolarAngle=controls.maxPolarAngle=Math.atan2(Math.hypot(23,28),24);controls.minZoom=.65;controls.maxZoom=2.7;controls.rotateSpeed=.6;controls.update();
 const softLook=createSoftLook({renderer,scene,camera});
 const night=map.procedural==='mill';scene.add(new THREE.HemisphereLight(night?'#b4d5dd':'#fffdf4',night?'#4e6260':'#a3af84',night?.85:1.35));
 const sun=new THREE.DirectionalLight(night?'#bed9ed':'#ffefd2',night?.7:1.3);sun.position.set(-8,20,9);sun.castShadow=true;const shadowSize=matchMedia('(pointer:coarse)').matches?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);
 Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.5,far:70});sun.shadow.bias=-.0003;sun.shadow.normalBias=.02;sun.shadow.radius=5;sun.shadow.intensity=.74;scene.add(sun);scene.add(sun.target);
 let rotating=null;
 function resize(){const a=innerWidth/innerHeight,h=Math.max(12.8,18.2/a);camera.left=-h*a;camera.right=h*a;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);softLook.setSize(innerWidth,innerHeight);}
 function turn(direction){rotating={from:controls.getAzimuthalAngle(),delta:direction*Math.PI/4,start:performance.now(),radius:camera.position.distanceTo(controls.target),polar:controls.getPolarAngle()};}
 function zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,overview?.08:.65,2.7);camera.updateProjectionMatrix();}
 $('left').onclick=()=>turn(-1);$('right').onclick=()=>turn(1);$('in').onclick=()=>zoom(1.18);$('out').onclick=()=>zoom(1/1.18);
 $('reset').onclick=()=>{rotating=null;camera.position.copy(initial);camera.zoom=1;controls.target.copy(target);camera.updateProjectionMatrix();controls.update();};
 controls.addEventListener('start',()=>{rotating=null;});addEventListener('keydown',e=>{if(document.querySelector('dialog:modal')||$('account-panel').dataset.blocking==='true'||e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest?.('input,textarea,select'))return;if(e.code==='KeyQ')turn(-1);if(e.code==='KeyE')turn(1);});addEventListener('resize',resize);resize();
 const [gltf,materials,flora,people,monsters,worldMaterials,regionalFlora,heroAtlas,capitalAtlas,leafAtlas]=await Promise.all([map.procedural?Promise.resolve({scene:new THREE.Group()}):new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('./vendor/addons/libs/draco/')).loadAsync('./'+map.model+'?v=29'),loader.loadAsync('./assets/materials.png'),loader.loadAsync('./assets/flora.png'),loader.loadAsync('./assets/people.png'),loader.loadAsync('./assets/monsters.png'),loader.loadAsync('./assets/world-materials-05.png'),loader.loadAsync('./assets/regional-flora-05.png'),loader.loadAsync(atlasPath(account.character.classId)),loader.loadAsync('./assets/capital-materials19.png'),loader.loadAsync('./assets/capital-leaves19.png')]);
 loading.stage(3);clearCourtTrees(gltf.scene,map);
 const tiles={wood:frame(materials.image,[0,0,.5,.5],true),roof:frame(materials.image,[.5,0,.5,.5],true),sand:frame(materials.image,[0,.5,.5,.5],true),grass:frame(materials.image,[.5,.5,.5,.5],true)},cache=new Map();
 for(const [key,rect] of Object.entries({brick:[0,0,.5,.5],plaster:[.5,0,.5,.5],paving:[0,.5,.5,.5],meadow:[.5,.5,.5,.5]}))tiles[key]=frame(worldMaterials.image,rect,true);
 const capitalLook=createCapitalLook({map,atlas:capitalAtlas,frame});tiles.roof=capitalLook.roof;
 // Painted look: smooth the tiled building textures instead of hard pixel edges.
 for(const t of Object.values(tiles)){t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=4;t.needsUpdate=true;}
 gltf.scene.traverse(o=>{if(o.isMesh){if(o.name.startsWith('Living_canopy')||o.name.startsWith('Living canopy')||o.name.startsWith('Market_pottery')||o.name.startsWith('Market pottery'))o.visible=false;o.castShadow=!/Water|River$|River_|Terrain|terrain|ground19|soil|fragment|Garden_canal/.test(o.name);o.receiveShadow=true;const name=o.material.name.replace(/\.\d+$/,''),colors=o.geometry.attributes.color,cacheKey=name+(colors?'|ao':'');
  // Blender-baked ambient occlusion (bake_building_ao.py) arrives as vertex colours; ease it so under-floor areas stay readable.
  if(colors&&!o.geometry.userData.aoEased){for(let i=0;i<colors.count;i++)for(let c=0;c<3;c++)colors.setComponent(i,c,1-(1-colors.getComponent(i,c))*.78);colors.needsUpdate=true;o.geometry.userData.aoEased=true;}
  if(!cache.has(cacheKey)){const key=name.startsWith('wood')?'wood':name.startsWith('roof')?'roof':name==='sand'?'sand':name==='grass'?'grass':tiles[name]?name:null;
   const m=key?new THREE.MeshLambertMaterial({map:tiles[key],color:name==='wood_dark'?'#a89b83':name==='wood_gold'?'#f4d7a1':name==='roof_dark'?'#e2ceb2':key==='sand'?'#e0ded2':key==='plaster'?'#d6d0bd':key==='brick'?'#c7a184':'#eee0c7',side:THREE.DoubleSide}):new THREE.MeshLambertMaterial({color:o.material.color,side:THREE.DoubleSide});
   m.name=name;if(key){m.emissiveMap=tiles[key];m.emissive.set('#ffffff');m.emissiveIntensity=key==='roof'?.17:key==='wood'?.09:0;}
   if(name==='amber'||name==='flame'){m.color.set('#ffbc5d');m.emissive.set('#ff7c12');m.emissiveIntensity=name==='flame'?1.3:.7;}if(name==='water')m.color.set('#68a5a1');if(name==='bark19'){m.map=tiles.wood;m.color.set('#a58a62');}if(name==='stone19')m.color.set('#b8b9a0');m.vertexColors=!!colors;cache.set(cacheKey,name==='ground19'?capitalLook.ground:name.startsWith('canopy')?capitalLook.canopy(name):['water','amber','flame'].includes(name)?m:paintify(m));
  }o.material=cache.get(cacheKey);
 }});scene.add(gltf.scene);
 createCapitalProps({scene,map});
 const landscapeDetails=createLandscapeDetails({scene,map});
 const cityTrees=createCapitalTrees({scene,map,texture:leafAtlas,crownTexture:capitalLook.crownTexture});
 const botanic={tree:frame(flora.image,[0,0,.558,.612]),banana:frame(flora.image,[.56,0,.44,.602]),hedge:frame(flora.image,[0,.68,.55,.30]),pots:frame(flora.image,[.587,.608,.409,.386])};
 for(const [i,kind] of ['forest','palm','bamboo','rice'].entries())botanic[kind]=frame(regionalFlora.image,[(i%2)*.5,Math.floor(i/2)*.5,.5,.5]);
 const personTextures=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]].map(r=>frame(people.image,r));
 const shadowMat=new THREE.MeshBasicMaterial({color:'#273325',transparent:true,opacity:.18,depthWrite:false});
 function shadow(x,y,r){const m=new THREE.Mesh(new THREE.CircleGeometry(r,24),shadowMat);m.rotation.x=-Math.PI/2;m.position.set(x,.072,-y);m.scale.y=.64;scene.add(m);return m;}
 function sprite(tex,x,y,w,h,z=.05){const m=new THREE.SpriteMaterial({map:tex,alphaTest:.45,transparent:false,depthWrite:true,color:'#fff1da'}),s=new THREE.Sprite(m);s.center.set(.5,0);s.position.set(x,z,-y);s.scale.set(w,h,1);scene.add(s);return s;}
 const plants=[],characters=[];
 function plant(kind,x,y,w,h,flip=false){const s=sprite(botanic[kind],x,y,w,h);if(flip){s.material.map=botanic[kind].clone();s.material.map.repeat.x=-1;s.material.map.offset.x=1;}plants.push({sprite:s,kind});return s;}
 for(const [kind,x,z,w,h,flip] of map.plants){if(['canopy19','shrub19'].includes(kind))continue;plant(kind,x,-z,w,h,flip);if(kind==='tree')shadow(x,-z,w*.3);}
 const customized=customizeAtlas(heroAtlas.image,account.character.appearance,account.character.classId);
 const heroHeight=2.1,heroFrames=Array.from({length:4},(_,i)=>frame(customized,atlasCell(account.character.gender,i)));
 const heroMesh=createRiggedSprite(heroFrames[0],{classId:account.character.classId,gender:account.character.gender,appearance:account.character.appearance,equipment:account.equipment});scene.add(heroMesh);
 characters.push({sprite:heroMesh,shadow:shadow(map.spawn.x,-map.spawn.z,.45),height:heroHeight,frames:heroFrames});
 // A01 is opt-in: standard costume turnaround; original wardrobe/action frames remain default.
 const pilotToggle=$('directional-pilot'),pilotStatus=$('directional-pilot-status');
 $('directional-pilot-option').hidden=account.character.classId==='novice';
 $('directional-pilot-name').textContent='ลอง '+className(account.character.classId,account.character.gender)+' 8 ทิศ · ชุดมาตรฐาน';
 $('directional-lab-link').href='./sprite-lab.html?class='+account.character.classId;
 pilotToggle.onchange=async()=>{
  const hero=characters[0];
  if(!pilotToggle.checked){hero.directionalEnabled=false;pilotStatus.textContent='กลับมาใช้ภาพและชุดเดิมแล้ว';return;}
  pilotToggle.disabled=true;pilotStatus.textContent='กำลังโหลดภาพตัวละคร 8 ทิศ…';
  try{
   if(!hero.directionalFrames){
    const art=await loadDirectionalArt(account.character.classId);hero.directionalFrames={};hero.directionalFootV=art.footV;
    for(const [d,canvas] of Object.entries(art.frames[account.character.gender]))hero.directionalFrames[d]=frame(canvas,[0,0,1,1]);
   }
   hero.directionalEnabled=true;pilotStatus.textContent='ชุดมาตรฐาน 8 ทิศ · ใช้การขยับเดิมชั่วคราว · ยังไม่มีคลิปเดิน/โจมตีใหม่';
  }catch(error){console.error(error);pilotToggle.checked=false;hero.directionalEnabled=false;pilotStatus.textContent='โหลดไม่สำเร็จ ใช้ภาพเดิมต่อได้ ลองเปิดอีกครั้ง';}
  finally{pilotToggle.disabled=false;}
 };

 for(const n of map.npcs.filter(n=>!n.mentorId)){const h=1.65;characters.push({sprite:sprite(personTextures[n.texture],n.x,-n.z,h,h,.06),shadow:shadow(n.x,-n.z,.4),height:h});}
 const cityLife=await createCityLife({scene,map,shadow,paving:tiles.paving});
 const flames=[];for(const [x,z] of []){const l=new THREE.PointLight('#ffb53f',6,3.3,1.6);l.position.set(x,1.6,z);scene.add(l);flames.push(l);}
 const geo=new THREE.BufferGeometry(),positions=new Float32Array(90);let seed=2026;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 for(let i=0;i<30;i++){positions[i*3]=-16+rnd()*32;positions[i*3+1]=.4+rnd()*4;positions[i*3+2]=-20+rnd()*20;}geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const motes=new THREE.Points(geo,new THREE.PointsMaterial({color:'#ffe29a',size:.038,transparent:true,opacity:.7}));scene.add(motes);
 const frontier=map.procedural?await createFrontierScene({scene,map,ground:capitalLook.ground,tiles}):null;
 const motion=frontier??createAmbientMotion({scene,world:gltf.scene,waterMaterial:cache.get('water'),plants,characters:characters.slice(1),leafSources:map.leafSources});
 const monsterTextures=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]].map(r=>frame(monsters.image,r));
 const monsterArt=await loadMonsterFrames(map);
 await heroMesh.userData.ready;if(heroMesh.userData.artError)throw new Error('Character animation unavailable');loading.stage(4);
 const game=createGame({skillState:{skills:account.skills,offline:!account.cloud,onChange:s=>account.setSkills(s)},scene,camera,controls,canvas:renderer.domElement,hero:characters[0],monsterTextures,monsterArt,sprite,shadow,cancelCameraTurn:()=>{rotating=null;},config:{...map,classId:account.character.classId,jobId:account.character.jobId,gender:account.character.gender},isPaused:()=>loading.active||!!document.querySelector('dialog:modal')||multiplayer?.paused||landscape.blocked||account.paused||overview||(worldUI?.paused??false)});gameHandle=game;
 applySave(game.world,map,account.data);
 document.querySelector('.player-heading strong').textContent=account.character?.name||'นักเดินทาง';
 document.querySelector('.player-heading small').textContent=className(account.character.classId,account.character.gender)+' · '+map.name;
 // Extract one atlas cell so a circular portrait can preserve the sprite's natural aspect ratio.
 const portrait=document.querySelector('.portrait'),portraitFrame=document.createElement('canvas');
 portraitFrame.width=customized.width/4;portraitFrame.height=customized.height/2;
 portraitFrame.getContext('2d').drawImage(customized,0,account.character.gender==='female'?portraitFrame.height:0,portraitFrame.width,portraitFrame.height,0,0,portraitFrame.width,portraitFrame.height);
 portrait.style.backgroundImage='url('+portraitFrame.toDataURL()+')';portrait.style.backgroundSize='contain';portrait.style.backgroundPosition='center';
 portrait.style.imageRendering='pixelated';$('profile-profession').textContent=className(account.character.classId,account.character.gender)+' · '+map.name;
 const savedSettings=account.data?.settings;let motionPlaying=motion.running;
 if(savedSettings){
  camera.zoom=THREE.MathUtils.clamp(Number(savedSettings.zoom)||1,.65,2.7);
  if(Number.isFinite(savedSettings.azimuth))camera.position.setFromSphericalCoords(camera.position.distanceTo(controls.target),controls.getPolarAngle(),savedSettings.azimuth).add(controls.target);
  if(savedSettings.motion===false&&motionPlaying){motion.toggle();motionPlaying=false;}
  camera.updateProjectionMatrix();controls.update();
 }
 account.bind({clearInput:game.clearInput,capture:()=>captureSave(game.world,map,camera,controls,motionPlaying)});
 multiplayer=createMultiplayer({scene,camera,controls,game,account,frame});createGameMenu({game,account});createSkillWindow({game,classId:account.character.classId});createMmoHud({game,account});
 createEquipmentUI({account,game,hero:heroMesh,onArtwork:(canvas,gear)=>{
  characters[0].directionalEnabled=false;pilotToggle.checked=false;
  pilotToggle.disabled=gear.weapon.endsWith('-crafted')||!gear.outfit.endsWith('-original');
  const icon=document.createElement('canvas');icon.width=icon.height=256;drawCharacterFrame(icon.getContext('2d'),canvas,0,0);
  portrait.style.backgroundImage=`url("${icon.toDataURL()}")`;portrait.style.backgroundSize='contain';portrait.style.backgroundPosition='center';portrait.style.backgroundRepeat='no-repeat';
 }});
 function toggleOverview(){
  overview=!overview;controls.minZoom=overview?.08:.65;game.clearInput();rotating=null;
  const offset=camera.position.clone().sub(controls.target).multiplyScalar(overview?6:1/6);
  const bounds=map.bounds;controls.target.set(overview&&bounds?bounds.x+bounds.w/2:game.world.player.x,1,overview&&bounds?bounds.z+bounds.d/2:game.world.player.z);camera.position.copy(controls.target).add(offset);camera.zoom=overview?(map.bounds?.25:.75):(innerWidth<700?1.6:1.05);camera.updateProjectionMatrix();controls.update();
  $('overview').textContent=overview?'V · กลับหาผู้เล่น':'V · ดูทั้งเมือง';$('overview').setAttribute('aria-pressed',String(overview));
 }
 $('overview').onclick=toggleOverview;
 addEventListener('keydown',e=>{if(!document.querySelector('dialog:modal')&&$('account-panel').dataset.blocking!=='true'&&e.code==='KeyV'&&!e.repeat&&!worldUI?.paused&&!e.ctrlKey&&!e.metaKey&&!e.target.closest?.('input,textarea,select'))toggleOverview();});
 const resetCamera=$('reset').onclick;$('reset').onclick=()=>{overview=false;controls.minZoom=.65;$('overview').textContent='V · ดูทั้งเมือง';$('overview').setAttribute('aria-pressed','false');resetCamera();};
 worldUI=createWorldUI({catalog,map,game,scene,camera,controls,account,citizens:cityLife.citizens,onLocalTravel:()=>{if(overview)toggleOverview();}});const storyUI=createStoryUI({game,worldUI,map,catalog,account});const bagUI=createBagUI({game,worldUI,map,account});const statusUI=createStatusUI({game,account,bagUI});const refineUI=createRefineUI({game,map,bagUI,statusUI});const marketUI=createMarketUI({game,map,account,bagUI});const socialUI=createSocialUI({game,account});const lifeUI=createLifeUI({game,account,camera});
 document.querySelector('.player-heading small').textContent=(jobFor(account.character.classId,account.character.jobId)?.name??className(account.character.classId,account.character.gender))+' · '+(map.safe?'เขตสงบ':map.name);
 function motionLabel(){$('motion').textContent=motionPlaying?'หยุดลมและน้ำ':'เล่นลมและน้ำ';$('motion').setAttribute('aria-pressed',String(!motionPlaying));}
 motionLabel();$('motion').onclick=()=>{motionPlaying=motion.toggle();motionLabel();};
 const graphicsLabel=()=>{$('graphics').textContent=softLook.enabled?'ภาพละมุน · เปิด':'ภาพละมุน · ปิด (ประหยัดเครื่อง)';$('graphics').setAttribute('aria-pressed',String(softLook.enabled));};
 graphicsLabel();$('graphics').onclick=()=>{softLook.setEnabled(!softLook.enabled);graphicsLabel();};
 $('load')?.remove();loading.stage(5);document.querySelectorAll('.camera-panel button,.attack-controls button').forEach(b=>b.disabled=false);
 let firstFrame=true,lastMs=null;const shakeVector=new THREE.Vector3();
 renderer.setAnimationLoop(ms=>{
  if(rotating){const t=Math.min(1,(performance.now()-rotating.start)/350),ease=t*t*(3-2*t),angle=rotating.from+rotating.delta*ease;camera.position.setFromSphericalCoords(rotating.radius,rotating.polar,angle).add(controls.target);if(t===1)rotating=null;}
  const dt=lastMs===null?0:(ms-lastMs)/1000;lastMs=ms;const t=motion.update(document.hidden||landscape.blocked?0:dt);capitalLook.update(t);cityTrees.update(t);landscapeDetails.update(t);game.update(dt);storyUI.update();bagUI.update();statusUI.update();refineUI.update();marketUI.update();socialUI.update();lifeUI.update();cityLife.update(document.hidden||landscape.blocked?0:dt,game.world.player,camera);worldUI.update(t);multiplayer.update(document.hidden?0:dt);
  flames.forEach((l,i)=>l.intensity=5.5+Math.sin(t*5+i*3)*.7);motes.position.y=Math.sin(t*.5)*.08;controls.update();$('angle').textContent=`มุมกล้อง ${Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()))}° · ซูม ${Math.round(camera.zoom*100)}%`;sun.position.set(game.world.player.x-14,25,game.world.player.z+12);sun.target.position.set(game.world.player.x,0,game.world.player.z);
  const viewDistance=camera.position.distanceTo(controls.target);scene.fog.near=viewDistance+14;scene.fog.far=viewDistance+102; // haze follows the camera (overview moves it 6x further)
  const shake=game.shakeOffset(shakeVector);camera.position.add(shake);softLook.render();camera.position.sub(shake);if(firstFrame){firstFrame=false;loading.finish();}
 });
}catch(error){console.error(error);$('status').textContent='เปิดฉากไม่สำเร็จ';loading.fail();}

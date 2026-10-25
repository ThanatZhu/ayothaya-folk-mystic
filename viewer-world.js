import {createAnnouncementUI} from './announcement-ui.js?v=149';
import {createAutoTargetUI} from './auto-target-ui.js?v=139';
import {createBossBrowserUI} from './boss-browser-ui.js?v=150';
import './role-i18n.js?v=116';
import {createActionbar} from './actionbar-ui.js?v=overlay143';
import {drawCharacterFrame,CHARACTER_WORLD_SCALE,WORLD_BODY_HEIGHT} from './character-size.js?v=size1';
import {peoplePlacement} from './npc-size.js?v=size1';
import {groundHeight} from './combat-core.js?v=pets128';
import {getLoadingScreen} from './loading-screen.js?v=105.0';
import {createFrontierScene} from './frontier-scene.js?v=38';
import {loadMonsterFrames} from './monster-art.js?v=world125';
import {createMultiplayer} from './multiplayer-ui.js?v=run153';
import {createEquipmentUI} from './equipment-ui.js?v=size1';
import {createCityLife,clearCourtTrees} from './city-life.js?v=talk137';
import {loadNPCLife,applyNPCLife,stationaryNPCAction} from './npc-life-animation.js?v=106.0';
import {createGameMenu} from './game-menu.js?v=34';
import {createSkillWindow} from './skill-window.js?v=skill150';
import {createAutoSettings} from './auto-settings.js?v=hud143';
import {createMmoHud} from './mmo-hud.js?v=role116';
import {createSoftLook} from './soft-look.js?v=82';
import {createLandscapeDetails} from './landscape-details.js?v=38';
import {createMeadow,MEADOW_MAPS} from './meadow.js?v=108';
import {createPerfSettings,readPerf,QUALITY} from './perf-settings.js?v=99.11';
import {createCapitalLook,createCapitalTrees,createCapitalProps,paintify} from './capital-look.js?v=38';
import {createPaintedAvatar} from './painted-avatar.js?v=combat129';
import {customizeAtlas} from './character-appearance.js?v=41';
import {jobFor} from './advancement.js?v=73';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAmbientMotion} from './ambient-motion.js?v=size1';
import {createGame} from './game-controls.js?v=run153';
import {atlasPath,className} from './classes.js?v=112.1';
import {atlasCell} from './sprite-motion.js';
import {createWorldUI} from './world-ui.js?v=walk149';
import {createStoryUI} from './story-ui.js?v=walk149';
import {createBagUI} from './bag-ui.js?v=mobile148';
import {createStatusUI} from './status-ui.js?v=talk137';
import {createProfileUI} from './profile-ui.js?v=107';
import {createRefineUI} from './refine-ui.js?v=talk137';
import {createCraftUI} from './craft-ui.js?v=107';
import {createWeather} from './weather-fx.js?v=announce149';
import {createMarketUI} from './market-ui.js?v=trade-center122';
import {createSocialUI} from './social-ui.js?v=107';
import {createLifeUI} from './life-ui.js?v=boss138';
import {createPetUI} from './pet-ui.js?v=mail150';
import {createControlsUI} from './controls-ui.js?v=01';
import {createQuestsUI} from './quests-ui.js?v=album152';
import {createLifeNPC} from './life-npc.js?v=106.0';
import {createFeedback} from './feedback.js?v=compact-notice1';
import {createLeaderboardUI} from './leaderboard-ui.js?v=podium153';
import {createMarketBoardUI} from './market-board-ui.js?v=107';
import {createHud63} from './hud-63.js?v=combat151';
import {bindRenderLifecycle} from './render-lifecycle.js';
import {resolveMap} from './world-state.js?v=101.5';
import {prepareSceneV2,disposeScene,MOODS,moodOf} from './scene-v2.js?v=106.1-lablae';
import {createRoofCutaway} from './roof-cutaway.js?v=106.1-lablae';
import {createLandscapeGuard} from './mobile-layout.js?v=mobile2';
import {prepareCloud} from './cloud-save.js?v=112.7';
import {captureSave,applySave} from './save-state.js?v=101.5';
const $=id=>document.getElementById(id),loading=getLoadingScreen(),loader=new THREE.TextureLoader();
// Sample source atlas cells at runtime; original generated PNGs remain intact.
function frame(image,rect,repeat=false){
 const [x,y,w,h]=rect,c=document.createElement('canvas');c.width=Math.round(image.width*w);c.height=Math.round(image.height*h);
 c.getContext('2d').drawImage(image,Math.round(image.width*x),Math.round(image.height*y),c.width,c.height,0,0,c.width,c.height);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;
 if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
let gameHandle=null;
const landscape=createLandscapeGuard({allowPortrait:true,onChange:()=>gameHandle?.clearInput()});
try {
 const response=await fetch('./maps/world.json?v=world125');if(!response.ok)throw new Error('โหลดข้อมูลเมืองไม่ได้');
 const catalog=await response.json();loading.stage(1);
 const account=await prepareCloud(catalog);if(!account.character)throw new Error('Character save unavailable');
 const map=resolveMap(catalog,account.data?.mapId||new URLSearchParams(location.search).get('map'));
 loading.theme(map.id);loading.stage(2);
 history.replaceState(null,'','?server='+account.serverId+'&map='+encodeURIComponent(map.id));
 let worldUI=null,multiplayer=null,overview=false;

 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'}); // 0.80 ask for the dedicated GPU on dual-GPU laptops
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.16;
 renderer.domElement.setAttribute('aria-label',map.name+' · ฉากเมืองหมุนกล้องได้ เดินด้วย WASD หรือจอยสัมผัส');document.getElementById('game-shell').prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d3dcc4');scene.fog=new THREE.Fog('#d9dfcb',62,150); // soft haze toward the far (top) edge
 const camera=new THREE.OrthographicCamera(-20,20,15,-15,.1,700),initial=new THREE.Vector3(25,27,31),target=new THREE.Vector3(0,1,-1.3);camera.position.copy(initial);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.1;controls.enablePan=false;
 controls.minPolarAngle=controls.maxPolarAngle=Math.atan2(Math.hypot(23,28),24);controls.minZoom=.65;controls.maxZoom=2.7;controls.rotateSpeed=.6;controls.update();
 const softLook=createSoftLook({renderer,scene,camera});
 const night=map.procedural==='mill',dusk=map.mood==='dusk',mood=map.scene?MOODS[moodOf(map)]:null;scene.add(mood?new THREE.HemisphereLight(...mood.hemi):new THREE.HemisphereLight(night?'#b4d5dd':dusk?'#ffd2a8':'#fffdf4',night?'#4e6260':dusk?'#5d5a72':'#a3af84',night?(map.instance?.5:.85):dusk?1.05:1.35));
 const sun=mood?new THREE.DirectionalLight(...mood.sun):new THREE.DirectionalLight(night?'#bed9ed':'#ffefd2',night?.7:1.3);sun.position.set(-8,20,9);sun.castShadow=true;const shadowSize=matchMedia('(pointer:coarse)').matches?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);
 Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.5,far:70});sun.shadow.bias=-.0005;sun.shadow.normalBias=.05;sun.shadow.radius=4;sun.shadow.intensity=.84; // 0.82 a little deeper and crisper for depth
 scene.add(sun);scene.add(sun.target);
 // 0.71.2 the shadow box follows the hero but moves in whole shadow-map texels, so ground shadows no longer shimmer
 // ("flicker") while walking. Texel size = shadow box width / map size.
 const sunPoint=new THREE.Vector3(),sunTexel=64/shadowSize;
 function followSun(p){
  sun.position.set(p.x-14,25,p.z+12);sun.target.position.set(p.x,0,p.z);sun.updateMatrixWorld();sun.target.updateMatrixWorld();sun.shadow.updateMatrices(sun);
  sunPoint.set(p.x,0,p.z).applyMatrix4(sun.shadow.camera.matrixWorldInverse);const dx=Math.round(sunPoint.x/sunTexel)*sunTexel-sunPoint.x,dy=Math.round(sunPoint.y/sunTexel)*sunTexel-sunPoint.y;
  sunPoint.set(dx,dy,0).applyQuaternion(sun.shadow.camera.quaternion);sun.position.add(sunPoint);sun.target.position.add(sunPoint);
 }
 let rotating=null;
 function resize(){const a=innerWidth/innerHeight,h=Math.max(12.8,18.2/a);camera.left=-h*a;camera.right=h*a;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);softLook.setSize(innerWidth,innerHeight);}
 function turn(direction){rotating={from:controls.getAzimuthalAngle(),delta:direction*Math.PI/4,start:performance.now(),radius:camera.position.distanceTo(controls.target),polar:controls.getPolarAngle()};}
 function zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,overview?.08:.65,2.7);camera.updateProjectionMatrix();}
 $('left').onclick=()=>turn(-1);$('right').onclick=()=>turn(1);$('in').onclick=()=>zoom(1.18);$('out').onclick=()=>zoom(1/1.18);
 $('reset').onclick=()=>{rotating=null;camera.position.copy(initial);camera.zoom=1;controls.target.copy(target);camera.updateProjectionMatrix();controls.update();};
 controls.addEventListener('start',()=>{rotating=null;});addEventListener('keydown',e=>{if(document.querySelector('dialog:modal')||$('account-panel').dataset.blocking==='true'||e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest?.('input,textarea,select'))return;/* 0.71.1 Q / E are the potion slots only; the camera turns with the on-screen arrows or by dragging */});addEventListener('resize',resize);resize();
 const [gltf,materials,flora,people,monsters,worldMaterials,regionalFlora,heroAtlas,capitalAtlas,leafAtlas]=await Promise.all([map.procedural&&!map.scene?Promise.resolve({scene:new THREE.Group()}):new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('./vendor/addons/libs/draco/')).loadAsync('./'+(map.scene??map.model)+(map.scene?'?v=62':'?v=29'),e=>{if(e.total)loading.stage(2,'กำลังโหลดฉาก '+Math.round(e.loaded/e.total*100)+'%');}),loader.loadAsync('./assets/materials.png'),loader.loadAsync('./assets/flora.png'),loader.loadAsync('./assets/people.png'),loader.loadAsync('./assets/monsters.png'),loader.loadAsync('./assets/world-materials-05.png'),loader.loadAsync('./assets/regional-flora-05.png'),loader.loadAsync(atlasPath(account.character.classId)),loader.loadAsync('./assets/capital-materials19.png'),loader.loadAsync('./assets/capital-leaves19.png')]);
 loading.stage(3);clearCourtTrees(gltf.scene,map);
 const tiles={wood:frame(materials.image,[0,0,.5,.5],true),roof:frame(materials.image,[.5,0,.5,.5],true),sand:frame(materials.image,[0,.5,.5,.5],true),grass:frame(materials.image,[.5,.5,.5,.5],true)},cache=new Map();
 for(const [key,rect] of Object.entries({brick:[0,0,.5,.5],plaster:[.5,0,.5,.5],paving:[0,.5,.5,.5],meadow:[.5,.5,.5,.5]}))tiles[key]=frame(worldMaterials.image,rect,true);
 const capitalLook=createCapitalLook({map,atlas:capitalAtlas,frame});tiles.roof=capitalLook.roof;
 // Painted look: smooth the tiled building textures instead of hard pixel edges.
 for(const t of Object.values(tiles)){t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=4;t.needsUpdate=true;}
 const sceneMotion=map.scene?prepareSceneV2({scene,model:gltf.scene,map}):null,roofCut=createRoofCutaway(gltf.scene,{minFloor:map.id==='lablae'?.3:1});
 if(!map.scene)gltf.scene.traverse(o=>{if(o.isMesh){if(o.name.startsWith('Living_canopy')||o.name.startsWith('Living canopy')||o.name.startsWith('Market_pottery')||o.name.startsWith('Market pottery'))o.visible=false;o.castShadow=!/Water|River$|River_|Terrain|terrain|ground19|soil|fragment|Garden_canal/.test(o.name);o.receiveShadow=true;const name=o.material.name.replace(/\.\d+$/,''),colors=o.geometry.attributes.color,cacheKey=name+(colors?'|ao':'');
  // Blender-baked ambient occlusion (bake_building_ao.py) arrives as vertex colours; ease it so under-floor areas stay readable.
  if(colors&&!o.geometry.userData.aoEased){for(let i=0;i<colors.count;i++)for(let c=0;c<3;c++)colors.setComponent(i,c,1-(1-colors.getComponent(i,c))*.78);colors.needsUpdate=true;o.geometry.userData.aoEased=true;}
  if(!cache.has(cacheKey)){const key=name.startsWith('wood')?'wood':name.startsWith('roof')?'roof':name==='sand'?'sand':name==='grass'?'grass':tiles[name]?name:null;
   const m=key?new THREE.MeshLambertMaterial({map:tiles[key],color:name==='wood_dark'?'#a89b83':name==='wood_gold'?'#f4d7a1':name==='roof_dark'?'#e2ceb2':key==='sand'?'#e0ded2':key==='plaster'?'#d6d0bd':key==='brick'?'#c7a184':'#eee0c7',side:THREE.DoubleSide}):new THREE.MeshLambertMaterial({color:o.material.color,side:THREE.DoubleSide});
   m.name=name;if(key){m.emissiveMap=tiles[key];m.emissive.set('#ffffff');m.emissiveIntensity=key==='roof'?.17:key==='wood'?.09:0;}
   if(name==='amber'||name==='flame'){m.color.set('#ffbc5d');m.emissive.set('#ff7c12');m.emissiveIntensity=name==='flame'?1.3:.7;}if(name==='water')m.color.set('#68a5a1');if(name==='bark19'){m.map=tiles.wood;m.color.set('#a58a62');}if(name==='stone19')m.color.set('#b8b9a0');m.vertexColors=!!colors;cache.set(cacheKey,name==='ground19'?capitalLook.ground:name.startsWith('canopy')?capitalLook.canopy(name):['water','amber','flame'].includes(name)?m:paintify(m));
  }o.material=cache.get(cacheKey);
 }});scene.add(gltf.scene);
 // v2 scenes already contain their trees, props and ground detail: never layer the old procedural set on top.
 const idle={update(){}};if(!map.scene)createCapitalProps({scene,map});
 const landscapeDetails=map.scene?idle:createLandscapeDetails({scene,map});
 const meadow=map.scene&&MEADOW_MAPS.has(map.id)?createMeadow({scene,map,model:gltf.scene,quality:QUALITY[readPerf().quality].meadow,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches}):idle;
 const cityTrees=map.scene?idle:createCapitalTrees({scene,map,texture:leafAtlas,crownTexture:capitalLook.crownTexture});
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
 const heroHeight=CHARACTER_WORLD_SCALE,heroFrames=Array.from({length:4},(_,i)=>frame(customized,atlasCell(account.character.gender,i)));
 // 0.68.3 the original full-bodied art is the default again (the 8-direction side views read as paper-thin);
 // the 8-direction art stays one tap away in settings and the choice is remembered on this device.
 let eightWay=false;try{eightWay=localStorage.getItem('ayothaya-eight-way')==='1';}catch{}
 const heroMesh=createPaintedAvatar(heroFrames[0],{directional:eightWay,classId:account.character.classId,gender:account.character.gender,appearance:account.character.appearance,equipment:account.equipment});scene.add(heroMesh);
 characters.push({sprite:heroMesh,shadow:shadow(map.spawn.x,-map.spawn.z,.45),height:heroHeight,frames:heroFrames});
 // The shared avatar selects camera-relative painted art by default; unsupported
 // custom silhouettes retain their original equipped artwork.
 const pilotToggle=$('directional-pilot'),pilotStatus=$('directional-pilot-status');
 $('directional-pilot-option').hidden=false;
 $('directional-pilot-name').textContent=className(account.character.classId,account.character.gender)+' · ภาพตัวละคร 8 ทิศ';
 $('directional-lab-link').href='./sprite-lab.html?class='+account.character.classId;
 function directionalStatus(){
  const reason=heroMesh.userData.directionalReason;pilotToggle.checked=heroMesh.userData.directionalActive;
  pilotToggle.disabled=reason==='weapon'||reason==='appearance';
  pilotStatus.textContent=reason==='weapon'?'ใช้ภาพอาวุธพิเศษที่สวมใส่':reason==='appearance'?'ใช้ภาพพร้อมการแต่งตัวที่บันทึกไว้':reason==='load'?'โหลดภาพหลายทิศไม่สำเร็จ ใช้ภาพเดิมต่อได้':pilotToggle.checked?'หันตามมุมกล้อง · ขยับแขนขาจากภาพเดิม':'ใช้ภาพท่าเดิม';
 }
 pilotToggle.checked=eightWay;
 pilotToggle.onchange=async()=>{
  pilotToggle.disabled=true;try{localStorage.setItem('ayothaya-eight-way',pilotToggle.checked?'1':'0');}catch{}await heroMesh.userData.setDirectional(pilotToggle.checked);directionalStatus();
 };

 for(const n of map.npcs.filter(n=>!n.mentorId)){
  const tex=personTextures[n.texture],p=peoplePlacement(n.texture,tex.image.width,tex.image.height);
  const ground=groundHeight(map.nav,n.x,n.z),actor=sprite(tex,n.x,-n.z,p.width,p.height,ground+.06);actor.center.set(p.centerX,p.centerY);
  n.visualHeight=WORLD_BODY_HEIGHT;actor.userData.npc=n;
  const shade=shadow(n.x,-n.z,.4);shade.position.y=ground+.072;
  characters.push({sprite:actor,shadow:shade,height:p.height,ground,npc:n,basePlacement:p,baseTexture:tex,life:await loadNPCLife(`people-${n.texture}`)});
 }
 const cityLife=await createCityLife({scene,map,shadow,paving:tiles.paving});
 const flames=[];for(const [x,z] of []){const l=new THREE.PointLight('#ffb53f',6,3.3,1.6);l.position.set(x,1.6,z);scene.add(l);flames.push(l);}
 const geo=new THREE.BufferGeometry(),positions=new Float32Array(90);let seed=2026;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 for(let i=0;i<30;i++){positions[i*3]=-16+rnd()*32;positions[i*3+1]=.4+rnd()*4;positions[i*3+2]=-20+rnd()*20;}geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const motes=new THREE.Points(geo,new THREE.PointsMaterial({color:'#ffe29a',size:.038,transparent:true,opacity:.7}));scene.add(motes);
 const frontier=map.procedural&&!map.scene?await createFrontierScene({scene,map,ground:capitalLook.ground,tiles}):null;
 // Leaving the map reloads the page; free the scene's GPU memory first so the next map starts clean.
 bindRenderLifecycle({dispose:()=>{disposeScene(scene);renderer.dispose();},resize});
 const motion=sceneMotion??frontier??createAmbientMotion({scene,world:gltf.scene,waterMaterial:cache.get('water'),plants,characters:characters.slice(1),leafSources:map.leafSources});
 const monsterTextures=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]].map(r=>frame(monsters.image,r));
 const monsterArt=await loadMonsterFrames(map);
 await heroMesh.userData.ready;if(heroMesh.userData.artError)throw new Error('Character animation unavailable');directionalStatus();loading.stage(4);
 createAnnouncementUI(document.getElementById('game-shell'));
 const game=createGame({skillState:{skills:account.skills,offline:!account.cloud,onChange:s=>account.setSkills(s)},scene,camera,controls,canvas:renderer.domElement,hero:characters[0],monsterTextures,monsterArt,sprite,shadow,cancelCameraTurn:()=>{rotating=null;},config:{...map,roleSkills:true,classId:account.character.classId,jobId:account.character.jobId,gender:account.character.gender,name:account.character.name},isPaused:()=>loading.active||!!document.querySelector('dialog:modal')||multiplayer?.paused||landscape.blocked||account.paused||overview||(worldUI?.paused??false)});gameHandle=game;
 applySave(game.world,map,account.data);
 // Local test hook (dev server only) for automated walk/bridge/portal checks; absent on the deployed site.
 if(['127.0.0.1','localhost'].includes(location.hostname))window.__ayothaya={game,map,camera,renderer,scene};
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
 multiplayer=createMultiplayer({scene,camera,controls,game,account,frame});createGameMenu({game,account});createSkillWindow({game,classId:account.character.classId});createMmoHud({game,account});createAutoSettings({game,classId:account.character.classId});createAutoTargetUI({game});
 const equipmentUI=createEquipmentUI({account,game,hero:heroMesh,onArtwork:(canvas,gear)=>{
  directionalStatus();game.refreshAnimationCapabilities();
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
 worldUI=createWorldUI({catalog,map,game,scene,camera,controls,account,renderer,citizens:cityLife.citizens,onLocalTravel:()=>{if(overview)toggleOverview();}});const storyUI=createStoryUI({game,worldUI,map,catalog,account});const bagUI=createBagUI({game,worldUI,map,account,equipmentUI});const statusUI=createStatusUI({game,account,bagUI});storyUI.context=statusUI.storyContext;const profileUI=createProfileUI({game,account,statusUI,equipmentUI});const refineUI=createRefineUI({game,map,bagUI,statusUI});const craftUI=createCraftUI({game,bagUI});const marketUI=createMarketUI({game,map,account,bagUI});const boardUI=createMarketBoardUI({game,map,scene,camera,bagUI});window.__ayothayaRank=createLeaderboardUI({game});const socialUI=createSocialUI({game,account,worldUI,map,hall:sceneMotion});const lifeUI=createLifeUI({game,account,camera});createBossBrowserUI({game,catalog,map,worldUI});const petUI=createPetUI({game,account,scene,bagUI});createControlsUI({game});const questsUI=createQuestsUI({game,account,map,bagUI});const lifeNPC=createLifeNPC({game,map,scene,camera,controls,bagUI});createFeedback({game,map});createHud63({game,partyUI:multiplayer});
 createActionbar({game,bagUI,account});
 document.querySelector('.player-heading small').textContent=(jobFor(account.character.classId,account.character.jobId)?.name??className(account.character.classId,account.character.gender))+' · '+(map.safe?'เขตสงบ':map.name);
 function motionLabel(){$('motion').textContent=motionPlaying?'หยุดลมและน้ำ':'เล่นลมและน้ำ';$('motion').setAttribute('aria-pressed',String(!motionPlaying));}
 motionLabel();$('motion').onclick=()=>{motionPlaying=motion.toggle();motionLabel();};
 const graphicsLabel=()=>{$('graphics').textContent=softLook.enabled?'ภาพละมุน · เปิด':'ภาพละมุน · ปิด (ประหยัดเครื่อง)';$('graphics').setAttribute('aria-pressed',String(softLook.enabled));};
 graphicsLabel();$('graphics').onclick=()=>{softLook.setEnabled(!softLook.enabled);graphicsLabel();};
 $('load')?.remove();loading.stage(5);document.querySelectorAll('.camera-panel button,.attack-controls button').forEach(b=>b.disabled=false);
 const perf=createPerfSettings({renderer,scene,sun,softLook,resize,onApply:graphicsLabel});const weather=createWeather({scene,controls,sun,map,game,quality:readPerf().quality,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches});const perfBox=$('audio-settings');if(perfBox)perf.mount(perfBox);
 let firstFrame=true,lastMs=null;const shakeVector=new THREE.Vector3();
 renderer.setAnimationLoop(ms=>{
  if(!perf.shouldDraw(ms))return;
  if(rotating){const t=Math.min(1,(performance.now()-rotating.start)/350),ease=t*t*(3-2*t),angle=rotating.from+rotating.delta*ease;camera.position.setFromSphericalCoords(rotating.radius,rotating.polar,angle).add(controls.target);if(t===1)rotating=null;}
  const dt=lastMs===null?0:(ms-lastMs)/1000;lastMs=ms;const t=motion.update(document.hidden||landscape.blocked?0:dt);capitalLook.update(t);cityTrees.update(t);landscapeDetails.update(t);meadow.update(t);game.update(dt);{const p=game.world.player;roofCut.update(p.x,groundHeight(map.nav,p.x,p.z),p.z);}storyUI.update();bagUI.update();statusUI.update();profileUI.update();refineUI.update();craftUI.update();marketUI.update();boardUI.update();socialUI.update();lifeUI.update();petUI.update(dt);questsUI.update();lifeNPC.update(dt);cityLife.update(document.hidden||landscape.blocked?0:dt,game.world.player,camera);worldUI.update(t);multiplayer.update(document.hidden?0:dt);
  const reducedCharacters=matchMedia('(prefers-reduced-motion:reduce)').matches;
  characters.slice(1).forEach((a,i)=>{
   const action=stationaryNPCAction(game.world.time,i,a.npc.talking);
   if(!applyNPCLife(a.sprite,a.life,action,game.world.time+i*1.7,{reduced:reducedCharacters})){
    delete a.sprite.userData.lifeAction;delete a.sprite.userData.lifeFrame;
    const p=a.basePlacement;a.sprite.material.map=a.baseTexture;a.sprite.center.set(p.centerX,p.centerY);
    const breath=reducedCharacters?1:1+Math.sin((game.world.time+i)*Math.PI*2/4.1)*.0025;
    a.sprite.scale.set(p.width,p.height*breath,1);
   }
   a.sprite.position.set(a.npc.x,a.ground+.06,a.npc.z);
  });
  flames.forEach((l,i)=>l.intensity=5.5+Math.sin(t*5+i*3)*.7);motes.position.y=Math.sin(t*.5)*.08;controls.update();$('angle').textContent=`มุมกล้อง ${Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()))}° · ซูม ${Math.round(camera.zoom*100)}%`;followSun(game.world.player);
  const viewDistance=camera.position.distanceTo(controls.target);scene.fog.near=viewDistance+14;scene.fog.far=viewDistance+102; // haze follows the camera (overview moves it 6x further)
  weather.update(document.hidden||landscape.blocked?0:dt);
  const shake=game.shakeOffset(shakeVector);camera.position.add(shake);softLook.render();camera.position.sub(shake);if(firstFrame){firstFrame=false;loading.finish();}
 });
}catch(error){console.error(error);$('status').textContent='เปิดฉากไม่สำเร็จ';loading.fail();}

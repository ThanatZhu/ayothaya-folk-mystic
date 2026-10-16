import {monsterFrame} from './monster-catalog.js?v=38';
import {jobProgress} from './experience.js?v=21';
import {applySkillArt} from './skill-art.js?v=21';
import {viewDirection} from './directional-sprite.js?v=17';
import {characterMotion,attackDuration} from './character-motion.js?v=37';
import {skillTrack,skillPose} from './skill-choreography.js?v=37';
import {createSkillEffects,createFootDust} from './skill-effects.js?v=37';
import {progression,jobFor} from './advancement.js?v=21';
import * as THREE from 'three';
import {CombatWorld,MONSTER_TYPES,screenDirection,predictMove} from './combat-core.js?v=38';
import {upgradeSkill as levelUpSkill,normalizeSkills,availablePoints} from './skill-progress.js?v=31';
import {createRouteWalker} from './route-walk.js?v=01';

import {className} from './classes.js?v=18';

export function createGame({scene,camera,controls,canvas,hero,monsterTextures,monsterArt={},sprite,shadow,cancelCameraTurn,config={},isPaused=()=>false,skillState={}}){
 const world=new CombatWorld(config),SKILLS=world.skills,$=id=>document.getElementById(id),keys=new Set();
 const skillEffects=createSkillEffects(scene);let activeSkill=null,network=null,serverSelf=null;
 // Skill levels: the server owns them online; guests keep them in their local save.
 const progress=()=>({classId:world.profession.id,jobId:world.jobId??'',jobXp:world.jobXp});
 let localSkills=normalizeSkills(skillState.skills,world.profession.id);world.skillLevels=[...localSkills[world.profession.id]];world.skillPoints=availablePoints(localSkills,progress());
 function upgradeSkill(index){
  if(network)return network.command('upgradeSkill',{index})?true:'not-connected';
  if(!skillState.offline)return 'online-required';
  try{localSkills=levelUpSkill(localSkills,world.profession.id,index,progress());}catch(e){return e.message;}
  world.skillLevels=[...localSkills[world.profession.id]];world.skillPoints=availablePoints(localSkills,progress());skillState.onChange?.(localSkills);return true;
 }
 // 0.29 feedback: one permanent light (constant light count, so no shader recompiles) pulses on each strike,
 // the camera shakes briefly, and dust puffs at every footfall.
 const castLight=new THREE.PointLight('#ffd9a0',0,9,1.6);scene.add(castLight);const footDust=createFootDust(scene);
 let strikes=[],shakeAmount=0,lastStep=0;
 let gait=0,visualPose=null,lastX=world.player.x,lastZ=world.player.z;
 const joy={x:0,y:0,id:null},input={x:0,z:0,attack:false};let attackPointer=null,castUntil=0,noticeUntil=0,lastHUD=0,actionMode='attack',actionStart=0,hitStart=0,hitUntil=0,emoteUntil=0,emote='idle';
 addEventListener('hero-emote',e=>{if(['bow','celebrate','rest','guard'].includes(e.detail)){network?.command('emote',{name:e.detail});castUntil=0;activeSkill=null;emote=e.detail;emoteUntil=world.time+4;actionStart=world.time;world.auto=false;clearInput();}});
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),touches=new Map();let pinchDistance=0,mouseStart=null;
 // Click / tap to move (Ragnarok style): a route walker feeds the joystick direction; a gold ring marks the spot.
 const walker=createRouteWalker(()=>world.nav),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),groundHit=new THREE.Vector3();
 const marker=new THREE.Mesh(new THREE.RingGeometry(.2,.3,32),new THREE.MeshBasicMaterial({color:'#f4cf7a',transparent:true,opacity:0,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
 marker.rotation.x=-Math.PI/2;marker.renderOrder=5;marker.visible=false;scene.add(marker);let markerAge=0;
 const listeners=new Set(); // story/quest UI listens to the same events the HUD does (offline and online)
 function walkTo(target,opts={}){
  if(world.player.hp<=0)return false;
  walker.go(target,{radius:opts.radius,kind:opts.kind,onArrive:opts.onArrive,onFail:reason=>{marker.visible=false;if(opts.onFail)opts.onFail(reason);else world.notice('ไปตรงนั้นไม่ได้');}});
  if(opts.marker!==false&&typeof target!=='function'){marker.position.set(target.x,.12,target.z);marker.visible=true;markerAge=0;}else marker.visible=false;
  return true;
 }
 const mobViews=world.mobs.map(m=>{
  const h=MONSTER_TYPES[m.type].height??1.45,frames=monsterArt[m.type]?.map(t=>t.clone()),tex=frames?.[0]??monsterTextures[m.type%4].clone(),s=sprite(tex,m.x,-m.z,h*1.1,h,.06),sh=shadow(m.x,-m.z,.36);
  s.userData.monsterId=m.id;
  const label=document.createElement('button');label.className='mob-label';label.type='button';label.setAttribute('aria-label','เลือกเป้า '+MONSTER_TYPES[m.type].name+' '+(m.id+1));
  const text=document.createElement('span');text.textContent=MONSTER_TYPES[m.type].name;label.append(text);
  const bar=document.createElement('i'),fill=document.createElement('b');bar.append(fill);label.append(bar);$('world-labels').append(label);
  label.addEventListener('click',()=>world.select(m.id));
  const warning=new THREE.Mesh(new THREE.RingGeometry(.15,MONSTER_TYPES[m.type].reach??1.35,40),new THREE.MeshBasicMaterial({color:'#ed9b59',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));warning.rotation.x=-Math.PI/2;scene.add(warning);
  return {sprite:s,shadow:sh,height:h,label,fill,frames,frame:-1,warning,deathStart:null};
 });
 hero.sprite.material.map=hero.sprite.material.map.clone();
 const ringGeometry=new THREE.RingGeometry(.47,.51,40);
 const targetRing=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#ffd476',side:THREE.DoubleSide,transparent:true,opacity:.85}));targetRing.rotation.x=-Math.PI/2;scene.add(targetRing);
 const playerRing=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#8de8d0',side:THREE.DoubleSide,transparent:true,opacity:.55}));playerRing.rotation.x=-Math.PI/2;playerRing.scale.setScalar(.78);scene.add(playerRing);
 const shield=new THREE.Mesh(new THREE.RingGeometry(.7,.74,40),new THREE.MeshBasicMaterial({color:'#edd592',side:THREE.DoubleSide,transparent:true,opacity:.55}));shield.rotation.x=-Math.PI/2;scene.add(shield);
 const playerLabel=document.createElement('span');playerLabel.className='hero-label';playerLabel.textContent='คุณ · '+(jobFor(world.profession.id,config.jobId)?.name??className(world.profession.id,config.gender));$('world-labels').append(playerLabel);
 const motionPreference=matchMedia('(prefers-reduced-motion:reduce)');
 const floats=[],projection=new THREE.Vector3();
 function toast(text){$('notice').textContent=text;$('notice').classList.add('visible');noticeUntil=performance.now()+2500;dispatchEvent(new CustomEvent('game-notice',{detail:text}));}
 function project(node,x,y,z){projection.set(x,y,z).project(camera);node.style.transform=`translate(-50%,-100%) translate(${(projection.x*.5+.5)*innerWidth}px,${(-projection.y*.5+.5)*innerHeight}px)`;node.style.visibility=Math.abs(projection.x)>1.12||Math.abs(projection.y)>1.12||projection.z>1?'hidden':'visible';}
 function popup(e,positive=false){const el=document.createElement('span');el.className='damage-number';el.textContent=(positive?'+':'−')+e.amount;el.style.color=e.color??(positive?'#abedaa':'#fff0ab');$('world-labels').append(el);floats.push({el,x:e.x,z:e.z,age:0});}
 function effect(e){
  if(e.type==='experience'){
   toast((e.baseUp?'Base Level Up! Lv. '+e.baseLevel+' · ':e.jobUp?'Job Level Up! Lv. '+e.jobLevel+' · ':'')+'+'+e.base+' Base EXP · +'+e.job+' Job EXP');
  }
  if(e.type==='cast'){
   const track=Number.isInteger(e.skillIndex)?skillTrack(world.profession.id,e.skillIndex):null;
   // Basic auto-attacks must not replace a skill's active pose mid-animation.
   if(track||world.time>=castUntil||activeSkill===null){
    activeSkill=track?e.skillIndex:null;castUntil=world.time+(track?.duration??attackDuration(world.profession.id));
    actionStart=world.time;emoteUntil=0;actionMode=!track?'attack':e.kind==='dash'?'dash':e.kind==='shield'?'guard':['slash','punch','thrust','arrow'].includes(e.kind)?'attack':'cast';
   }
   const beats=track?track.strikes.map(b=>world.time+b*track.duration):[world.time+.12];strikes=beats.map(at=>({at,power:track?1:.4}));if(e.color)castLight.color.set(e.color);
   const presentation=track??{...skillTrack(world.profession.id,0),duration:attackDuration(world.profession.id),strikes:[.42]};
   skillEffects.create(presentation,{...e,reduced:motionPreference.matches});
  }else if(e.type==='damage'){popup(e);}
  else if(e.type==='heal'){popup(e,true);}
  else if(e.type==='playerHit'){hitUntil=world.time+.28;hitStart=world.time;popup({...e,color:'#ff987e'});hero.sprite.material.color.set('#ff9b83');}
  else if(e.type==='notice')toast(e.text);
  else if(e.type==='defeat')toast('ปราบ '+MONSTER_TYPES[world.mobs[e.id].type].name+' แล้ว');
 }
 const skillButtons=SKILLS.map((s,i)=>{
  const b=document.createElement('button');b.type='button';b.className='skill';b.setAttribute('aria-label',`สกิล ${s.key} ${s.name}`);b.title=`${s.key} · ${s.name} · MP ${s.cost} · ${s.cd} วินาที`;
  b.innerHTML=`<kbd>${s.key}</kbd><strong>${s.icon}</strong><span>${s.short}</span><em></em><small class="skill-level"></small>`;b.style.setProperty('--skill-color',s.color);b.addEventListener('click',()=>{if(!isPaused())world.skill(i);});$('skills').append(b);return b;
 });
 applySkillArt(skillButtons,world.profession.id);

 $('auto-attack').addEventListener('click',()=>{if(!isPaused())world.toggleAuto();});
 $('attack').addEventListener('pointerdown',e=>{if(isPaused())return;e.preventDefault();attackPointer=e.pointerId;input.attack=true;$('attack').setPointerCapture(e.pointerId);world.basicAttack();});
 function releaseAttack(e){if(e.pointerId===attackPointer){input.attack=false;attackPointer=null;}}
 $('attack').addEventListener('pointerup',releaseAttack);$('attack').addEventListener('pointercancel',releaseAttack);$('attack').addEventListener('lostpointercapture',releaseAttack);
 // Keyboard activation of the accessible attack button also works.
 $('attack').addEventListener('click',e=>{if(e.detail===0&&!isPaused())world.basicAttack();});
 function editable(e){return e.target instanceof Element&&!!e.target.closest('input,textarea,select,[contenteditable=true]');}
 addEventListener('keydown',e=>{
  if(isPaused()||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Space'&&e.target.closest?.('[data-hud-panel] button,#account-panel button'))return;
  if(['KeyW','KeyA','KeyS','KeyD','Space','KeyF'].includes(e.code)||/^Digit[0-9]$/.test(e.code))e.preventDefault();
  if(['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code))keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='KeyF')world.toggleAuto();
  if(e.code==='Space')world.basicAttack();
  if(/^Digit[0-9]$/.test(e.code)){const n=Number(e.code.slice(-1));world.skill(n===0?9:n-1);}
 });
 addEventListener('keyup',e=>keys.delete(e.code));
 const joystick=$('joystick'),knob=$('stick');
 function updateStick(e){const b=joystick.getBoundingClientRect(),r=b.width*.34;let x=(e.clientX-b.left-b.width/2)/r,y=(b.top+b.height/2-e.clientY)/r,n=Math.max(1,Math.hypot(x,y));joy.x=x/n;joy.y=y/n;knob.style.transform=`translate(${joy.x*r}px,${-joy.y*r}px)`;}
 function clearStick(){joy.id=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)';joystick.classList.remove('held');}
 joystick.addEventListener('pointerdown',e=>{if(isPaused()||joy.id!==null)return;e.preventDefault();joy.id=e.pointerId;joystick.setPointerCapture(e.pointerId);joystick.classList.add('held');updateStick(e);});
 joystick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id){e.preventDefault();updateStick(e);}});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(name,e=>{if(e.pointerId===joy.id)clearStick();});
 function clearInput(){
  walker.cancel();
  keys.clear();input.attack=false;
  if(attackPointer!==null&&$('attack').hasPointerCapture(attackPointer))$('attack').releasePointerCapture(attackPointer);
  if(joy.id!==null&&joystick.hasPointerCapture(joy.id))joystick.releasePointerCapture(joy.id);
  for(const id of touches.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  attackPointer=null;clearStick();touches.clear();pinchDistance=0;mouseStart=null;
 }
 addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
 function selectAt(x,y){
  pointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  for(const hit of raycaster.intersectObjects(mobViews.map(v=>v.sprite))){
   const id=hit.object.userData.monsterId;if(world.mobs[id].hp<=0)continue;
   const tex=hit.object.material.map,uv=hit.uv?.clone();
   if(uv){tex.transformUv(uv);const img=tex.image,c=img.getContext?.('2d');if(c&&c.getImageData(Math.min(img.width-1,Math.max(0,Math.floor(uv.x*img.width))),Math.min(img.height-1,Math.max(0,Math.floor(uv.y*img.height))),1,1).data[3]<40)continue;}
   world.select(id);return;
  }
  if(raycaster.ray.intersectPlane(groundPlane,groundHit))walkTo({x:groundHit.x,z:groundHit.z});
 }
 function pinchSpan(){const a=[...touches.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;}
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'){mouseStart={x:e.clientX,y:e.clientY};return;}
  e.stopImmediatePropagation();e.preventDefault();canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});
  if(touches.size>1){touches.forEach(p=>p.moved=true);pinchDistance=pinchSpan();}cancelCameraTurn();
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch')return;e.stopImmediatePropagation();const p=touches.get(e.pointerId);if(!p)return;e.preventDefault();const dx=e.clientX-p.x;p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(p.x-p.startX,p.y-p.startY)>8)p.moved=true;
  if(touches.size===2){const d=pinchSpan();if(pinchDistance>0)camera.zoom=THREE.MathUtils.clamp(camera.zoom*d/pinchDistance,.65,2.7);pinchDistance=d;camera.updateProjectionMatrix();}
  else if(p.startX>innerWidth*.45&&p.moved){const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta-=dx/innerWidth*Math.PI*2;camera.position.setFromSpherical(spherical).add(controls.target);controls.update();}
 },true);
 function pointerEnd(e){
  if(e.pointerType!=='touch'){if(mouseStart&&Math.hypot(e.clientX-mouseStart.x,e.clientY-mouseStart.y)<7&&e.type==='pointerup')selectAt(e.clientX,e.clientY);mouseStart=null;return;}
  e.stopImmediatePropagation();const p=touches.get(e.pointerId);if(p&&!p.moved&&e.type==='pointerup')selectAt(e.clientX,e.clientY);touches.delete(e.pointerId);pinchDistance=0;
 }
 for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,pointerEnd,true);
 canvas.addEventListener('lostpointercapture',e=>{touches.delete(e.pointerId);if(!touches.size)pinchDistance=0;});
 const defaultZoom=()=>innerWidth<700?1.6:1.05;
 camera.zoom=defaultZoom();camera.updateProjectionMatrix();
 const initialOffset=camera.position.clone().sub(controls.target);
 $('reset').onclick=()=>{cancelCameraTurn();controls.target.set(world.player.x,1,world.player.z);camera.position.copy(controls.target).add(initialOffset);camera.zoom=defaultZoom();camera.updateProjectionMatrix();controls.update();};
 function update(dt){
  const paused=isPaused();if(paused)clearInput();
  dt=document.hidden||paused?0:Math.min(.05,Math.max(0,dt));
  const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joy.x,y=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+joy.y;
  let direction=screenDirection(x,y,controls.getAzimuthalAngle());
  // Keys / joystick always win over a tapped route; otherwise the route steers like a held joystick.
  if(Math.hypot(x,y)>.08||world.player.hp<=0)walker.cancel();else if(!paused){const routed=walker.step(world.player,dt);if(routed)direction=routed;}
  if(marker.visible){markerAge+=dt;if(walker.active){marker.material.opacity=.85;marker.scale.setScalar(1+.15*Math.sin(markerAge*7));}else{marker.material.opacity-=dt*3.5;if(marker.material.opacity<=0)marker.visible=false;}}if(network){network.setInput(paused?{x:0,z:0,attack:false}:{...direction,attack:input.attack||keys.has('Space')});world.time+=dt;predictMove(world,serverSelf,dt,paused?{x:0,z:0}:direction);}else if(!paused)world.update(dt,{...direction,attack:input.attack||keys.has('Space')});
  world.events.splice(0).forEach(e=>{effect(e);for(const fn of listeners)fn(e);});
  const p=world.player,t=world.time,reduced=motionPreference.matches;
  if(p.moving)emoteUntil=0;
  const mode=t<hitUntil?'hit':t<castUntil?actionMode:t<emoteUntil?emote:p.moving?'walk':p.shield>0?'guard':'idle';
  const distanceMoved=Math.hypot(p.x-lastX,p.z-lastZ);lastX=p.x;lastZ=p.z;
  if(distanceMoved<1)gait+=distanceMoved/2.1; // No steps while blocked; teleports do not advance the gait.
  const skillActive=t<castUntil&&t>=hitUntil&&activeSkill!==null;
  const pose=skillActive?skillPose(world.profession.id,activeSkill,t-actionStart,{reduced}):characterMotion({time:mode==='walk'||mode==='idle'?t:mode==='hit'?t-hitStart:t-actionStart,phase:mode==='walk'?gait:null,mode,classId:world.profession.id,reduced});
  if(!visualPose||reduced)visualPose={...pose};
  else for(const key of Object.keys(pose))visualPose[key]=['frame','artFrame'].includes(key)?pose[key]:(visualPose[key]??pose[key])+(pose[key]-(visualPose[key]??pose[key]))*(1-Math.exp(-dt*24));
  const heroSize=hero.height??1.8;
  const faceLength=Math.hypot(p.face.x,p.face.z)||1,rootOffset=skillActive&&SKILLS[activeSkill].type!=='dash'?visualPose.x:0;
  hero.sprite.position.set(p.x+p.face.x/faceLength*rootOffset,(p.z>4.25?.41:.06)+visualPose.y,p.z+p.face.z/faceLength*rootOffset);
  hero.sprite.scale.set(heroSize,heroSize,1);
  const azimuth=controls.getAzimuthalAngle(),directional=hero.directionalEnabled&&hero.directionalFrames;
  if(directional){
   hero.viewDirection=viewDirection(p.face,azimuth,hero.viewDirection);
   hero.sprite.material.map=hero.directionalFrames[hero.viewDirection];hero.sprite.userData.footV=hero.directionalFootV;
  }else{if(hero.frames)hero.sprite.material.map=hero.frames[0];hero.sprite.userData.footV=1;}
  const facing=p.face.x*Math.cos(azimuth)-p.face.z*Math.sin(azimuth);
  hero.sprite.userData.directional=!!directional;
  hero.sprite.userData.pose?.(visualPose,directional?false:facing<0);
  hero.sprite.material.color.lerp(new THREE.Color('#fff1da'),Math.min(1,dt*8));hero.sprite.visible=p.hp>0;hero.shadow.visible=p.hp>0;
  footDust.update(dt);
  if(mode==='walk'&&!reduced){const step=Math.floor(gait*2+.5);if(step!==lastStep){lastStep=step;footDust.puff(p.x-p.face.x/faceLength*.25,p.z>4.25?.44:.09,p.z-p.face.z/faceLength*.25);}}
  let flash=0,shake=0;for(const s of strikes){const d=t-s.at;if(d>=0&&d<.45){flash=Math.max(flash,s.power*Math.exp(-d*9));if(d<.25)shake=Math.max(shake,s.power*Math.exp(-d*16));}}strikes=strikes.filter(s=>t-s.at<.5);
  castLight.intensity=reduced?0:flash*14;castLight.position.set(p.x,1.3,p.z);shakeAmount=reduced?0:shake*.11;
  hero.shadow.position.set(p.x,p.z>4.25?.46:.072,p.z);playerRing.position.set(p.x,p.z>4.25?.47:.081,p.z);shield.position.set(p.x,.1,p.z);shield.visible=p.shield>0;
  // Camera follows the player while preserving user-controlled azimuth and zoom.
  const follow=new THREE.Vector3(p.x,1,p.z).sub(controls.target).multiplyScalar(1-Math.exp(-dt*4));camera.position.add(follow);controls.target.add(follow);
  controls.update();camera.updateMatrixWorld();
  project(playerLabel,p.x,2.0+hero.sprite.position.y,p.z);
  mobViews.forEach((v,i)=>{
   const m=world.mobs[i],type=MONSTER_TYPES[m.type];
   if(m.hp<=0&&v.deathStart===null)v.deathStart=t;if(m.hp>0)v.deathStart=null;
   const deadAge=v.deathStart===null?0:t-v.deathStart,visible=m.hp>0||deadAge<1.25;
   v.sprite.visible=v.shadow.visible=visible;v.label.hidden=m.hp<=0;v.warning.visible=m.hp>0&&m.windup>0;
   v.warning.position.set(m.x,.09,m.z);v.warning.material.opacity=.12+.25*(1-(m.windup??0)/(type.windup??.45));
   if(!visible)return;
   const f=monsterFrame(m,t);if(v.frames&&f!==v.frame){v.sprite.material.map=v.frames[f];v.sprite.material.map.needsUpdate=true;v.frame=f;}
   const recoil=reduced?0:Math.sin(Math.PI*Math.min(1,m.hit/.34))*.18;
   v.sprite.position.set(m.x+(m.recoil?.x??0)*recoil,.06,m.z+(m.recoil?.z??0)*recoil);v.shadow.position.set(m.x,.073,m.z);
   v.sprite.scale.set(v.height*1.1,v.height,1);v.sprite.material.rotation=0;
   v.sprite.material.transparent=m.hp<=0;v.sprite.material.opacity=m.hp<=0?Math.max(0,1-(deadAge-.5)/.75):1;
   v.sprite.material.color.set(m.hit>.25&&!reduced?'#ffe8c8':m.root>0?'#9ddacc':'#fff1da');v.fill.style.width=`${m.hp/m.maxHp*100}%`;v.label.classList.toggle('selected',world.targetId===m.id);
   if(m.aggro){const side=(p.x-m.x)*Math.cos(controls.getAzimuthalAngle())-(p.z-m.z)*Math.sin(controls.getAzimuthalAngle());v.sprite.material.map.repeat.x=side<0?-1:1;v.sprite.material.map.offset.x=side<0?1:0;}
   project(v.label,m.x,v.height+.08,m.z);
  });
  const target=world.target;targetRing.visible=!!target;if(target){targetRing.position.set(target.x,.088,target.z);targetRing.scale.setScalar(1+.07*Math.sin(t*5));}
  skillEffects.update(dt,camera);
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.age+=dt;if(f.age>1){f.el.remove();floats.splice(i,1);}else{project(f.el,f.x,1.6+f.age*.8,f.z);f.el.style.opacity=String(1-f.age*.8);}}
  if(performance.now()>noticeUntil)$('notice').classList.remove('visible');
  if(t-lastHUD>.08){lastHUD=t;
   $('hp').style.width=`${p.hp/p.maxHp*100}%`;$('mp').style.width=`${p.mp/p.maxMp*100}%`;$('hp-text').textContent=`HP ${Math.ceil(p.hp)} / ${p.maxHp}`;$('mp-text').textContent=`MP ${Math.floor(p.mp)} / ${p.maxMp}`;$('kills').textContent=`Lv. ${progression(world).level} · ปราบมอน ${world.kills} ตัว`;if($('hero-level'))$('hero-level').textContent='Lv. '+progression(world).level;
   const base=progression(world),job=jobProgress(world,world.profession.id,world.jobId);
   for(const [id,stats,label] of [['base-exp',base,'Base'],['job-exp',job,'Job']]){
    const track=$(id);if(!track)continue;
    track.querySelector('i').style.width=stats.percent+'%';
    track.querySelector('span').textContent=label+' Lv.'+stats.level+' · '+(stats.maxed?'MAX':stats.current+'/'+stats.required);
    track.setAttribute('aria-valuenow',String(Math.round(stats.percent)));track.setAttribute('aria-valuetext',label+' Level '+stats.level+', '+(stats.maxed?'สูงสุด':stats.current+' จาก '+stats.required+' EXP'));
   }
   $('auto-attack').classList.toggle('active',world.auto);$('auto-attack').setAttribute('aria-pressed',String(world.auto));$('auto-state').textContent=world.auto?'เปิด':'ปิด';
   $('target-name').textContent=target?MONSTER_TYPES[target.type].name:world.safe?'เขตปลอดภัย':'ยังไม่เลือกเป้าหมาย';$('target-hp').textContent=target?`${target.hp} / ${target.maxHp}`:world.safe?'พักฟื้น · พูดคุย · เดินทาง':'คลิก / แตะมอนสเตอร์';$('target-fill').style.width=target?`${target.hp/target.maxHp*100}%`:'0%';
   if(!network)world.skillPoints=availablePoints(localSkills,progress());
   skillButtons.forEach((b,i)=>{const cd=world.cooldowns[i],lv=world.skillLevels[i]??1;b.querySelector('.skill-level').textContent=lv?'Lv'+lv:'—';b.classList.toggle('locked',!lv);b.querySelector('em').textContent=cd>.05?String(Math.ceil(cd)):'';b.classList.toggle('cooling',cd>.05);b.classList.toggle('no-mana',p.mp<SKILLS[i].cost);b.style.setProperty('--cooldown',`${cd/SKILLS[i].cd*100}%`);});
  }
 }
 function mobileLayout(){return innerWidth<=800||matchMedia('(pointer:coarse)').matches;}
 function updateHelp(){
  document.querySelector('.control-hint').textContent=mobileLayout()?'ลากจอยซ้ายเพื่อเดิน · แตะมอนเลือกเป้า · ลากด้านขวาหมุนกล้อง':'WASD เดิน · Space โจมตี · F ออโต้ · 1–9 / 0 สกิล · Q / E หมุนกล้อง';
  document.querySelector('.player-foot span:last-child').textContent=mobileLayout()?'จอยซ้าย · เดิน':'W A S D · เดิน';
 }
 updateHelp();addEventListener('resize',updateHelp);
 toast(mobileLayout()?'ลากจอยเดิน · แตะมอนและสกิลด้านขวา':'WASD เดิน · คลิกมอนเลือกเป้า · Space โจมตี · F ออโต้');
 function setNetwork(client){network=client;clearInput();world.auto=false;
  world.skill=i=>client.command('skill',{index:i});world.basicAttack=()=>client.command('attack');world.select=id=>client.command('select',{target:id});world.toggleAuto=()=>client.command('auto');world.questTalk=npc=>client.command('questTalk',{npc});world.useItem=item=>client.command('useItem',{item});world.statUp=stat=>client.command('statUp',{stat});world.equipGear=item=>client.command('equip',{item});world.unequipGear=slot=>client.command('unequip',{slot});world.refine=(slot,npc,lekLai)=>client.command('refine',{slot,npc,lekLai});world.insertCard=(slot,card)=>client.command('insertCard',{slot,card});world.trade=(type,npc,item,count)=>client.command(type,{npc,item,count});
 }
 function applyNetworkSnapshot(snapshot){const s=snapshot.self;if(s.story)world.story=s.story;if(s.bag)world.bag=s.bag;if(s.stats){world.stats=s.stats;world.gear=s.gear;world.statPoints=s.statPoints;world.derivedView=s.derived;}if(Array.isArray(s.skillLevels))world.skillLevels=[...s.skillLevels];if(Number.isInteger(s.skillPoints))world.skillPoints=s.skillPoints;const {x,z,moving,face,...state}=s.player;Object.assign(world.player,state);if(!serverSelf){world.player.x=x;world.player.z=z;}serverSelf={x,z,moving,face};world.cooldowns=[...s.cooldowns];world.kills=s.kills;world.baseXp=s.baseXp;world.jobXp=s.jobXp;world.targetId=s.targetId;world.auto=s.auto;if(Math.abs(world.time-snapshot.time)>.25)world.time=snapshot.time;
  for(const mob of snapshot.mobs){const existing=world.mobs.find(m=>m.id===mob.id);if(existing)Object.assign(existing,mob);}
 }
 // Applied by the renderer around the draw call only, so it never leaks into the orbit controls.
 function shakeOffset(out){const t=world.time,a=shakeAmount;return out.set(Math.sin(t*83)*a,Math.cos(t*67)*a*.6,Math.sin(t*71+1)*a);}
 return {update,world,clearInput,setNetwork,applyNetworkSnapshot,shakeOffset,upgradeSkill,walkTo,cancelWalk:()=>walker.cancel(),get walking(){return walker.active;},onEvent:fn=>listeners.add(fn),get online(){return !!network;}};
}

import {itemDef} from './items.js?v=107';
import {monsterFrame,MONSTER_BEHAVIOUR} from './monster-catalog.js?v=38';
import {jobProgress} from './experience.js?v=105.3';
import {applySkillArt} from './skill-art.js?v=101';
import {characterMotion,attackDuration,gaitStep,walkView} from './character-motion.js?v=life1';
import {activeEmote,actionChoice,canonicalAction,CHARACTER_ACTIONS,EMOTE_ACTIONS,supportsCharacterAction,GAMEPLAY_RUN_ENABLED} from './character-action-state.js?v=106.0';
import {skillTrack,skillPose} from './skill-choreography.js?v=life1';
import {createSkillEffects,createFootDust} from './skill-effects.js?v=74';
import {progression,jobFor} from './advancement.js?v=73';
import * as THREE from 'three';
import {CombatWorld,MONSTER_TYPES,screenDirection,predictMove,groundHeight} from './combat-core.js?v=109.4';
import {upgradeSkill as levelUpSkill,normalizeSkills,availablePoints,SLOTS,BASE_SLOTS,isMaster,HOTBAR_KEYS} from './skill-progress.js?v=101';
import {createRouteWalker} from './route-walk.js?v=01';

import {className} from './classes.js?v=101';
import {rebirthRank} from './character-stats.js?v=107';
import {normalizeAuto} from './auto-play.js';

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
 const castLight=new THREE.PointLight('#ffd9a0',0,9,1.6);scene.add(castLight);
 // 0.57 rare drops: a light pillar where the item fell (rarity blue and up), fading over 2.6 s.
 const RARITY_COLOR=['#c9c9c9','#7ddc6f','#5fb2ff','#c27bff','#ffc23d'],pillars=[];
 function pillar(x,z,rarity){const m=new THREE.Mesh(new THREE.CylinderGeometry(.18,.42,6,12,1,true),new THREE.MeshBasicMaterial({color:RARITY_COLOR[rarity],transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));m.position.set(x,3,z);scene.add(m);pillars.push({m,age:0});}const footDust=createFootDust(scene);
 let strikes=[],shakeAmount=0,lastStep=0;
 let heroView='side',heroFlip=false,gait=0,visualPose=null,lastX=world.player.x,lastZ=world.player.z;
 const joy={x:0,y:0,id:null},input={x:0,z:0,attack:false};let hitTintUntil=0,attackPointer=null,castUntil=0,noticeUntil=0,lastHUD=0,actionMode='attack',actionStart=0,hitStart=0,hitUntil=0,runToggled=false,capabilitySignature='';
 const supportsAction=action=>(action!=='run'||GAMEPLAY_RUN_ENABLED)&&supportsCharacterAction(action,hero.sprite.userData.supportsAction?.bind(hero.sprite.userData));
 function refreshAnimationCapabilities(){const actions=CHARACTER_ACTIONS.filter(supportsAction),signature=actions.join(',');if(signature!==capabilitySignature){capabilitySignature=signature;if(!supportsAction('run'))runToggled=false;dispatchEvent(new CustomEvent('character-animation-capabilities',{detail:{actions}}));}return actions;}
 function setRunning(value){runToggled=value===true&&supportsAction('run');return runToggled;}
 function requestEmote(action){
  const name=canonicalAction(action);if(!EMOTE_ACTIONS.includes(name)||world.player.hp<=0)return false;
  if(!supportsAction(name)){world.notice('ท่านี้กำลังรอภาพแอนิเมชันของตัวละครชุดนี้');return false;}
  if(network&&!network.command('emote',{name}))return false;
  clearInput();network?.setInput({x:0,z:0,attack:false,run:false});castUntil=0;activeSkill=null;actionStart=world.time;return world.setEmote(name);
 }
 addEventListener('hero-emote',e=>requestEmote(e.detail));
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
  const h=(MONSTER_TYPES[m.type].height??1.45)*(m.leader?1.35:1),frames=monsterArt[m.type]?.map(t=>t.clone()),tex=frames?.[0]??monsterTextures[m.type%4].clone(),s=sprite(tex,m.x,-m.z,h*1.1,h,.06),sh=shadow(m.x,-m.z,.36);
  s.userData.monsterId=m.id;
  const label=document.createElement('button');label.className='mob-label'+(m.leader?' leader':'');label.type='button';label.setAttribute('aria-label','เลือกเป้า '+MONSTER_TYPES[m.type].name+' '+(m.id+1));
  const text=document.createElement('span');text.textContent=(m.leader?'★ หัวหน้า':'')+MONSTER_TYPES[m.type].name;label.append(text);
  const bar=document.createElement('i'),fill=document.createElement('b');bar.append(fill);label.append(bar);$('world-labels').append(label);
  label.addEventListener('click',()=>world.select(m.id));
  const warning=new THREE.Mesh(new THREE.RingGeometry(.15,MONSTER_BEHAVIOUR[MONSTER_TYPES[m.type].id]?.aoe??MONSTER_TYPES[m.type].reach??1.35,40),new THREE.MeshBasicMaterial({color:MONSTER_BEHAVIOUR[MONSTER_TYPES[m.type].id]?.aoe?'#ff4a4a':'#ed9b59',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));warning.rotation.x=-Math.PI/2;scene.add(warning);
  const charge=new THREE.Mesh(new THREE.CircleGeometry(MONSTER_BEHAVIOUR[MONSTER_TYPES[m.type].id]?.aoe??MONSTER_TYPES[m.type].reach??1.35,40),new THREE.MeshBasicMaterial({color:MONSTER_BEHAVIOUR[MONSTER_TYPES[m.type].id]?.aoe?'#ff3b3b':'#ff8a3d',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));charge.rotation.x=-Math.PI/2;charge.visible=false;scene.add(charge);
  return {sprite:s,shadow:sh,height:h,label,fill,frames,frame:-1,warning,charge,deathStart:null,flashAt:-9};
 });
 hero.sprite.material.map=hero.sprite.material.map.clone();
 const ringGeometry=new THREE.RingGeometry(.47,.51,40);
 const targetRing=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#ffd476',side:THREE.DoubleSide,transparent:true,opacity:.85}));targetRing.rotation.x=-Math.PI/2;scene.add(targetRing);
 const playerRing=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#8de8d0',side:THREE.DoubleSide,transparent:true,opacity:.55}));playerRing.rotation.x=-Math.PI/2;playerRing.scale.setScalar(.78);scene.add(playerRing);
 const shield=new THREE.Mesh(new THREE.RingGeometry(.7,.74,40),new THREE.MeshBasicMaterial({color:'#edd592',side:THREE.DoubleSide,transparent:true,opacity:.55}));shield.rotation.x=-Math.PI/2;scene.add(shield);
 // 0.103.2 the hero shows its own name (players asked for it instead of "คุณ") and, once reborn, its rank above it
 const playerLabel=document.createElement('span');playerLabel.className='hero-label';playerLabel.innerHTML='<small class="rank-title" hidden></small><b data-i18n-skip></b>';
 playerLabel.querySelector('b').textContent=config.name||className(world.profession.id,config.gender);let shownRank=-1;$('world-labels').append(playerLabel);
 const motionPreference=matchMedia('(prefers-reduced-motion:reduce)'),compactEffects=matchMedia('(pointer:coarse),(max-width:900px)');
 const floats=[],projection=new THREE.Vector3();let kick=0; // 0.99.3 impact shake (crits, heavy hits taken)
 // 0.91 the notice sits just under the target box whenever that box shows, so the two never overlap (every layout).
 function placeNotice(){const n=$('notice'),t=document.querySelector('.target-panel'),r=t&&getComputedStyle(t).display!=='none'?t.getBoundingClientRect():null;n.style.top=r&&r.height?Math.round(r.bottom+8)+'px':'';}
 function toast(text){placeNotice();$('notice').textContent=text;$('notice').classList.add('visible');noticeUntil=performance.now()+2500;dispatchEvent(new CustomEvent('game-notice',{detail:text}));}
 // 0.103.3 on the sala stairs a character's camera-facing quad leans into the higher treads, so it draws on top
 // there; on the deck itself roof-cutaway.js opens the roof instead.
 function xray(sprite,floor){const raised=floor>.2&&floor<2.5;if(sprite.userData.raised===raised)return;sprite.userData.raised=raised;sprite.traverse(o=>{o.renderOrder=raised?6:0;if(o.material)o.material.depthTest=!raised;});}
 function project(node,x,y,z){projection.set(x,y,z).project(camera);node.style.transform=`translate(-50%,-100%) translate(${(projection.x*.5+.5)*innerWidth}px,${(-projection.y*.5+.5)*innerHeight}px)`;node.style.visibility=Math.abs(projection.x)>1.12||Math.abs(projection.y)>1.12||projection.z>1?'hidden':'visible';}
 // 0.99.3 numbers rise from the head of whoever was hit and stack: each new one pushes the older ones of that
 // target up a line, they drift upward together and fade out. Anchors follow the target while it moves.
 const FLOAT_LINE=22,FLOAT_LIFE=1.05,FLOAT_STACK=4;
 function anchorOf(e){
  if(e.type==='damage'&&Number.isInteger(e.id)&&world.mobs[e.id]){const m=world.mobs[e.id],v=mobViews[e.id];return {key:'m'+e.id,pos:()=>({x:m.x,y:(v?.height??1.4)+.3,z:m.z})};}
  if(e.type==='damage'&&typeof e.id==='string'){const id=e.id;return {key:id,pos:()=>{const f=world.foes?.().find(o=>o.id===id);const x=f?.x??e.x,z=f?.z??e.z;return {x,y:2.2+groundHeight(world.nav,x,z),z};}};}
  if(['playerHit','heal','dodge'].includes(e.type))return {key:'self',pos:()=>({x:world.player.x,y:2.2+hero.sprite.position.y,z:world.player.z})};
  return {key:'at'+Math.round(e.x)+':'+Math.round(e.z),pos:()=>({x:e.x,y:1.9+groundHeight(world.nav,e.x,e.z),z:e.z})};
 }
 function popup(e,positive=false,anchor=anchorOf(e)){
  const crit=!positive&&(e.crit||e.color==='#ffd27a'),magic=!positive&&!!e.magic,el=document.createElement('span');const mob=Number.isInteger(e.id)?world.mobs[e.id]:null,big=!positive&&!crit&&mob&&typeof e.amount==='number'&&e.amount>=mob.maxHp*.2;
  el.className='damage-number'+(crit?' crit':'')+(magic?' magic':'')+(big?' big':'')+(positive?' heal':'');
  // 1.09 owner: numbers only (no minus or plus sign) and four fixed colours instead of one per skill/element:
  // white = your hit, gold = critical, red = damage you take, green = healing. Words (MISS, คอมโบ!) keep their own.
  const word=typeof e.amount==='string';
  el.textContent=String(e.amount); // owner: plain numbers, no + or −
  // 1.09.4 owner: physical white, physical crit orange; magic blue, magic crit purple; taken red; heal green
  el.style.setProperty('color',word?(e.color??'#fff4dc'):positive?'#8ff08c':e.hurt?'#ff5a4a':magic?(crit?'#c27bff':'#6cc8ff'):crit?'#ff9a2e':'#fff4dc','important');
  const same=floats.filter(f=>f.key===anchor.key);for(const f of same)f.slot+=crit?1.3:1;
  if(same.length>=FLOAT_STACK){const old=same[0];old.el.remove();floats.splice(floats.indexOf(old),1);}
  const f={el,key:anchor.key,pos:anchor.pos,age:0,slot:0,off:0,side:same.length%2?1:-1}; // popcorn: alternate left / right as they rise
  // 0.99.6 place it over the head before it is shown, so it never flashes at the screen corner first
  placeFloat(f,0);$('world-labels').append(el);floats.push(f);
 }
 function placeFloat(f,dt){
  f.off+=(f.slot*FLOAT_LINE-f.off)*Math.min(1,dt*16);const a=f.pos();projection.set(a.x,a.y,a.z).project(camera);
  // 0.99.8 position through `translate` (applied before the pop-in `scale`), so the pop grows in place over the head
  f.el.style.translate=`calc(${(projection.x*.5+.5)*innerWidth+f.side*Math.min(1,f.age*3)*14}px - 50%) calc(${(-projection.y*.5+.5)*innerHeight-f.off-f.age*26}px - 100%)`;
  f.el.style.visibility=Math.abs(projection.x)>1.12||Math.abs(projection.y)>1.12||projection.z>1?'hidden':'visible';
 }
 function effect(e){
  if(e.type==='experience'){
   toast((e.baseUp?'Base Level Up! Lv. '+e.baseLevel+' · ':e.jobUp?'Job Level Up! Lv. '+e.jobLevel+' · ':'')+'+'+e.base+' Base EXP · +'+e.job+' Job EXP');
  }
  if(e.type==='cast'){
   const track=Number.isInteger(e.skillIndex)?skillTrack(world.profession.id,e.skillIndex):null;
   // Basic auto-attacks must not replace a skill's active pose mid-animation.
   if(track||world.time>=castUntil||activeSkill===null){
    activeSkill=track?e.skillIndex:null;castUntil=world.time+(track?.duration??attackDuration(world.profession.id));
    actionStart=world.time;world.clearEmote();actionMode=!track?'attack':e.kind==='dash'?'dash':e.kind==='shield'?'guard':['slash','punch','thrust','arrow'].includes(e.kind)?'attack':'cast';
   }
   const beats=track?track.strikes.map(b=>world.time+b*track.duration):[world.time+.12];strikes=beats.map(at=>({at,power:track?1:.4}));if(e.color)castLight.color.set(e.color);
   const presentation=track??{...skillTrack(world.profession.id,0),duration:attackDuration(world.profession.id),strikes:[.42]};
   const from=e.from??world.player,to=e.to??from;
   skillEffects.create(presentation,{...e,skillIndex:track?e.skillIndex:null,from,to:{...to,y:groundHeight(world.nav,to.x,to.z)},direction:world.player.face,groundY:groundHeight(world.nav,from.x,from.z),reduced:motionPreference.matches,quality:compactEffects.matches?'low':'high'});
  }else if(e.type==='miss'){popup({...e,type:'damage',amount:'MISS',color:'#d8d8d8'});
  }else if(e.type==='damage'){popup(e);const v=mobViews[e.id];if(v)v.flashAt=world.time;if(e.color==='#ffd27a')kick=Math.max(kick,1);}
  else if(e.type==='heal'){popup(e,true);}
  else if(e.type==='playerHit'){hitUntil=world.time+.28;hitStart=world.time;popup({...e,hurt:true});if(e.amount>=world.player.maxHp*.2)kick=Math.max(kick,.8);hero.sprite.material.color.set('#ff7a6a');hitTintUntil=world.time+.45;}
  else if(e.type==='notice')toast(e.text);
  else if(e.type==='combo')popup({x:e.x,z:e.z,amount:'คอมโบ!',color:'#fff4dc'},true);
  else if(e.type==='drop'){const best=Math.max(...e.items.map(i=>itemDef(i.id)?.rarity??0));if(best>=2&&Number.isFinite(e.x))pillar(e.x,e.z,best);}
  else if(e.type==='defeat')toast('ปราบ '+MONSTER_TYPES[world.mobs[e.id].type].name+' แล้ว');
 }
 // 0.90 hotbar: which skill sits on each of the ten buttons / keys 1-0 (dragged in the skill window), and the AUTO
 // settings (skills to cast, potion thresholds). Both are per path on this device; AUTO settings go to the server online.
 const HOT_KEY='ayothaya-hotbar:'+world.profession.id,AUTO_KEY='ayothaya-auto:'+world.profession.id;
 // 0.101 five more slots (keys Alt+1-5) hold the Master skills; a ten-slot hotbar saved before keeps its order.
 const order=[...Array(SLOTS).keys()],isOrder=h=>Array.isArray(h)&&h.length===SLOTS&&[...h].sort((a,b)=>a-b).join()===order.join();
 let hotbar=order;try{let h=JSON.parse(localStorage.getItem(HOT_KEY));if(Array.isArray(h)&&h.length===BASE_SLOTS)h=[...h,...order.slice(BASE_SLOTS)];if(isOrder(h))hotbar=h;}catch{}
 try{world.autoConfig=normalizeAuto(JSON.parse(localStorage.getItem(AUTO_KEY)));}catch{world.autoConfig=normalizeAuto(null);}
 let autoSent='';
 const skillButtons=world.skills.map((s,i)=>{
  const b=document.createElement('button');b.type='button';b.className='skill'+(isMaster(i)?' master-slot':'');b.hidden=isMaster(i);
  b.innerHTML=`<kbd>${HOTBAR_KEYS[i]}</kbd><strong>${s.icon}</strong><span>${s.short}</span><em></em><small class="skill-level"></small>`;b.addEventListener('click',()=>{if(!isPaused())world.skill(hotbar[i]);});$('skills').append(b);return b;
 });
 function paintHotbar(){skillButtons.forEach((b,i)=>{const s=world.skills[hotbar[i]];if(!s)return;b.querySelector('strong').textContent=s.icon;b.querySelector('span').textContent=s.short??s.name;b.setAttribute('aria-label',`สกิล ${HOTBAR_KEYS[i]} ${s.name}`);b.title=`${HOTBAR_KEYS[i]} · ${s.name} · MP ${s.cost} · ${s.cd} วินาที`;b.style.setProperty('--skill-color',s.color);});applySkillArt(skillButtons,world.profession.id,hotbar);}
 paintHotbar();
 function setHotbar(order){if(!isOrder(order))return;hotbar=[...order];try{localStorage.setItem(HOT_KEY,JSON.stringify(hotbar));}catch{}paintHotbar();}
 function setAutoConfig(cfg){world.autoConfig=normalizeAuto(cfg);try{localStorage.setItem(AUTO_KEY,JSON.stringify(world.autoConfig));}catch{}autoSent='';}

 $('auto-attack').addEventListener('click',()=>{if(!isPaused())world.toggleAuto();});
 $('attack').addEventListener('pointerdown',e=>{if(isPaused())return;e.preventDefault();attackPointer=e.pointerId;input.attack=true;$('attack').setPointerCapture(e.pointerId);world.basicAttack();});
 function releaseAttack(e){if(e.pointerId===attackPointer){input.attack=false;attackPointer=null;}}
 $('attack').addEventListener('pointerup',releaseAttack);$('attack').addEventListener('pointercancel',releaseAttack);$('attack').addEventListener('lostpointercapture',releaseAttack);
 // Keyboard activation of the accessible attack button also works.
 $('attack').addEventListener('click',e=>{if(e.detail===0&&!isPaused())world.basicAttack();});
 function editable(e){return e.target instanceof Element&&!!e.target.closest('input,textarea,select,[contenteditable=true]');}
 addEventListener('keydown',e=>{
  if(e.altKey&&/^Digit[1-5]$/.test(e.code)&&!isPaused()&&!editable(e)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();if(!e.repeat)world.skill(hotbar[BASE_SLOTS+Number(e.code.slice(-1))-1]);return;}
  if(isPaused()||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Space'&&e.target.closest?.('[data-hud-panel] button,#account-panel button'))return;
  if(['KeyW','KeyA','KeyS','KeyD','Space','KeyF'].includes(e.code)||/^Digit[0-9]$/.test(e.code))e.preventDefault();
  if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight'].includes(e.code))keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='KeyF')world.toggleAuto();
  if(e.code==='Space')world.basicAttack();
  if(/^Digit[0-9]$/.test(e.code)){const n=Number(e.code.slice(-1));world.skill(hotbar[n===0?9:n-1]);}
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
 // 0.99.15 another player under the tap opens their menu first (multiplayer-ui sets this)
 let playerTap=null;
 function selectAt(x,y){
  if(playerTap?.(x,y))return;
  pointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  for(const hit of raycaster.intersectObjects(mobViews.map(v=>v.sprite))){
   const id=hit.object.userData.monsterId;if(world.mobs[id].hp<=0)continue;
   const tex=hit.object.material.map,uv=hit.uv?.clone();
   if(uv){tex.transformUv(uv);const img=tex.image,c=img.getContext?.('2d');if(c&&c.getImageData(Math.min(img.width-1,Math.max(0,Math.floor(uv.x*img.width))),Math.min(img.height-1,Math.max(0,Math.floor(uv.y*img.height))),1,1).data[3]<40)continue;}
   world.select(id);return;
  }
  // 0.101.4 raised floors (the sala deck): re-aim at the floor height under the last hit until it settles
  let hit=null;groundPlane.constant=0;for(let i=0;i<4;i++){hit=raycaster.ray.intersectPlane(groundPlane,groundHit);if(!hit)break;groundPlane.constant=-groundHeight(world.nav,hit.x,hit.z);}
  if(hit)walkTo({x:hit.x,z:hit.z});
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
  refreshAnimationCapabilities();
  const steering=paused?{x:0,z:0,attack:false,run:false}:{...direction,attack:input.attack||keys.has('Space'),run:supportsAction('run')&&(runToggled||keys.has('ShiftLeft')||keys.has('ShiftRight'))};
  if(marker.visible){markerAge+=dt;if(walker.active){marker.material.opacity=.85;marker.scale.setScalar(1+.15*Math.sin(markerAge*7));}else{marker.material.opacity-=dt*3.5;if(marker.material.opacity<=0)marker.visible=false;}}if(network){network.setInput(steering);world.time+=dt;predictMove(world,serverSelf,dt,steering);}else if(!paused)world.update(dt,steering);
  world.events.splice(0).forEach(e=>{effect(e);for(const fn of listeners)fn(e);});
  const p=world.player,t=world.time,reduced=motionPreference.matches;
  if(p.moving||t<hitUntil||p.hp<=0)world.clearEmote();world.emote=activeEmote(world.emote,t);
  const chosen=actionChoice({time:t,dead:p.hp<=0,hit:t<hitUntil,cast:t<castUntil?actionMode:false,moving:p.moving,running:p.running,emote:world.emote,guard:p.shield>0});
  const mode=['sit','sleep','run'].includes(chosen)&&!supportsAction(chosen)?(chosen==='run'?'walk':'idle'):chosen;
  const distanceMoved=Math.hypot(p.x-lastX,p.z-lastZ);lastX=p.x;lastZ=p.z;
  if(distanceMoved<1)gait+=gaitStep(distanceMoved,dt,world.profession.id,mode); // No steps while blocked; teleports do not advance the gait.
  const skillActive=t<castUntil&&t>=hitUntil&&activeSkill!==null;
  const locomotion=mode==='walk'||mode==='run',poseTime=locomotion||mode==='idle'?t:mode==='hit'?t-hitStart:world.emote?.name===mode?t-world.emote.time:t-actionStart;
  const pose=skillActive?skillPose(world.profession.id,activeSkill,t-actionStart,{reduced}):characterMotion({time:poseTime,phase:locomotion?gait:null,mode,classId:world.profession.id,reduced,view:heroView=walkView(p.face,controls.getAzimuthalAngle(),heroView)});
  if(!visualPose||reduced)visualPose={...pose};
  else for(const key of Object.keys(pose))visualPose[key]=typeof pose[key]!=='number'||['frame','artFrame','stand','time','phase'].includes(key)?pose[key]:(visualPose[key]??pose[key])+(pose[key]-(visualPose[key]??pose[key]))*(1-Math.exp(-dt*24));
  const heroSize=hero.height??1.8;
  const faceLength=Math.hypot(p.face.x,p.face.z)||1,rootOffset=skillActive&&SKILLS[activeSkill].type!=='dash'?visualPose.x:0;
  const floor=groundHeight(world.nav,p.x,p.z);
  hero.sprite.position.set(p.x+p.face.x/faceLength*rootOffset,floor+.06+(hero.sprite.userData.directionalActive&&mode==='walk'?0:visualPose.y),p.z+p.face.z/faceLength*rootOffset);
  hero.sprite.scale.set(heroSize,heroSize,1);xray(hero.sprite,floor);
  const azimuth=controls.getAzimuthalAngle();
  if(hero.frames)hero.sprite.material.map=hero.frames[0];
  hero.sprite.userData.setFacing?.(p.face,azimuth,{mode,time:poseTime,phase:locomotion?gait:null,reduced});
  const facing=p.face.x*Math.cos(azimuth)-p.face.z*Math.sin(azimuth);
  if(Math.abs(facing)/faceLength>.3)heroFlip=facing<0; // hysteresis: keep the last side until clearly turning
  hero.sprite.userData.pose?.(visualPose,heroFlip);
  if(world.time>=hitTintUntil)hero.sprite.material.color.lerp(new THREE.Color('#fff1da'),Math.min(1,dt*4)); // 1.09.4 a faint red that lingers a moment when hithero.sprite.visible=p.hp>0;hero.shadow.visible=p.hp>0;
  footDust.update(dt);
  if(locomotion&&!reduced){const step=Math.floor(gait*2+.5);if(step!==lastStep){lastStep=step;footDust.puff(p.x-p.face.x/faceLength*.25,floor+(!world.nav.grid&&p.z>4.25?.44:.09),p.z-p.face.z/faceLength*.25);}}
  let flash=0,shake=0;for(const s of strikes){const d=t-s.at;if(d>=0&&d<.45){flash=Math.max(flash,s.power*Math.exp(-d*9));if(d<.25)shake=Math.max(shake,s.power*Math.exp(-d*16));}}strikes=strikes.filter(s=>t-s.at<.5);
  castLight.intensity=reduced?0:flash*14;castLight.position.set(p.x,floor+1.3,p.z);kick*=Math.exp(-dt*14);shakeAmount=reduced?0:Math.max(shake*.11,kick*.07);
  hero.shadow.position.set(p.x,floor+.072,p.z);playerRing.position.set(p.x,floor+.081,p.z);shield.position.set(p.x,floor+.1,p.z);shield.visible=p.shield>0;
  // Camera follows the player while preserving user-controlled azimuth and zoom.
  const follow=new THREE.Vector3(p.x,floor+1,p.z).sub(controls.target).multiplyScalar(1-Math.exp(-dt*4));camera.position.add(follow);controls.target.add(follow);
  controls.update();camera.updateMatrixWorld();
  project(playerLabel,p.x,2.0+hero.sprite.position.y,p.z);
  if((world.rebirth??0)!==shownRank){shownRank=world.rebirth??0;const t=playerLabel.querySelector('.rank-title');t.hidden=!shownRank;t.textContent=shownRank?'✦ '+rebirthRank(shownRank)+' ✦':'';}
  mobViews.forEach((v,i)=>{
   const m=world.mobs[i],type=MONSTER_TYPES[m.type];
   if(m.hp<=0&&v.deathStart===null)v.deathStart=t;if(m.hp>0)v.deathStart=null;
   const deadAge=v.deathStart===null?0:t-v.deathStart,visible=m.hp>0||deadAge<1.25;
   v.sprite.visible=v.shadow.visible=visible;v.label.hidden=m.hp<=0;v.warning.visible=m.hp>0&&m.windup>0;
   {const charge=Math.min(1,Math.max(0,1-(m.windup??0)/(MONSTER_BEHAVIOUR[type.id]?.windup??type.windup??.45)));const aoe=!!MONSTER_BEHAVIOUR[type.id]?.aoe;v.warning.position.set(m.x,.09,m.z);v.warning.material.opacity=aoe?.3+.35*charge:.12+.25*charge;
    v.charge.visible=aoe&&v.warning.visible;v.charge.position.set(m.x,.092,m.z);v.charge.scale.setScalar(Math.max(.05,charge));v.charge.material.opacity=.1+.14*charge;} // 0.99.3 area bursts fill up until they land
   if(!visible)return;
   const f=monsterFrame(m,t);if(v.frames&&f!==v.frame){v.sprite.material.map=v.frames[f];v.sprite.material.map.needsUpdate=true;v.frame=f;}
   const recoil=reduced?0:Math.sin(Math.PI*Math.min(1,m.hit/.34))*.18;
   const mobFloor=groundHeight(world.nav,m.x,m.z);v.sprite.position.set(m.x+(m.recoil?.x??0)*recoil,mobFloor+.06,m.z+(m.recoil?.z??0)*recoil);v.shadow.position.set(m.x,mobFloor+.073,m.z);
   v.sprite.scale.set(v.height*1.1,v.height,1);v.sprite.material.rotation=0;
   v.sprite.material.transparent=m.hp<=0;v.sprite.material.opacity=m.hp<=0?Math.max(0,1-(deadAge-.5)/.75):1;
   // 0.74 hit flash: overbright tint (>1) burns the sprite near-white for ~0.12 s, then fades back.
   const burn=reduced?0:Math.max(0,1-(t-v.flashAt)/.14);v.sprite.material.color.set(m.root>0?'#9ddacc':'#fff1da');if(burn>0)v.sprite.material.color.multiplyScalar(1+2.6*burn);
   if(burn>0)v.sprite.scale.set(v.height*1.1*(1+.08*burn),v.height*(1-.06*burn),1);v.fill.style.width=`${m.hp/m.maxHp*100}%`;v.label.classList.toggle('selected',world.targetId===m.id);
   if(m.aggro){const side=(p.x-m.x)*Math.cos(controls.getAzimuthalAngle())-(p.z-m.z)*Math.sin(controls.getAzimuthalAngle());v.sprite.material.map.repeat.x=side<0?-1:1;v.sprite.material.map.offset.x=side<0?1:0;}
   project(v.label,m.x,v.height+.08,m.z);
  });
  const target=world.target;targetRing.visible=!!target;if(target){targetRing.position.set(target.x,.088,target.z);targetRing.scale.setScalar(1+.07*Math.sin(t*5));}
  skillEffects.update(dt,camera);
  for(let i=pillars.length-1;i>=0;i--){const p=pillars[i];p.age+=dt;p.m.material.opacity=.7*Math.max(0,1-p.age/2.6);p.m.scale.x=p.m.scale.z=1+Math.sin(p.age*6)*.08;if(p.age>2.6){scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();pillars.splice(i,1);}}
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.age+=dt;if(f.age>FLOAT_LIFE){f.el.remove();floats.splice(i,1);continue;}
   placeFloat(f,dt);f.el.style.opacity=String(f.age<.55?1:Math.max(0,1-(f.age-.55)/(FLOAT_LIFE-.55)));}
  if(performance.now()>noticeUntil)$('notice').classList.remove('visible');else placeNotice();
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
   $('target-name').textContent=target?.pvp?'⚔ '+target.name+(target.id.startsWith('duel:')?' · '+world.duelLeft+' วิ':target.guild?' · '+target.guild:''):target?MONSTER_TYPES[target.type].name:world.safe?'เขตปลอดภัย':'ยังไม่เลือกเป้าหมาย';$('target-hp').textContent=target?`${target.hp} / ${target.maxHp}`:world.safe?'พักฟื้น · พูดคุย · เดินทาง':'คลิก / แตะมอนสเตอร์';{const wv=world.war,line=$('war-line'),mm=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); // 0.95 guild war status under the target
    line.hidden=!wv?.active;if(wv?.active)line.textContent='⚔ กิลด์วอร์ '+mm(wv.left)+(wv.stone?' · ศิลา '+wv.stone.hp.toLocaleString('th-TH')+'/'+wv.stone.maxHp.toLocaleString('th-TH'):'')+' · ผู้ยึด: '+(wv.holder??'ยังไม่มี');}
   $('target-fill').style.width=target?`${target.hp/target.maxHp*100}%`:'0%';
   if(!network)world.skillPoints=availablePoints(localSkills,progress());
   if(network){const j=JSON.stringify(world.autoConfig);if(j!==autoSent&&network.command('autoConfig',world.autoConfig))autoSent=j;}
   skillButtons.forEach((b,i)=>{const cd=world.cooldowns[hotbar[i]],lv=world.skillLevels[hotbar[i]]??1;const s=world.skills[hotbar[i]];b.hidden=isMaster(i)&&!lv;b.querySelector('.skill-level').textContent=lv?'Lv'+lv:'—';b.classList.toggle('locked',!lv);b.querySelector('em').textContent=cd>.05?String(Math.ceil(cd)):'';b.classList.toggle('cooling',cd>.05);b.classList.toggle('no-mana',p.mp<s.cost);b.style.setProperty('--cooldown',`${cd/s.cd*100}%`);});
  }
 }
 function mobileLayout(){return innerWidth<=800||matchMedia('(pointer:coarse)').matches;}
 function updateHelp(){
  document.querySelector('.control-hint').textContent=mobileLayout()?'ลากจอยซ้ายเพื่อเดิน'+(supportsAction('run')?' · แตะปุ่มวิ่งเพื่อสลับจังหวะ':'')+' · แตะมอนเลือกเป้า · ลากด้านขวาหมุนกล้อง':'WASD เดิน'+(supportsAction('run')?' · Shift วิ่ง':'')+' · Space โจมตี · F ออโต้ · 1–9 / 0 สกิล · Q / E ใช้ยา';
  document.querySelector('.player-foot span:last-child').textContent=mobileLayout()?'จอยซ้าย · เดิน':'W A S D · เดิน';
 }
 updateHelp();addEventListener('resize',updateHelp);
 toast(mobileLayout()?'ลากจอยเดิน · แตะมอนและสกิลด้านขวา':'WASD เดิน · คลิกมอนเลือกเป้า · Space โจมตี · F ออโต้');
 function setNetwork(client){network=client;clearInput();world.auto=false;autoSent='';client.addEventListener('welcome',()=>{autoSent='';}); // a fresh server world starts on default AUTO settings
  // 0.97 the AUTO button shows only what the server reports.
  world.skill=i=>{world.clearEmote();return client.command('skill',{index:i});};world.basicAttack=()=>{world.clearEmote();return client.command('attack');};world.select=id=>client.command('select',{target:id});world.toggleAuto=()=>client.command('auto',{on:!world.auto});world.setAuto=(on,hunt)=>client.command('auto',{on,hunt});world.questTalk=npc=>client.command('questTalk',{npc});world.useItem=item=>client.command('useItem',{item});world.statUp=stat=>client.command('statUp',{stat});world.equipGear=item=>client.command('equip',{item});world.netState=()=>client.status+'/'+(client.socket?.readyState??'-')+(client.stopped?'/stopped':'');world.unequipGear=slot=>client.command('unequip',{slot});world.refine=(slot,npc,lekLai,guard)=>client.command('refine',{slot,npc,lekLai,guard});world.insertCard=(slot,card)=>client.command('insertCard',{slot,card});world.market=(type,data={})=>client.command(type,data);world.trade=(type,npc,item,count)=>client.command(type,{npc,item,count});world.discard=(item,count)=>client.command('discard',{item,count});
 }
 function applyNetworkSnapshot(snapshot){const s=snapshot.self;world.weekly=s.weekly??null;world.rebirth=s.rebirth??0;if(s.story)world.story=s.story;world.myStall=s.stall??null;world.myGuild=s.guild??null;world.status=s.status??{};world.mvp=s.mvp??null;world.pet=s.pet??null;world.bounty=s.bounty??null;world.mercLeft=s.merc??0;world.album=s.album??[];if(s.bag)world.bag=s.bag;if(s.stats){world.stats=s.stats;world.gear=s.gear;world.statPoints=s.statPoints;world.derivedView=s.derived;}if(Array.isArray(s.skillLevels))world.skillLevels=[...s.skillLevels];if(Number.isInteger(s.skillPoints))world.skillPoints=s.skillPoints;const {x,z,moving,face,...state}=s.player;Object.assign(world.player,state);if(!serverSelf){world.player.x=x;world.player.z=z;}serverSelf={x,z,moving,face};world.cooldowns=[...s.cooldowns];world.kills=s.kills;world.baseXp=s.baseXp;world.jobXp=s.jobXp;world.targetId=s.targetId;world.auto=s.auto;world.foe=s.duel?.foe??null;world.war=s.war??null;world.rivals=s.war?.rivals??[];world.duelLeft=s.duel?.left??0;if(Math.abs(world.time-snapshot.time)>.25)world.time=snapshot.time;
  serverSelf.running=s.player.running===true;world.emote=activeEmote(s.emote,snapshot.time);
  for(const mob of snapshot.mobs){const existing=world.mobs.find(m=>m.id===mob.id);if(existing)Object.assign(existing,mob);}
 }
 // Applied by the renderer around the draw call only, so it never leaks into the orbit controls.
 function shakeOffset(out){const t=world.time,a=shakeAmount;return out.set(Math.sin(t*83)*a,Math.cos(t*67)*a*.6,Math.sin(t*71+1)*a);}
 return {xray,set playerTap(f){playerTap=f;},popup:(e,anchor)=>popup(e,false,anchor),get hotbar(){return [...hotbar];},setHotbar,setAutoConfig,update,world,clearInput,setNetwork,applyNetworkSnapshot,shakeOffset,upgradeSkill,walkTo,cancelWalk:()=>walker.cancel(),get walking(){return walker.active;},onEvent:fn=>listeners.add(fn),get online(){return !!network;},supportsAction,refreshAnimationCapabilities,requestEmote,setRunning,get runningRequested(){return runToggled;}};
}

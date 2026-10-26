import {characterHead} from './character-label.js?v=149';
import {createRoleWorldDecor} from './role-world-decor.js';
import {loadMonsterFrames} from './monster-art.js?v=world125';
import {normalizeRoleSkills,upgradeRoleSkill,ROLE_MARK} from './role-skill-progress.js';
import {SKILL_PROFILES} from './assets/skill-polish/library-profiles.js';
import {createRoleAnimation,roleAnimationActive,sampleRolePose,ageQueuedCombatEvent,castFacing} from './combat-animation165.js?v=align169';
import {createLiveRoleVfx} from './role-skill-vfx.js?v=vfx119';
import {createRolePlayUI} from './role-play-ui.js';
import {itemDef} from './items.js?v=107';
import {targetHudState,paintTargetHud} from './target-hud.js';
import {monsterFrame,MONSTER_BEHAVIOUR} from './monster-catalog.js?v=110.8';
import {jobProgress} from './experience.js?v=105.3';
import {applySkillArt} from './skill-art.js?v=icons117';
import {presentationDelta} from './combat-timing.js';
import {characterMotion,attackDuration,gaitStep,walkView} from './character-motion.js?v=novice174';
import {activeEmote,actionChoice,canonicalAction,CHARACTER_ACTIONS,EMOTE_ACTIONS,supportsCharacterAction,GAMEPLAY_RUN_ENABLED} from './character-action-state.js?v=106.0';
import {skillTrack,skillPose} from './skill-choreography.js?v=novice174';
import {createSkillEffects,createFootDust} from './skill-effects.js?v=novice174';
import {progression,jobFor} from './advancement.js?v=73';
import * as THREE from 'three';
import {CombatWorld,MONSTER_TYPES,screenDirection,predictMove,groundHeight,bodyRadius} from './combat-core.js?v=hire177';
import {scaledSkill,upgradeSkill as levelUpSkill,normalizeSkills,availablePoints,NOVICE_SLOTS,SLOTS,BASE_SLOTS,isMaster,HOTBAR_KEYS} from './skill-progress.js?v=novice174';
import {createRouteWalker} from './route-walk.js?v=bridge164';

import {className} from './classes.js?v=novice174';
import {rebirthRank} from './character-stats.js?v=107';
import {normalizeAuto,pickAutoSkill} from './auto-play.js?v=novice174';

export function createGame({scene,camera,controls,canvas,hero,monsterTextures,monsterArt={},sprite,shadow,cancelCameraTurn,config={},isPaused=()=>false,skillState={}}){
 const world=new CombatWorld(config),SKILLS=world.skills,$=id=>document.getElementById(id),keys=new Set();
 const skillEffects=createSkillEffects(scene),roleEffects=createLiveRoleVfx(scene,camera,world),roleDecor=createRoleWorldDecor(scene,world),roleUI=createRolePlayUI({world,clear:()=>clearInput(),returnToSpawn:()=>network?network.command('returnToSpawn'):world.player.down=0});let roleClip=null,basicCastId=null,castFace=null;let activeSkill=null,network=null,serverSelf=null;
 // Skill levels: the server owns them online; guests keep them in their local save.
 const progress=()=>({classId:world.profession.id,jobId:world.jobId??'',jobXp:world.jobXp});
 if(world.roleCombat&&!skillState.skills?.[ROLE_MARK])try{localStorage.setItem('ayothaya-role-skill-backup:'+world.profession.id,JSON.stringify(skillState.skills??{}));}catch{}
 let localSkills=world.roleCombat?normalizeRoleSkills(skillState.skills,world.profession.id):normalizeSkills(skillState.skills,world.profession.id);if(world.roleCombat&&skillState.offline)skillState.onChange?.(localSkills);world.skillLevels=[...localSkills[world.profession.id]];world.skillPoints=availablePoints(localSkills,progress());
 function upgradeSkill(index){
  if(network)return network.command('upgradeSkill',{index})?true:'not-connected';
  if(!skillState.offline)return 'online-required';
  try{localSkills=world.roleCombat&&!world.roleCombat.legacy?upgradeRoleSkill(localSkills,world.profession.id,index,progress()):levelUpSkill(localSkills,world.profession.id,index,progress());}catch(e){return e.message;}
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
 const joy={x:0,y:0,id:null},input={x:0,z:0,attack:false};let hitTintUntil=0,skillScale=1,strikeAt=0,swingScale=1,heldHits=[],attackPointer=null,castUntil=0,noticeUntil=0,lastHUD=0,actionMode='attack',actionStart=0,hitStart=0,hitUntil=0,runToggled=false,capabilitySignature='';
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
 let walkJob=null,arrivalPending=null,serverWalkState=null,walkPaceSent=null,walkPredictedArrival=false,networkExpected=false;
 function cancelWalk(){const id=walkJob?.id??(serverWalkState?.status==='walking'?serverWalkState.id:null);walker.cancel();arrivalPending=null;if(id&&network?.walkSchema===1)network.command('walkCancel',{id});walkJob=null;serverWalkState=null;walkPaceSent=null;walkPredictedArrival=false;marker.visible=false;}
 const wantsRun=()=>supportsAction('run')&&(runToggled||keys.has('ShiftLeft')||keys.has('ShiftRight'));
 const listeners=new Set(); // story/quest UI listens to the same events the HUD does (offline and online)
 function walkTo(target,opts={}){
  if(world.player.hp<=0)return false;cancelWalk();
  const goal=typeof target==='function'?target():target;if(!goal||!Number.isFinite(goal.x)||!Number.isFinite(goal.z))return false;
  for(const fn of listeners)fn({type:'walkIntent',kind:opts.kind??'ground'});
  const remote=network?.walkSchema===1,id=crypto.randomUUID();
  const failed=reason=>{marker.visible=false;if(opts.onFail)opts.onFail(reason);else world.notice('ไปตรงนั้นไม่ได้');};
  if(remote){const run=network.walkRunSchema===1&&wantsRun();walkJob={id,target,opts};if(!network.command('walkTo',{id,mapId:config.id,x:goal.x,z:goal.z,radius:opts.radius??.18,kind:opts.kind??'ground',run,...(opts.npc?{npc:opts.npc}:{}),...(Number.isInteger(opts.mobId)?{mob:opts.mobId}:{})})){walkJob=null;return false;}walkPaceSent={id,run};}
  world.auto=false;walker.go(target,{radius:opts.radius,kind:opts.kind,onArrive:()=>{if(remote)walkPredictedArrival=true;else arrivalPending={opts};},onFail:reason=>{if(!remote)failed(reason);}});
  if(opts.marker!==false&&typeof target!=='function'){marker.position.set(goal.x,.12,goal.z);marker.visible=true;markerAge=0;}else marker.visible=false;
  return true;
 }
 const makeMobView=m=>{
  const type=MONSTER_TYPES[m.type],frames=monsterArt[m.type]?.map(t=>t.clone()),scale=m.leader?1.35:1,h=(frames?.[0]?.userData.monsterHeight??type.height??1.45)*scale,width=h*(frames?.[0]?.userData.monsterAspect??1.1),tex=frames?.[0]??monsterTextures[m.type%4].clone(),s=sprite(tex,m.x,-m.z,width,h,.06),sh=shadow(m.x,-m.z,.36);
  s.userData.monsterId=m.id;
  const label=document.createElement('button');label.className='mob-label'+(m.leader?' leader':'')+(MONSTER_TYPES[m.type].boss?' boss':'');label.type='button';label.setAttribute('aria-label','เลือกเป้า '+MONSTER_TYPES[m.type].name+' '+(m.id+1));
  const text=document.createElement('span');text.textContent=(m.leader?'★ หัวหน้า':'')+MONSTER_TYPES[m.type].name;label.append(text);
  const bar=document.createElement('i'),fill=document.createElement('b');bar.append(fill);label.append(bar);$('world-labels').append(label);
  label.addEventListener('click',()=>world.select(m.id));
  const warning=new THREE.Mesh(new THREE.RingGeometry(.15,MONSTER_BEHAVIOUR[MONSTER_TYPES[m.type].id]?.aoe??MONSTER_TYPES[m.type].reach??1.35,40),new THREE.MeshBasicMaterial({color:MONSTER_BEHAVIOUR[MONSTER_TYPES[m.type].id]?.aoe?'#ff4a4a':'#ed9b59',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));warning.rotation.x=-Math.PI/2;scene.add(warning);
  const charge=new THREE.Mesh(new THREE.CircleGeometry(MONSTER_BEHAVIOUR[MONSTER_TYPES[m.type].id]?.aoe??MONSTER_TYPES[m.type].reach??1.35,40),new THREE.MeshBasicMaterial({color:MONSTER_BEHAVIOUR[MONSTER_TYPES[m.type].id]?.aoe?'#ff3b3b':'#ff8a3d',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));charge.rotation.x=-Math.PI/2;charge.visible=false;scene.add(charge);
  const view={sprite:s,shadow:sh,height:h,width,labelHeight:(type.bodyHeight??type.height??h)*scale,label,fill,frames,frame:-1,warning,charge,deathStart:null,flashAt:-9};
  if(!frames&&(type.chapter2Art||type.sheet))loadMonsterFrames({mobs:[[0,0,m.type]]}).then(art=>{
   monsterArt[m.type]=art[m.type];if(!art[m.type])return;
   s.material.map.dispose();view.frames=art[m.type].map(t=>t.clone());view.height=(view.frames[0].userData.monsterHeight??type.height??1.45)*scale;
   view.width=view.height*(view.frames[0].userData.monsterAspect??1.1);view.frame=-1;
  }).catch(e=>console.error('Monster art unavailable',type.id,e));
  return view;
 };
 const mobViews=world.mobs.map(makeMobView);
 // 0.110.9 monsters the server adds after we joined (back-office world bosses) arrive whole on first sight: make them
 // here. Ids are list positions, so any gap before them is filled with a far-away dead placeholder.
 function addNetworkMob(mob){
  if(!Number.isInteger(mob.id)||mob.id<0||mob.id>5000||!MONSTER_TYPES[mob.type])return;
  while(world.mobs.length<=mob.id){const i=world.mobs.length,live=i===mob.id;
   const m=live?{pack:null,leader:false,attackCD:0,root:0,hit:0,aggro:false,step:0,dead:0,...mob,home:{x:mob.x,z:mob.z}}:{id:i,type:mob.type,pack:null,leader:false,x:1e5,z:1e5,home:{x:1e5,z:1e5},hp:0,maxHp:1,dead:1e9,attackCD:0,root:0,hit:0,aggro:false,step:0};
   world.mobs.push(m);mobViews.push(makeMobView(m));}
 }
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
 // 0.116.5 tree crowns, roofs and rocks in front of the camera hid characters on 5-59 % of the walkable ground.
 // Characters and monsters also join the actor layer, which soft-look.js draws again over the scenery with the depth
 // cleared, so every part of the sprite keeps its depth (0.116.4 switched depth off and parts of the body vanished).
 function xray(sprite){sprite.traverse(o=>o.layers.enable(1));}
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
 // 1.11 owner (AUTO feels late online): the client mirrors the server's AUTO choice and starts the swing or cast at
 // once; the server's own cast event then only confirms it. Damage, numbers and deaths still come from the server and
 // wait for the blow. A cast the client did not foresee plays as before (shifted by the network lag).
 let predictions=[],predCD=[],predAutoCast=0,nextBasicAt=0,cooldownsAt=0,netLag=.1;const wall=()=>performance.now()/1000; // a steady clock: world.time resyncs to the server
 function attackInterval(){return world.profession.delay*(((network&&world.derivedView)||world.derived)?.delay??1);}
 function predictAuto(dt){
  if(world.roleCombat)return;
  for(let i=0;i<predCD.length;i++)predCD[i]=Math.max(0,predCD[i]-dt);predAutoCast=Math.max(0,predAutoCast-dt);
  predictions=predictions.filter(q=>wall()-q.at<.7);
  const p=world.player;let m=Number.isInteger(world.targetId)?world.mobs[world.targetId]:null;
  // the target just died: the server takes the nearest live monster in the same tick, so take it here too
  if(!m||m.hp<=0)m=world.mobs.filter(x=>x.hp>0&&(world.hunt==null||x.type===world.hunt)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]??null;
  if(m&&Math.hypot(m.x-p.x,m.z-p.z)>8)m=null;
  if(!m||p.hp<=0)return;
  const cast=(index,kind,color)=>{p.face={x:m.x-p.x,z:m.z-p.z};playCast({type:'cast',skillIndex:index,predicted:true,kind,color,from:{x:p.x,z:p.z},to:{x:m.x,z:m.z}});};
  if(predAutoCast===0){
   const view={bodyRadius,player:p,target:m,skills:world.skills,skillLevels:world.skillLevels,profession:world.profession,cooldowns:world.cooldowns.map((c,i)=>Math.max(c-(wall()-cooldownsAt)-netLag,predCD[i]??0)) /* snapshot cooldowns are a network delay old */};
   const i=pickAutoSkill(view,world.autoConfig,scaledSkill);
   if(i>=0){const sk=scaledSkill(world.skills[i],world.skillLevels?.[i]??1);predCD[i]=sk?.cd??1;predAutoCast=.5;cast(i,sk?.type,sk?.color);return;}
  }
  if(Math.hypot(m.x-p.x,m.z-p.z)-bodyRadius(m)<=world.profession.range+1.5&&wall()>=nextBasicAt){nextBasicAt=wall()+attackInterval();cast(null,world.profession.kind,world.profession.color);}
 }
 function playCast(e){
   const aim=castFacing(e,world.player.face);if(aim)world.player.face={...aim};
   if(e.roleSkillId&&SKILL_PROFILES[e.roleSkillId]){roleClip=createRoleAnimation(e,roleEffects.time);castUntil=world.time-Math.max(0,e.lag??0)+roleClip.duration;actionStart=world.time-Math.max(0,e.lag??0);castFace=aim;strikeAt=world.time;actionMode='cast';activeSkill=null;basicCastId=null;world.clearEmote();roleEffects.spawn(e);return;}
   if(e.timing&&!Number.isInteger(e.skillIndex)){
    const timing=e.timing,lag=Math.max(0,e.lag??0),start=world.time-lag;
    if(!roleAnimationActive(roleClip,roleEffects.time)){roleClip=null;activeSkill=null;basicCastId=e.castId;castFace=aim;actionStart=start;castUntil=actionStart+timing.duration;actionMode='attack';swingScale=attackDuration(world.profession.id)/timing.duration;}
    strikeAt=start+timing.impacts[0];strikes=timing.impacts.map(at=>({at:start+at,power:.4}));world.clearEmote();
    const track={...skillTrack(world.profession.id,0),duration:timing.duration,strikes:timing.impacts.map(at=>at/timing.duration)},from=e.from??world.player,to=e.to??from;
    const fx=skillEffects.create(track,{...e,skillIndex:null,synced:true,from,to:{...to,y:groundHeight(world.nav,to.x,to.z)},direction:world.player.face,groundY:groundHeight(world.nav,from.x,from.z),reduced:motionPreference.matches,quality:compactEffects.matches?'low':'high'});fx.age=lag;return;
   }
   const track=Number.isInteger(e.skillIndex)?skillTrack(world.profession.id,e.skillIndex):null;
   // a server cast this client already started: keep the running animation, only time the numbers to its blow
   if(!e.predicted){const idx=Number.isInteger(e.skillIndex)?e.skillIndex:null,q=predictions.findIndex(q=>q.index===idx);
    if(q>=0){strikeAt=Math.max(strikeAt,predictions[q].strikeAt);predictions.splice(q,1);if(e.color)castLight.color.set(e.color);return;}
    if(Number.isFinite(e.lag))netLag=netLag*.8+Math.min(.4,e.lag)*.2;
    if(idx===null){const lag=Math.min(.4,Math.max(.12,e.lag??0));nextBasicAt=wall()-lag+attackInterval()-.03;}}
   // Basic auto-attacks must not replace a skill's active pose mid-animation.
   // 1.10.4 owner: skills play fast enough that the first blow lands within ~0.25 s and the cast ends within ~0.7 s
   // (shaman skills were 1-2 s long and the hit landed 0.6-1.3 s in, long after the server had dealt it)
   const k=track?(e.timing?track.duration/e.timing.duration:Math.max(1,track.strikes[0]*track.duration/.25,track.duration/.7)):1,fast=track?{...track,duration:track.duration/k,...(e.timing?{strikes:e.timing.impacts.map(at=>at/e.timing.duration)}:{})}:null,lag=Math.min(.4,Math.max(0,e.lag??0));
   if(track||world.time>=castUntil||activeSkill===null){
    // 1.10 owner: the swing keeps pace with the attack speed (AGI/DEX make attacks faster than the base swing)
    const interval=world.profession.delay*(((network&&world.derivedView)||world.derived)?.delay??1);swingScale=track?1:Math.max(1,attackDuration(world.profession.id)/Math.max(.2,interval*.95),.42*attackDuration(world.profession.id)/.2); // and the blow lands within 0.2 s
    // 1.10.2 online: the swing began e.lag seconds ago on the server; start it that far in so the blow lands on time
    const swingStart=world.time-lag;skillScale=k;
    activeSkill=track?e.skillIndex:null;castFace=aim;castUntil=swingStart+(fast?.duration??attackDuration(world.profession.id)/swingScale);
    actionStart=swingStart;world.clearEmote();actionMode=!track?'attack':e.kind==='dash'?'dash':e.kind==='shield'?'guard':['slash','punch','thrust','arrow'].includes(e.kind)?'attack':'cast';
   }
   const beats=fast?fast.strikes.map(b=>world.time-lag+b*fast.duration):[world.time+.12];
   // 1.10 owner: numbers, the hit flash and the death wait for the moment the swing / spell connects
   strikeAt=world.time-lag+(fast?fast.strikes[0]*fast.duration:.42*attackDuration(world.profession.id)/swingScale);if(e.predicted)predictions.push({index:Number.isInteger(e.skillIndex)?e.skillIndex:null,at:wall(),strikeAt});strikes=beats.map(at=>({at,power:track?1:.4}));if(e.color)castLight.color.set(e.color);
   const presentation=fast??{...skillTrack(world.profession.id,0),duration:attackDuration(world.profession.id),strikes:[.42]};
   const from=e.from??world.player,to=e.to??from,noviceFx=world.profession.id==='novice'&&fast&&Number.isInteger(e.skillIndex)?'novice:'+e.skillIndex:null;
   // 0.119 Novice basics play their painted sheet on the same beats as the swing.
   if(noviceFx&&roleEffects.has(noviceFx)){roleEffects.spawn({...e,roleSkillId:noviceFx,from,to,lag,timing:{impacts:fast.strikes.map(b=>b*fast.duration),duration:fast.duration}});return;}
   const effect=skillEffects.create(presentation,{...e,skillIndex:track?e.skillIndex:null,synced:true,from,to:{...to,y:groundHeight(world.nav,to.x,to.z)},direction:world.player.face,groundY:groundHeight(world.nav,from.x,from.z),reduced:motionPreference.matches,quality:compactEffects.matches?'low':'high'});effect.age=lag;
 }
 function effect(e){
  if(e.type==='experience'){
   toast((e.baseUp?'Base Level Up! Lv. '+e.baseLevel+' · ':e.jobUp?'Job Level Up! Lv. '+e.jobLevel+' · ':'')+'+'+e.base+' Base EXP · +'+e.job+' Job EXP');
  }
  if(e.type==='petSkill'){const ids={fireBurst:'sky-spear',lotusCleanse:'cleanse',moonBarrier:'sanctuary',roarGuard:'guard',trueSight:'mark',flowerBind:'vine-trap',riceHeal:'heal',jadeShell:'sanctuary',waterMana:'regen',echoSlow:'hamstring'};roleEffects.spawn({roleSkillId:ids[e.kind],from:{x:e.x,z:e.z},to:e.to??{x:e.x+.5,z:e.z},lag:e.lag});if(!e.actor||e.actor===network?.id)toast(e.name);
  }else if(e.type==='castCancel'){if(roleClip?.castId===e.castId){roleClip=null;castUntil=world.time;}if(basicCastId===e.castId)castUntil=world.time;roleEffects.cancel(e.castId,e.actor??network?.id??'self');skillEffects.cancel(e.castId,e.actor??'self');
  }else if(e.type==='rolePassive'){roleEffects.spawn(e);
  }else if(e.type==='cast'){playCast(e);
  }else if(e.type==='miss'){const m={...e,type:'damage',amount:'MISS',color:'#d8d8d8'};if(!e.synced&&strikeAt>world.time)heldHits.push({at:strikeAt,e:m});else popup(m);
  }else if(e.type==='damage'){roleEffects.hit(e);const v=mobViews[e.id];if(!e.synced&&strikeAt>world.time){heldHits.push({at:strikeAt,e});if(v)v.holdUntil=strikeAt;}else{popup(e);if(v)v.flashAt=world.time;if(e.crit||e.color==='#ffd27a')kick=Math.max(kick,1);}}
  else if(e.type==='heal'){popup(e,true);}
  else if(e.type==='knock'){kick=Math.max(kick,1.4);if(network)world.knock={vx:e.vx,vz:e.vz,t:e.t};} // 0.111 boss slam: shake and slide back (online: mirror the server's slide)
  else if(e.type==='playerHit'){hitUntil=world.time+.28;hitStart=world.time;popup({...e,hurt:true});if(e.amount>=world.player.maxHp*.2)kick=Math.max(kick,.8);hero.sprite.material.color.set('#ff7a6a');hitTintUntil=world.time+.45;}
  else if(e.type==='notice')toast(e.text);
  else if(e.type==='combo')popup({x:e.x,z:e.z,amount:'คอมโบ!',color:'#fff4dc'},true);
  else if(e.type==='drop'){const best=Math.max(...e.items.map(i=>itemDef(i.id)?.rarity??0));if(best>=2&&Number.isFinite(e.x))pillar(e.x,e.z,best);}
  else if(e.type==='defeat')toast('ปราบ '+MONSTER_TYPES[world.mobs[e.id].type].name+' แล้ว');
 }
 // 0.90 hotbar: which skill sits on each of the ten buttons / keys 1-0 (dragged in the skill window), and the AUTO
 // settings (skills to cast, potion thresholds). Both are per path on this device; AUTO settings go to the server online.
 const roleKey=world.roleCombat&&!world.roleCombat.legacy?'role1:':'';const HOT_KEY='ayothaya-hotbar:'+roleKey+world.profession.id,AUTO_KEY='ayothaya-auto:'+roleKey+world.profession.id;
 // 0.101 five more slots (keys Alt+1-5) hold the Master skills; a ten-slot hotbar saved before keeps its order.
 const order=[...Array(SLOTS).keys()],isOrder=h=>Array.isArray(h)&&h.length===SLOTS&&[...h].sort((a,b)=>a-b).join()===order.join();
 let hotbar=order;try{let h=JSON.parse(localStorage.getItem(HOT_KEY));if(Array.isArray(h)&&(h.length===BASE_SLOTS||h.length===15))h=[...h,...order.slice(h.length)]; /* 0.119 two more slots: a saved bar keeps its order */if(isOrder(h))hotbar=h;}catch{}
 if(world.profession.id==='novice')hotbar=[...hotbar.filter(i=>NOVICE_SLOTS.includes(i)),...hotbar.filter(i=>!NOVICE_SLOTS.includes(i))];
 try{world.autoConfig=normalizeAuto(JSON.parse(localStorage.getItem(AUTO_KEY)));}catch{world.autoConfig=normalizeAuto(null);}
 let autoSent='';
 const skillButtons=world.skills.map((s,i)=>{
  const b=document.createElement('button');b.type='button';b.className='skill'+(isMaster(i)?' master-slot':'');b.hidden=isMaster(i);
  b.innerHTML=`<kbd>${HOTBAR_KEYS[i]}</kbd><strong>${s.icon}</strong><span>${s.short}</span><em></em><small class="skill-level"></small>`;b.addEventListener('click',()=>{if(!isPaused())world.skill(hotbar[i]);});$('skills').append(b);return b;
 });
 function paintHotbar(){skillButtons.forEach((b,i)=>{const s=world.skills[hotbar[i]];if(!s)return;b.querySelector('strong').textContent=s.icon;b.querySelector('span').textContent=s.short??s.name;b.setAttribute('aria-label',`สกิล ${HOTBAR_KEYS[i]} ${s.name}`);b.title=`${HOTBAR_KEYS[i]} · ${s.name} · MP ${s.cost} · ${s.cd} วินาที`;b.style.setProperty('--skill-color',s.color);});applySkillArt(skillButtons,world.profession.id,hotbar,world.skills);}
 paintHotbar();
 function setHotbar(order){if(!isOrder(order))return;hotbar=[...order];try{localStorage.setItem(HOT_KEY,JSON.stringify(hotbar));}catch{}paintHotbar();}
 function setAutoConfig(cfg){world.autoConfig=normalizeAuto(cfg);try{localStorage.setItem(AUTO_KEY,JSON.stringify(world.autoConfig));}catch{}autoSent='';}

 let autoPicker=null;
 $('auto-attack').addEventListener('click',()=>{if(!isPaused()){if(autoPicker&&document.body.classList.contains('mobile-play'))autoPicker();else world.toggleAuto();}});
 $('attack').addEventListener('pointerdown',e=>{if(isPaused())return;e.preventDefault();attackPointer=e.pointerId;input.attack=true;$('attack').setPointerCapture(e.pointerId);world.basicAttack();});
 function releaseAttack(e){if(e.pointerId===attackPointer){input.attack=false;attackPointer=null;}}
 $('attack').addEventListener('pointerup',releaseAttack);$('attack').addEventListener('pointercancel',releaseAttack);$('attack').addEventListener('lostpointercapture',releaseAttack);
 // Keyboard activation of the accessible attack button also works.
 $('attack').addEventListener('click',e=>{if(e.detail===0&&!isPaused())world.basicAttack();});
 function editable(e){return e.target instanceof Element&&!!e.target.closest('input,textarea,select,[contenteditable=true]');}
 let spaceTalkHeld=false;
 addEventListener('keydown',e=>{
  if(e.code==='Space'&&spaceTalkHeld){e.preventDefault();return;}
  if(e.altKey&&/^Digit[1-5]$/.test(e.code)&&!isPaused()&&!editable(e)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();if(!e.repeat)world.skill(hotbar[BASE_SLOTS+Number(e.code.slice(-1))-1]);return;}
  if(isPaused()||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Space'){
   const button=e.target.closest?.('button,a,[role=button]');
   if(button&&!['attack','interact'].includes(button.id))return;
   if(!e.repeat&&npcInteraction?.talkNearest()){spaceTalkHeld=true;e.preventDefault();clearInput();return;}
   if(button)return; // Native activation of focused HUD buttons remains accessible.
  }
  if(['KeyW','KeyA','KeyS','KeyD','Space','KeyF'].includes(e.code)||/^Digit[0-9]$/.test(e.code))e.preventDefault();
  if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))cancelWalk();
  if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight'].includes(e.code))keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='KeyF')world.toggleAuto();
  if(e.code==='Space')world.basicAttack();
  if(/^Digit[0-9]$/.test(e.code)){const n=Number(e.code.slice(-1));world.skill(hotbar[n===0?9:n-1]);}
 });
 addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')spaceTalkHeld=false;});
 const joystick=$('joystick'),knob=$('stick');
 function updateStick(e){const b=joystick.getBoundingClientRect(),r=b.width*.34;let x=(e.clientX-b.left-b.width/2)/r,y=(b.top+b.height/2-e.clientY)/r,n=Math.max(1,Math.hypot(x,y));joy.x=x/n;joy.y=y/n;knob.style.transform=`translate(${joy.x*r}px,${-joy.y*r}px)`;}
 function clearStick(){joy.id=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)';joystick.classList.remove('held');}
 joystick.addEventListener('pointerdown',e=>{if(isPaused()||joy.id!==null)return;e.preventDefault();cancelWalk();joy.id=e.pointerId;joystick.setPointerCapture(e.pointerId);joystick.classList.add('held');updateStick(e);});
 joystick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id){e.preventDefault();updateStick(e);}});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(name,e=>{if(e.pointerId===joy.id)clearStick();});
 function clearInput(){
  // Menus/focus changes release held controls; only explicit movement cancels
  // a destination. Its local prediction must keep pace with the authority too.
  keys.clear();input.attack=false;
  if(attackPointer!==null&&$('attack').hasPointerCapture(attackPointer))$('attack').releasePointerCapture(attackPointer);
  if(joy.id!==null&&joystick.hasPointerCapture(joy.id))joystick.releasePointerCapture(joy.id);
  for(const id of touches.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  attackPointer=null;clearStick();touches.clear();pinchDistance=0;mouseStart=null;
 }
 addEventListener('blur',()=>{spaceTalkHeld=false;clearInput();});document.addEventListener('visibilitychange',()=>{if(document.hidden){spaceTalkHeld=false;clearInput();}});
 // 0.99.15 another player under the tap opens their menu first (multiplayer-ui sets this)
 let playerTap=null,npcInteraction=null;
 function selectAt(x,y,npc=null){
  if(isPaused())return;
  if(!world.roleAim&&(npcInteraction?.activate(npc)||npcInteraction?.tap(x,y)))return;
  if(!world.roleAim&&playerTap?.(x,y))return;
  pointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  for(const hit of world.roleAim?[]:raycaster.intersectObjects(mobViews.map(v=>v.sprite))){
   const id=hit.object.userData.monsterId;if(world.mobs[id].hp<=0)continue;
   const tex=hit.object.material.map,uv=hit.uv?.clone();
   if(uv){tex.transformUv(uv);const img=tex.image,c=img.getContext?.('2d');if(c&&c.getImageData(Math.min(img.width-1,Math.max(0,Math.floor(uv.x*img.width))),Math.min(img.height-1,Math.max(0,Math.floor(uv.y*img.height))),1,1).data[3]<40)continue;}
   world.select(id);return;
  }
  // 0.101.4 raised floors (the sala deck): re-aim at the floor height under the last hit until it settles
  let hit=null;groundPlane.constant=0;for(let i=0;i<4;i++){hit=raycaster.ray.intersectPlane(groundPlane,groundHit);if(!hit)break;groundPlane.constant=-groundHeight(world.nav,hit.x,hit.z);}
  if(hit){if(world.roleAim){world.roleAim=false;world.roleGround={x:hit.x,z:hit.z};world.notice('เลือกจุดวางแล้ว · กดสกิลเพื่อร่าย');}else walkTo({x:hit.x,z:hit.z});}
 }
 function pinchSpan(){const a=[...touches.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;}
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'){mouseStart={x:e.clientX,y:e.clientY,npc:!world.roleAim?npcInteraction?.pick(e.clientX,e.clientY):null};return;}
  e.stopImmediatePropagation();e.preventDefault();canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,npc:!world.roleAim?npcInteraction?.pick(e.clientX,e.clientY):null});
  if(touches.size>1){touches.forEach(p=>p.moved=true);pinchDistance=pinchSpan();}cancelCameraTurn();
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch')return;e.stopImmediatePropagation();const p=touches.get(e.pointerId);if(!p)return;e.preventDefault();const dx=e.clientX-p.x;p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(p.x-p.startX,p.y-p.startY)>8)p.moved=true;
  if(touches.size===2){const d=pinchSpan();if(pinchDistance>0)camera.zoom=THREE.MathUtils.clamp(camera.zoom*d/pinchDistance,.65,2.7);pinchDistance=d;camera.updateProjectionMatrix();}
  else if(p.startX>innerWidth*.45&&p.moved){const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta-=dx/innerWidth*Math.PI*2;camera.position.setFromSpherical(spherical).add(controls.target);controls.update();}
 },true);
 function pointerEnd(e){
  if(e.pointerType!=='touch'){if(mouseStart&&Math.hypot(e.clientX-mouseStart.x,e.clientY-mouseStart.y)<7&&e.type==='pointerup')selectAt(e.clientX,e.clientY,mouseStart.npc);mouseStart=null;return;}
  e.stopImmediatePropagation();const p=touches.get(e.pointerId);if(p&&!p.moved&&e.type==='pointerup')selectAt(e.clientX,e.clientY,p.npc);touches.delete(e.pointerId);pinchDistance=0;
 }
 for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,pointerEnd,true);
 canvas.addEventListener('lostpointercapture',e=>{touches.delete(e.pointerId);if(!touches.size)pinchDistance=0;});
 const defaultZoom=()=>innerWidth<700?1.6:1.05;
 camera.zoom=defaultZoom();camera.updateProjectionMatrix();
 const initialOffset=camera.position.clone().sub(controls.target);
 $('reset').onclick=()=>{cancelCameraTurn();controls.target.set(world.player.x,1,world.player.z);camera.position.copy(controls.target).add(initialOffset);camera.zoom=defaultZoom();camera.updateProjectionMatrix();controls.update();};
 function update(dt){
  const renderDt=presentationDelta(dt,{hidden:document.hidden}),paused=isPaused();if(paused)clearInput();
  // The authority keeps simulating during long rendered frames. Dropping every
  // millisecond beyond 50 ms makes online sprint fall behind on slower devices.
  // moveBody subdivides collision steps; offline simulation keeps its old cap.
  dt=document.hidden?0:network?renderDt:Math.min(.05,Math.max(0,dt));const visualDt=network?renderDt:dt;
  const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joy.x,y=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+joy.y;
  let direction=screenDirection(x,y,controls.getAzimuthalAngle());
  // Keys / joystick always win over a tapped route; otherwise the route steers like a held joystick.
  if(Math.hypot(x,y)>.08||world.player.hp<=0)cancelWalk();else{const routeRun=wantsRun()&&(network?.walkSchema!==1||network.walkRunSchema===1),step=network?Math.min(.05,dt):dt,routed=walker.step(world.player,step,world.walkSpeed(routeRun)*step);if(routed)direction=routed;}
  refreshAnimationCapabilities();
  const routeId=walkJob?.id??(serverWalkState?.status==='walking'?serverWalkState.id:null),remoteRoute=network?.walkSchema===1&&!!routeId,run=wantsRun();
  // A route is simulated by the authority even without browser frames. Send
  // only pace changes; older hosts must also be predicted at walking speed.
  if(remoteRoute&&network.walkRunSchema===1&&(walkPaceSent?.id!==routeId||walkPaceSent.run!==run)){
   if(network.command('walkPace',{id:routeId,run}))walkPaceSent={id:routeId,run};
  }
  const steering=paused&&!walker.active&&!walkJob&&!remoteRoute?{x:0,z:0,attack:false,run:false}:{...direction,attack:input.attack||keys.has('Space'),run:remoteRoute?network.walkRunSchema===1&&run:run};
  if(marker.visible){markerAge+=dt;if(walker.active||walkJob){marker.material.opacity=.85;marker.scale.setScalar(1+.15*Math.sin(markerAge*7));}else{marker.material.opacity-=dt*3.5;if(marker.material.opacity<=0)marker.visible=false;}}
  if(network){
   network.setInput(remoteRoute?{...steering,x:0,z:0}:steering);world.time+=renderDt;
   let remaining=dt,first=true;
   do{
    const step=Math.min(.05,remaining);let move=steering;
    if(!first&&Math.hypot(x,y)<=.08){const routed=walker.step(world.player,step,world.walkSpeed(steering.run)*step);move={...steering,...(routed??{x:0,z:0})};}
    predictMove(world,serverSelf,step,move,{pendingStop:network.waitingForStop(serverSelf?.inputAck)||!!walkJob&&walkPredictedArrival,inputAge:network.inputAge(serverSelf?.inputAck)});
    remaining-=step;first=false;
   }while(remaining>1e-8);
  }else if(!paused||walker.active||arrivalPending)world.update(dt,steering);
  if(arrivalPending&&!document.hidden&&!isPaused()){const done=arrivalPending;arrivalPending=null;done.opts.onArrive?.();}
  if(network&&world.auto&&!paused)predictAuto(dt);
  roleUI.update();roleDecor.update();roleEffects.advance(visualDt);
  world.events.splice(0).forEach(e=>{e=ageQueuedCombatEvent(e,wall());effect(e);for(const fn of listeners)fn(e);});
  const roleShake=roleEffects.update(0);
  if(heldHits.length){const now=world.time;heldHits=heldHits.filter(h=>{if(h.at>now+.6)h.at=now;if(h.at>now)return true;popup(h.e);const v=mobViews[h.e.id];if(v&&h.e.amount!=='MISS')v.flashAt=now;if(h.e.crit||h.e.color==='#ffd27a')kick=Math.max(kick,1);return false;});}
  const p=world.player,t=world.time,reduced=motionPreference.matches;
  if(p.moving||t<hitUntil||p.hp<=0)world.clearEmote();world.emote=activeEmote(world.emote,t);
  const roleActive=roleAnimationActive(roleClip,roleEffects.time);
  if(roleClip&&!roleActive){roleClip=null;castUntil=t;}
  const chosen=actionChoice({time:t,dead:p.hp<=0,hit:t<hitUntil&&t>=castUntil&&!roleActive,cast:roleActive?'cast':t<castUntil?actionMode:false,moving:p.moving,running:p.running,emote:world.emote,guard:p.shield>0});
  const mode=['sit','sleep','run'].includes(chosen)&&!supportsAction(chosen)?(chosen==='run'?'walk':'idle'):chosen;
  const distanceMoved=Math.hypot(p.x-lastX,p.z-lastZ);lastX=p.x;lastZ=p.z;
  if(distanceMoved<1)gait+=gaitStep(distanceMoved,dt,world.profession.id,mode); // No steps while blocked; teleports do not advance the gait.
  const skillActive=t<castUntil&&t>=hitUntil&&activeSkill!==null;
  const locomotion=mode==='walk'||mode==='run',poseTime=locomotion||mode==='idle'?t:mode==='hit'?t-hitStart:world.emote?.name===mode?t-world.emote.time:mode==='attack'?(t-actionStart)*swingScale:t-actionStart;
  const rolePose=p.hp>0?sampleRolePose(roleClip,roleEffects.time,{reduced}):null;
  const pose=rolePose??(skillActive?skillPose(world.profession.id,activeSkill,(t-actionStart)*skillScale,{reduced}):characterMotion({time:poseTime,phase:locomotion?gait:null,mode,classId:world.profession.id,reduced,view:heroView=walkView(p.face,controls.getAzimuthalAngle(),heroView)}));
  if(mode==='attack'&&activeSkill===null)pose.actionPhase=Math.max(0,Math.min(1,(t-actionStart)/(attackDuration(world.profession.id)/swingScale)));
  if(visualPose){visualPose.profileFrame=!!pose.profileFrame;visualPose.actionPhase=pose.actionPhase??null;}
  if(!visualPose||reduced)visualPose={...pose};
  else for(const key of Object.keys(pose))visualPose[key]=typeof pose[key]!=='number'||['frame','artFrame','stand','time','phase','actionPhase'].includes(key)?pose[key]:(visualPose[key]??pose[key])+(pose[key]-(visualPose[key]??pose[key]))*(1-Math.exp(-dt*24));
  const heroSize=hero.height??1.8;
  const faceLength=Math.hypot(p.face.x,p.face.z)||1,rootOffset=skillActive&&SKILLS[activeSkill].type!=='dash'?visualPose.x:0;
  const floor=groundHeight(world.nav,p.x,p.z);
  hero.sprite.position.set(p.x+p.face.x/faceLength*rootOffset,floor+.06+(hero.sprite.userData.directionalActive&&mode==='walk'?0:visualPose.y),p.z+p.face.z/faceLength*rootOffset);
  hero.sprite.scale.set(heroSize,heroSize,1);xray(hero.sprite,floor);
  const azimuth=controls.getAzimuthalAngle(),poseFace=rolePose?(roleClip.facing??p.face):t<castUntil?(castFace??p.face):p.face;
  if(hero.frames)hero.sprite.material.map=hero.frames[0];
  hero.sprite.userData.setFacing?.(poseFace,azimuth,{mode,time:poseTime,phase:locomotion?gait:null,reduced});
  const facing=poseFace.x*Math.cos(azimuth)-poseFace.z*Math.sin(azimuth);
  if((rolePose||t<castUntil?Math.abs(facing)>1e-6:Math.abs(facing)/faceLength>.3))heroFlip=facing<0; // hysteresis: keep the last side until clearly turning
  hero.sprite.userData.pose?.(visualPose,heroFlip);
  if(world.time>=hitTintUntil)hero.sprite.material.color.lerp(new THREE.Color('#fff1da'),Math.min(1,dt*4)); // 1.09.4 a faint red that lingers a moment when hithero.sprite.visible=p.hp>0;hero.shadow.visible=p.hp>0;
  footDust.update(dt);
  if(locomotion&&!reduced){const step=Math.floor(gait*2+.5);if(step!==lastStep){lastStep=step;footDust.puff(p.x-p.face.x/faceLength*.25,floor+(!world.nav.grid&&p.z>4.25?.44:.09),p.z-p.face.z/faceLength*.25);}}
  let flash=0,shake=0;for(const s of strikes){const d=t-s.at;if(d>=0&&d<.45){flash=Math.max(flash,s.power*Math.exp(-d*9));if(d<.25)shake=Math.max(shake,s.power*Math.exp(-d*16));}}strikes=strikes.filter(s=>t-s.at<.5);
  castLight.intensity=reduced?0:flash*14;castLight.position.set(p.x,floor+1.3,p.z);kick*=Math.exp(-dt*14);shakeAmount=reduced?0:Math.max(shake*.11,kick*.07,roleShake);
  hero.shadow.position.set(p.x,floor+.072,p.z);playerRing.position.set(p.x,floor+.081,p.z);shield.position.set(p.x,floor+.1,p.z);shield.visible=p.shield>0;
  // Camera follows the player while preserving user-controlled azimuth and zoom.
  const follow=new THREE.Vector3(p.x,floor+1,p.z).sub(controls.target).multiplyScalar(1-Math.exp(-dt*4));camera.position.add(follow);controls.target.add(follow);
  controls.update();camera.updateMatrixWorld();
  const head=characterHead(hero.sprite,camera);project(playerLabel,head.x,head.y,head.z);
  if((world.rebirth??0)!==shownRank){shownRank=world.rebirth??0;const t=playerLabel.querySelector('.rank-title');t.hidden=!shownRank;t.textContent=shownRank?'✦ '+rebirthRank(shownRank)+' ✦':'';}
  mobViews.forEach((v,i)=>{
   const m=world.mobs[i],type=MONSTER_TYPES[m.type];
   const held=v.holdUntil>t; // 1.10 still standing until the blow lands
   if(m.hp<=0&&v.deathStart===null&&!held)v.deathStart=t;if(m.hp>0)v.deathStart=null;
   const deadAge=v.deathStart===null?0:t-v.deathStart,visible=m.hp>0||held||deadAge<1.25;
   v.sprite.visible=v.shadow.visible=visible;v.label.hidden=m.hp<=0&&!held;v.warning.visible=m.hp>0&&m.windup>0;
   {const b=MONSTER_BEHAVIOUR[type.id],slam=m.slamming&&b?.slam,charge=Math.min(1,Math.max(0,1-(m.windup??0)/(slam?slam.windup:b?.windup??type.windup??.45))),aoe=!!b?.aoe||!!slam,grow=slam?slam.radius/(b.aoe??type.reach??1.35):1;v.warning.position.set(m.x,.09,m.z);v.warning.scale.setScalar(grow);v.warning.material.opacity=slam?.45+.45*charge:aoe?.3+.35*charge:.12+.25*charge;
    v.charge.visible=aoe&&v.warning.visible;v.charge.position.set(m.x,.092,m.z);v.charge.scale.setScalar(Math.max(.05,charge)*grow);v.charge.material.opacity=.1+.14*charge;} // 0.99.3 area bursts fill up until they land
   if(!visible)return;
   const f=monsterFrame(m,t);if(v.frames&&f!==v.frame){v.sprite.material.map=v.frames[f];v.sprite.material.map.needsUpdate=true;v.frame=f;}
   const recoil=reduced?0:Math.sin(Math.PI*Math.min(1,m.hit/.34))*.18;
   const mobFloor=groundHeight(world.nav,m.x,m.z);v.sprite.position.set(m.x+(m.recoil?.x??0)*recoil,mobFloor+.06,m.z+(m.recoil?.z??0)*recoil);v.shadow.position.set(m.x,mobFloor+.073,m.z);
   v.sprite.scale.set(v.width,v.height,1);v.sprite.material.rotation=0;xray(v.sprite);
   v.sprite.material.transparent=m.hp<=0;v.sprite.material.opacity=m.hp<=0?Math.max(0,1-(deadAge-.5)/.75):1;
   // 0.74 hit flash: overbright tint (>1) burns the sprite near-white for ~0.12 s, then fades back.
   const burn=reduced?0:Math.max(0,1-(t-v.flashAt)/.14);v.sprite.material.color.set(m.root>0?'#9ddacc':'#fff1da');if(burn>0)v.sprite.material.color.multiplyScalar(1+2.6*burn);
   if(burn>0)v.sprite.scale.set(v.width*(1+.08*burn),v.height*(1-.06*burn),1);v.fill.style.width=`${m.hp/m.maxHp*100}%`;v.label.classList.toggle('selected',world.targetId===m.id);
   v.label.toggleAttribute('data-full-health',m.hp>=m.maxHp);
   if(m.aggro){const side=(p.x-m.x)*Math.cos(controls.getAzimuthalAngle())-(p.z-m.z)*Math.sin(controls.getAzimuthalAngle());v.sprite.material.map.repeat.x=side<0?-1:1;v.sprite.material.map.offset.x=side<0?1:0;}
   project(v.label,m.x,mobFloor+v.labelHeight+.24,m.z);
  });
  const target=world.target;targetRing.visible=!!target;if(target){targetRing.position.set(target.x,.088,target.z);targetRing.scale.setScalar(1+.07*Math.sin(t*5));}
  skillEffects.update(visualDt,camera);
  for(let i=pillars.length-1;i>=0;i--){const p=pillars[i];p.age+=dt;p.m.material.opacity=.7*Math.max(0,1-p.age/2.6);p.m.scale.x=p.m.scale.z=1+Math.sin(p.age*6)*.08;if(p.age>2.6){scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();pillars.splice(i,1);}}
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.age+=visualDt;if(f.age>FLOAT_LIFE){f.el.remove();floats.splice(i,1);continue;}
   placeFloat(f,visualDt);f.el.style.opacity=String(f.age<.55?1:Math.max(0,1-(f.age-.55)/(FLOAT_LIFE-.55)));}
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
   {const wv=world.war,line=$('war-line'),mm=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); // 0.95 guild war status under the target
    line.hidden=!wv?.active;if(wv?.active)line.textContent='⚔ กิลด์วอร์ '+mm(wv.left)+(wv.stone?' · ศิลา '+wv.stone.hp.toLocaleString('th-TH')+'/'+wv.stone.maxHp.toLocaleString('th-TH'):'')+' · ผู้ยึด: '+(wv.holder??'ยังไม่มี');}
   paintTargetHud(document,targetHudState({target:world.target,mobs:world.mobs,player:p,types:MONSTER_TYPES}));
   if(!network)world.skillPoints=availablePoints(localSkills,progress());
   if(network){const j=JSON.stringify(world.autoConfig);if(j!==autoSent&&network.command('autoConfig',world.autoConfig))autoSent=j;}
   skillButtons.forEach((b,i)=>{const cd=world.cooldowns[hotbar[i]],lv=world.skillLevels[hotbar[i]]??1;const s=world.skills[hotbar[i]];b.hidden=!!s.reserved||!!s.passive||isMaster(i)&&!lv;b.querySelector('.skill-level').textContent=lv?'Lv'+lv:'—';b.classList.toggle('locked',!lv);b.querySelector('em').textContent=cd>.05?String(Math.ceil(cd)):'';b.classList.toggle('cooling',cd>.05);b.classList.toggle('no-mana',p.mp<s.cost);b.style.setProperty('--cooldown',`${cd/s.cd*100}%`);});
  }
 }
 function mobileLayout(){return innerWidth<=800||matchMedia('(pointer:coarse)').matches;}
 function updateHelp(){
  document.querySelector('.control-hint').textContent=mobileLayout()?'ลากจอยซ้ายเพื่อเดิน'+(supportsAction('run')?' · แตะปุ่มวิ่งเพื่อสลับจังหวะ':'')+' · แตะมอนเลือกเป้า · ลากด้านขวาหมุนกล้อง':'WASD เดิน'+(supportsAction('run')?' · Shift วิ่ง':'')+' · Space คุยกับ NPC / โจมตี · F ออโต้ · 1–9 / 0 สกิล · Q / E ใช้ยา';
  document.querySelector('.player-foot span:last-child').textContent=mobileLayout()?'จอยซ้าย · เดิน':'W A S D · เดิน';
 }
 updateHelp();addEventListener('resize',updateHelp);
 toast(mobileLayout()?'ลากจอยเดิน · แตะมอนและสกิลด้านขวา':'WASD เดิน · คลิกมอนเลือกเป้า · Space คุยกับ NPC / โจมตี · F ออโต้');
 function setNetwork(client){networkExpected=true;network=client;clearInput();world.auto=false;autoSent='';client.addEventListener('welcome',()=>{autoSent='';});client.addEventListener('walkError',e=>{if(walkJob?.id!==e.detail.id)return;const job=walkJob;walkJob=null;walker.cancel();marker.visible=false;if(job.opts.onFail)job.opts.onFail(e.detail.code);else world.notice('เดินไปจุดนั้นไม่ได้');}); // a fresh server world starts on default AUTO settings
  // 0.97 the AUTO button shows only what the server reports.
  world.skill=i=>{world.clearEmote();const point=world.roleGround;world.roleGround=null;return client.command('skill',{index:i,roleSchema:1,...(point?{point}: {})});};world.basicAttack=()=>{world.clearEmote();return client.command('attack');};world.select=id=>client.command('select',{target:id});world.toggleAuto=()=>client.command('auto',{on:!world.auto});world.setAuto=(on,hunt,target)=>client.command('auto',{on,hunt,...(target?{target}: {})});world.questTalk=(npc,expected)=>client.command('questTalk',{npc,expected});world.storyCheck=()=>client.command('storyCheck');world.useItem=item=>client.command('useItem',{item});world.statUp=stat=>client.command('statUp',{stat});world.equipGear=item=>client.command('equip',{item});world.netState=()=>client.status+'/'+(client.socket?.readyState??'-')+(client.stopped?'/stopped':'');world.unequipGear=slot=>client.command('unequip',{slot});world.refine=(slot,npc,lekLai,guard,attempt)=>client.command('refine',{slot,npc,lekLai,guard,attempt});world.insertCard=(slot,card)=>client.command('insertCard',{slot,card});world.petCommand=(type,data={},id=crypto.randomUUID())=>client.request(type,id,data);world.market=(type,data={})=>client.command(type,data);world.trade=(type,npc,item,count)=>client.command(type,{npc,item,count});world.discard=(item,count)=>client.command('discard',{item,count});
 }
 function applyNetworkSnapshot(snapshot){const s=snapshot.self;world.networkMapId=s.mapId;world.networkSelfId=s.id;world.arenaRoom=s.arenaRoom??null;if(s.character){world.heroName=s.character.name;playerLabel.querySelector('b').textContent=s.character.name;}{const o=snapshot.weather;world.weatherOverride=o?{id:o.id,mapId:o.mapId??null,endsAt:Date.now()+o.left}:null;} // 0.109.7 admin weather
 if('weekly' in s)world.weekly=s.weekly??null;world.rebirth=s.rebirth??0;if(s.story)world.story=s.story;if('stall' in s)world.myStall=s.stall??null;if('guild' in s)world.myGuild=s.guild??null;world.status=s.status??{};world.supportTargetId=s.supportTargetId;world.supportRoster=s.supportRoster??[];world.roleFieldsView=snapshot.roleFields??[];world.rolePetsView=snapshot.rolePets??[];world.food=s.food??null;if('mvp' in s)world.mvp=s.mvp??null;if('pet' in s)world.pet=s.pet??null;if('mailbox' in s)world.mailbox=s.mailbox;if('petCollection' in s)world.petCollection=s.petCollection;if('bounty' in s)world.bounty=s.bounty??null;world.mercLeft=s.merc??0;world.mercenary=s.mercenary??null;world.adventurers=s.adventurers??[];world.adventurerSchema=s.adventurerSchema??0;if('album' in s){world.album=s.album??[];world.albumRewards=s.albumRewards??[];world.albumSchema=s.albumSchema??1;}if(s.bag)world.bag=s.bag;if(s.stats){world.stats=s.stats;world.gear=s.gear;world.statPoints=s.statPoints;world.derivedView=s.derived;}if(Array.isArray(s.skillLevels))world.skillLevels=[...s.skillLevels];if(Number.isInteger(s.skillPoints))world.skillPoints=s.skillPoints;const {x,z,moving,face,...state}=s.player;Object.assign(world.player,state);if(!serverSelf){world.player.x=x;world.player.z=z;}serverSelf={x,z,moving,face,inputAck:s.inputAck};world.cooldowns=[...s.cooldowns];cooldownsAt=performance.now()/1000;world.kills=s.kills;world.baseXp=s.baseXp;world.jobXp=s.jobXp;world.targetId=s.targetId;world.auto=s.auto;world.autoTarget=s.autoTarget??null;world.hunt=s.hunt??null;world.foe=s.duel?.foe??null;world.war=s.war??null;world.rivals=s.war?.rivals??[];world.duelLeft=s.duel?.left??0;if(Math.abs(world.time-snapshot.time)>.25)world.time=snapshot.time;
  serverWalkState=s.walkRoute??null;if(walkJob&&serverWalkState?.id===walkJob.id&&serverWalkState.status!=='walking'){const job=walkJob;walkJob=null;walker.cancel();if(serverWalkState.status==='arrived')arrivalPending=job;else if(serverWalkState.status==='failed')job.opts.onFail?.(serverWalkState.reason);}
  serverSelf.running=s.player.running===true;world.emote=activeEmote(s.emote,snapshot.time);
  for(const mob of snapshot.mobs){const existing=world.mobs.find(m=>m.id===mob.id);if(existing)Object.assign(existing,mob);else if('type' in mob)addNetworkMob(mob);}
 }
 // Applied by the renderer around the draw call only, so it never leaks into the orbit controls.
 function shakeOffset(out){const t=world.time,a=shakeAmount;return out.set(Math.sin(t*83)*a,Math.cos(t*67)*a*.6,Math.sin(t*71+1)*a);}
 // Warm the HTTP cache with this character's own skill sheets once the map has settled.
 setTimeout(()=>roleEffects.prefetch(world.skills.map((s,i)=>s.roleSkillId??'novice:'+i)),4000);
 addEventListener('pagehide',e=>{if(!e.persisted){roleEffects.dispose();roleDecor.dispose();roleUI.dispose();}});
 return {roleEffects,roleDecor,get canUseActions(){return !isPaused();},selectAlly(id){world.supportTargetId=id;return network?.command('selectAlly',{target:id});},xray,set playerTap(f){playerTap=f;},set npcInteraction(value){npcInteraction=value;},set autoPicker(value){autoPicker=value;},popup:(e,anchor)=>popup(e,false,anchor),get hotbar(){return [...hotbar];},setHotbar,setAutoConfig,update,world,clearInput,setNetwork,applyNetworkSnapshot,shakeOffset,upgradeSkill,walkTo,cancelWalk,get walking(){return !!walkJob||walker.active||serverWalkState?.status==='walking';},onEvent:fn=>listeners.add(fn),get online(){return !!network;},expectNetwork(){networkExpected=true;},get networkExpected(){return networkExpected;},get networkStatus(){return network?.status??null;},supportsAction,refreshAnimationCapabilities,requestEmote,setRunning,get runningRequested(){return runToggled;}};
}

import * as THREE from 'three';
import {CombatWorld,MONSTER_TYPES,screenDirection} from './combat-core.js?v=09';

import {className} from './classes.js';
import {poseFrame} from './sprite-motion.js';

export function createGame({scene,camera,controls,canvas,hero,monsterTextures,sprite,shadow,cancelCameraTurn,config={},isPaused=()=>false}){
 const world=new CombatWorld(config),SKILLS=world.skills,$=id=>document.getElementById(id),keys=new Set();
 const joy={x:0,y:0,id:null},input={x:0,z:0,attack:false};let attackPointer=null,castUntil=0,noticeUntil=0,lastHUD=0;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),touches=new Map();let pinchDistance=0,mouseStart=null;
 const mobViews=world.mobs.map(m=>{
  const h=m.type===0?1.3:1.45,tex=monsterTextures[m.type].clone(),s=sprite(tex,m.x,-m.z,h*1.1,h,.06),sh=shadow(m.x,-m.z,.36);
  s.userData.monsterId=m.id;
  const label=document.createElement('button');label.className='mob-label';label.type='button';label.setAttribute('aria-label','เลือกเป้า '+MONSTER_TYPES[m.type].name+' '+(m.id+1));
  const text=document.createElement('span');text.textContent=MONSTER_TYPES[m.type].name;label.append(text);
  const bar=document.createElement('i'),fill=document.createElement('b');bar.append(fill);label.append(bar);$('world-labels').append(label);
  label.addEventListener('click',()=>world.select(m.id));
  return {sprite:s,shadow:sh,height:h,label,fill};
 });
 hero.sprite.material.map=hero.sprite.material.map.clone();
 const ringGeometry=new THREE.RingGeometry(.47,.51,40);
 const targetRing=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#ffd476',side:THREE.DoubleSide,transparent:true,opacity:.85}));targetRing.rotation.x=-Math.PI/2;scene.add(targetRing);
 const playerRing=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#8de8d0',side:THREE.DoubleSide,transparent:true,opacity:.55}));playerRing.rotation.x=-Math.PI/2;playerRing.scale.setScalar(.78);scene.add(playerRing);
 const shield=new THREE.Mesh(new THREE.RingGeometry(.7,.74,40),new THREE.MeshBasicMaterial({color:'#edd592',side:THREE.DoubleSide,transparent:true,opacity:.55}));shield.rotation.x=-Math.PI/2;scene.add(shield);
 const playerLabel=document.createElement('span');playerLabel.className='hero-label';playerLabel.textContent='คุณ · '+className(world.profession.id,config.gender);$('world-labels').append(playerLabel);
 const motionPreference=matchMedia('(prefers-reduced-motion:reduce)');
 const effects=[],floats=[],fxRing=new THREE.RingGeometry(.75,.83,32),fxBall=new THREE.IcosahedronGeometry(.10,0),projection=new THREE.Vector3();
 const fxArrow=new THREE.ConeGeometry(.065,.65,4),fxArc=new THREE.RingGeometry(.4,.52,24,1,0,Math.PI*1.25);
 function toast(text){$('notice').textContent=text;$('notice').classList.add('visible');noticeUntil=performance.now()+2500;}
 function project(node,x,y,z){projection.set(x,y,z).project(camera);node.style.transform=`translate(-50%,-100%) translate(${(projection.x*.5+.5)*innerWidth}px,${(-projection.y*.5+.5)*innerHeight}px)`;node.style.visibility=Math.abs(projection.x)>1.12||Math.abs(projection.y)>1.12||projection.z>1?'hidden':'visible';}
 function popup(e,positive=false){const el=document.createElement('span');el.className='damage-number';el.textContent=(positive?'+':'−')+e.amount;el.style.color=e.color??(positive?'#abedaa':'#fff0ab');$('world-labels').append(el);floats.push({el,x:e.x,z:e.z,age:0});}
 function effect(e){
  if(e.type==='cast'){
   castUntil=world.time+.42;
   const bolt=['bolt','arrow','blessing'].includes(e.kind),mat=new THREE.MeshBasicMaterial({color:e.color,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}),mesh=new THREE.Mesh(e.kind==='arrow'?fxArrow:e.kind==='slash'?fxArc:bolt?fxBall:fxRing,mat);scene.add(mesh);
   if(!bolt)mesh.rotation.x=-Math.PI/2;
   effects.push({mesh,age:0,life:bolt?.25:.55,bolt,kind:e.kind,from:e.from,to:e.to,radius:e.radius??1});
  }else if(e.type==='damage'){popup(e);}
  else if(e.type==='heal'){popup(e,true);}
  else if(e.type==='playerHit'){popup({...e,color:'#ff987e'});hero.sprite.material.color.set('#ff9b83');}
  else if(e.type==='notice')toast(e.text);
  else if(e.type==='defeat')toast('ปราบ '+MONSTER_TYPES[world.mobs[e.id].type].name+' แล้ว');
 }
 const skillButtons=SKILLS.map((s,i)=>{
  const b=document.createElement('button');b.type='button';b.className='skill';b.setAttribute('aria-label',`สกิล ${s.key} ${s.name}`);b.title=`${s.key} · ${s.name} · MP ${s.cost} · ${s.cd} วินาที`;
  b.innerHTML=`<kbd>${s.key}</kbd><strong>${s.icon}</strong><span>${s.short}</span><em></em>`;b.style.setProperty('--skill-color',s.color);b.addEventListener('click',()=>{if(!isPaused())world.skill(i);});$('skills').append(b);return b;
 });
 $('auto-attack').addEventListener('click',()=>{if(!isPaused())world.toggleAuto();});
 $('attack').addEventListener('pointerdown',e=>{if(isPaused())return;e.preventDefault();attackPointer=e.pointerId;input.attack=true;$('attack').setPointerCapture(e.pointerId);world.basicAttack();});
 function releaseAttack(e){if(e.pointerId===attackPointer){input.attack=false;attackPointer=null;}}
 $('attack').addEventListener('pointerup',releaseAttack);$('attack').addEventListener('pointercancel',releaseAttack);$('attack').addEventListener('lostpointercapture',releaseAttack);
 // Keyboard activation of the accessible attack button also works.
 $('attack').addEventListener('click',e=>{if(e.detail===0&&!isPaused())world.basicAttack();});
 function editable(e){return e.target instanceof Element&&!!e.target.closest('input,textarea,select,[contenteditable=true]');}
 addEventListener('keydown',e=>{
  if(isPaused()||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;
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
  const direction=screenDirection(x,y,controls.getAzimuthalAngle());if(!paused)world.update(dt,{...direction,attack:input.attack||keys.has('Space')});
  world.events.splice(0).forEach(effect);
  const p=world.player,t=world.time,reduced=motionPreference.matches;
  hero.sprite.position.set(p.x,p.z>4.25?.41:.06,p.z);if(p.moving&&!reduced)hero.sprite.position.y+=Math.abs(Math.sin(t*12))*.055;
  const heroSize=hero.height??1.8;hero.sprite.scale.set(heroSize,heroSize*(1+(reduced?0:.012*Math.sin(t*2))),1);
  if(hero.frames)hero.sprite.material.map=hero.frames[poseFrame({time:t,moving:p.moving,casting:t<castUntil,reduced})];hero.sprite.material.rotation=p.moving?(reduced?0:Math.sin(t*12)*.025):0;
  if(t<castUntil){hero.sprite.material.rotation=-.10;hero.sprite.scale.y*=1.04;}
  const facing=p.face.x*Math.cos(controls.getAzimuthalAngle())-p.face.z*Math.sin(controls.getAzimuthalAngle());hero.sprite.material.map.repeat.x=facing<0?-1:1;hero.sprite.material.map.offset.x=facing<0?1:0;
  hero.sprite.material.color.lerp(new THREE.Color('#fff1da'),Math.min(1,dt*8));hero.sprite.visible=p.hp>0;hero.shadow.visible=p.hp>0;
  hero.shadow.position.set(p.x,p.z>4.25?.46:.072,p.z);playerRing.position.set(p.x,p.z>4.25?.47:.081,p.z);shield.position.set(p.x,.1,p.z);shield.visible=p.shield>0;
  // Camera follows the player while preserving user-controlled azimuth and zoom.
  const follow=new THREE.Vector3(p.x,1,p.z).sub(controls.target).multiplyScalar(1-Math.exp(-dt*4));camera.position.add(follow);controls.target.add(follow);
  controls.update();camera.updateMatrixWorld();
  project(playerLabel,p.x,2.0+hero.sprite.position.y,p.z);
  mobViews.forEach((v,i)=>{
   const m=world.mobs[i];v.sprite.visible=v.shadow.visible=m.hp>0;v.label.hidden=m.hp<=0;
   if(m.hp<=0)return;
   v.sprite.position.set(m.x,.06+Math.abs(Math.sin(t*2+m.id))*.025,m.z);v.shadow.position.set(m.x,.073,m.z);
   const lunge=m.attackCD>1.05?Math.sin((1.4-m.attackCD)/.35*Math.PI):0;
   v.sprite.scale.y=v.height*(1+(reduced?0:.035*Math.sin(t*3+i))-.10*lunge);v.sprite.scale.x=v.height*1.1*(1+.12*lunge);v.sprite.material.rotation=reduced?0:Math.sin(m.step*2)*.04+lunge*.12;
   if(m.hit>0&&!reduced)v.sprite.position.x+=Math.sin(t*70)*.045;v.sprite.material.color.set(m.hit>0?'#fffbd1':m.root>0?'#9ddacc':'#fff1da');v.fill.style.width=`${m.hp/m.maxHp*100}%`;v.label.classList.toggle('selected',world.targetId===m.id);
   if(m.aggro){const side=(p.x-m.x)*Math.cos(controls.getAzimuthalAngle())-(p.z-m.z)*Math.sin(controls.getAzimuthalAngle());v.sprite.material.map.repeat.x=side>0?-1:1;v.sprite.material.map.offset.x=side>0?1:0;}
   project(v.label,m.x,v.height+.08,m.z);
  });
  const target=world.target;targetRing.visible=!!target;if(target){targetRing.position.set(target.x,.088,target.z);targetRing.scale.setScalar(1+.07*Math.sin(t*5));}
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;const f=e.age/e.life;
   if(f>=1){scene.remove(e.mesh);e.mesh.material.dispose();effects.splice(i,1);continue;}
   if(e.bolt){e.mesh.position.set(THREE.MathUtils.lerp(e.from.x,e.to.x,f),.85+Math.sin(f*Math.PI)*.25,THREE.MathUtils.lerp(e.from.z,e.to.z,f));if(e.kind==='arrow'){const aim=new THREE.Vector3(e.to.x-e.from.x,0,e.to.z-e.from.z).normalize();e.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),aim);}}
   else if(['slash','punch','thrust'].includes(e.kind)){e.mesh.position.set(e.to.x,.8,e.to.z);e.mesh.rotation.x=0;e.mesh.quaternion.copy(camera.quaternion);e.mesh.scale.set(.25+f*.6,e.kind==='thrust'?.12:.25+f*.5,1);}
   else{e.mesh.position.set(e.to.x,.15,e.to.z);e.mesh.scale.setScalar(e.radius*(.35+f));}e.mesh.material.opacity=1-f;
  }
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.age+=dt;if(f.age>1){f.el.remove();floats.splice(i,1);}else{project(f.el,f.x,1.6+f.age*.8,f.z);f.el.style.opacity=String(1-f.age*.8);}}
  if(performance.now()>noticeUntil)$('notice').classList.remove('visible');
  if(t-lastHUD>.08){lastHUD=t;
   $('hp').style.width=`${p.hp/p.maxHp*100}%`;$('mp').style.width=`${p.mp/p.maxMp*100}%`;$('hp-text').textContent=`HP ${Math.ceil(p.hp)} / ${p.maxHp}`;$('mp-text').textContent=`MP ${Math.floor(p.mp)} / ${p.maxMp}`;$('kills').textContent=`ปราบมอน ${world.kills} ตัว`;
   $('auto-attack').classList.toggle('active',world.auto);$('auto-attack').setAttribute('aria-pressed',String(world.auto));$('auto-state').textContent=world.auto?'เปิด':'ปิด';
   $('target-name').textContent=target?MONSTER_TYPES[target.type].name:world.safe?'เขตสงบ · เมืองหลวง':'ยังไม่เลือกเป้าหมาย';$('target-hp').textContent=target?`${target.hp} / ${target.maxHp}`:world.safe?'พักฟื้น · พูดคุย · เดินทาง':'คลิก / แตะมอนสเตอร์';$('target-fill').style.width=target?`${target.hp/target.maxHp*100}%`:'0%';
   skillButtons.forEach((b,i)=>{const cd=world.cooldowns[i];b.querySelector('em').textContent=cd>.05?String(Math.ceil(cd)):'';b.classList.toggle('cooling',cd>.05);b.classList.toggle('no-mana',p.mp<SKILLS[i].cost);b.style.setProperty('--cooldown',`${cd/SKILLS[i].cd*100}%`);});
  }
 }
 function mobileLayout(){return innerWidth<=800||matchMedia('(pointer:coarse)').matches;}
 function updateHelp(){
  document.querySelector('.control-hint').textContent=mobileLayout()?'ลากจอยซ้ายเพื่อเดิน · แตะมอนเลือกเป้า · ลากด้านขวาหมุนกล้อง':'WASD เดิน · Space โจมตี · F ออโต้ · 1–9 / 0 สกิล · Q / E หมุนกล้อง';
  document.querySelector('.player-foot span:last-child').textContent=mobileLayout()?'จอยซ้าย · เดิน':'W A S D · เดิน';
 }
 updateHelp();addEventListener('resize',updateHelp);
 toast(mobileLayout()?'ลากจอยเดิน · แตะมอนและสกิลด้านขวา':'WASD เดิน · คลิกมอนเลือกเป้า · Space โจมตี · F ออโต้');
 return {update,world,clearInput};
}

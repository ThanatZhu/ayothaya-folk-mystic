// 0.61 a livelier world when playing alone: the hired mercenary (rules in combat-core / realm 'hire') and a few
// wandering adventurer NPCs on field maps. Both are drawn with the painted class art; NPCs are clearly labelled NPCs.
import * as THREE from 'three';
import {CHARACTER_WORLD_SCALE,WORLD_BODY_HEIGHT} from './character-size.js?v=size1';
import {createRiggedSprite} from './rigged-sprite.js?v=pose119';
import {characterMotion,attackDuration,gaitStep,walkView} from './character-motion.js?v=novice174';
import {walkable,groundHeight,moveBody,lineClear} from './combat-core.js?v=surfaces222';
import {fieldAdventurers,adventurerAt,adventurerContract,ADVENTURER_TIME} from './field-adventurers177.js?v=surfaces222';
const blank=()=>{const t=new THREE.Texture();t.image=document.createElement('canvas');return t;};

export function createLifeNPC({game,map,scene,camera,controls,bagUI,worldUI}){
 if(map.pvpArena)return {update(){}};
 const world=game.world,labels=document.getElementById('world-labels'),at=new THREE.Vector3();
 function actor(classId,gender,label,interactive=false){
  const sprite=createRiggedSprite(blank(),{classId,gender});sprite.scale.set(CHARACTER_WORLD_SCALE,CHARACTER_WORLD_SCALE,1);scene.add(sprite);
  const tag=document.createElement(interactive?'button':'span');if(interactive){tag.type='button';tag.style.pointerEvents='auto';}tag.className='npc-label life-label';tag.textContent=label;labels.append(tag);
  return {classId,sprite,tag,x:0,z:0,face:{x:1,z:0},gait:0,view:'side',flip:false,moving:false,running:false,rest:0,attackAt:-9,
   place(dt,t){
    const mode=t-this.attackAt<attackDuration(classId)?'attack':this.moving?(this.running&&sprite.userData.supportsAction('run')?'run':'walk'):this.rest>0&&sprite.userData.supportsAction('sit')?'sit':'idle';
    const p=characterMotion({classId,mode,time:t-this.attackAt<attackDuration(classId)?t-this.attackAt:t,phase:this.gait,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,view:this.view=walkView(this.face,controls.getAzimuthalAngle(),this.view)});
    const side=this.face.x*Math.cos(controls.getAzimuthalAngle())-this.face.z*Math.sin(controls.getAzimuthalAngle());if(Math.abs(side)>.3)this.flip=side<0;
    sprite.position.set(this.x,groundHeight(game.world.nav,this.x,this.z)+.06,this.z);sprite.userData.pose(p,this.flip);
    const e=camera.matrixWorld.elements,h=WORLD_BODY_HEIGHT+.14;
    at.set(this.x+e[4]*h,sprite.position.y+e[5]*h,this.z+e[6]*h).project(camera);tag.hidden=Math.abs(at.x)>1.05||Math.abs(at.y)>1.05||at.z>=1||!sprite.visible;
    tag.style.transform=`translate(-50%,-100%) translate(${(at.x*.5+.5)*innerWidth}px,${(-at.y*.5+.5)*innerHeight}px)`;
   },
   step(tx,tz,speed,dt){const dx=tx-this.x,dz=tz-this.z,d=Math.hypot(dx,dz);this.moving=d>.15;this.running=speed>4&&sprite.userData.supportsAction('run');if(!this.moving)return;const s=Math.min(d,speed*dt);moveBody(this,dx/d*s,dz/d*s,world.nav);this.face={x:dx/d,z:dz/d};this.gait+=gaitStep(s,dt,classId,this.running?'run':'walk');}};
 }

 // Contracts belong to this map session. The realm owns money, identity and damage.
 const contract=()=>game.online?world.mercenary:world.merc;
 const active=()=>game.online?(world.mercLeft??0)>0:!!world.merc;
 const remaining=()=>Math.ceil(game.online?world.mercLeft??0:world.merc?.left??0);
 const clock=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
 let merc=null,mercKey='',pending=null,hireButton=null;
 const wanderers=fieldAdventurers(map).map(def=>{
  const a=actor(def.classId,def.gender,'นักผจญภัย · '+def.name,true),pose=adventurerAt(def,Date.now()/1000);Object.assign(a,{x:pose.x,z:pose.z});
  const n={...def,x:a.x,z:a.z,adventurer:def.id,title:'นักผจญภัย · Lv.'+def.level,text:'ข้าช่วยต่อสู้กับมอนสเตอร์ที่เจ้าเลือกได้ ค่าจ้าง '+def.cost+' เบี้ย / 20 นาที · ช่วยเฉพาะแผนที่นี้ · ออกจากแมพหรือออกเกมสัญญาสิ้นสุด · จ้างได้ครั้งละ 1 คน'};
  a.n=n;a.def=def;a.tag.dataset.adventurer=def.id;a.tag.setAttribute('aria-label','คุยกับ '+def.name);worldUI.registerNPC(n,a.sprite,a.tag);return a;
 });
 function drawHire(){if(!hireButton?.isConnected)return;const n=wanderers.find(a=>a.n.adventurer===hireButton.dataset.adventurer)?.n;if(!n)return;
  hireButton.disabled=!!pending||active()||(bagUI.bag().coins<n.cost)||game.networkExpected&&(game.networkStatus!=='online'||world.adventurerSchema!==1);
  hireButton.textContent=pending?'กำลังจ้าง…':active()?'มีผู้ช่วยแล้ว · เหลือ '+clock(remaining()):(bagUI.bag().coins<n.cost?'เบี้ยไม่พอ · ':'จ้าง · ')+n.cost+' เบี้ย / 20 นาที';
 }
 bagUI.talkHooks.push(n=>{
  document.getElementById('npc-hire-adventurer')?.remove();hireButton=null;if(!n.adventurer)return;
  const b=hireButton=document.createElement('button');b.type='button';b.id='npc-hire-adventurer';b.dataset.adventurer=n.adventurer;document.getElementById('close-npc').before(b);drawHire();
  b.onclick=()=>{
   if(pending||active()||world.player.hp<=0)return;
   if(Math.hypot(n.x-world.player.x,n.z-world.player.z)>3.6||!lineClear(world.player.x,world.player.z,n.x,n.z,world.nav)){world.notice('เดินเข้าใกล้นักผจญภัยเพื่อจ้าง');return;}
   if(bagUI.bag().coins<n.cost){world.notice('เบี้ยไม่พอ');return;}
   if(game.online){if(game.networkStatus!=='online'||world.adventurerSchema!==1)return;pending=performance.now();if(!world.market?.('hire',{adventurer:n.adventurer}))pending=null;drawHire();return;}
   if(game.networkExpected)return;
   const bag=bagUI.bag();bagUI.setLocal({...bag,items:{...bag.items},coins:bag.coins-n.cost});world.hire(ADVENTURER_TIME,adventurerContract(n));world.notice('จ้างนักผจญภัยแล้ว · 20 นาที · ช่วยเฉพาะแผนที่นี้');worldUI.endTalk();
  };
 });
 game.onEvent(e=>{
  if(e.type==='merc'&&merc&&(!e.actor||e.actor===world.networkSelfId)){merc.attackAt=world.time-(e.lag??0);merc.face={x:e.x-merc.x,z:e.z-merc.z};}
  if(e.type==='hired'){pending=null;worldUI.endTalk();}
  if(e.type==='notice'&&pending&&['เดินเข้าใกล้นักผจญภัยเพื่อจ้าง','จ้างผู้ช่วยไม่ได้ในขณะนี้','มีทหารรับจ้างอยู่แล้ว','เบี้ยไม่พอ','อีกฝ่ายกำลังแลกของอยู่'].includes(e.text)){pending=null;drawHire();}
 });
 return {update(dt){
  if(pending&&(performance.now()-pending>10000||game.networkStatus!=='online')){pending=null;world.notice('ตรวจสอบผู้ช่วยและยอดเบี้ยก่อนลองจ้างอีกครั้ง');}
  drawHire();const t=world.time,p=world.player,c=contract(),key=c?.id??'legacy';
  if(merc&&(!active()||mercKey!==key)){scene.remove(merc.sprite);merc.sprite.userData.dispose?.();merc.tag.remove();merc=null;}
  if(active()&&!merc){merc=actor(c?.classId??'swordsman',c?.gender??'male','ผู้ช่วย');mercKey=key;merc.x=p.x;merc.z=p.z;}
  if(merc){
   merc.tag.textContent=(c?.name??'ทหารรับจ้าง')+' · '+clock(remaining());
   if(Math.hypot(p.x-merc.x,p.z-merc.z)>12){merc.x=p.x;merc.z=p.z;}
   const tx=p.x-p.face.x*1.3+.7,tz=p.z-p.face.z*1.3;
   Math.hypot(tx-merc.x,tz-merc.z)>1?merc.step(tx,tz,world.walkSpeed?.()??5,dt):(merc.moving=false);merc.place(dt,t);
  }
  for(const a of wanderers){
   const pose=game.online?world.adventurers?.find(n=>n.id===a.n.adventurer):adventurerAt(a.def,Date.now()/1000);
   a.n.unavailable=active()&&c?.id===a.n.adventurer||game.online&&!pose;a.sprite.visible=!a.n.unavailable;
   if(pose){if(Math.hypot(a.x-pose.x,a.z-pose.z)>4){a.x=pose.x;a.z=pose.z;}else a.step(pose.x,pose.z,2.8,dt);a.rest=pose.rest?1:0;a.moving=!!pose.moving;}
   a.n.x=a.x;a.n.z=a.z;a.place(dt,t);
  }
 }};
}

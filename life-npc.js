// 0.61 a livelier world when playing alone: the hired mercenary (rules in combat-core / realm 'hire') and a few
// wandering adventurer NPCs on field maps. Both are drawn with the painted class art; NPCs are clearly labelled NPCs.
import * as THREE from 'three';
import {createRiggedSprite} from './rigged-sprite.js?v=41.2';
import {characterMotion,attackDuration,gaitStep,walkView} from './character-motion.js?v=37';
import {walkable,groundHeight} from './combat-core.js?v=94';
const MERC_COST=200,MERC_TIME=1200;
const NAMES=['นายแก่น','แม่จันทร์','ทิดคำ','อ้ายพรม','นางแก้ว','ขุนทอง','อีแป้น','ตาผล'];
const CLASSES=['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
const blank=()=>{const t=new THREE.Texture();t.image=document.createElement('canvas');return t;};

export function createLifeNPC({game,map,scene,camera,controls,bagUI}){
 const world=game.world,labels=document.getElementById('world-labels'),at=new THREE.Vector3();
 function actor(classId,gender,label){
  const sprite=createRiggedSprite(blank(),{classId,gender});sprite.scale.set(2.1,2.1,1);scene.add(sprite);
  const tag=document.createElement('span');tag.className='npc-label life-label';tag.textContent=label;labels.append(tag);
  return {classId,sprite,tag,x:0,z:0,face:{x:1,z:0},gait:0,view:'side',flip:false,moving:false,attackAt:-9,
   place(dt,t){
    const p=characterMotion({classId,mode:t-this.attackAt<attackDuration(classId)?'attack':this.moving?'walk':'idle',time:t-this.attackAt<attackDuration(classId)?t-this.attackAt:t,phase:this.gait,view:this.view=walkView(this.face,controls.getAzimuthalAngle(),this.view)});
    const side=this.face.x*Math.cos(controls.getAzimuthalAngle())-this.face.z*Math.sin(controls.getAzimuthalAngle());if(Math.abs(side)>.3)this.flip=side<0;
    sprite.position.set(this.x,groundHeight(game.world.nav,this.x,this.z)+.06,this.z);sprite.userData.pose(p,this.flip);
    at.set(this.x,2.25,this.z).project(camera);tag.hidden=Math.abs(at.x)>1.05||Math.abs(at.y)>1.05||at.z>=1||!sprite.visible;
    tag.style.transform=`translate(-50%,-100%) translate(${(at.x*.5+.5)*innerWidth}px,${(-at.y*.5+.5)*innerHeight}px)`;
   },
   step(tx,tz,speed,dt){const dx=tx-this.x,dz=tz-this.z,d=Math.hypot(dx,dz);this.moving=d>.15;if(!this.moving)return;const s=Math.min(d,speed*dt);this.x+=dx/d*s;this.z+=dz/d*s;this.face={x:dx/d,z:dz/d};this.gait+=gaitStep(s,dt,classId);}};
 }
 // ---- mercenary
 let merc=null;const mercActive=()=>game.online?(world.mercLeft??0)>0:!!world.merc;
 game.onEvent(e=>{if(e.type==='merc'&&merc){merc.attackAt=world.time;merc.face={x:e.x-merc.x,z:e.z-merc.z};}});
 bagUI.talkHooks.push(n=>{
  document.getElementById('npc-hire')?.remove();if(n.name!=='ครูแสนดาบ')return;
  const b=document.createElement('button');b.id='npc-hire';b.type='button';b.textContent=`⚔ จ้างทหารรับจ้าง · ${MERC_COST} เบี้ย / 20 นาที`;
  b.onclick=()=>{
   if(mercActive())return world.notice('มีทหารรับจ้างอยู่แล้ว');
   if(game.online)world.market?.('hire',{});
   else{const bag=bagUI.bag();if(bag.coins<MERC_COST)return world.notice('เบี้ยไม่พอ');bagUI.setLocal({...bag,coins:bag.coins-MERC_COST});world.hire(MERC_TIME);world.notice('จ้างทหารรับจ้างแล้ว · 20 นาที');}
   document.getElementById('close-npc').click();
  };
  document.getElementById('close-npc').before(b);
 });
 // ---- wandering adventurers on field maps (not towns, not party instances)
 const wanderers=[];
 if(!map.safe&&!map.instance){
  const rand=(()=>{let s=[...map.id].reduce((h,c)=>h*31+c.charCodeAt(0)>>>0,9);return()=>(s=(s*1664525+1013904223)>>>0)/4294967296;})();
  const spot=()=>{for(let i=0;i<40;i++){const x=map.spawn.x+(rand()-.5)*50,z=map.spawn.z-rand()*45;if(walkable(x,z,.4,map.nav))return {x,z};}return {...map.spawn};};
  for(let i=0;i<3;i++){const a=actor(CLASSES[Math.floor(rand()*7)],rand()<.5?'male':'female','นักผจญภัย · '+NAMES[Math.floor(rand()*NAMES.length)]);Object.assign(a,spot());a.goal=spot();a.rest=rand()*4;wanderers.push(a);}
 }
 return {update(dt){
  const t=world.time,p=world.player;
  if(mercActive()&&!merc)merc=actor('swordsman','male','ทหารรับจ้าง');
  if(!mercActive()&&merc){scene.remove(merc.sprite);merc.sprite.userData.dispose?.();merc.tag.remove();merc=null;}
  if(merc){if(Math.hypot(p.x-merc.x,p.z-merc.z)>12){merc.x=p.x-1;merc.z=p.z+.6;}
   const tx=p.x-p.face.x*1.3+.7,tz=p.z-p.face.z*1.3;Math.hypot(tx-merc.x,tz-merc.z)>1?merc.step(tx,tz,game.world.walkSpeed?.()??5,dt):(merc.moving=false);merc.place(dt,t);}
  for(const a of wanderers){if(a.rest>0){a.rest-=dt;a.moving=false;}else{a.step(a.goal.x,a.goal.z,2.6,dt);if(!a.moving){a.rest=3+Math.random()*6;a.goal=Object.assign({},a.goal,{x:a.goal.x+(Math.random()-.5)*16,z:a.goal.z+(Math.random()-.5)*16});if(!walkable(a.goal.x,a.goal.z,.4,map.nav))a.goal={x:a.x,z:a.z};}}a.place(dt,t);}
 }};
}

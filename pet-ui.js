// Pets (0.50): pet window, bag actions (lure / hatch / feed), the pet that trots after its owner.
// Online the realm server owns the pet; offline it lives in localStorage beside the bag. Remote pets: multiplayer-ui.js.
import * as THREE from 'three';
import {ITEM_ERRORS,itemDef} from './items.js?v=64';
import {PETS,FOOD,LOYAL,INTIMACY_MAX,mood,normalizePet,tame,hatch,feedPet,returnPet,petTick,petBonus} from './pets.js?v=01';
import {MONSTER_TYPES,groundHeight} from './combat-core.js?v=68';
import {loadMonsterFrames} from './monster-art.js?v=38';
import {iconStyle} from './bag-ui.js?v=64';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
const typeOf=id=>MONSTER_TYPES.findIndex(t=>t.id===id);
// Shared by the owner's pet and remote pets: a small copy of the monster sprite that follows a point.
let frames=null;
const petFrames=()=>frames??=loadMonsterFrames({mobs:Object.keys(PETS).map(id=>[0,0,typeOf(id)])});
export function createPetView(scene,id){
 const t=typeOf(id),h=(MONSTER_TYPES[t].height??1.2)*.72,mat=new THREE.SpriteMaterial({alphaTest:.45,transparent:false,depthWrite:true,color:'#fff1da'}),s=new THREE.Sprite(mat);
 s.center.set(.5,0);s.scale.set(h*1.1,h,1);s.visible=false;scene.add(s);let art=null,gait=0;
 petFrames().then(f=>{art=f[t];if(art){mat.map=art[0];mat.needsUpdate=true;s.visible=true;}});
 return {id,sprite:s,
  follow(owner,dt){ // stay ~1.1 behind the owner, hop between the two walk frames while moving
   const dx=owner.x-s.position.x,dz=owner.z-s.position.z,d=Math.hypot(dx,dz);
   if(d>12)s.position.set(owner.x-.8,.06,owner.z+.6);
   const moving=d>1.1;if(moving){const step=Math.min(d-1.1,(2.6+d)*dt);s.position.x+=dx/d*step;s.position.z+=dz/d*step;gait+=dt*8;}
   if(art){const frame=moving?1+(Math.floor(gait)%2):0;if(mat.map!==art[frame]){mat.map=art[frame];mat.needsUpdate=true;}}
   if(owner.y!==undefined)s.position.y=owner.y+.06;
   if(Math.abs(dx)>.05)s.scale.x=Math.abs(s.scale.x)*(dx<0?-1:1);
  },
  dispose(){scene.remove(s);mat.dispose();}};
}

export function createPetUI({game,account,scene,bagUI}){
 if(!document.querySelector('link[data-pet-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='pet-ui.css?v=01';css.dataset.petUi='';document.head.append(css);}
 const world=game.world,key='ayothaya-pet:'+(account?.serverId??'local')+':'+(account?.slotId??'guest'),fail=c=>world.notice(ITEM_ERRORS[c]??c);
 let local=null;try{local=normalizePet(JSON.parse(localStorage.getItem(key)));}catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(local));}catch{}};
 const pet=()=>game.online?normalizePet(world.pet):local;
 let view=null,saveAt=0,shown='';

 // Offline: same rules applied here; online: a server command.
 function act(type,item){
  if(game.online)return world.market?.(type,type==='tame'?{target:world.targetId}:type==='hatch'?{item}:{});
  try{
   if(type==='tame'){const mob=world.target;if(!mob)throw new Error('not-tameable');const r=tame(bagUI.bag(),MONSTER_TYPES[mob.type].id,mob);bagUI.setLocal(r.bag);
    if(r.ok){mob.hp=0;mob.dead=MONSTER_TYPES[mob.type].respawn??12;mob.aggro=false;world.targetId=null;}world.emit('tamed',{ok:r.ok,egg:PETS[MONSTER_TYPES[mob.type].id].egg});}
   else{const r=type==='hatch'?hatch(bagUI.bag(),local,item):type==='petFeed'?feedPet(bagUI.bag(),local):returnPet(bagUI.bag(),local);bagUI.setLocal(r.bag);local=r.pet;save();}
  }catch(e){fail(e.message);}
  render(true);
 }
 bagUI.onPet=act;
 game.onEvent(e=>{if(e.type==='tamed')world.notice(e.ok?'จับได้แล้ว! ได้ '+itemDef(e.egg).name+' · กดฟักไข่ในกระเป๋า':'ล่อไม่สำเร็จ · ลองตีให้เลือดน้อยลงก่อน');});

 const menu=document.createElement('button');menu.id='menu-pet';menu.type='button';menu.title='สัตว์เลี้ยง';menu.setAttribute('aria-label','สัตว์เลี้ยง');
 menu.innerHTML='<i>'+icon('pet-bell','item-icon menu-item-icon')+'</i><span>สัตว์เลี้ยง</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menu,$('menu-players')??null);
 const dialog=document.createElement('dialog');dialog.id='pet-window';dialog.setAttribute('aria-labelledby','pet-title');
 dialog.innerHTML='<header><h2 id="pet-title">สัตว์เลี้ยง</h2><button class="mp-icon" id="pet-close" aria-label="ปิด">×</button></header><div id="pet-body"></div>';
 ($('game-shell')??document.body).append(dialog);
 menu.onclick=()=>{if(dialog.open)dialog.close();else{game.clearInput();openHudPanel(dialog);render(true);}};
 dialog.querySelector('#pet-close').onclick=()=>dialog.close();
 function render(force=false){
  if(!dialog.open)return;const p=pet(),food=bagUI.bag().items[FOOD]??0,sig=JSON.stringify([p&&[p.id,Math.round(p.intimacy),Math.round(p.hunger)],food]);if(!force&&sig===shown)return;shown=sig;
  const body=$('pet-body');
  if(!p){body.innerHTML=`<p class="pet-note">${icon('pet-egg','item-icon small')}ยังไม่มีสัตว์เลี้ยง</p><ol class="pet-how"><li>ซื้อ <b>ข้าวเหนียวล่อสัตว์</b> ที่ร้านแม่บัว</li><li>เลือก ${Object.values(PETS).map(v=>v.name).join(' / ')} เป็นเป้า ตีให้เลือดน้อย แล้วกด <b>ล่อสัตว์</b> ในกระเป๋า</li><li>ได้ไข่แล้วกด <b>ฟักไข่</b></li></ol>`;return;}
  const def=PETS[p.id],loyal=p.intimacy>=LOYAL;
  body.innerHTML=`<div class="pet-head">${icon(def.egg,'item-icon big')}<div><strong>${def.name}</strong><small>${mood(p)} · โบนัสเมื่อสนิทมาก: ${def.text}${loyal?' ✔ ทำงานอยู่':''}</small></div></div>`+
   `<label class="pet-bar">ความสนิท<span><i style="width:${p.intimacy/INTIMACY_MAX*100}%"></i></span><b>${Math.round(p.intimacy)}</b></label>`+
   `<label class="pet-bar hunger">ความอิ่ม<span><i style="width:${p.hunger}%"></i></span><b>${Math.round(p.hunger)}</b></label>`+
   `<p class="pet-note">ให้อาหารตอนหิว (ต่ำกว่า 75) ความสนิทจะขึ้น · ให้ตอนอิ่มเกินจะลด · ปล่อยให้หิวจนหมดจะห่างเหิน · คืนเป็นไข่แล้วความสนิทเริ่มใหม่</p>`+
   `<div class="pet-actions"><button type="button" id="pet-feed" ${food?'':'disabled'}>${icon(FOOD,'item-icon small')}ให้อาหาร (${food})</button><button type="button" id="pet-return">คืนเป็นไข่</button></div>`;
  body.querySelector('#pet-feed').onclick=()=>act('petFeed');
  body.querySelector('#pet-return').onclick=()=>{if(confirm('คืน '+def.name+' เป็นไข่? ความสนิทจะเริ่มใหม่'))act('petReturn');};
 }
 return {update(dt){
  const p=pet();
  if(!game.online&&local){petTick(local,dt);if(performance.now()>saveAt){saveAt=performance.now()+15000;save();}}
  world.petBonus=petBonus(p);
  if(view&&view.id!==p?.id){view.dispose();view=null;}
  if(p&&!view)view=createPetView(scene,p.id);
  view?.follow({x:world.player.x,z:world.player.z,y:groundHeight(world.nav,world.player.x,world.player.z)},dt);
  render();
 }};
}

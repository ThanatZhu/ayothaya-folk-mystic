import * as THREE from 'three';
import {GROUND_LOOT,GROUND_PICKUP_ERRORS,makeGroundDrop,groundDropView,groundEligible,stepGroundPet,groundPetView} from './ground-loot.js?v=surfaces222';
import {activePremiumPet} from './pet-account.js';
import {groundHeight,walkLineClear} from './combat-core.js?v=surfaces222';
import {itemLabel} from './items.js';
import {iconStyle} from './bag-ui.js?v=surfaces222';
export function createGroundLootUI({game,camera,map,bagUI}){
 const world=game.world,layer=document.createElement('div'),views=new Map(),local=new Map(),point=new THREE.Vector3();let serial=0,wasOnline=false;
 layer.className='ground-loot-layer';layer.setAttribute('aria-label','ไอเท็มบนพื้น');document.getElementById('game-shell').append(layer);
 const css=document.createElement('link');css.rel='stylesheet';css.href='ground-loot.css?v=loot219';document.head.append(css);
 const find=id=>(world.groundDrops??[]).find(d=>d.id===id);
 const distance=d=>Math.hypot(world.player.x-d.x,world.player.z-d.z);
 function pickup(id){
  if(!game.canUseActions||world.observer||world.player.hp<=0)return;
  const drop=find(id);if(!drop)return;
  if(!drop.canPick){world.notice(GROUND_PICKUP_ERRORS.reserved);return;}
  if(distance(drop)>GROUND_LOOT.manualReach||!walkLineClear(world.player,drop,world.nav)){
   game.walkTo(()=>find(id),{radius:GROUND_LOOT.manualReach-.25,onArrive:()=>pickup(id),onFail:()=>world.notice(GROUND_PICKUP_ERRORS.far)});return;
  }
  if(game.online){world.pickupLoot?.(id);return;}
  collectLocal(id);
 }
 function collectLocal(id){
  const drop=local.get(id);if(!drop||!groundEligible(drop,'guest',world.time))return;
  // Guests have no online mailbox: keep any remainder on the ground instead of destroying it.
  const rest=bagUI.collectGroundLoot(drop.loot,drop);
  if(rest.items.length||rest.coins){drop.loot=rest;drop.retryAt=world.time+2;}else local.delete(id);
 }
 world.spawnGroundLoot=(loot,at)=>{
  if(game.online||game.networkExpected)return;
  const drop=makeGroundDrop({id:'guest-'+(++serial),loot,at,owner:{key:'guest',id:'guest',character:{name:''},world},priorityKeys:[],time:world.time,nav:world.nav});
  if(drop){while(local.size>=GROUND_LOOT.maxDrops)local.delete(local.keys().next().value);local.set(drop.id,drop);}
 };
 world.pickupNearestGround=()=>{
  if(!game.canUseActions||world.observer||world.player.hp<=0)return false;
  const drop=(world.groundDrops??[]).filter(d=>d.canPick&&d.expiresAt>world.time).sort((a,b)=>distance(a)-distance(b))[0];
  if(!drop)return false;pickup(drop.id);return true;
 };
 function update(dt){
  if(!game.online&&!game.networkExpected){
   for(const drop of local.values())if(world.time>=drop.expiresAt)local.delete(drop.id);
   const result=stepGroundPet({state:world.localGroundPet,petId:activePremiumPet(world.petCollection)?.id,player:world.player,nav:world.nav,drops:local,key:'guest',time:world.time,dt,enabled:world.player.hp>0});
   world.localGroundPet=result.state;if(result.pickup)collectLocal(result.pickup);
   world.groundPet=groundPetView(result.state);world.groundDrops=[...local.values()].map(d=>groundDropView(d,'guest',world.time));
  }else if(!game.online){world.groundDrops=[];world.groundPet=null;}
  if(game.online&&!wasOnline)local.clear();wasOnline=game.online;
  const seen=new Set();
  for(const drop of world.groundDrops??[]){
   if(drop.expiresAt<=world.time)continue;seen.add(drop.id);
   let v=views.get(drop.id);
   if(!v){
    const button=document.createElement('button');button.type='button';button.className='ground-loot-item';button.dataset.dropId=drop.id;
    button.addEventListener('pointerdown',e=>e.stopPropagation());button.onclick=e=>{e.stopPropagation();pickup(drop.id);};
    const art=document.createElement('span'),hint=document.createElement('span');art.className='ground-loot-art';hint.className='ground-loot-hint';button.append(art,hint);layer.append(button);v={button,art,hint};views.set(drop.id,v);
   }
   const sig=JSON.stringify([drop.items,drop.coins]);if(v.sig!==sig){
    v.sig=sig;v.art.replaceChildren();
    const items=drop.items.slice(0,3);if(!items.length&&drop.coins)items.push({id:'coin',count:drop.coins});
    items.forEach((item,i)=>{const icon=document.createElement('i');icon.className='ground-loot-icon';icon.style.cssText=iconStyle(item.id==='coin'?'cowrie-pile':item.id);icon.style.setProperty('--i',i);v.art.append(icon);});
    v.title=[itemLabel(drop.items),drop.coins?drop.coins+' เบี้ย':''].filter(Boolean).join(' · ');
   }
   v.button.title=v.title;v.button.setAttribute('aria-label','เก็บของ · '+v.title);v.button.dataset.reserved=String(!drop.canPick);v.button.disabled=world.observer||world.player.hp<=0;
   v.hint.textContent=drop.canPick?'แตะ / F · เก็บของ':'สิทธิ์ของ '+drop.ownerName;
   point.set(drop.x,groundHeight(world.nav,drop.x,drop.z)+.2,drop.z).project(camera);
   const visible=point.z>-1&&point.z<1&&Math.abs(point.x)<1.04&&Math.abs(point.y)<1.04;
   v.button.hidden=!visible;if(visible)v.button.style.transform='translate(-50%,-85%) translate('+((point.x*.5+.5)*innerWidth)+'px,'+((-point.y*.5+.5)*innerHeight)+'px)';
  }
  for(const [id,v] of views)if(!seen.has(id)){v.button.remove();views.delete(id);}
 }
 return {update,pickup,dispose(){delete world.pickupNearestGround;layer.remove();css.remove();delete world.spawnGroundLoot;}};
}

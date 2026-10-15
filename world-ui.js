import {openHudPanel} from './hud-panels.js?v=34';
import {drawMap} from './city-map.js?v=38';
import * as THREE from 'three';
import {destinations,restoreTraveler,serializeTraveler} from './world-state.js?v=21';

export function createWorldUI({catalog,map,game,scene,camera,controls,account,onLocalTravel=()=>{}}){
 const $=id=>document.getElementById(id),world=game.world,dialog=$('world-map'),labels=$('world-labels');
 const reachable=destinations(catalog,map),lookup=id=>catalog.maps.find(m=>m.id===id),point=new THREE.Vector3();
 let traveling=false,nearest=null,nearNPC=null,conversation=null,lastMini=0;
 if(!account)try{restoreTraveler(world,JSON.parse(sessionStorage.getItem('ayothaya-traveler-v5')));}catch{}
 document.title=map.name+' · อโยธยา Folk Mystic';$('status').textContent=map.name+(map.safe?' · เขตปลอดภัย':' · นอกเมือง');
 const mapHeading=document.querySelector('.field-map-title');if(mapHeading)mapHeading.textContent=map.name+' · CH '+(account?.serverId?.slice(-1)||'1');
 document.querySelector('.player-heading small').textContent=map.safe?'เขตสงบ · พักฟื้นในเมืองหลวง':map.subtitle.split(' · ')[0];
 if(map.safe){$('target-name').textContent='เขตปลอดภัย';$('target-hp').textContent='พักฟื้น · พูดคุย · เดินทาง';}
 $('district-name').textContent=map.name;$('district-description').textContent=map.subtitle;
 $('world-title').textContent=map.name;$('mini-title').textContent=map.name;document.body.dataset.map=map.id;document.body.dataset.safe=String(map.safe);
 async function travel(id){
  if(traveling||!reachable.has(id)||world.player.hp<=0)return;
  traveling=true;game.clearInput();
  $('travel-loading').hidden=false;$('travel-loading').textContent='กำลังเซฟและเดินทางไป '+lookup(id).name+'…';
  if(account){
   if(!await account.travel(lookup(id))){traveling=false;$('travel-loading').hidden=true;world.notice('เซฟยังไม่สำเร็จ กรุณาลองเดินทางอีกครั้ง');return;}
  }else try{sessionStorage.setItem('ayothaya-traveler-v5',JSON.stringify(serializeTraveler(world)));}catch{}
  $('travel-loading').hidden=false;$('travel-loading').textContent='กำลังเดินทางไป '+lookup(id).name+'…';
  location.assign('?server='+account.serverId+'&map='+encodeURIComponent(id));
 }
 function openMap(){if(account?.paused)return;game.clearInput();conversation=null;$('npc-dialog').hidden=true;openHudPanel(dialog);drawCityMap();}
 $('open-world').onclick=openMap;$('close-world').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{game.clearInput();$('mini-open').focus();});
 const views=map.portals.map(p=>{
  const name=lookup(p.to).name;
  const ring=new THREE.Mesh(new THREE.RingGeometry(.72,.84,40),new THREE.MeshBasicMaterial({color:'#edcf83',side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.095,p.z);scene.add(ring);
  const label=document.createElement('button');label.className='portal-label';label.textContent='↗ '+name;label.setAttribute('aria-label','จุดเดินทางไป '+name);labels.append(label);
  label.onclick=()=>{if(Math.hypot(world.player.x-p.x,world.player.z-p.z)<2)travel(p.to);else world.notice('เดินเข้าใกล้วงเดินทาง หรือกดแผนที่โลก');};
  return {p,ring,label};
 });
 const npcViews=map.npcs.map(n=>{
  const label=document.createElement('button');label.className='npc-label';label.textContent=n.name;label.setAttribute('aria-label','คุยกับ '+n.name);labels.append(label);
  label.onclick=()=>talk(n);return {n,label};
 });
 function talk(n){
  if(Math.hypot(world.player.x-n.x,world.player.z-n.z)>3){world.notice('เดินเข้าใกล้ '+n.name+' เพื่อคุย');return;}
  game.clearInput();conversation=n;$('npc-name').textContent=n.name;$('npc-text').textContent=n.text;$('npc-dialog').hidden=false;$('close-npc').focus();
 }
 $('close-npc').onclick=()=>{conversation=null;$('npc-dialog').hidden=true;game.clearInput();};
 $('interact').onclick=()=>{if(nearest)travel(nearest.to);else if(nearNPC)talk(nearNPC);};
 addEventListener('keydown',e=>{
  if($('settings-panel')?.open||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('input,textarea,select'))return;
  if(e.code==='KeyM'){e.preventDefault();dialog.open?dialog.close():openMap();}
  if(e.code==='Escape'&&conversation){conversation=null;$('npc-dialog').hidden=true;game.clearInput();}
  if(e.code==='KeyR'&&!dialog.open&&!conversation){e.preventDefault();$('interact').click();}
 });
 const mini=$('mini-map');
 const drawCityMap=()=>drawMap($('city-map'),map,world.player,{detailed:true});
 let mapZoom=1;const viewport=$('city-map-viewport');
 function zoomMap(step){const old=mapZoom;mapZoom=Math.max(1,Math.min(3,mapZoom+step));const x=(viewport.scrollLeft+viewport.clientWidth/2)*mapZoom/old-viewport.clientWidth/2,y=(viewport.scrollTop+viewport.clientHeight/2)*mapZoom/old-viewport.clientHeight/2;viewport.style.setProperty('--map-zoom',mapZoom);viewport.scrollTo(x,y);$('map-minus').disabled=mapZoom===1;$('map-plus').disabled=mapZoom===3;}
 $('map-plus').onclick=()=>zoomMap(.5);$('map-minus').onclick=()=>zoomMap(-.5);
 function minimap(){drawMap(mini,map,world.player);}
 function position(label,x,z,y){point.set(x,y,z).project(camera);label.style.transform=`translate(-50%,-100%) translate(${(point.x*.5+.5)*innerWidth}px,${(-point.y*.5+.5)*innerHeight}px)`;label.style.visibility=Math.abs(point.x)>1.1||Math.abs(point.y)>1.1?'hidden':'visible';}
 function update(t){
  const p=world.player;nearest=null;nearNPC=null;let best=2;
  const area=(map.districts??[]).find(d=>Math.hypot(p.x-d.x,p.z-d.z)<14);$('district-description').textContent=area?area.name+' · '+(map.safe?'เขตปลอดภัย':'นอกเมือง'):map.subtitle;
  $('mini-area').textContent=(area?.name??'ระหว่างทาง')+' · '+(map.safe?'ปลอดภัย':'นอกเมือง');
  for(const v of views){const d=Math.hypot(p.x-v.p.x,p.z-v.p.z);if(d<best){best=d;nearest=v.p;}v.ring.material.opacity=.52+Math.sin(t*2)*.2;position(v.label,v.p.x,v.p.z,.36);v.label.classList.toggle('near',d<2);}
  for(const v of npcViews){position(v.label,v.n.x,v.n.z,1.85);if(Math.hypot(p.x-v.n.x,p.z-v.n.z)>28)v.label.style.visibility='hidden';if(Math.hypot(p.x-v.n.x,p.z-v.n.z)<2.3)nearNPC=v.n;}
  const canInteract=!!(nearest||nearNPC)&&p.hp>0&&!conversation&&!dialog.open;
  $('interact').hidden=!canInteract;
  if(canInteract)$('interact').textContent=nearest?'เดินทางไป '+lookup(nearest.to).name:'คุยกับ '+nearNPC.name;
  $('position-readout').textContent=`ตำแหน่ง ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`;
  const now=performance.now();if(now-lastMini>100){lastMini=now;minimap();}
 }
 minimap();return {update,get paused(){return !!conversation||traveling;}};
}

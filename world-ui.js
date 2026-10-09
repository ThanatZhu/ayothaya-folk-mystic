import * as THREE from 'three';
import {destinations,restoreTraveler,serializeTraveler} from './world-state.js';

export function createWorldUI({catalog,map,game,scene,camera,account}){
 const $=id=>document.getElementById(id),world=game.world,dialog=$('world-map'),labels=$('world-labels');
 const reachable=destinations(catalog,map),lookup=id=>catalog.maps.find(m=>m.id===id),point=new THREE.Vector3();
 let traveling=false,nearest=null,nearNPC=null,conversation=null,lastMini=0;
 if(!account)try{restoreTraveler(world,JSON.parse(sessionStorage.getItem('ayothaya-traveler-v5')));}catch{}
 document.title=map.name+' · อโยธยา Folk Mystic';$('status').textContent=map.name+(map.safe?' · เมืองหลวง':'');
 document.querySelector('.player-heading small').textContent=map.safe?'เขตสงบ · พักฟื้นในเมืองหลวง':map.subtitle.split(' · ')[0];
 if(map.safe){$('target-name').textContent='เขตสงบ · เมืองหลวง';$('target-hp').textContent='พักฟื้น · พูดคุย · เดินทาง';}
 $('district-name').textContent=map.name;$('district-description').textContent=map.subtitle;
 $('mini-title').textContent=map.name;document.body.dataset.map=map.id;
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
 function openMap(){if(account?.paused)return;game.clearInput();conversation=null;$('npc-dialog').hidden=true;dialog.showModal();}
 $('open-world').onclick=openMap;$('close-world').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{game.clearInput();$('open-world').focus();});
 $('world-grid').replaceChildren();
 for(const destination of catalog.maps){
  const card=document.createElement('button');card.className='world-card';card.type='button';card.style.setProperty('--city',destination.color);
  const selected=destination.id===map.id;card.disabled=selected||!reachable.has(destination.id);
  card.setAttribute('aria-label',(selected?'อยู่ที่ ':reachable.has(destination.id)?'เดินทางไป ':'ผ่านอยุธยาไป ')+destination.name);
  const illustration=document.createElement('div');illustration.className='city-picture';
  // A miniature of the actual footprint layout, not a fixed screenshot of a different map.
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-19 -23 38 34');
  function rect(x,z,w,d,color){const n=document.createElementNS(svg.namespaceURI,'rect');for(const [k,v] of Object.entries({x,y:z,width:w,height:d,fill:color}))n.setAttribute(k,String(v));svg.append(n);}
  rect(-18,-22,36,27.4,'#c3ad7c');rect(-18,5.4,36,4,'#416c62');
  for(const b of destination.nav.obstacles)rect(b.x,b.z,b.w,b.d,destination.id==='lavo'?'#9b563c':'#76523c');
  for(const p of destination.portals)rect(p.x-.65,p.z-.65,1.3,1.3,'#ffe0a0');
  illustration.append(svg);card.append(illustration);
  const heading=document.createElement('strong');heading.textContent=destination.name+(destination.safe?' · เมืองหลวง':'');
  const description=document.createElement('span');description.textContent=destination.subtitle.split(' · ')[1];
  const action=document.createElement('small');action.textContent=selected?'คุณอยู่ที่นี่':reachable.has(destination.id)?'เดินทาง →':'เชื่อมผ่านอยุธยา';
  card.append(heading,description,action);card.onclick=()=>travel(destination.id);$('world-grid').append(card);
 }
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
  if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('input,textarea,select'))return;
  if(e.code==='KeyM'){e.preventDefault();dialog.open?dialog.close():openMap();}
  if(e.code==='Escape'&&conversation){conversation=null;$('npc-dialog').hidden=true;game.clearInput();}
  if(e.code==='KeyR'&&!dialog.open&&!conversation){e.preventDefault();$('interact').click();}
 });
 const mini=$('mini-map'),ctx=mini.getContext('2d');
 const mx=x=>(x+19)/38*190,mz=z=>(z+23)/34*170;
 function minimap(){
  ctx.fillStyle='#20392f';ctx.fillRect(0,0,190,170);ctx.fillStyle='#b7a074';ctx.fillRect(mx(-18),mz(-22),180,27.4/34*170);
  ctx.fillStyle='#47766c';ctx.fillRect(mx(-18),mz(5.4),180,4/34*170);
  ctx.fillStyle='#634b36';map.nav.obstacles.forEach(b=>ctx.fillRect(mx(b.x),mz(b.z),b.w/38*190,b.d/34*170));
  ctx.fillStyle='#91af72';map.plants.filter(p=>p[0]==='tree').forEach(p=>{ctx.beginPath();ctx.arc(mx(p[1]),mz(p[2]),3,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#eaca78';map.portals.forEach(p=>ctx.fillRect(mx(p.x)-2,mz(p.z)-2,4,4));
  ctx.fillStyle='#c77a5b';world.mobs.filter(m=>m.hp>0).forEach(m=>ctx.fillRect(mx(m.x)-1.5,mz(m.z)-1.5,3,3));
  ctx.fillStyle='#b9ffdf';ctx.beginPath();ctx.arc(mx(world.player.x),mz(world.player.z),3.5,0,Math.PI*2);ctx.fill();
 }
 function position(label,x,z,y){point.set(x,y,z).project(camera);label.style.transform=`translate(-50%,-100%) translate(${(point.x*.5+.5)*innerWidth}px,${(-point.y*.5+.5)*innerHeight}px)`;label.style.visibility=Math.abs(point.x)>1.1||Math.abs(point.y)>1.1?'hidden':'visible';}
 function update(t){
  const p=world.player;nearest=null;nearNPC=null;let best=2;
  for(const v of views){const d=Math.hypot(p.x-v.p.x,p.z-v.p.z);if(d<best){best=d;nearest=v.p;}v.ring.material.opacity=.52+Math.sin(t*2)*.2;position(v.label,v.p.x,v.p.z,.36);v.label.classList.toggle('near',d<2);}
  for(const v of npcViews){position(v.label,v.n.x,v.n.z,1.85);if(Math.hypot(p.x-v.n.x,p.z-v.n.z)<2.3)nearNPC=v.n;}
  const canInteract=!!(nearest||nearNPC)&&p.hp>0&&!conversation&&!dialog.open;
  $('interact').hidden=!canInteract;
  if(canInteract)$('interact').textContent=nearest?'R · เดินทางไป '+lookup(nearest.to).name:'R · คุยกับ '+nearNPC.name;
  $('position-readout').textContent=`ตำแหน่ง ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`;
  if(t-lastMini>.1){lastMini=t;minimap();}
 }
 minimap();return {update,get paused(){return dialog.open||!!conversation||traveling;}};
}

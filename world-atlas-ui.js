import {warpCost,hops} from './world-state.js?v=101.5';

// 0.112.4 the world map is Thailand (models3d/world-thailand/build_thailand.py renders it in Blender from Natural Earth
// data). Every place is pinned at a real longitude / latitude, in the same frame the render uses.
const OPEN_ZOOM=2.5,MAX_ZOOM=5,FRAME={lon0:96.6,lon1:106.4,lat0:5.2,lat1:21.0},IMG='assets/world112/thailand.jpg',ASPECT=1240/2052;
const at=([lon,lat])=>[(lon-FRAME.lon0)/(FRAME.lon1-FRAME.lon0),(FRAME.lat1-lat)/(FRAME.lat1-FRAME.lat0)];
// Open maps: where each one sits in the real country (the place it is drawn from).
const PLACES={
 'ayutthaya':[100.57,14.36],          // กรุงศรีอยุธยา
 'rice-fields':[100.12,14.47],        // ทุ่งนาสุพรรณบุรี
 'moonlit-mill':[100.40,14.90],       // โรงสีริมเจ้าพระยา สิงห์บุรี
 'old-orchard':[100.50,13.86],        // สวนผลไม้นนทบุรี
 'lotus-marsh':[100.25,15.70],        // บึงบอระเพ็ด นครสวรรค์
 'bamboo-grove':[101.15,16.40],       // ป่าเพชรบูรณ์
 'ruined-temple':[99.70,17.02],       // กรุงเก่าสุโขทัย
 'lablae':[100.03,17.65],             // อำเภอลับแล อุตรดิตถ์
 'himmapan-edge':[98.55,18.60],       // ป่าดอยสูงเชียงใหม่
 'naga-cave':[102.75,17.88],          // ริมโขง หนองคาย (ตำนานบั้งไฟพญานาค)
 'kailash-peak':[99.85,20.30]         // ยอดดอยเชียงราย
};
// Which side of the pin the name sits on, so the crowded central plain stays readable (default below).
const SIDE={'ayutthaya':'r','rice-fields':'l','moonlit-mill':'t','old-orchard':'b','lotus-marsh':'r','ruined-temple':'l','lablae':'r','naga-cave':'r','himmapan-edge':'l'};
// Historic cities shown on the map but not open for travel yet.
const LATER=[['เชียงใหม่ · ล้านนา',[98.99,18.79]],['พิษณุโลก',[100.26,16.82]],['พิมาย',[102.49,15.22]],['ด่านเจดีย์สามองค์',[98.38,15.30]],
 ['จันทบูร',[102.10,12.61]],['นครศรีธรรมราช',[99.96,8.43]],['ปัตตานี',[101.25,6.87]],['ตะนาวศรี',[98.85,12.10]]];

export function createWorldAtlas({catalog,currentId,coins,onWarp,onWalk,onClose}){
 const dialog=document.createElement('dialog');
 dialog.id='world-atlas-dialog';dialog.setAttribute('aria-labelledby','atlas-heading');
 dialog.innerHTML=`<header class="atlas-header"><div><h2 id="atlas-heading">แผนที่สยาม</h2><p>แตะชื่อเมืองบนแผนที่ แล้วกดเดินไปหรือวาร์ป · จุดสีเทายังไม่เปิดเดินทาง</p></div><nav aria-label="ควบคุมแผนที่โลก"><button type="button" data-zoom="minus" aria-label="ย่อแผนที่โลก">−</button><button type="button" data-zoom="reset" aria-label="แสดงแผนที่โลกทั้งหมด">100%</button><button type="button" data-zoom="plus" aria-label="ขยายแผนที่โลก">+</button><button type="button" id="atlas-close" aria-label="ปิดแผนที่โลก">✕</button></nav></header>
 <div class="atlas-viewport" tabindex="0" aria-label="ภาพแผนที่โลก เลื่อนเพื่อสำรวจเมื่อขยาย"><div class="atlas-stage"><div class="atlas-surface"><img src="${IMG}" width="1536" height="1024" alt="ภาพแผนที่โลกอโยธยา" draggable="false"></div></div></div>
 <footer class="atlas-footer"><div class="atlas-destination-info"><select id="atlas-destination" aria-label="เลือกจุดหมาย"></select><p id="atlas-detail" role="status" aria-live="polite"></p></div><div class="atlas-travel"><span id="atlas-wallet"></span><button type="button" id="atlas-walk">เดินไป</button><button type="button" id="atlas-warp">วาร์ป</button></div></footer>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),viewport=$('.atlas-viewport'),surface=$('.atlas-surface'),select=$('#atlas-destination'),warp=$('#atlas-warp'),walk=$('#atlas-walk');
 const pins=new Map();let selected=currentId,zoom=1,busy=false,drag=null,suppressClick=false;
 for(const map of catalog.maps){if((map.pvpArena||map.prologue)&&map.id!==currentId)continue;
  const option=document.createElement('option');option.value=map.id;option.textContent=map.name;select.append(option);
  if(!PLACES[map.id])continue;const anchor=at(PLACES[map.id]);
  const pin=document.createElement('button');pin.type='button';pin.className='atlas-place';pin.dataset.mapId=map.id;
  pin.style.left=anchor[0]*100+'%';pin.style.top=anchor[1]*100+'%';pin.setAttribute('aria-label',map.name);pin.title=map.name;
  const name=document.createElement('span');name.className='atlas-name side-'+(SIDE[map.id]??'b');name.textContent=map.name;pin.append(name);
  if(map.id===currentId){pin.classList.add('is-current');pin.setAttribute('aria-current','location');pin.title=map.name+' · คุณอยู่ที่นี่';}
  pin.onclick=()=>choose(map.id);surface.append(pin);pins.set(map.id,pin);
 }
 for(const [label,ll] of LATER){const [x,y]=at(ll),d=document.createElement('span');d.className='atlas-later';d.style.left=x*100+'%';d.style.top=y*100+'%';
  d.innerHTML='<i></i><span></span>';d.lastChild.textContent=label;d.title=label+' · ยังไม่เปิดเดินทาง';surface.append(d);}
 function choose(id){selected=id;select.value=id;refresh();}
 function refresh(){
  const map=catalog.maps.find(m=>m.id===selected),cost=warpCost(catalog,currentId,selected),money=coins();
  if(!map)return;
  for(const [id,pin] of pins)pin.setAttribute('aria-pressed',String(id===selected));
  let detail=(map.subtitle??'').split(' · ')[0];
  if(selected===currentId)detail='คุณอยู่ที่นี่';
  else if(map.pvpArena)detail='สนามส่วนตัว · เข้าผ่านเมนูประลอง และกดกลับอยุธยาเพื่อออก';
  else if(map.guildHall)detail='เข้าผ่านหน้ากิลด์หรือขุนพลชุมพล เมื่อเป็นสมาชิกกิลด์';
  else if(map.instance)detail='ดันเจี้ยนปาร์ตี้ · เข้าจากโรงสีใต้เงาจันทร์';
  else if(cost===null)detail='ยังไม่มีเส้นทางวาร์ปไปที่นี่';
  else if(money<cost)detail='เบี้ยไม่พอสำหรับการเดินทาง';
  if(map.levelBand)detail+=' · แนะนำ Lv.'+map.levelBand.join('–');
  if(map.worldBoss)detail+=' · บอส HP '+map.worldBoss.hp.toLocaleString('th-TH')+' · เกิดใหม่ 60 นาทีหลังตาย';
  $('#atlas-detail').textContent=detail;
  $('#atlas-wallet').textContent=`มี ${money.toLocaleString('th-TH')} เบี้ย`;
  warp.textContent=cost===null?'วาร์ป':`วาร์ป · ${cost} เบี้ย`;
  warp.disabled=busy||cost===null||money<cost;
  // 0.122 walk there for free through the gates (any map a warp reaches; party dungeons and guild halls stay closed)
  walk.disabled=busy||!onWalk||cost===null||hops(catalog.maps,currentId,selected)===null;
 }
 function fit(){
  const width=Math.min(viewport.clientWidth,viewport.clientHeight*ASPECT)*zoom;
  surface.style.width=Math.max(1,width)+'px';
  $('[data-zoom="reset"]').textContent=Math.round(zoom*100)+'%';
  $('[data-zoom="minus"]').disabled=zoom===1;$('[data-zoom="plus"]').disabled=zoom>=MAX_ZOOM;
 }
 function setZoom(value){
  const old=surface.getBoundingClientRect(),box=viewport.getBoundingClientRect();
  const x=(box.left+viewport.clientWidth/2-old.left)/old.width,y=(box.top+viewport.clientHeight/2-old.top)/old.height;
  zoom=Math.max(1,Math.min(MAX_ZOOM,value));fit();
  const next=surface.getBoundingClientRect();
  viewport.scrollLeft+=next.left+x*next.width-box.left-viewport.clientWidth/2;
  viewport.scrollTop+=next.top+y*next.height-box.top-viewport.clientHeight/2;
 }
 new ResizeObserver(()=>{if(dialog.open)fit();}).observe(viewport);
 $('[data-zoom="plus"]').onclick=()=>setZoom(zoom+.5);
 $('[data-zoom="minus"]').onclick=()=>setZoom(zoom-.5);
 $('[data-zoom="reset"]').onclick=()=>setZoom(1);
 select.onchange=()=>{choose(select.value);pins.get(selected)?.scrollIntoView({block:'nearest',inline:'nearest'});};
 // Native touch scrolling; mouse drag pans without accidentally selecting a city on release.
 viewport.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||zoom===1)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};});
 viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5&&!drag.moved){drag.moved=true;viewport.setPointerCapture(e.pointerId);}if(drag.moved){viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY;}});
 const endDrag=()=>{if(drag?.moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);}drag=null;};
 viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
 viewport.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();}},true);
 warp.onclick=()=>{refresh();if(warp.disabled)return;busy=true;warp.disabled=true;onWarp(selected);};
 walk.onclick=()=>{refresh();if(walk.disabled)return;dialog.close();onWalk(selected);};
 $('#atlas-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{busy=false;onClose?.();});
 return {
  get open(){return dialog.open;},close(){dialog.close();},
  show(destinationId=currentId){
   for(const panel of document.querySelectorAll('dialog[data-hud-panel][open]'))panel.close();
   busy=false;zoom=OPEN_ZOOM;choose(catalog.maps.some(m=>m.id===destinationId)?destinationId:currentId);dialog.showModal();fit();
   // Center the requested destination; ordinary map opens still start at the player.
   const pin=pins.get(selected);if(pin){const v=viewport.getBoundingClientRect(),p=pin.getBoundingClientRect();viewport.scrollLeft+=p.left-v.left-v.width/2;viewport.scrollTop+=p.top-v.top-v.height/2;}else viewport.scrollTo(0,0);
   $('#atlas-close').focus();
  }
 };
}

import {warpCost} from './world-state.js?v=101.5';

// Anchors follow the nameplates in the 1536 × 1024 illustration, not screen pixels.
const PLACES={
 'ayutthaya':[.093,.715], 'rice-fields':[.269,.746], 'old-orchard':[.470,.763],
 'moonlit-mill':[.680,.714], 'lotus-marsh':[.917,.751], 'bamboo-grove':[.871,.526],
 'ruined-temple':[.585,.494], 'lablae':[.326,.477], 'himmapan-edge':[.304,.250],
 'naga-cave':[.618,.286], 'kailash-peak':[.881,.206],
 'guild-hall':[.171,.928], 'mill-cellar':[.675,.916]
};

export function createWorldAtlas({catalog,currentId,coins,onWarp,onClose}){
 const dialog=document.createElement('dialog');
 dialog.id='world-atlas-dialog';dialog.setAttribute('aria-labelledby','atlas-heading');
 dialog.innerHTML=`<header class="atlas-header"><div><h2 id="atlas-heading">แผนที่โลกอโยธยา</h2><p>แตะชื่อเมืองบนภาพ แล้วเลือกวาร์ป</p></div><nav aria-label="ควบคุมแผนที่โลก"><button type="button" data-zoom="minus" aria-label="ย่อแผนที่โลก">−</button><button type="button" data-zoom="reset" aria-label="แสดงแผนที่โลกทั้งหมด">100%</button><button type="button" data-zoom="plus" aria-label="ขยายแผนที่โลก">+</button><button type="button" id="atlas-close" aria-label="ปิดแผนที่โลก">✕</button></nav></header>
 <div class="atlas-viewport" tabindex="0" aria-label="ภาพแผนที่โลก เลื่อนเพื่อสำรวจเมื่อขยาย"><div class="atlas-stage"><div class="atlas-surface"><img src="assets/world105/world-map.png" width="1536" height="1024" alt="ภาพแผนที่โลกอโยธยา" draggable="false"></div></div></div>
 <footer class="atlas-footer"><div class="atlas-destination-info"><select id="atlas-destination" aria-label="เลือกจุดหมาย"></select><p id="atlas-detail" role="status" aria-live="polite"></p></div><div class="atlas-travel"><span id="atlas-wallet"></span><button type="button" id="atlas-warp">วาร์ป</button></div></footer>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),viewport=$('.atlas-viewport'),surface=$('.atlas-surface'),select=$('#atlas-destination'),warp=$('#atlas-warp');
 const pins=new Map();let selected=currentId,zoom=1,busy=false,drag=null,suppressClick=false;
 for(const map of catalog.maps){
  const option=document.createElement('option');option.value=map.id;option.textContent=map.name;select.append(option);
  const anchor=PLACES[map.id];if(!anchor)continue;
  const pin=document.createElement('button');pin.type='button';pin.className='atlas-place';pin.dataset.mapId=map.id;
  pin.style.left=anchor[0]*100+'%';pin.style.top=anchor[1]*100+'%';pin.setAttribute('aria-label',map.name);pin.title=map.name;
  if(map.id===currentId){pin.classList.add('is-current');pin.setAttribute('aria-current','location');const badge=document.createElement('span');badge.className='atlas-here';badge.textContent='คุณอยู่ที่นี่';pin.append(badge);}
  pin.onclick=()=>choose(map.id);surface.append(pin);pins.set(map.id,pin);
 }
 function choose(id){selected=id;select.value=id;refresh();}
 function refresh(){
  const map=catalog.maps.find(m=>m.id===selected),cost=warpCost(catalog,currentId,selected),money=coins();
  if(!map)return;
  for(const [id,pin] of pins)pin.setAttribute('aria-pressed',String(id===selected));
  let detail=(map.subtitle??'').split(' · ')[0];
  if(selected===currentId)detail='คุณอยู่ที่นี่';
  else if(map.guildHall)detail='เข้าผ่านหน้ากิลด์หรือขุนพลชุมพล เมื่อเป็นสมาชิกกิลด์';
  else if(map.instance)detail='ดันเจี้ยนปาร์ตี้ · เข้าจากโรงสีใต้เงาจันทร์';
  else if(cost===null)detail='ยังไม่มีเส้นทางวาร์ปไปที่นี่';
  else if(money<cost)detail='เบี้ยไม่พอสำหรับการเดินทาง';
  $('#atlas-detail').textContent=detail;
  $('#atlas-wallet').textContent=`มี ${money.toLocaleString('th-TH')} เบี้ย`;
  warp.textContent=cost===null?'วาร์ป':`วาร์ป · ${cost} เบี้ย`;
  warp.disabled=busy||cost===null||money<cost;
 }
 function fit(){
  const width=Math.min(viewport.clientWidth,viewport.clientHeight*1.5)*zoom;
  surface.style.width=Math.max(1,width)+'px';
  $('[data-zoom="reset"]').textContent=Math.round(zoom*100)+'%';
  $('[data-zoom="minus"]').disabled=zoom===1;$('[data-zoom="plus"]').disabled=zoom===3;
 }
 function setZoom(value){
  const old=surface.getBoundingClientRect(),box=viewport.getBoundingClientRect();
  const x=(box.left+viewport.clientWidth/2-old.left)/old.width,y=(box.top+viewport.clientHeight/2-old.top)/old.height;
  zoom=Math.max(1,Math.min(3,value));fit();
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
 $('#atlas-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{busy=false;onClose?.();});
 return {
  get open(){return dialog.open;},close(){dialog.close();},
  show(){
   for(const panel of document.querySelectorAll('dialog[data-hud-panel][open]'))panel.close();
   busy=false;zoom=1;choose(currentId);dialog.showModal();fit();viewport.scrollTo(0,0);
   $('#atlas-close').focus();
  }
 };
}

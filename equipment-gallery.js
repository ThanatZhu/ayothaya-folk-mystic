import {drawCharacterFrame} from './character-size.js?v=41.2';
import {EQUIPMENT,normalizeEquipment,equipItem,starterEquipment} from './equipment.js?v=41';
import {equipmentIcon} from './equipment-ui.js?v=41.2';
import {loadPaintedCharacter} from './painted-character.js?v=41.2';
import {motionFrame} from './animation-frames.js?v=37';
import {className} from './classes.js?v=101';
const $=id=>document.getElementById(id),select=$('gallery-class'),canvas=$('gallery-art'),ctx=canvas.getContext('2d');
for(const id of new Set(EQUIPMENT.map(i=>i.classId))){const o=document.createElement('option');o.value=id;o.textContent=className(id,'male');select.append(o);}
let gear=normalizeEquipment(null,'novice'),art=null,version=0;
async function render(){const id=select.value,token=++version;$('gallery-status').textContent='กำลังเตรียมภาพ…';
 for(const slot of ['weapon','outfit']){$(slot==='weapon'?'gallery-weapons':'gallery-outfits').replaceChildren(...starterEquipment(id).filter(i=>i.slot===slot).map(item=>{
  const b=document.createElement('button');b.append(equipmentIcon(item),document.createTextNode(item.name));b.setAttribute('aria-pressed',String(gear[slot]===item.id));b.onclick=()=>{gear=equipItem(gear,id,item.id);render();};return b;
 }));}
 try{const next=await loadPaintedCharacter(id,{},gear);if(token!==version)return;art=next;$('gallery-status').textContent='พร้อมลอง · 20 เฟรมต่อเพศ · อาวุธติดตามทุกท่า';}
 catch{if(token===version){art=null;$('gallery-status').textContent='โหลดภาพไม่สำเร็จ กรุณาเลือกอุปกรณ์อีกครั้ง';}}
}
select.onchange=()=>{gear=normalizeEquipment(null,select.value);art=null;render();};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function draw(ms){if(art&&!document.hidden){const mode=$('gallery-motion').value,frame=motionFrame(mode,mode==='attack'?ms/1000%1.4:ms/1000,null,reduced.matches,select.value);ctx.clearRect(0,0,320,320);ctx.imageSmoothingEnabled=false;drawCharacterFrame(ctx,art[$('gallery-gender').value][frame],32,12);}requestAnimationFrame(draw);}
render();requestAnimationFrame(draw);

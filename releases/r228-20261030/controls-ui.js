// 0.51 control layout editor: drag the joystick, the attack/skill wheel and the quick slots anywhere, resize each one
// and set how see-through they are. Saved on this device, separately for phone landscape and desktop.
// Edit mode swallows every pointer event (capture phase) except its own toolbar, so nothing in the game reacts.
const GROUPS=[['joystick','จอยเดิน','#joystick'],['combat','ปุ่มโจมตี / สกิล','.combat-controls'],['quick','ปุ่มลัดยา / อีโมต','#quick-slots']];
const $=id=>document.getElementById(id);

export function createControlsUI({game}){
 if(!document.querySelector('link[data-controls-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='controls-ui.css?v=01';css.dataset.controlsUi='';document.head.append(css);}
 const phone=matchMedia('(orientation:landscape) and (max-height:520px)');
 const key=()=>'ayothaya-controls:'+(phone.matches?'phone':'desktop');
 const read=()=>{try{return JSON.parse(localStorage.getItem(key()))??{};}catch{return {};}};
 let layout=read(),editing=false,selected='combat',drag=null;
 const el=id=>document.querySelector(GROUPS.find(g=>g[0]===id)[2]);
 function apply(){
  for(const [id] of GROUPS){const node=el(id);if(!node)continue;const v=layout[id]??{};
   node.style.translate=v.x||v.y?`${v.x??0}px ${v.y??0}px`:'';node.style.scale=v.s&&v.s!==1?String(v.s):'';
   node.style.opacity=!editing&&layout.opacity<1?String(layout.opacity):'';}
 }
 // Keep at least half of each control on screen.
 function clamp(id){const node=el(id),v=layout[id];if(!node||!v)return;const r=node.getBoundingClientRect();
  const dx=Math.min(0,innerWidth-(r.left+r.width/2))-Math.min(0,r.left+r.width/2),dy=Math.min(0,innerHeight-(r.top+r.height/2))-Math.min(0,r.top+r.height/2);
  if(dx||dy){v.x=(v.x??0)+dx;v.y=(v.y??0)+dy;apply();}}
 const save=()=>{try{localStorage.setItem(key(),JSON.stringify(layout));}catch{}};

 const bar=document.createElement('div');bar.id='controls-editor';bar.hidden=true;
 bar.innerHTML='<strong>ปรับปุ่มควบคุม</strong><span>ลากปุ่มเพื่อย้าย · แตะเพื่อเลือก</span>'+
  '<label>ขนาด <b id="ctl-which"></b><input type="range" id="ctl-size" min="60" max="150" step="5"></label>'+
  '<label>ความทึบ<input type="range" id="ctl-opacity" min="30" max="100" step="5"></label>'+
  '<button type="button" id="ctl-reset">ค่าเริ่มต้น</button><button type="button" id="ctl-done" class="primary">เสร็จ</button>';
 document.body.append(bar);
 const sync=()=>{for(const [id] of GROUPS)el(id)?.classList.toggle('ctl-selected',editing&&id===selected);
  $('ctl-which').textContent=GROUPS.find(g=>g[0]===selected)[1];$('ctl-size').value=String(Math.round((layout[selected]?.s??1)*100));$('ctl-opacity').value=String(Math.round((layout.opacity??1)*100));};
 $('ctl-size').oninput=e=>{(layout[selected]??={}).s=+e.target.value/100;apply();};
 $('ctl-size').onchange=()=>clamp(selected);
 $('ctl-opacity').oninput=e=>{layout.opacity=+e.target.value/100;};
 $('ctl-reset').onclick=()=>{layout={};apply();sync();};
 $('ctl-done').onclick=()=>stop();

 function start(){editing=true;game.clearInput?.();document.body.classList.add('controls-editing');bar.hidden=false;apply();sync();}
 function stop(){editing=false;drag=null;save();document.body.classList.remove('controls-editing');bar.hidden=true;apply();sync();game.clearInput?.();}
 const groupOf=t=>GROUPS.find(([id])=>el(id)?.contains(t))?.[0];
 const swallow=e=>{if(!editing||bar.contains(e.target))return false;e.preventDefault();e.stopImmediatePropagation();return true;};
 addEventListener('pointerdown',e=>{if(!swallow(e))return;const id=groupOf(e.target);if(!id)return;
  selected=id;const v=layout[id]??={};drag={id,x:e.clientX-(v.x??0),y:e.clientY-(v.y??0)};sync();},{capture:true});
 addEventListener('pointermove',e=>{if(!drag||!editing)return;e.preventDefault();e.stopImmediatePropagation();const v=layout[drag.id];v.x=Math.round(e.clientX-drag.x);v.y=Math.round(e.clientY-drag.y);apply();},{capture:true});
 for(const t of ['pointerup','pointercancel'])addEventListener(t,e=>{if(!editing)return;if(drag){clamp(drag.id);drag=null;}swallow(e);},{capture:true});
 for(const t of ['click','touchstart','contextmenu'])addEventListener(t,swallow,{capture:true,passive:false});
 phone.addEventListener('change',()=>{layout=read();apply();});

 // Entry: the profile panel (tap the portrait).
 const open=document.createElement('button');open.id='open-controls';open.type='button';open.textContent='ปรับตำแหน่ง / ขนาดปุ่มควบคุม';
 open.onclick=()=>{$('close-account')?.click();start();};
 $('return-lobby')?.before(open);
 apply();
 return {start,stop,get editing(){return editing;}};
}

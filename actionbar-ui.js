import {ACTION_COLUMNS,ACTION_MAX_ROWS,actionEntry,defaultActionbar,normalizeActionbar,resizeActionbar,actionKey} from './actionbar-state.js';
import {itemDef} from './items.js?v=107';
import {iconStyle} from './bag-ui.js?v=107';
import {applySkillArt} from './skill-art.js?v=icons117';

export function createActionbar({game,bagUI,account={}}){
 const world=game.world,body=document.body,$=id=>document.getElementById(id),phone=matchMedia('(any-pointer:coarse),(max-width:900px)');
 const css=document.createElement('link');css.rel='stylesheet';css.href='./actionbar-ui.css?v=mobile130';document.head.append(css);
 const key='ayothaya-actionbar-v1:'+[(account.serverId??'local'),(account.slotId??'guest'),world.profession.id,world.jobId??'',world.roleCombat?'role':'legacy'].join(':');
 const fallback=defaultActionbar(world.skills,game.hotbar,bagUI.quickItems);
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 let state=normalizeActionbar(saved,fallback,world.skills,id=>!!itemDef(id)),buttons=[],drag=null,suppressClick=false;
 const root=document.createElement('section');root.id='desktop-actionbar';root.setAttribute('aria-label','ตารางปุ่มลัดสกิลและไอเท็ม');
 root.innerHTML='<div class="actionbar-rows" role="group" aria-label="ช่องปุ่มลัด"></div><div class="actionbar-tools"><div class="actionbar-resize"><button type="button" id="actionbar-add" aria-label="เพิ่มแถวปุ่มลัด 8 ช่อง">+</button><button type="button" id="actionbar-remove" aria-label="ซ่อนแถวบนสุด 8 ช่อง">−</button></div><div id="actionbar-life"></div><div id="actionbar-combat"></div></div><span class="actionbar-status" role="status"></span>';
 for(const [id,sign,label,title] of [['actionbar-add','+','เพิ่ม','เพิ่มแถวปุ่มลัด 8 ช่อง'],['actionbar-remove','−','ลด','ซ่อนแถวบนสุด · แถวหลักเก็บไว้เสมอ']]){
  const button=root.querySelector('#'+id);button.innerHTML='<i class="actionbar-row-sign" aria-hidden="true">'+sign+'</i><span>'+label+'</span>';button.title=title;
 }
 $('game-shell').append(root);const rows=root.querySelector('.actionbar-rows'),status=root.querySelector('[role=status]');
 const auto=$('auto-control')??$('auto-attack'),attack=$('attack'),moves=[auto,attack,$('emote-open'),$('run-toggle')].filter(Boolean).map(node=>{const home=document.createComment('shortcut home');node.before(home);return {node,home};});
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{}};
 const blocked=()=>!game.canUseActions||!!document.querySelector('dialog:modal')||body.classList.contains('controls-editing');
 function activate(entry){
  if(blocked()||!entry)return;
  if(entry.kind==='item'){bagUI.activateShortcut(entry.id);return;}
  const s=world.skills[entry.index];if(!s?.reserved&&!s?.passive)world.skill(entry.index);
 }
 function render(){
  rows.replaceChildren();buttons=[];
  for(let row=state.rows-1;row>=0;row--){
   const line=document.createElement('div');line.className='actionbar-row';line.dataset.row=row;line.setAttribute('aria-label',row===0?'แถวหลัก ลบไม่ได้':'แถวปุ่มลัด '+(row+1));
   for(let column=0;column<ACTION_COLUMNS;column++){
    const index=row*ACTION_COLUMNS+column,entry=state.slots[index],button=document.createElement('button');
    button.type='button';button.className='action-slot';button.dataset.index=index;
    button.innerHTML='<strong class="slot-icon" aria-hidden="true"></strong><kbd></kbd><em></em><small></small>';button.querySelector('kbd').textContent=['','S+','A+','S+A+'][row]+(column+1);
    button.classList.toggle('empty',!entry);
    const name=entry?.kind==='skill'?world.skills[entry.index].name:entry?.kind==='item'?itemDef(entry.id).name:'ช่องว่าง · ลากสกิลหรือไอเท็มมาวาง';
    button.setAttribute('aria-label',actionKey(row,column)+' · '+name);button.title=name+' · '+actionKey(row,column)+(entry?' · คลิกขวาเพื่อล้างช่อง':'');
    if(entry?.kind==='skill')applySkillArt([button],world.profession.id,[entry.index],world.skills);
    if(entry?.kind==='item')button.querySelector('strong').style.cssText=iconStyle(entry.id);
    button.onclick=()=>activate(state.slots[index]);
    button.oncontextmenu=e=>{e.preventDefault();state.slots[index]=null;persist();render();};
    line.append(button);buttons.push(button);
   }
   rows.append(line);
  }
  $('actionbar-remove').disabled=state.rows===1;$('actionbar-add').disabled=state.rows===ACTION_MAX_ROWS;
  root.dataset.rows=state.rows;update();
 }
 const announce=text=>{status.textContent=text;};
 for(const [id,delta] of [['actionbar-add',1],['actionbar-remove',-1]])$(id).onclick=()=>{state=resizeActionbar(state,delta);persist();render();announce(state.rows+' แถว · '+state.rows*ACTION_COLUMNS+' ช่อง');};
 function hit(x,y){if(phone.matches)return null;return buttons.find(b=>{const r=b.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})??null;}
 function mark(x,y){const target=hit(x,y);buttons.forEach(b=>b.classList.toggle('drop-over',b===target));return target;}
 function assign(index,value){const entry=actionEntry(value,world.skills,id=>!!itemDef(id));if(!entry)return false;state.slots[index]=entry;persist();render();announce('ตั้งปุ่มลัดแล้ว');return true;}
 function update(){
  if(phone.matches)return;
  const bag=bagUI.bag();
  for(const button of buttons){
   const entry=state.slots[+button.dataset.index],skill=entry?.kind==='skill'?world.skills[entry.index]:null;
   const level=skill?world.skillLevels[entry.index]??0:0,cd=skill?world.cooldowns[entry.index]??0:0,count=entry?.kind==='item'?bag.items[entry.id]??0:null;
   button.classList.toggle('locked',!!skill&&!level);button.classList.toggle('no-mana',!!skill&&world.player.mp<skill.cost);
   button.classList.toggle('cooling',cd>.05);button.classList.toggle('depleted',count===0);
   button.setAttribute('aria-disabled',String(!entry||!!skill&&!level||count===0));
   button.querySelector('em').textContent=cd>.05?Math.ceil(cd):'';button.querySelector('small').textContent=count!==null?count:skill&&level?'Lv'+level:'';
   button.style.setProperty('--cooldown',skill?.cd?Math.min(100,cd/skill.cd*100)+'%':'0%');
  }
 }
 function mode(){
  body.classList.toggle('actionbar-desktop',!phone.matches);body.classList.toggle('actionbar-mobile',phone.matches);root.hidden=phone.matches;
  if(!phone.matches){attack.disabled=false;$('auto-attack').disabled=false;}
  for(const {node,home} of moves){if(phone.matches)home.after(node);else $(['emote-open','run-toggle'].includes(node.id)?'actionbar-life':'actionbar-combat').append(node);}
  render();
 }
 // Pointer dragging works across nonmodal skill/bag windows and touch-capable laptops.
 addEventListener('pointerdown',e=>{
  if(phone.matches||e.button!==0||body.classList.contains('controls-editing'))return;
  const slot=e.target.closest?.('#desktop-actionbar .action-slot'),node=e.target.closest?.('#skill-window .skill-node');
  if(node&&e.target.closest('button'))return;
  const from=slot?+slot.dataset.index:null,value=slot?state.slots[from]:node?{kind:'skill',index:+node.dataset.slot}:null;
  if(!actionEntry(value,world.skills,id=>!!itemDef(id)))return;
  drag={value,from,x:e.clientX,y:e.clientY,pointer:e.pointerId,source:slot??node,ghost:null};
 },true);
 addEventListener('pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  if(!drag.ghost){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8)return;drag.ghost=document.createElement('div');drag.ghost.className='actionbar-ghost';drag.ghost.append(drag.source.querySelector('strong').cloneNode(true));body.append(drag.ghost);game.clearInput();body.classList.add('actionbar-dragging');}
  e.preventDefault();drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';mark(e.clientX,e.clientY);
 },{capture:true,passive:false});
 for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{
  if(!drag||drag.pointer!==e.pointerId)return;const d=drag;drag=null;if(!d.ghost)return;
  d.ghost.remove();body.classList.remove('actionbar-dragging');const target=type==='pointerup'?hit(e.clientX,e.clientY):null;mark(-1,-1);
  if(target){const to=+target.dataset.index;if(d.from!==null){[state.slots[d.from],state.slots[to]]=[state.slots[to],state.slots[d.from]];persist();render();}else assign(to,d.value);}
  suppressClick=true;setTimeout(()=>suppressClick=false,100);e.preventDefault();
 },true);
 addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
 addEventListener('keydown',e=>{
  if(phone.matches||e.ctrlKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable=true]')||blocked()||!/^Digit[0-9]$/.test(e.code))return;
  e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;const column=Number(e.code.slice(-1))-1,row=(e.shiftKey?1:0)+(e.altKey?2:0);
  if(column>=0&&column<8&&row<state.rows)activate(state.slots[row*ACTION_COLUMNS+column]);
 },true);
 new ResizeObserver(()=>document.documentElement.style.setProperty('--actionbar-height',root.offsetHeight+'px')).observe(root);
 phone.addEventListener('change',mode);mode();const timer=setInterval(update,100);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 const api={update,get state(){return structuredClone(state);},get desktop(){return !phone.matches;},mark,dropItemAt(id,x,y){const target=hit(x,y);if(!target)return false;return assign(+target.dataset.index,{kind:'item',id});}};
 game.actionBar=api;return api;
}

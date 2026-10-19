import {applySkillArt} from './skill-art.js?v=21';
import {openHudPanel} from './hud-panels.js?v=34';
// Skill window (menu "สกิล" or K). 0.84: a skill tree. Each skill opens when the skills it needs reach a level
// (shared rules in skill-progress.js, enforced by the realm server too); tap a skill for its numbers.
import {SKILL_MAX,OPEN_MAX,SKILL_TREE,requirements,skillOpen,nextLevelText,scaledSkill} from './skill-progress.js?v=87';
const reasons={'no-skill-points':'แต้มสกิลไม่พอ · ได้เพิ่มเมื่อ Job Level ขึ้น','skill-trial-required':'ขั้น 5 ต้องผ่านบททดสอบวิชา · เปิดพร้อมระบบเควสต์','skill-max':'ขั้นสูงสุดแล้ว','skill-locked':'ยังไม่ปลดล็อก · อัปสกิลที่ต้องใช้ให้ถึงขั้นก่อน','skill-not-learned':'ยังไม่ได้เรียนสกิลนี้','online-required':'ต้องเชื่อมต่อออนไลน์เพื่ออัปสกิล','not-connected':'กำลังเชื่อมต่อ · ลองอีกครั้ง'};
// Grid place of each slot: [column, row]. Rows are the tree tiers, top to bottom.
const PLACE={0:[1,0],4:[3,0],1:[0,1],2:[1,1],5:[3,1],3:[0,2],6:[1,2],8:[3,2],7:[0,3],9:[2,3]};
export function createSkillWindow({game,classId}){
 if(!document.querySelector('link[data-skill-tree]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./skill-tree.css?v=90';css.dataset.skillTree='';document.head.append(css);}
 const dialog=document.createElement('dialog');dialog.id='skill-window';dialog.setAttribute('aria-labelledby','skill-window-title');
 dialog.innerHTML='<header><div><small>SKILL TREE</small><h2 id="skill-window-title">ต้นไม้สกิล</h2></div><b id="skill-points"></b><button class="mp-icon" id="skill-close" aria-label="ปิดหน้าสกิล">×</button></header><p class="skill-hint">เริ่มจากสกิลแถวบน · อัปให้ถึงขั้นที่กำหนดเพื่อปลดล็อกสกิลถัดไป (เรียนฟรี) · ขั้น 2–4 ใช้ 1 แต้ม · ขั้น 5 และ 10 ต้องผ่านเควสต์</p><div class="skill-tree" id="skill-tree"><svg id="skill-links" aria-hidden="true"></svg></div><section id="skill-detail" aria-live="polite"></section><section class="skill-setup"><h3>ปุ่มลัดสกิล <small>ลากสกิลจากต้นไม้มาวางในช่อง หรือแตะสกิลแล้วแตะช่อง · ปุ่ม 1–0 บนจอและคีย์บอร์ดใช้ตามนี้</small></h3><ol id="skill-hotbar"></ol><h3>ออโต้ <small>ติ๊กสกิลที่ให้ใช้เองตอนเปิด AUTO (เรียงตามช่องปุ่มลัด) · ตั้งให้กินน้ำยาเมื่อเลือดหรือมานาต่ำกว่าที่กำหนด</small></h3><div id="skill-auto"></div><div class="auto-pots"><label>กินยา HP เมื่อต่ำกว่า <input type="range" id="auto-hp" min="0" max="90" step="5"><output id="auto-hp-out"></output></label><label>กินยา MP เมื่อต่ำกว่า <input type="range" id="auto-mp" min="0" max="90" step="5"><output id="auto-mp-out"></output></label></div></section><p id="skill-note" role="status"></p>';
 document.getElementById('game-shell').append(dialog);
 const $=id=>dialog.querySelector('#'+id),world=game.world,tree=$('skill-tree');let picked=0;
 const nodes=world.skills.map((s,i)=>{
  const node=document.createElement('div'),icon=document.createElement('strong'),name=document.createElement('span'),level=document.createElement('b'),button=document.createElement('button');
  node.className='skill-node';node.dataset.slot=i;const [c,r]=PLACE[i];node.style.gridColumn=String(c+1);node.style.gridRow=String(r+1);
  icon.className='skill-icon';icon.textContent=s.icon;icon.style.setProperty('--skill-color',s.color);
  name.textContent=s.key+' · '+s.name;button.type='button';button.setAttribute('aria-label','อัปสกิล '+s.name);
  node.onclick=e=>{if(e.target!==button){picked=i;draw();}};
  button.onclick=()=>{picked=i;const r=game.upgradeSkill(i);$('skill-note').textContent=r===true?(levels()[i]?'อัปสกิล ':'เรียนสกิล ')+s.name+' แล้ว':(reasons[r]??'อัปสกิลไม่ได้');setTimeout(draw,250);};
  node.draggable=true;node.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move';});
  node.append(icon,name,level,button);tree.append(node);return {node,level,button};
 });
 if(classId)applySkillArt(nodes.map(n=>n.node),classId);
 const levels=()=>world.skillLevels??[];
 // 0.88 square connectors (owner: no diagonal lines): down from the requirement, across in the gap between rows,
 // down into the skill. A link that skips a row runs down the gutter beside the skill instead of crossing a card.
 // Gold when that requirement is met; the level needed sits just above the skill it opens.
 function links(){
  const svg=$('skill-links'),box=tree.getBoundingClientRect();if(!box.width)return;svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  const at=i=>{const r=nodes[i].node.getBoundingClientRect();return {x:r.left-box.left+r.width/2,top:r.top-box.top,bottom:r.bottom-box.top,left:r.left-box.left,row:PLACE[i][1]};};
  const gap=13;
  svg.innerHTML=SKILL_TREE.flatMap(n=>n.req.map(([s,l],k)=>{const a=at(s),b=at(n.slot),met=(levels()[s]??0)>=l,cls=met?'met':'';
   const below=a.bottom+gap,above=b.top-gap,side=b.left-6;
   const d=b.row-a.row>1?`M${a.x} ${a.bottom}V${below}H${side}V${above}H${b.x}V${b.top}`:`M${a.x} ${a.bottom}V${above}H${b.x}V${b.top}`;
   return `<path d="${d}" class="${cls}"/><text x="${b.x+5+k*30}" y="${b.top-3}" class="${cls}">Lv${l}</text>`;})).join('');
 }
 function draw(){
  const points=world.skillPoints??0,lv=levels();$('skill-points').textContent='แต้มสกิล '+points;
  world.skills.forEach((s,i)=>{
   const l=lv[i]??1,open=skillOpen(lv,i),n=nodes[i];
   n.node.classList.toggle('learned',l>0);n.node.classList.toggle('open',!l&&open);n.node.classList.toggle('closed',!l&&!open);n.node.classList.toggle('picked',i===picked);
   n.level.textContent=l?'Lv '+l+'/'+SKILL_MAX:open?'เรียนได้':'ล็อก';
   n.button.textContent=l?'+':'เรียน';n.button.disabled=l?(l>=OPEN_MAX||points<1):!open;
  });
  const s=world.skills[picked],l=lv[picked]??1,now=scaledSkill(s,Math.max(1,l)),next=l>=1&&l<SKILL_MAX?scaledSkill(s,l+1):null;
  const need=requirements(picked).map(([r,rl])=>`<li class="${(lv[r]??0)>=rl?'met':''}">${(lv[r]??0)>=rl?'✓':'✗'} ${world.skills[r].name} ขั้น ${rl} <small>(ตอนนี้ ${lv[r]??0})</small></li>`).join('');
  const nums=k=>[now?.damage?'พลัง '+now.damage+(next?.damage&&next.damage!==now.damage?' → '+next.damage:''):null,now?.heal?'ฟื้นฟู '+now.heal:null,now?'MP '+now.cost:null,now?'คูลดาวน์ '+now.cd+' วิ'+(next&&next.cd!==now.cd?' → '+next.cd:''):null,now?.duration?'นาน '+now.duration+' วิ':null].filter(Boolean).join(' · ');
  $('skill-detail').innerHTML=`<strong>${s.key} · ${s.name} <em>${l?'ขั้น '+l+'/'+SKILL_MAX:'ยังไม่ได้เรียน'}</em></strong><p>${nums()}</p><small>${l?nextLevelText(l):skillOpen(lv,picked)?'เงื่อนไขครบแล้ว · กด เรียน ได้ทันทีไม่ใช้แต้ม':'ต้องการ:'}</small>${need?`<ul>${need}</ul>`:''}`;
  links();
 }
 let timer=0;
 // 0.90 hotbar + AUTO setup. Dropping skill k on slot j swaps it with whatever sat there, so every skill keeps one slot.
 let carry=null; // tap-to-place on touch screens: the skill picked last waits for a slot tap
 function place(skill,slot){const bar=game.hotbar,from=bar.indexOf(skill);[bar[from],bar[slot]]=[bar[slot],bar[from]];game.setHotbar(bar);carry=null;setup();save();$('skill-note').textContent='ย้ายสกิลลงปุ่มลัดแล้ว';}
 function setup(){
  const bar=game.hotbar,cfg=world.autoConfig??{skills:[],hp:0,mp:0},keys=['1','2','3','4','5','6','7','8','9','0'];
  $('skill-hotbar').innerHTML=bar.map((k,j)=>{const s=world.skills[k];return `<li data-slot="${j}" class="${carry!==null?'waiting':''}" tabindex="0" aria-label="ช่อง ${keys[j]} · ${s.name}"><kbd>${keys[j]}</kbd><strong class="skill-icon"></strong><span>${s.name}</span></li>`;}).join('');
  const slots=[...$('skill-hotbar').children];
  if(classId)applySkillArt(slots,classId,bar);
  slots.forEach(li=>{const j=+li.dataset.slot;
   li.draggable=true;li.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',String(bar[j]));});
   li.addEventListener('dragover',e=>{e.preventDefault();li.classList.add('over');});li.addEventListener('dragleave',()=>li.classList.remove('over'));
   li.addEventListener('drop',e=>{e.preventDefault();const k=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(k))place(k,j);});
   li.onclick=()=>{if(carry!==null)place(carry,j);};li.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&carry!==null){e.preventDefault();place(carry,j);}};});
  $('skill-auto').innerHTML=bar.map(k=>{const s=world.skills[k],lv=levels()[k]??1;return `<label class="${lv?'':'off'}"><input type="checkbox" data-auto="${k}" ${cfg.skills.includes(k)?'checked':''} ${lv?'':'disabled'}> ${s.name}</label>`;}).join('');
  $('skill-auto').querySelectorAll('[data-auto]').forEach(c=>c.onchange=save);
  $('auto-hp').value=cfg.hp;$('auto-mp').value=cfg.mp;outs();
 }
 const outs=()=>{$('auto-hp-out').textContent=+$('auto-hp').value?$('auto-hp').value+'%':'ปิด';$('auto-mp-out').textContent=+$('auto-mp').value?$('auto-mp').value+'%':'ปิด';};
 function save(){const order=game.hotbar,on=new Set([...$('skill-auto').querySelectorAll('[data-auto]:checked')].map(c=>+c.dataset.auto));
  game.setAutoConfig({skills:order.filter(k=>on.has(k)),hp:+$('auto-hp').value,mp:+$('auto-mp').value});outs();$('skill-note').textContent='บันทึกการตั้งค่าออโต้แล้ว';}
 $('auto-hp').oninput=save;$('auto-mp').oninput=save;
 nodes.forEach((n,i)=>n.node.addEventListener('click',e=>{if(e.target===n.button)return;carry=i;setup();$('skill-note').textContent='แตะช่องปุ่มลัดเพื่อวาง '+world.skills[i].name;}));
 const open=()=>{setup();$('skill-note').textContent='';openHudPanel(dialog);requestAnimationFrame(draw);clearInterval(timer);timer=setInterval(draw,500);};
 dialog.addEventListener('close',()=>clearInterval(timer));$('skill-close').onclick=()=>dialog.close();
 addEventListener('resize',()=>{if(dialog.open)links();});
 addEventListener('keydown',e=>{if(e.code!=='KeyK'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select'))return;if(dialog.open)dialog.close();else if(!document.querySelector('dialog:modal'))open();});
 addEventListener('open-skill-window',()=>{if(!dialog.open)open();});
 return {open,dialog};
}

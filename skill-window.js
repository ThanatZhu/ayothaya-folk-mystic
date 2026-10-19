import {applySkillArt} from './skill-art.js?v=21';
import {openHudPanel} from './hud-panels.js?v=34';
// Skill window (menu "สกิล" or K). 0.84: a skill tree. Each skill opens when the skills it needs reach a level
// (shared rules in skill-progress.js, enforced by the realm server too); tap a skill for its numbers.
import {SKILL_MAX,OPEN_MAX,SKILL_TREE,requirements,skillOpen,nextLevelText,scaledSkill} from './skill-progress.js?v=84';
const reasons={'no-skill-points':'แต้มสกิลไม่พอ · ได้เพิ่มเมื่อ Job Level ขึ้น','skill-trial-required':'ขั้น 5 ต้องผ่านบททดสอบวิชา · เปิดพร้อมระบบเควสต์','skill-max':'ขั้นสูงสุดแล้ว','skill-locked':'ยังไม่ปลดล็อก · อัปสกิลที่ต้องใช้ให้ถึงขั้นก่อน','skill-not-learned':'ยังไม่ได้เรียนสกิลนี้','online-required':'ต้องเชื่อมต่อออนไลน์เพื่ออัปสกิล','not-connected':'กำลังเชื่อมต่อ · ลองอีกครั้ง'};
// Grid place of each slot: [column, row]. Rows are the tree tiers, top to bottom.
const PLACE={0:[1,0],4:[3,0],1:[0,1],2:[1,1],5:[3,1],3:[0,2],6:[1,2],8:[3,2],7:[0,3],9:[2,3]};
export function createSkillWindow({game,classId}){
 if(!document.querySelector('link[data-skill-tree]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./skill-tree.css?v=84';css.dataset.skillTree='';document.head.append(css);}
 const dialog=document.createElement('dialog');dialog.id='skill-window';dialog.setAttribute('aria-labelledby','skill-window-title');
 dialog.innerHTML='<header><div><small>SKILL TREE</small><h2 id="skill-window-title">ต้นไม้สกิล</h2></div><b id="skill-points"></b><button class="mp-icon" id="skill-close" aria-label="ปิดหน้าสกิล">×</button></header><p class="skill-hint">เริ่มจากสกิลแถวบน · อัปให้ถึงขั้นที่กำหนดเพื่อปลดล็อกสกิลถัดไป (เรียนฟรี) · ขั้น 2–4 ใช้ 1 แต้ม · ขั้น 5 และ 10 ต้องผ่านเควสต์</p><div class="skill-tree" id="skill-tree"><svg id="skill-links" aria-hidden="true"></svg></div><section id="skill-detail" aria-live="polite"></section><p id="skill-note" role="status"></p>';
 document.getElementById('game-shell').append(dialog);
 const $=id=>dialog.querySelector('#'+id),world=game.world,tree=$('skill-tree');let picked=0;
 const nodes=world.skills.map((s,i)=>{
  const node=document.createElement('div'),icon=document.createElement('strong'),name=document.createElement('span'),level=document.createElement('b'),button=document.createElement('button');
  node.className='skill-node';node.dataset.slot=i;const [c,r]=PLACE[i];node.style.gridColumn=String(c+1);node.style.gridRow=String(r+1);
  icon.className='skill-icon';icon.textContent=s.icon;icon.style.setProperty('--skill-color',s.color);
  name.textContent=s.key+' · '+s.name;button.type='button';button.setAttribute('aria-label','อัปสกิล '+s.name);
  node.onclick=e=>{if(e.target!==button){picked=i;draw();}};
  button.onclick=()=>{picked=i;const r=game.upgradeSkill(i);$('skill-note').textContent=r===true?(levels()[i]?'อัปสกิล ':'เรียนสกิล ')+s.name+' แล้ว':(reasons[r]??'อัปสกิลไม่ได้');setTimeout(draw,250);};
  node.append(icon,name,level,button);tree.append(node);return {node,level,button};
 });
 if(classId)applySkillArt(nodes.map(n=>n.node),classId);
 const levels=()=>world.skillLevels??[];
 // Lines from each requirement to the skill it opens; gold when that requirement is met.
 function links(){
  const svg=$('skill-links'),box=tree.getBoundingClientRect();if(!box.width)return;svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  const at=i=>{const r=nodes[i].node.getBoundingClientRect();return [r.left-box.left+r.width/2,r.top-box.top+r.height/2,r.height/2];};
  svg.innerHTML=SKILL_TREE.flatMap(n=>n.req.map(([s,l])=>{const [x1,y1,h1]=at(s),[x2,y2,h2]=at(n.slot),met=(levels()[s]??0)>=l;
   return `<line x1="${x1}" y1="${y1+h1}" x2="${x2}" y2="${y2-h2}" class="${met?'met':''}"/><text x="${(x1+x2)/2+4}" y="${(y1+h1+y2-h2)/2+4}" class="${met?'met':''}">Lv${l}</text>`;})).join('');
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
 const open=()=>{$('skill-note').textContent='';openHudPanel(dialog);requestAnimationFrame(draw);clearInterval(timer);timer=setInterval(draw,500);};
 dialog.addEventListener('close',()=>clearInterval(timer));$('skill-close').onclick=()=>dialog.close();
 addEventListener('resize',()=>{if(dialog.open)links();});
 addEventListener('keydown',e=>{if(e.code!=='KeyK'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select'))return;if(dialog.open)dialog.close();else if(!document.querySelector('dialog:modal'))open();});
 addEventListener('open-skill-window',()=>{if(!dialog.open)open();});
 return {open,dialog};
}

import {ROLE_TREE,roleRequirements,roleSkillOpen} from './role-skill-progress.js';
import {getClass} from './classes.js';
import {applySkillArt} from './skill-art.js?v=icons117';
import {openHudPanel} from './hud-panels.js?v=34';
// Skill window (menu "สกิล" or K). 0.84: a skill tree. Each skill opens when the skills it needs reach a level
// (shared rules in skill-progress.js, enforced by the realm server too); tap a skill for its numbers.
import {SKILL_MAX,SKILL_TREE,requirements,skillOpen,nextLevelText,scaledSkill,isMaster,MASTER_FROM,BASE_SLOTS} from './skill-progress.js?v=role116';
const reasons={'no-skill-points':'แต้มสกิลไม่พอ · ได้เพิ่มเมื่อ Job Level ขึ้น','skill-max':'ขั้นสูงสุดแล้ว','skill-locked':'ยังไม่ปลดล็อก · อัปสกิลที่ต้องใช้ให้ถึงขั้นก่อน','skill-not-learned':'ยังไม่ได้เรียนสกิลนี้','online-required':'ต้องเชื่อมต่อออนไลน์เพื่ออัปสกิล','not-connected':'กำลังเชื่อมต่อ · ลองอีกครั้ง'};
// Grid place of each slot: [column, row]. Rows are the tree tiers, top to bottom.
// 0.101 the Master tab reuses the grid: each Master skill sits in its parent's column.
const PLACE={0:[1,0],4:[3,0],1:[0,1],2:[1,1],5:[3,1],3:[0,2],6:[1,2],8:[3,2],7:[0,3],9:[2,3],10:[1,0],11:[0,0],12:[3,0],13:[1,1],14:[2,1]};
export function createSkillWindow({game,classId}){
 if(!document.querySelector('link[data-skill-tree]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./skill-tree.css?v=layout154';css.dataset.skillTree='';document.head.append(css);}
 const dialog=document.createElement('dialog');dialog.id='skill-window';dialog.dataset.profession=classId||'shaman';dialog.setAttribute('aria-labelledby','skill-window-title');
 dialog.innerHTML='<header><div><small>SKILL TREE</small><h2 id="skill-window-title">ต้นไม้สกิล</h2></div><b id="skill-points"></b><button class="mp-icon" id="skill-close" aria-label="ปิดหน้าสกิล">×</button></header><p class="skill-hint">เริ่มจากสกิลแถวบน · อัปให้ถึงขั้นที่กำหนดเพื่อปลดล็อกสกิลถัดไป (เรียนฟรี) · ขั้น 2–10 ใช้ขั้นละ 1 แต้ม · สกิลถึง Lv 10 ปลดล็อกสกิล Master</p><div class="skill-tabs" role="tablist"><button type="button" role="tab" data-tab="base" aria-selected="true">สกิลหลัก</button><button type="button" role="tab" data-tab="master" aria-selected="false">Master <small id="master-count"></small></button></div><div class="skill-tree" id="skill-tree"><svg id="skill-links" aria-hidden="true"></svg></div><section id="skill-detail" aria-live="polite"></section><p id="skill-note" role="status"></p>';
 document.getElementById('game-shell').append(dialog);
 dialog.querySelector('header small').textContent=getClass(classId||'shaman').name+' · SKILL TREE';
 const workspace=document.createElement('div');workspace.className='skill-workspace';
 dialog.querySelector('.skill-tree').before(workspace);workspace.append(dialog.querySelector('.skill-tree'),dialog.querySelector('#skill-detail'));
 const $=id=>dialog.querySelector('#'+id),world=game.world,tree=$('skill-tree'),roleMode=world.roleCombat&&!world.roleCombat.legacy,req=roleMode?roleRequirements:requirements,canOpen=(levels,i)=>roleMode?roleSkillOpen(levels,i,world.jobId):skillOpen(levels,i);let picked=0;
 const nodes=world.skills.map((s,i)=>{
  const node=document.createElement('div'),icon=document.createElement('strong'),name=document.createElement('span'),level=document.createElement('b'),button=document.createElement('button');
  node.className='skill-node'+(isMaster(i)?' master':'');node.dataset.slot=i;const [c,r]=PLACE[i];node.style.gridColumn=String(c+1);node.style.gridRow=String(r+1);
  icon.className='skill-icon';icon.textContent=s.icon;icon.style.setProperty('--skill-color',s.color);
  name.textContent=s.key+' · '+s.name;button.type='button';button.setAttribute('aria-label','อัปสกิล '+s.name);
  node.onclick=e=>{if(e.target!==button){picked=i;draw();}};
  button.onclick=()=>{picked=i;const r=game.upgradeSkill(i);$('skill-note').textContent=r===true?(levels()[i]?'อัปสกิล ':'เรียนสกิล ')+s.name+' แล้ว':(reasons[r]??'อัปสกิลไม่ได้');setTimeout(draw,250);};
  node.append(icon,name,level,button);tree.append(node);return {node,level,button};
 });
 if(classId)applySkillArt(nodes.map(n=>n.node),classId,null,world.skills);
 const levels=()=>world.skillLevels??[];
 let master=false; // which tab shows: the ten base skills or the five Master skills
 dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{master=b.dataset.tab==='master';picked=master?BASE_SLOTS:0;draw();});
 // 0.88 square connectors (owner: no diagonal lines): down from the requirement, across in the gap between rows,
 // down into the skill. A link that skips a row runs down the gutter beside the skill instead of crossing a card.
 // Gold when that requirement is met; the level needed sits just above the skill it opens.
 function links(){
  const svg=$('skill-links'),box=tree.getBoundingClientRect();if(!box.width)return;svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  const at=i=>{const r=nodes[i].node.getBoundingClientRect();return {x:r.left-box.left+r.width/2,top:r.top-box.top,bottom:r.bottom-box.top,left:r.left-box.left,row:PLACE[i][1]};};
  const gap=13;
  // Master skills need a base skill from the other tab: that requirement shows on the card, not as a line.
  svg.innerHTML=(roleMode?ROLE_TREE:SKILL_TREE).filter(n=>isMaster(n.slot)===master).flatMap(n=>n.req.filter(([s])=>isMaster(s)===master).map(([s,l],k)=>{const a=at(s),b=at(n.slot),met=(levels()[s]??0)>=l,cls=met?'met':'';
   const below=a.bottom+gap,above=b.top-gap,side=b.left-6;
   const d=b.row-a.row>1?`M${a.x} ${a.bottom}V${below}H${side}V${above}H${b.x}V${b.top}`:`M${a.x} ${a.bottom}V${above}H${b.x}V${b.top}`;
   return `<path d="${d}" class="${cls}"/><text x="${b.x+5+k*30}" y="${b.top-3}" class="${cls}">Lv${l}</text>`;})).join('');
 }
 function draw(){
  const points=world.skillPoints??0,lv=levels();dialog.querySelector('.skill-hint').textContent=roleMode&&master&&!world.jobId?'เลือกสาย Master ที่อาจารย์ประจำอาชีพ เพื่อปลดล็อกสกิลขั้นสูงและพาสซีฟ':'เริ่มจากสกิลแถวบน · เรียนฟรีเมื่อเงื่อนไขครบ · ขั้น 2–10 ใช้ขั้นละ 1 แต้ม · ตั้งค่าใช้สกิลอัตโนมัติที่ฟันเฟืองปุ่ม Auto';$('skill-points').textContent='แต้มสกิล '+points;
  dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String((b.dataset.tab==='master')===master)));
  $('master-count').textContent=MASTER_FROM.filter((_,j)=>(lv[BASE_SLOTS+j]??0)>0).length+'/'+MASTER_FROM.length;
  world.skills.forEach((s,i)=>{
   const l=lv[i]??(isMaster(i)?0:1),open=canOpen(lv,i),n=nodes[i];
   n.node.hidden=!!s.reserved||isMaster(i)!==master;
   n.node.classList.toggle('learned',l>0);n.node.classList.toggle('open',!l&&open);n.node.classList.toggle('closed',!l&&!open);n.node.classList.toggle('picked',i===picked);
   n.level.textContent=s.passive?(l?'พาสซีฟ · ทำงานแล้ว':'พาสซีฟ · ยังไม่เรียน'):l?'Lv '+l+'/'+SKILL_MAX:open?'เรียนได้':isMaster(i)?(roleMode&&!world.jobId?'เลือกสาย Master ก่อน':'ต้อง '+world.skills[roleMode?(req(i)[0]?.[0]??0):MASTER_FROM[i-BASE_SLOTS]].short+' Lv'+SKILL_MAX):'ล็อก';
   n.button.textContent=l?'+':'เรียน';n.button.disabled=l?(s.passive||l>=SKILL_MAX||points<1):!open;
  });
  const s=world.skills[picked],l=lv[picked]??(isMaster(picked)?0:1),now=scaledSkill(s,Math.max(1,l)),next=!s.passive&&l>=1&&l<SKILL_MAX?scaledSkill(s,l+1):null;
  const need=req(picked).map(([r,rl])=>`<li class="${(lv[r]??0)>=rl?'met':''}">${(lv[r]??0)>=rl?'✓':'✗'} ${world.skills[r].name} ขั้น ${rl} <small>(ตอนนี้ ${lv[r]??0})</small></li>`).join('');
  const nums=k=>[s.tip,now?.power?'พลัง '+now.power:null,now?.damage?'พลัง '+now.damage+(next?.damage&&next.damage!==now.damage?' → '+next.damage:''):null,now?.heal?'ฟื้นฟู '+now.heal:null,now?'MP '+now.cost:null,now?'คูลดาวน์ '+now.cd+' วิ'+(next&&next.cd!==now.cd?' → '+next.cd:''):null,now?.duration?'นาน '+now.duration+' วิ':null].filter(Boolean).join(' · ');
  $('skill-detail').innerHTML=`<strong>${s.key} · ${s.name} <em>${l?'ขั้น '+l+'/'+(s.passive?1:SKILL_MAX):'ยังไม่ได้เรียน'}</em></strong><p>${nums()}</p><small>${l?(s.passive?'พาสซีฟทำงานอัตโนมัติ':nextLevelText(l,picked)):canOpen(lv,picked)?'เงื่อนไขครบแล้ว · กด เรียน ได้ทันทีไม่ใช้แต้ม':'ต้องการ:'}</small>${need?`<ul>${need}</ul>`:''}`;
  links();
 }
 let timer=0;
 const open=()=>{$('skill-note').textContent='';openHudPanel(dialog);requestAnimationFrame(draw);clearInterval(timer);timer=setInterval(draw,500);};
 dialog.addEventListener('close',()=>clearInterval(timer));$('skill-close').onclick=()=>dialog.close();
 // Recompute connector endpoints when the lazily loaded frame/type styles settle.
 const resize=new ResizeObserver(()=>{if(dialog.open)links();});resize.observe(tree);
 addEventListener('resize',()=>{if(dialog.open)links();});
 addEventListener('keydown',e=>{if(e.code!=='KeyK'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select'))return;if(dialog.open)dialog.close();else if(!document.querySelector('dialog:modal'))open();});
 addEventListener('open-skill-window',()=>{if(!dialog.open)open();});
 return {open,dialog};
}

import {skillOpenAt,roleSkillMax,isPassiveSlot,PASSIVE_MAX} from './role-skill-progress.js';
import {getClass} from './classes.js?v=novice174';
import {applySkillArt} from './skill-art.js?v=skills119';
import {openHudPanel} from './hud-panels.js?v=34';
import {jobProgress} from './experience.js?v=105.3';
// Skill window (menu "สกิล" or K). 0.119 class skills: every skill opens at a Job level (no prerequisite chain),
// actives level 1-5 and passives 1-3, one point per level (the first too). The Novice keeps its small tree.
import {skillMax,skillAllowed,NOVICE_SLOTS,requirements,skillOpen,nextLevelText,scaledSkill,isMaster,BASE_SLOTS} from './skill-progress.js?v=skills119';
const reasons={'no-skill-points':'แต้มสกิลไม่พอ · ได้ 1 แต้มทุกครั้งที่ Job Level ขึ้น','skill-max':'ขั้นสูงสุดแล้ว','skill-locked':'ยังไม่ปลดล็อก · รอ Job Level ถึงก่อน','skill-not-learned':'ยังไม่ได้เรียนสกิลนี้','online-required':'ต้องเชื่อมต่อออนไลน์เพื่ออัปสกิล','not-connected':'กำลังเชื่อมต่อ · ลองอีกครั้ง'};
// Grid place [column, row]: a left-to-right tree in Job-unlock order (every class shares the levels). The first skill
// branches into two lanes that meet at the ultimate; passives hang off the lane they open beside.
const PLACE={0:[0,1],1:[1,0],2:[1,2],3:[2,0],4:[2,2],5:[3,1],6:[2,1],7:[3,0],8:[3,2],10:[0,1],11:[1,0],12:[2,0],13:[3,1],14:[1,2],15:[2,2],16:[3,2]};
// [from, to, side]: side links (to passives) are dashed.
const LINKS=[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[0,6,1],[3,7,1],[4,8,1],[10,11],[11,12],[12,13],[10,14,1],[14,15,1],[15,16,1]];
const pct=n=>Math.round(n*1000)/10;
export function createSkillWindow({game,classId}){
 if(!document.querySelector('link[data-skill-tree]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./skill-tree.css?v=ult119';css.dataset.skillTree='';document.head.append(css);}
 const dialog=document.createElement('dialog');dialog.id='skill-window';dialog.dataset.profession=classId||'shaman';dialog.setAttribute('aria-labelledby','skill-window-title');
 dialog.innerHTML='<header><div><small>SKILL TREE</small><h2 id="skill-window-title">สกิล</h2></div><b id="skill-points"></b><button class="mp-icon" id="skill-close" aria-label="ปิดหน้าสกิล">×</button></header><p class="skill-hint"></p><div class="skill-tabs" role="tablist"><button type="button" role="tab" data-tab="base" aria-selected="true">สกิลอาชีพ</button><button type="button" role="tab" data-tab="master" aria-selected="false">Master <small id="master-count"></small></button></div><div class="skill-tree role-tree" id="skill-tree"></div><section id="skill-detail" aria-live="polite"></section><p id="skill-note" role="status"></p>';
 document.getElementById('game-shell').append(dialog);
 // Crop the existing painting in fixed-aspect SVG viewports. Only the plain
 // rails stretch; the crown and corner ornaments must never be nine-sliced.
 const frame=document.createElement('div');frame.className='skill-frame-art';frame.setAttribute('aria-hidden','true');
 const ornaments=[['tl',0,0,350,380],['tr',1186,0,350,380],['bl',0,704,350,320],['br',1186,704,350,320],['crown',460,0,616,240],['foot',500,840,536,160]];
 frame.innerHTML=ornaments.map(([part,x,y,w,h])=>`<svg class="skill-frame-${part}" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" focusable="false"><image href="./assets/ui-skill150/window.webp" width="1536" height="1024"/></svg>`).join('');dialog.append(frame);
 dialog.querySelector('header small').textContent=getClass(classId||'shaman').name+' · SKILL TREE';
 const workspace=document.createElement('div');workspace.className='skill-workspace';
 dialog.querySelector('.skill-tree').before(workspace);workspace.append(dialog.querySelector('.skill-tree'),dialog.querySelector('#skill-detail'));
 const $=id=>dialog.querySelector('#'+id),world=game.world,tree=$('skill-tree'),roleMode=world.roleCombat&&!world.roleCombat.legacy,novice=classId==='novice';let picked=0;
 const jobLevel=()=>jobProgress(world,world.profession.id,world.jobId).level;
 const maxAt=i=>roleMode?roleSkillMax(i):skillMax(classId);
 const canOpen=(levels,i)=>roleMode?skillOpenAt(classId,i,world.jobId,jobLevel()):skillOpen(levels,i,classId);
 if(!roleMode)tree.classList.remove('role-tree');
 const nodes=world.skills.map((s,i)=>{
  const node=document.createElement('div'),icon=document.createElement('strong'),name=document.createElement('span'),level=document.createElement('b'),button=document.createElement('button'),select=document.createElement('button');
  node.className='skill-node'+(isMaster(i)?' master':'')+(s.passive?' passive':'')+(s.ultimate?' ultimate':'');node.dataset.slot=i;
  const [c,r]=novice&&NOVICE_SLOTS.includes(i)?[NOVICE_SLOTS.indexOf(i),0]:PLACE[i]??[0,0];node.style.gridColumn=String(c+1);node.style.gridRow=String(r+1);
  icon.className='skill-icon';icon.textContent=s.icon;icon.style.setProperty('--skill-color',s.color);
  name.textContent=(s.passive?'พาสซีฟ':s.ultimate?'ไม้ตาย':s.key)+' · '+s.name;button.type='button';button.className='skill-upgrade';button.setAttribute('aria-label','อัปสกิล '+s.name);
  select.type='button';select.className='skill-select';select.setAttribute('aria-describedby','skill-detail');select.append(icon);
  node.onclick=e=>{if(e.target!==button){picked=i;draw();}};
  button.onclick=()=>{picked=i;const r=game.upgradeSkill(i);$('skill-note').textContent=r===true?(levels()[i]?'อัปสกิล ':'เรียนสกิล ')+s.name+' แล้ว':(reasons[r]??'อัปสกิลไม่ได้');setTimeout(draw,250);};
  node.append(select,name,level,button);
  if(s.ultimate){const badge=document.createElement('em');badge.className='skill-ult-badge';badge.textContent='★ ไม้ตาย';node.append(badge);}
  tree.append(node);return {node,level,button,select};
 });
 if(classId)applySkillArt(nodes.map(n=>n.node),classId,null,world.skills);
 // Branch lines behind the icons, measured in the tree's own (unscaled) layout; gold once the far end is learned.
 const links=document.createElementNS('http://www.w3.org/2000/svg','svg');links.classList.add('skill-links');links.setAttribute('aria-hidden','true');if(roleMode&&!novice)tree.prepend(links);
 function drawLinks(lv){
  if(!links.isConnected)return;const mid=({node:n})=>[n.offsetLeft+n.offsetWidth/2,n.offsetTop+n.offsetHeight/2];
  links.setAttribute('viewBox',`0 0 ${tree.clientWidth} ${tree.clientHeight}`);
  links.innerHTML=LINKS.filter(([a,b])=>!nodes[a].node.hidden&&!nodes[b].node.hidden).map(([a,b,side])=>{const [x1,y1]=mid(nodes[a]),[x2,y2]=mid(nodes[b]),mx=(x1+x2)/2;
   return `<path d="M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" class="${side?'side ':''}${(lv[b]??0)>0?'lit':(lv[a]??0)>0?'next':''}"/>`;}).join('');
 }
 const levels=()=>world.skillLevels??[];
 // 0.119.1 the menu's red dot: only while a point can actually go somewhere (every skill maxed = no dot, points or not)
 world.canSpendSkill=()=>{const lv=levels();return world.skills.some((s,i)=>{const l=lv[i]??0;
  if(s.reserved||!skillAllowed(classId,i)||l>=maxAt(i)||!canOpen(lv,i))return false;return roleMode||!l||!s.passive;});};
 if(novice){dialog.querySelector('.skill-tabs').hidden=true;dialog.querySelector('h2').textContent='วิชาพื้นฐาน';}
 let master=false; // which tab shows: class skills or the chosen Master branch
 dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{master=b.dataset.tab==='master';picked=master?BASE_SLOTS:0;draw();});
 function numbers(s,l){
  if(s.passive){const each=s.modifier&&Math.abs(s.value)<1?pct(s.value)+'%':String(s.value);return [s.tip,'ขั้นละ +'+each,l?'ตอนนี้ +'+(Math.abs(s.value)<1?pct(s.value*l)+'%':s.value*l):null].filter(Boolean).join(' · ');}
  const now=scaledSkill(s,Math.max(1,l)),next=l>=1&&l<maxAt(picked)?scaledSkill(s,l+1):null,area=now?.radius&&['cleave','zone','wall','storm','trap','rain','thorns','holyField','mine','meteor','sanctuary','yantra','lifeTree','massBind','uppercut','soulWave','curseWave','push','taunt','anchor','purify'].includes(s.type);
  return [s.tip,now?.power?'พลัง '+now.power+(next&&next.power!==now.power?' → '+next.power:''):null,now?.damage?'พลัง '+now.damage:null,'MP '+now.cost,'คูลดาวน์ '+now.cd+' วิ'+(next&&next.cd!==now.cd?' → '+next.cd:''),area?'วง '+Math.round(now.radius*10)/10:now?.range?'ระยะ '+Math.round(now.range*10)/10:null,s.seconds&&!['line','cleave','break'].includes(s.type)?'นาน '+s.seconds+' วิ':null,s.windup>=.5?'ร่าย '+s.windup+' วิ':null].filter(Boolean).join(' · ');
 }
 function draw(){
  const points=world.skillPoints??0,lv=levels(),job=jobLevel();
  dialog.querySelector('.skill-hint').textContent=novice?'3 วิชาพื้นฐาน · สูงสุดขั้น 4 · Job 10 ได้ 9 แต้ม · เรียนตั้งรับเมื่อพักหายใจถึงขั้น 2':roleMode&&master&&!world.jobId?'เลือกสาย Master ที่อาจารย์ประจำอาชีพ เพื่อปลดล็อกสกิล Master ไม้ตายขั้นสอง และพาสซีฟ':`Job Lv.${job} · ได้ 1 แต้มทุก Job Level · ทุกขั้นใช้ 1 แต้ม · สกิลกดใช้ 5 ขั้น พาสซีฟ ${PASSIVE_MAX} ขั้น · สกิลเปิดตาม Job Level`;
  $('skill-points').textContent='แต้มสกิล '+points;
  dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String((b.dataset.tab==='master')===master)));
  if(roleMode)$('master-count').textContent=[10,11,12,13,14,15,16].filter(i=>(lv[i]??0)>0).length+'/7';
  world.skills.forEach((s,i)=>{
   const l=lv[i]??0,open=canOpen(lv,i),n=nodes[i],max=maxAt(i);
   n.node.hidden=!!s.reserved||!skillAllowed(classId,i)||isMaster(i)!==master;
   n.node.classList.toggle('learned',l>0);n.node.classList.toggle('open',!l&&open);n.node.classList.toggle('closed',!l&&!open);n.node.classList.toggle('picked',i===picked);
   n.level.textContent=l?'Lv '+l+'/'+max:open?'เรียนได้ · 1 แต้ม':roleMode?(isMaster(i)&&!world.jobId?'เลือกสาย Master ก่อน':'ปลดที่ Job '+s.job):'ล็อก';
   n.select.setAttribute('aria-label',s.name+' · '+n.level.textContent);n.select.title=s.name+' · '+n.level.textContent;n.select.setAttribute('aria-pressed',String(i===picked));
   // A skill at its top rank has nothing left to buy: the + goes away instead of greying out.
   n.button.hidden=!!l&&(l>=max||!roleMode&&!!s.passive);
   n.button.textContent='+';n.button.disabled=roleMode?(!open||l>=max||points<1):(l?(s.passive||l>=max||points<1):!open);
   n.button.title=n.button.disabled?(l&&(l>=max||s.passive&&!roleMode)?reasons['skill-max']:!l&&!open?reasons['skill-locked']:reasons['no-skill-points']):(l?'อัปสกิล ':'เรียนสกิล ')+s.name;
  });
  drawLinks(lv);
  const s=world.skills[picked],l=lv[picked]??0,max=maxAt(picked);
  const status=l?'ขั้น '+l+'/'+max:'ยังไม่ได้เรียน';
  const foot=roleMode?(l>=max?'ขั้นสูงสุดแล้ว':!canOpen(lv,picked)?(isMaster(picked)&&!world.jobId?'เลือกสาย Master ก่อน':'ปลดล็อกที่ Job Level '+s.job+' (ตอนนี้ '+job+')'):isPassiveSlot(picked)?'พาสซีฟทำงานอัตโนมัติ · ขั้นถัดไปใช้ 1 แต้ม':nextLevelText(l,picked,classId)):(l?(s.passive?'พาสซีฟทำงานอัตโนมัติ':nextLevelText(l,picked,classId)):canOpen(lv,picked)?'เงื่อนไขครบแล้ว · กด เรียน ได้ทันทีไม่ใช้แต้ม':'ต้องการ: '+requirements(picked,classId).map(([r,rl])=>world.skills[r].name+' ขั้น '+rl).join(', '));
  $('skill-detail').innerHTML=`<strong>${s.passive?'พาสซีฟ':s.ultimate?'ไม้ตาย':s.key} · ${s.name} <em>${status}</em></strong><p>${numbers(s,l)}</p><small>${foot}</small>`;
 }
 let timer=0;
 const open=()=>{$('skill-note').textContent='';openHudPanel(dialog);requestAnimationFrame(draw);clearInterval(timer);timer=setInterval(draw,500);};
 dialog.addEventListener('close',()=>clearInterval(timer));$('skill-close').onclick=()=>dialog.close();
 addEventListener('keydown',e=>{if(e.code!=='KeyK'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select'))return;if(dialog.open)dialog.close();else if(!document.querySelector('dialog:modal'))open();});
 addEventListener('open-skill-window',()=>{if(!dialog.open)open();});
 return {open,dialog};
}

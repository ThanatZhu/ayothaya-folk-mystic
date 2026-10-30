import {loadFarmStyles} from './farm-utility-ui221.js?v=surfaces222';
const number=n=>Math.max(0,Math.round(n??0)).toLocaleString('th-TH');
function row(){const d=document.createElement('div');d.className='boss-meter-row';d.innerHTML='<span></span><strong></strong><i><b></b></i>';return d;}
function updateRow(d,r){d.querySelector('span').textContent=r.name;d.querySelector('strong').textContent=number(r.damage)+' · '+Math.round((r.share??0)*100)+'%';d.querySelector('b').style.transform='scaleX('+Math.max(0,Math.min(1,r.share??0))+')';d.title='DPS '+number(r.dps);}
export function createBossMeterUI({game}){
 loadFarmStyles();const box=document.createElement('aside');box.id='boss-live-meter';box.hidden=true;box.setAttribute('aria-label','ดาเมจระหว่างต่อสู้บอส');box.innerHTML='<header><strong></strong><button class="boss-meter-toggle" type="button" aria-expanded="true" aria-label="ย่อหรือขยายดาเมจบอส">−</button></header><div class="boss-meter-groups"></div>';document.body.append(box);
 const body=box.querySelector('.boss-meter-groups'),nodes=new Map();let encounter=null,collapsed=false;
 box.querySelector('button').onclick=()=>{collapsed=!collapsed;body.hidden=collapsed;box.querySelector('button').textContent=collapsed?'+':'−';box.querySelector('button').setAttribute('aria-expanded',String(!collapsed));};
 function render(view){box.hidden=!view;if(!view){encounter=null;return;}box.querySelector('header strong').textContent='ดาเมจ · '+view.bossName;
  if(encounter!==view.encounterId){encounter=view.encounterId;nodes.clear();body.replaceChildren();collapsed=false;body.hidden=false;box.querySelector('button').textContent='−';box.querySelector('button').setAttribute('aria-expanded','true');}
  let index=0;const live=new Set();for(const g of view.groups){live.add(g.id);let n=nodes.get(g.id);if(!n){const element=document.createElement(g.kind==='party'?'details':'div'),summary=g.kind==='party'?document.createElement('summary'):element;const top=row();summary.append(top);if(g.kind==='party')element.append(summary);const members=document.createElement('div');members.className='boss-meter-members';if(g.kind==='party')element.append(members);n={element,top,members,children:new Map()};nodes.set(g.id,n);}
   updateRow(n.top,g);if(body.children[index]!==n.element)body.insertBefore(n.element,body.children[index]??null);index++;let memberIndex=0;const memberKeys=new Set();
   if(g.kind==='party')for(const m of g.members){memberKeys.add(m.id);let r=n.children.get(m.id);if(!r){r=row();n.children.set(m.id,r);}updateRow(r,m);if(n.members.children[memberIndex]!==r)n.members.insertBefore(r,n.members.children[memberIndex]??null);memberIndex++;}
   for(const[id,r]of n.children)if(!memberKeys.has(id)){r.remove();n.children.delete(id);}
  }for(const[id,n]of nodes)if(!live.has(id)){n.element.remove();nodes.delete(id);}
 }
 for(const type of ['keydown','keyup'])box.addEventListener(type,e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();});
 game.onEvent(e=>{if(e.type==='bossDamage')render(e.view);});if(game.world.bossDamage)render(game.world.bossDamage);return {render};
}

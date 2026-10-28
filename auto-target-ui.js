import {mobileHudScale208} from './mobile-hud-scale208.js';
import {mobileHudMedia} from './hud-mode204.js';
import {MONSTER_TYPES} from './combat-core.js?v=auto202';
import {normalizeAutoTarget,autoMonsterRank} from './auto-targets.js?v=auto202';
import {openHudPanel} from './hud-panels.js?v=auto207';
import {monsterPortrait,classPortrait} from './portraits.js?v=at1';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
export function createAutoTargetUI({game}){
 if(!document.querySelector('[data-auto-target202]')){const css=el('link');css.rel='stylesheet';css.href='./auto-target202.css?v=auto207';css.dataset.autoTarget202='';document.head.append(css);}
 const phone=mobileHudMedia(),world=game.world,dialog=el('dialog');dialog.id='auto-target-window';dialog.setAttribute('aria-labelledby','auto-target-title');
 dialog.innerHTML='<header><div><small>AUTO BATTLE</small><h2 id="auto-target-title">เลือกเป้าหมายออโต้</h2></div><button type="button" id="auto-target-gear" aria-label="ตั้งค่าสกิลออโต้">⚙</button><button type="button" id="auto-target-close" aria-label="ปิดเลือกเป้าหมาย">×</button></header><nav class="auto-target-tabs" aria-label="ชนิดเป้าหมาย"><button type="button" data-target-tab="monsters" aria-pressed="true">มอนสเตอร์</button><button type="button" data-target-tab="players" aria-pressed="false">ผู้เล่น</button></nav><div id="auto-target-options"><label><input id="auto-allow-boss" type="checkbox">ตีบอส / MVP</label><label><input id="auto-allow-mini" type="checkbox">ตีมินิบอส</label></div><p id="auto-target-help"></p><div id="auto-target-list"></div><footer><span id="auto-target-state" role="status"></span><button type="button" id="auto-target-stop">หยุด</button><button type="button" id="auto-target-start">เริ่มออโต้</button></footer>';
 (document.getElementById('game-shell')??document.body).append(dialog);const $=id=>dialog.querySelector('#'+id);let tab='monsters',timer=0,signature='',all=true,selected=new Set();
 const storageKey='ayothaya-auto-target202:'+world.profession.id+':'+(new URL(location.href).searchParams.get('map')??location.pathname);
 const legalPlayers=()=>[...(world.foe?[world.foe]:[]),...(world.rivals??[])].filter(p=>p.pvp&&p.hp>0&&p.id!=='war:stone');
 const typesHere=()=>[...new Set(world.mobs.map(m=>m.type))].filter(i=>MONSTER_TYPES[i]);
 function choose(target){game.clearInput();world.setAuto(true,null,target);dialog.close();}
 function save(){try{localStorage.setItem(storageKey,JSON.stringify(all?{kind:'monsters'}:{kind:'types',types:[...selected]}));}catch{}}
 function setRank(){game.setAutoConfig({...world.autoConfig,bosses:$('auto-allow-boss').checked,minis:$('auto-allow-mini').checked});signature='';draw();}
 function row(label,sub,target,{type=null,player=null,checked=false,locked=false}={}){
  const b=el('button','auto-target-choice');b.type='button';b.title=label+' · '+sub;b.dataset.target=JSON.stringify(target);b.setAttribute('aria-pressed',String(checked));b.disabled=locked;
  if(type)b.dataset.monsterType=target.type;
  const art=el('i',player?'auto-target-player':'auto-target-monster');art.setAttribute('aria-hidden','true');const art_=type?monsterPortrait(target.type):player?.classId?classPortrait(player.classId,player.gender):null;
  if(art_)art_.then(src=>{if(!b.isConnected)return;const image=el('img');image.alt='';image.src=src;art.replaceChildren(image);}).catch(()=>{});else art.textContent=player?'♟':target.kind==='monsters'?'All':'';
  const text=el('span');text.append(el('strong','',label),el('small','',sub));b.append(art,text,el('b','auto-target-radio',checked?'✓':''));
  b.onclick=()=>{if(player)return choose(target);if(target.kind==='monsters'){all=true;selected.clear();}else{if(all){all=false;selected.clear();}selected.has(target.type)?selected.delete(target.type):selected.add(target.type);}save();signature='';draw();};return b;
 }
 function activeTypes(){return typesHere().filter(i=>{const rank=autoMonsterRank(MONSTER_TYPES[i]);return (all||selected.has(i))&&(rank!=='boss'||world.autoConfig.bosses!==false)&&(rank!=='mini'||world.autoConfig.minis!==false);});}
 function draw(){
  const types=typesHere(),players=legalPlayers();dialog.querySelector('.auto-target-tabs').dataset.noPlayers=String(!players.length&&tab==='monsters');const sig=JSON.stringify([tab,world.auto,world.autoConfig,all,[...selected],types,types.map(i=>world.mobs.filter(m=>m.type===i&&m.hp>0).length),players.map(p=>[p.id,p.name])]);if(signature===sig)return;signature=sig;
  for(const b of dialog.querySelectorAll('[data-target-tab]'))b.setAttribute('aria-pressed',String(b.dataset.targetTab===tab));
  $('auto-target-options').hidden=tab!=='monsters';$('auto-target-start').hidden=tab!=='monsters';
  $('auto-allow-boss').checked=world.autoConfig.bosses!==false;$('auto-allow-mini').checked=world.autoConfig.minis!==false;
  const count=activeTypes().length;$('auto-target-state').textContent=tab==='monsters'?(all?'ทุกชนิดที่อนุญาต':`เลือก ${count} ชนิด`):(world.auto?'AUTO เปิด':'AUTO ปิด');$('auto-target-stop').disabled=!world.auto;$('auto-target-start').disabled=!count;
  const list=$('auto-target-list'),scroll=list.scrollTop;list.replaceChildren();
  if(tab==='monsters'){
   $('auto-target-help').textContent='ติ๊กได้หลายชนิด · กดเริ่มออโต้เมื่อเลือกครบ';list.append(row('ทุกชนิดในแมพ','ยังเคารพตัวเลือกบอส / มินิด้านบน',{kind:'monsters'},{checked:all}));
   for(const index of types){const type=MONSTER_TYPES[index],rank=autoMonsterRank(type),locked=rank==='boss'&&world.autoConfig.bosses===false||rank==='mini'&&world.autoConfig.minis===false,count=world.mobs.filter(m=>m.type===index&&m.hp>0).length;list.append(row(type.name,`${rank==='boss'?'บอส / MVP · ':rank==='mini'?'มินิ · ':''}Lv.${type.level??1} · ${locked?'ปิดการโจมตีกลุ่มนี้':count>0?'พบ '+count+' ตัว':'รอเกิดใหม่'}`,{kind:'type',type:index},{type,checked:!all&&selected.has(index),locked}));}
   if(!types.length)list.append(el('p','auto-target-empty','แผนที่นี้ยังไม่มีมอนสเตอร์ให้ล่า'));
  }else{
   $('auto-target-help').textContent='เลือกคู่ดวลหรือศัตรูในสงครามตามกติกาของพื้นที่';for(const p of players)list.append(row(p.name??p.id,'ล็อคผู้เล่นนี้เป็นเป้าหมาย',{kind:'entity',id:p.id},{player:p,checked:world.auto&&world.autoTarget?.id===p.id}));
   if(!players.length)list.append(el('p','auto-target-empty','ยังไม่มีผู้เล่นที่สามารถต่อสู้ได้ในขณะนี้'));
  }list.scrollTop=scroll;
 }
 function position(){
  const compact=phone.matches;dialog.toggleAttribute('data-compact-hud',compact);
  if(!compact){for(const key of ['inset','margin','width','height','max-height','max-width'])dialog.style.removeProperty(key);return;}
  const scale=mobileHudScale208({width:innerWidth,height:innerHeight}),width=Math.min(168*scale,innerWidth-16),height=Math.min(196*scale,innerHeight-16),anchor=document.getElementById('auto-control')?.getBoundingClientRect()??document.getElementById('auto-attack')?.getBoundingClientRect();
  const top=Math.max(8,Math.min(innerHeight-height-8,(anchor?.top??innerHeight-12)-height-6));
  let left=(anchor?anchor.left+anchor.width/2:innerWidth*.62)-width/2;
  const arc=[...document.querySelectorAll('#skills .skill:not([hidden]):not([data-mobile-away])')].map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.top<top+height&&r.bottom>top);
  if(arc.length)left=Math.min(left,Math.min(...arc.map(r=>r.left))-width-6);
  left=Math.max(8,Math.min(innerWidth-width-8,left));
  for(const [key,value]of Object.entries({inset:top/scale+'px auto auto '+left/scale+'px',margin:'0',width:width/scale+'px',height:height/scale+'px','max-height':height/scale+'px','max-width':width/scale+'px'}))dialog.style.setProperty(key,value,'important');
 }
 addEventListener('resize',()=>{if(dialog.open)position();});phone.addEventListener('change',()=>{if(dialog.open)position();});
 function open(){game.clearInput();let saved=null;try{saved=normalizeAutoTarget(JSON.parse(localStorage.getItem(storageKey)));}catch{}
  const target=world.auto?world.autoTarget??(Number.isInteger(world.hunt)?{kind:'type',type:world.hunt}:saved):saved;
  all=!target||!['type','types'].includes(target.kind);selected=new Set(target?.kind==='types'?target.types:target?.kind==='type'?[target.type]:[]);signature='';draw();position();openHudPanel(dialog,{modal:false});position();clearInterval(timer);timer=setInterval(()=>{draw();position();},500);
 }
 game.autoPicker=open;const auto=document.getElementById('auto-attack');auto?.setAttribute('aria-haspopup','dialog');auto?.setAttribute('aria-controls',dialog.id);
 $('auto-target-close').onclick=()=>dialog.close();$('auto-target-gear').onclick=()=>{dialog.close();dispatchEvent(new Event('open-auto-settings'));};$('auto-target-stop').onclick=()=>{world.setAuto(false);dialog.close();};
 $('auto-target-start').onclick=()=>{if(!activeTypes().length)return;save();choose(all?{kind:'monsters'}:{kind:'types',types:[...selected]});};
 $('auto-allow-boss').onchange=$('auto-allow-mini').onchange=setRank;
 for(const b of dialog.querySelectorAll('[data-target-tab]'))b.onclick=()=>{tab=b.dataset.targetTab;signature='';draw();};dialog.addEventListener('close',()=>clearInterval(timer));
 return {open,dialog};
}

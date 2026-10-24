import {MONSTER_TYPES} from './combat-core.js?v=role116';
import {MONSTER_BEHAVIOUR} from './monster-catalog.js';
import {bossEntries,bossCountdown,bossClock} from './boss-directory.js?v=138';
import {DROPS,itemDef} from './items.js?v=107';
import {iconStyle} from './bag-ui.js';
import {createBossResultsUI} from './boss-results-ui.js?v=boss138';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const format=n=>Math.round(n??0).toLocaleString();
export function createBossBrowserUI({game,catalog,map,worldUI}){
 const css=el('link');css.rel='stylesheet';css.href='boss-browser-ui.css?v=138';document.head.append(css);
 const dialog=el('dialog');dialog.id='boss-browser';dialog.setAttribute('aria-labelledby','boss-browser-title');dialog.innerHTML='<header class="boss-browser-header"><div><small>AYOTHAYA · BESTIARY</small><h2 id="boss-browser-title">สารานุกรมบอส</h2></div><button type="button" id="boss-browser-close" aria-label="ปิดหน้า MVP">×</button></header><nav class="boss-browser-tabs" role="tablist" aria-label="หมวดบอส"><button type="button" role="tab" data-boss-tab="mvp">MVP · บอสโลก</button><button type="button" role="tab" data-boss-tab="mini">มินิบอส / ร่างทรง</button><button type="button" role="tab" data-boss-tab="results">อันดับดาเมจ</button></nav><p id="boss-directory-state" role="status"></p><div id="boss-browser-catalog"><nav id="boss-browser-list" aria-label="รายชื่อบอส"></nav><article id="boss-browser-detail"></article></div><section id="boss-browser-results" hidden></section>';
 (document.getElementById('game-shell')??document.body).append(dialog);const $=id=>dialog.querySelector('#'+id);
 const button=el('button');button.id='menu-boss-result';button.type='button';button.setAttribute('aria-label','เปิดหน้า MVP และรายชื่อบอส');const icon=el('i');icon.setAttribute('aria-hidden','true');button.append(icon,el('span','','MVP'));document.getElementById('game-menu')?.append(button);
 const entries=bossEntries(catalog,MONSTER_TYPES);let tab='mvp',selected=entries.find(e=>e.mapId===map.id)?.id??entries[0]?.id,report=null,receivedAt=0,lastRequest=-Infinity,lastChannel=null,loadGeneration=0;
 const results=createBossResultsUI({game,container:$('boss-browser-results'),onOpen(){tab='results';show();},onClose(){dialog.close();}});
 function reportRow(entry){return report?.channel===lastChannel?report?.rows.find(r=>r.id===entry.id):null;}
 function status(entry){const row=reportRow(entry),time=bossCountdown(row,receivedAt,performance.now());return {row,time,text:time===null?(entry.instance?'บอสประจำดันเจี้ยน':'รอตรวจสอบ'):time>0?bossClock(time):row?.alive===false?'รอเกิดใหม่':'ปรากฏตัวแล้ว'};}
 function request(){if(!game.online||performance.now()-lastRequest<3000)return;lastRequest=performance.now();game.world.market?.('bossDirectory');}
 async function portrait(entry,target){const type=MONSTER_TYPES[entry.typeIndex],generation=loadGeneration;target.replaceChildren();
  if(type.chapter2Art){const image=el('img');image.src='assets/admin127/monsters/'+type.id+'.webp';image.alt=type.name;image.decoding='async';target.append(image);return;}
  if(!type.sheet)return;
  try{const [meta,image]=await Promise.all([fetch('assets/frontier38/'+type.sheet+'.json').then(r=>r.json()),new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='assets/frontier38/'+type.sheet+'.png';})]);if(generation!==loadGeneration||!target.isConnected)return;const [x,y,w,h]=meta.rects[type.row*8],canvas=el('canvas');canvas.width=canvas.height=320;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',type.name);const scale=Math.min(280/w,280/h),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(image,x,y,w,h,(320-w*scale)/2,300-h*scale,w*scale,h*scale);target.append(canvas);}catch{if(generation===loadGeneration)target.append(el('span','','ภาพบอสยังโหลดไม่สำเร็จ'));}
 }
 function draw(){
  for(const b of dialog.querySelectorAll('[data-boss-tab]'))b.setAttribute('aria-selected',String(b.dataset.bossTab===tab));$('boss-browser-catalog').hidden=tab==='results';$('boss-browser-results').hidden=tab!=='results';$('boss-directory-state').hidden=tab==='results';
  if(tab==='results'){results.dialog.hidden=false;return;}
  const visible=entries.filter(e=>e.group===tab);if(!visible.some(e=>e.id===selected))selected=visible[0]?.id;loadGeneration++;
  const list=$('boss-browser-list');list.replaceChildren();for(const entry of visible){const type=MONSTER_TYPES[entry.typeIndex],b=el('button','boss-directory-row');b.type='button';b.dataset.boss=entry.id;b.setAttribute('aria-pressed',String(entry.id===selected));const art=el('span','boss-list-portrait'),text=el('span','boss-list-copy'),timer=el('small','boss-list-clock',status(entry).text);timer.dataset.timer=entry.id;text.append(el('strong','',type.name),el('small','',`Lv.${type.level??1} · ${entry.mapName}`),timer);b.append(art,text);b.onclick=()=>{selected=entry.id;draw();};list.append(b);portrait(entry,art);}
  const entry=visible.find(e=>e.id===selected),detail=$('boss-browser-detail');detail.replaceChildren();if(!entry){detail.append(el('p','','ยังไม่มีบอสในหมวดนี้'));return;}
  const type=MONSTER_TYPES[entry.typeIndex],hero=el('section','boss-hero'),badge=el('span','boss-kind',entry.group==='mvp'?'MVP':'MINI'),name=el('h3','',type.name),art=el('div','boss-hero-art'),time=el('span','boss-detail-clock',status(entry).text);time.dataset.timer=entry.id;hero.append(badge,name,art,time);detail.append(hero);portrait(entry,art);
  const stats=el('div','boss-quick-stats');for(const [label,value]of [['เลเวล',type.level??1],['พลังชีวิต',format(type.hp)],['พลังโจมตี',format(type.damage)]]){const s=el('span');s.append(el('small','',label),el('b','',value));stats.append(s);}detail.append(stats);
  const place=el('section','boss-location');place.append(el('small','','ถิ่นที่ปรากฏ'),el('strong','',entry.mapName),el('p','',entry.instance?'ปรากฏตามรอบดันเจี้ยน':'รอบเกิด '+format((type.respawn??12)/60)+' นาที · ใช้สถานะของแนลที่กำลังเล่น'));
  const travel=el('button','boss-travel',entry.mapId===map.id?'อยู่ในแผนที่นี้':'เดินทางไปแผนที่นี้');travel.type='button';travel.disabled=entry.mapId===map.id||entry.instance||!game.online;travel.onclick=()=>{dialog.close();worldUI.travelTo(entry.mapId);};place.append(travel);detail.append(place);
  const traits=el('div','boss-traits'),behaviour=MONSTER_BEHAVIOUR[type.id]??{};for(const text of [type.awakened?'ร่างทรง':null,type.worldBoss?'บอสประจำแผนที่':null,type.boss?'ต้านทานผลักและตรึง':null,behaviour.slam?'ทุบพื้นวงกว้าง':null,behaviour.enrage?'คลั่งเมื่อเลือดต่ำ':null,behaviour.leap?'กระโจนโจมตี':null,behaviour.skirmish?'โจมตีแล้วถอย':null].filter(Boolean))traits.append(el('span','',text));detail.append(traits);
  const drops=el('section','boss-drop-section');drops.append(el('h4','','ของดรอป'),el('small','','อัตราพื้นฐานต่อชิ้น · อาจปรับตามกิจกรรมและค่าที่แอดมินตั้งไว้'));const grid=el('div','boss-drops');
  for(const [id,chance,count=1]of DROPS[type.id]?.items??[]){const def=itemDef(id);if(!def)continue;const item=el('div','boss-drop'),i=el('i','item-icon');i.style.cssText=iconStyle(id);i.setAttribute('aria-hidden','true');item.title=def.name+' · '+def.text;item.append(i,el('span','',def.name),el('small','',`${(chance*100).toLocaleString(undefined,{maximumFractionDigits:3})}%${count>1?' ×'+count:''}`));grid.append(item);}drops.append(grid);detail.append(drops);
  const last=results.results.find(r=>r.bossId===entry.bossId&&r.mapId===entry.mapId);if(last?.rows[0]){const previous=el('button','boss-previous','ผลล่าสุด · '+last.rows[0].name+' ทำดาเมจสูงสุด');previous.type='button';previous.onclick=()=>results.open(last.encounterId);detail.append(previous);}
  tick();
 }
 function tick(){if(!dialog.open||tab==='results')return;const connected=game.online,stale=performance.now()-receivedAt>12000;const state=$('boss-directory-state');state.textContent=!connected?'ออฟไลน์ · แสดงข้อมูลบอสพื้นฐาน':!report?'กำลังตรวจสถานะบอสจากเซิร์ฟเวอร์…':`CH ${report.channel} · `+(stale?'กำลังอัปเดตสถานะ…':'สถานะจากเซิร์ฟเวอร์ · อัปเดตอัตโนมัติ');
  for(const node of dialog.querySelectorAll('[data-timer]')){const entry=entries.find(e=>e.id===node.dataset.timer),s=status(entry);node.textContent=s.text;node.dataset.alive=String(s.time===0&&s.row?.alive!==false);}
  request();
 }
 function show(){game.clearInput();draw();if(!dialog.open){dispatchEvent(new CustomEvent('hud-panel-opening'));dialog.showModal();}request();}
 button.onclick=()=>{if(dialog.open){dialog.close();return;}tab='mvp';show();};$('boss-browser-close').onclick=()=>dialog.close();
 for(const b of dialog.querySelectorAll('[data-boss-tab]'))b.onclick=()=>{tab=b.dataset.bossTab;if(tab==='results')results.open();else draw();};
 addEventListener('open-boss-browser',()=>{tab='mvp';show();});
 game.onEvent(e=>{if(e.type==='bossDirectory'){report=e;lastChannel=e.channel;receivedAt=performance.now();tick();}});
 const timer=setInterval(tick,1000);dialog.addEventListener('close',()=>{game.clearInput();button.focus({preventScroll:true});});addEventListener('pagehide',e=>{if(!e.persisted)clearInterval(timer);});
 return {dialog,results};
}

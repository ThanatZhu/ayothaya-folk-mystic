import {bindStatHold} from './stat-hold.js';
import {createStatResetUI} from './stat-reset-ui.js?v=surfaces222';
// Allocation and explanations only. Equipment actions are exposed through the bag.
// Online the server owns changes; offline gear and stats retain their existing shared owner.
import {statPath,STATS,STAT_MAX,STAT_LABEL,STAT_HINT,raiseCost,statPoints,normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,insertCard} from './character-stats.js?v=tier167';
import {ITEM_ERRORS,itemDef,foodBuff} from './items.js?v=stat-reset189';
import {baseProgress} from './experience.js?v=105.3';
import {openHudPanel} from './hud-panels.js?v=34';
import {createCardSlotUI} from './card-slot-ui.js?v=cards156';
import {statTip} from './stat-tips.js?v=tips210';

const $=id=>document.getElementById(id);

export function createStatusUI({game,account,bagUI}){
 const world=game.world,key='ayothaya-status:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const classId=account?.character?.classId??world.profession.id;
 const path=statPath(account?.character??{classId});let local={stats:normalizeStats(null),gear:normalizeGear(null),path};
 try{const v=JSON.parse(localStorage.getItem(key));if(v)local={stats:normalizeStats(v.path&&v.path!==path?null:v.stats),gear:normalizeGear(v.gear),path};}catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(local));}catch{}};if(!account?.cloud)save();
 const who=()=>({classId,level:baseProgress(world).level,reborn:world.rebirth??0});
 const view=()=>game.online?{stats:normalizeStats(world.stats),gear:normalizeGear(world.gear),points:world.statPoints??0,derived:world.derivedView??deriveStats({...who()})}
  :{...local,points:statPoints(local.stats,who().level,who().reborn),derived:deriveStats({...who(),...local,pet:world.petBonus,food:foodBuff(world)})};
 const fail=code=>world.notice(ITEM_ERRORS[code]??code);

 // Offline: keep the local world's combat numbers in step with level / stats / gear.
 let appliedSig='';
 function applyOffline(){
  if(game.online)return;
  const fit=dropInvalidGear(bagUI.bag(),local.gear,who());
  if(JSON.stringify(fit.gear)!==JSON.stringify(local.gear)){local.gear=fit.gear;bagUI.setLocal(fit.bag);save();}
  const food=foodBuff(world),sig=JSON.stringify([who(),local,world.petBonus,food]);if(sig===appliedSig)return;appliedSig=sig;
  world.applyDerived(deriveStats({...who(),...local,pet:world.petBonus,food}));
 }
 function raise(stat){
  if(!canRaise(stat))return false;
  if(game.online)return world.statUp?.(stat)??false;
  try{local.stats=raiseStat(local.stats,stat,who().level,who().reborn);save();applyOffline();render(true);return true;}catch(e){fail(e.message);return false;}
 }
 function canRaise(stat){const v=view();return STATS.includes(stat)&&v.stats[stat]<STAT_MAX&&v.points>=raiseCost(v.stats[stat]);}
 function wear(id){
  if(game.online){if(!world.equipGear?.(id))world.notice('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ · ลองอีกครั้ง ('+(world.netState?.()??'no-net')+')');return;}
  try{const r=equipGear(bagUI.bag(),local.gear,id,who());local.gear=r.gear;bagUI.setLocal(r.bag);save();applyOffline();world.notice('สวมใส่ '+itemDef(id).name);render(true);}catch(e){fail(e.message);}
 }
 // 0.45: slot a card from the bag into a worn piece (permanent).
 function slotCard(slot,card){
  if(!card)return false;
  if(game.online)return world.insertCard?.(slot,card)??false;
  try{const r=insertCard(bagUI.bag(),local.gear,slot,card);local.gear=r.gear;bagUI.setLocal(r.bag);save();applyOffline();world.notice('ใส่การ์ดแล้ว · '+itemDef(r.gear[slot]).name);render(true);return true;}catch(e){fail(e.message);return false;}
 }
 function takeOff(slot){
  if(game.online){world.unequipGear?.(slot);return;}
  try{const r=unequipGear(bagUI.bag(),local.gear,slot);local.gear=r.gear;bagUI.setLocal(r.bag);save();applyOffline();render(true);}catch(e){fail(e.message);}
 }
 bagUI.onReplaceGear=g=>{local.gear=normalizeGear(g);save();applyOffline();render(true);};
 bagUI.onWear=wear;bagUI.gearView=()=>view().gear;bagUI.onTakeOff=takeOff; // 0.83 the bag shows and removes worn gear

 const menuButton=document.createElement('button');menuButton.id='menu-status';menuButton.type='button';menuButton.title='สถานะ';menuButton.setAttribute('aria-label','สถานะ');
 menuButton.innerHTML='<i><b class="status-glyph" aria-hidden="true">✦</b></i><span>สถานะ</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menuButton,$('menu-bag')??$('menu-players')??null);
 const dot=document.createElement('b');dot.className='menu-dot';dot.hidden=true;menuButton.append(dot);
 const dialog=document.createElement('dialog');dialog.id='status-window';dialog.setAttribute('aria-labelledby','status-title');
 dialog.innerHTML='<header><h2 id="status-title">สถานะ</h2><b id="status-points"></b><button class="mp-icon" id="status-close" aria-label="ปิดหน้าสถานะ">×</button></header><div class="status-columns237"><section class="status-allocation237" aria-label="อัปค่าสถานะ"><h3>อัปค่าสถานะ</h3><p class="status-hint237">กดค้างที่ปุ่ม + เพื่อเพิ่มต่อเนื่อง</p><ol id="status-stats"></ol><h3>ค่าพลังรวม</h3><dl id="status-derived"></dl></section><section class="status-explanations237" aria-label="รายละเอียดค่าสถานะ"><h3>รายละเอียดค่าสถานะ</h3><p class="status-hint237">ผลของแต่ละค่า และผลเมื่ออัปเพิ่มอีก 1 แต้ม</p><div id="status-details" tabindex="0" aria-label="คำอธิบาย STR AGI VIT INT DEX LUK"></div></section></div>';
 ($('game-shell')??document.body).append(dialog);
 const resetUI=createStatResetUI({game,bagUI,stats:()=>view().stats,onOpen:()=>hold.stop(),resetOffline(){local.stats=normalizeStats(null);save();applyOffline();render(true);}});
 const hold=bindStatHold($('status-stats'),{read:stat=>({value:view().stats[stat],allowed:canRaise(stat)}),raise,enabled:()=>dialog.open&&!resetUI.busy&&(!game.online||world.netState?.().startsWith('online/'))});
 dialog.addEventListener('close',()=>hold.stop());dialog.addEventListener('cancel',()=>hold.stop());
 // Permanent help beside allocation; no floating tooltip over the stat rows.
 if(!document.querySelector('link[data-status-bag237]')){const css=document.createElement('link');css.rel='stylesheet';css.href='status-bag237.css';css.dataset.statusBag237='';document.head.append(css);}
 let selectedStat='str';
 function selectStat(row,scroll=false){const stat=row?.querySelector('[data-stat]')?.dataset.stat;if(!stat)return;selectedStat=stat;
  dialog.querySelectorAll('#status-stats > li').forEach(n=>n.classList.toggle('stat-selected237',n===row));
  dialog.querySelectorAll('[data-stat-detail]').forEach(n=>{n.classList.toggle('stat-selected237',n.dataset.statDetail===stat);if(scroll&&n.dataset.statDetail===stat)n.scrollIntoView({block:'nearest',behavior:'instant'});});
 }
 const statList=$('status-stats');
 statList.addEventListener('pointerover',e=>{if(e.pointerType!=='touch')selectStat(e.target.closest('li'));});
 statList.addEventListener('focusin',e=>selectStat(e.target.closest('li')));
 statList.addEventListener('click',e=>{if(!e.target.closest('button'))selectStat(e.target.closest('li'),true);});
 statList.addEventListener('keydown',e=>{if(e.target.tagName==='LI'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectStat(e.target,true);}});
 const cardPicker=createCardSlotUI({game,bag:()=>bagUI.bag(),gear:()=>view().gear,onInsert:slotCard});
 bagUI.openCardPicker=(slot,button)=>cardPicker.open(slot,button);
 dialog.querySelector('#status-close').onclick=()=>dialog.close();
 menuButton.onclick=()=>{if(dialog.open)dialog.close();else{game.clearInput();openHudPanel(dialog);render(true);}};
 addEventListener('keydown',e=>{if(e.code!=='KeyC'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select')||document.querySelector('dialog:modal'))return;e.preventDefault();menuButton.click();});

 let shown='';
 function render(force=false){
  const v=view(),sig=JSON.stringify([v,dialog.open]);if(!force&&sig===shown)return;shown=sig;
  dot.hidden=!(v.points>0);
  if(!dialog.open)return;
  $('status-points').textContent='แต้มสถานะ '+v.points;
  const total=v.derived.total??v.stats;
  // 0.104 permanent rebirth bonus, shown green apart from gear/pet/food
  const reborn=v.derived.rebirthBonus??0,rebirthTag=reborn?` <em class="rebirth-bonus" title="โบนัสจุติถาวร">+${reborn}</em>`:'';
  const statMarkup=STATS.map(k=>{const cost=raiseCost(v.stats[k]),bonus=Math.round(((total[k]??v.stats[k])-v.stats[k]-reborn)*100)/100;
   return `<li tabindex="0" aria-describedby="stat-detail-${k}" aria-label="${STAT_LABEL[k]} · ${STAT_HINT[k]}"><b>${STAT_LABEL[k]}</b><span>${v.stats[k]+rebirthTag}${bonus?` <em>+${bonus}</em>`:''}</span><small>${STAT_HINT[k]}</small><button type="button" data-stat="${k}" title="กดค้างเพื่อเพิ่มต่อเนื่อง" ${v.points<cost||v.stats[k]>=STAT_MAX?'disabled':''} aria-label="เพิ่ม ${STAT_LABEL[k]}">+<i>${cost}</i></button></li>`;}).join('');
  // Preserve pressed buttons and keyboard focus across server snapshots.
  const list=$('status-stats');
  if(!list.children.length)list.innerHTML=statMarkup;
  else{const template=document.createElement('template');template.innerHTML=statMarkup;[...template.content.children].forEach((row,i)=>{const target=list.children[i];target.querySelector('span').innerHTML=row.querySelector('span').innerHTML;const old=target.querySelector('button'),next=row.querySelector('button');old.disabled=next.disabled;old.innerHTML=next.innerHTML;});}
  const d=v.derived,pct=n=>Math.round(n*100)+'%';
  $('status-derived').innerHTML=[['HP สูงสุด',d.maxHp],['MP สูงสุด',d.maxMp],[d.magic?'MATK':'ATK',d.magic?d.matk:d.atk],['DEF',d.def],['หลบหลีก',pct(d.flee)],['คริติคอล',pct(d.crit)],['ความเร็วโจมตี',Math.round(100/d.delay)+'%']].map(([k,n])=>`<div><dt>${k}</dt><dd>${n}</dd></div>`).join('');
  const details=$('status-details'),oldScroll=details.scrollTop;
  details.innerHTML=STATS.map(stat=>{const t=statTip(stat,{who:who(),stats:v.stats,gear:v.gear});return `<article id="stat-detail-${stat}" data-stat-detail="${stat}"><h4>${t.title} · ${STAT_HINT[stat]}</h4><ul>${t.rules.map(line=>'<li>'+line+'</li>').join('')}</ul>${t.gains.length?'<p class="stat-next237"><small>อัปเพิ่ม 1 แต้ม</small> '+t.gains.map(([k,n])=>'<span>'+k+' '+n+'</span>').join(' · ')+'</p>':''}<p class="stat-cost237">${t.raise}</p></article>`;}).join('');
  details.scrollTop=oldScroll;selectStat([...list.children].find(row=>row.querySelector('[data-stat]')?.dataset.stat===selectedStat));
 }
 applyOffline();render(true);
 // Refine window hooks (offline gear lives here).
 // 0.98 what the tutorial quests can see (offline; the realm builds the same online)
 const storyContext=()=>{const g=view().gear,worn=Object.values(g).filter(Boolean).map(id=>itemDef(id));return {level:who().level,weapon:!!g.weapon,refined:worn.some(d=>d?.refine>0),carded:worn.some(d=>d?.card),job:classId!=='novice',skilled:(world.skillLevels??[]).reduce((n,v)=>n+v,0)>2,auto:!!world.auto,guild:false};};
 return {storyContext,update(){applyOffline();render();hold.update();resetUI.update();cardPicker.update();},view,gear:()=>game.online?normalizeGear(world.gear):local.gear,setGear(g){local.gear=normalizeGear(g);save();applyOffline();render(true);},who};
}

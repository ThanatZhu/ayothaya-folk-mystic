import {bindStatHold} from './stat-hold.js';
import {createStatResetUI} from './stat-reset-ui.js?v=surfaces222';
// Allocation and combat totals only. Equipment actions are exposed through the bag.
// Online the server owns changes; offline gear and stats retain their existing shared owner.
import {statPath,STATS,STAT_MAX,STAT_LABEL,STAT_HINT,raiseCost,statPoints,normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,insertCard} from './character-stats.js?v=tier167';
import {ITEM_ERRORS,itemDef,foodBuff} from './items.js?v=stat-reset189';
import {baseProgress} from './experience.js?v=105.3';
import {openHudPanel} from './hud-panels.js?v=34';
import {createCardSlotUI} from './card-slot-ui.js?v=cards156';
import {statTip} from './stat-tips.js?v=tips210';
import {statusMetrics} from './status-metrics238.js';

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
 dialog.innerHTML='<header><h2 id="status-title">สถานะ</h2><b id="status-points"></b><button class="mp-icon" id="status-close" aria-label="ปิดหน้าสถานะ">×</button></header><div class="status-columns237"><section class="status-allocation237" aria-label="อัปค่าสถานะ"><h3>อัปค่าสถานะ</h3><p class="status-hint237">กดค้างที่ปุ่ม + เพื่อเพิ่มต่อเนื่อง</p><ol id="status-stats"></ol></section><section class="status-explanations237" aria-label="ค่าพลังรวม"><h3>ค่าพลังรวม</h3><p class="status-hint237">ชี้หรือแตะที่ค่าเพื่อดูรายละเอียด · อัปเดตตามค่าตัวละคร</p><div id="status-details" tabindex="0" aria-label="ค่าพลังรวมทุกหมวด"></div></section></div>';
 ($('game-shell')??document.body).append(dialog);
 const resetUI=createStatResetUI({game,bagUI,stats:()=>view().stats,onOpen:()=>hold.stop(),resetOffline(){local.stats=normalizeStats(null);save();applyOffline();render(true);}});
 const hold=bindStatHold($('status-stats'),{read:stat=>({value:view().stats[stat],allowed:canRaise(stat)}),raise,enabled:()=>dialog.open&&!resetUI.busy&&(!game.online||world.netState?.().startsWith('online/'))});
 dialog.addEventListener('close',()=>hold.stop());dialog.addEventListener('cancel',()=>hold.stop());
 // Fixed-size, clamped help stays beside the hovered row; allocation buttons remain stable.
 if(!document.querySelector('link[data-status-bag237]')){const css=document.createElement('link');css.rel='stylesheet';css.href='status-bag237.css';css.dataset.statusBag237='';document.head.append(css);}
 const tip=document.createElement('aside');tip.id='status-hover238';tip.hidden=true;tip.setAttribute('role','tooltip');dialog.append(tip);
 let tipTarget=null,tipKey=null,tipHideTimer=0,metricRows=new Map();
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function hideTip(){clearTimeout(tipHideTimer);tip.hidden=true;if(tipTarget)tipTarget.removeAttribute('aria-describedby');tipTarget=null;tipKey=null;}
 function placeTip(){if(!tipTarget?.isConnected)return hideTip();const r=tipTarget.getBoundingClientRect(),w=innerWidth,h=innerHeight;tip.style.width=Math.min(320,w-24)+'px';tip.style.maxHeight=Math.max(80,h-24)+'px';tip.style.left='0px';tip.style.top='0px';const box=tip.getBoundingClientRect(),sx=box.width/tip.offsetWidth||1,sy=box.height/tip.offsetHeight||1;let x=r.right+10,y=r.top;
  if(x+box.width>w-12){if(r.left-box.width-10>=12)x=r.left-box.width-10;else{x=Math.max(12,Math.min(r.left,w-box.width-12));y=r.bottom+8;if(y+box.height>h-12)y=r.top-box.height-8;}}
  tip.style.left=(Math.max(12,Math.min(x,w-box.width-12))-box.left)/sx+'px';tip.style.top=(Math.max(12,Math.min(y,h-box.height-12))-box.top)/sy+'px';
 }
 function showTip(target){clearTimeout(tipHideTimer);if(!target)return;const stat=target.dataset.statHelp,metric=metricRows.get(target.dataset.metric);if(!stat&&!metric)return;
  if(tipTarget&&tipTarget!==target)tipTarget.removeAttribute('aria-describedby');tipTarget=target;tipKey=stat?'stat:'+stat:'metric:'+target.dataset.metric;
  if(stat){const v=view(),t=statTip(stat,{who:who(),stats:v.stats,gear:v.gear});tip.innerHTML='<strong>'+escape(t.title+' · '+STAT_HINT[stat])+'</strong><ul>'+t.rules.map(line=>'<li>'+escape(line)+'</li>').join('')+'</ul>'+(t.gains.length?'<p class="stat-next237">อัปเพิ่ม 1 แต้ม: '+t.gains.map(([k,n])=>escape(k+' '+n)).join(' · ')+'</p>':'')+'<p>'+escape(t.raise)+'</p>';}
  else tip.innerHTML='<strong>'+escape(metric.label)+' · '+escape(metric.value)+'</strong><p>'+escape(metric.help)+'</p>';
  tip.hidden=false;target.setAttribute('aria-describedby',tip.id);placeTip();
 }
 const helpTarget=e=>e.target.closest?.('[data-stat-help],[data-metric]');
 dialog.addEventListener('pointerover',e=>{if(e.pointerType!=='touch'){const target=helpTarget(e);if(target&&target!==tipTarget)showTip(target);}});
 dialog.addEventListener('pointerout',e=>{if(e.pointerType!=='touch'&&tipTarget&&!tipTarget.contains(e.relatedTarget)&&!tip.contains(e.relatedTarget)){clearTimeout(tipHideTimer);tipHideTimer=setTimeout(hideTip,150);}});
 tip.addEventListener('pointerenter',()=>clearTimeout(tipHideTimer));tip.addEventListener('pointerleave',hideTip);
 dialog.addEventListener('focusin',e=>showTip(helpTarget(e)));dialog.addEventListener('focusout',e=>{if(!tip.contains(e.relatedTarget))hideTip();});
 dialog.addEventListener('click',e=>{const target=helpTarget(e);if(!target||e.target.closest('button[data-stat]'))return;showTip(target);});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'&&!tip.hidden){e.preventDefault();e.stopPropagation();hideTip();}else if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-stat-help]')){e.preventDefault();showTip(e.target);}});
 dialog.addEventListener('close',hideTip);dialog.addEventListener('scroll',e=>{if(e.target!==tip&&!tip.contains(e.target))hideTip();},true);addEventListener('resize',hideTip);
 document.addEventListener('pointerdown',e=>{if(tipTarget&&!tipTarget.contains(e.target)&&!tip.contains(e.target))hideTip();});
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
   return `<li tabindex="0" data-stat-help="${k}" aria-label="${STAT_LABEL[k]} · ${STAT_HINT[k]}"><b>${STAT_LABEL[k]}</b><span>${v.stats[k]+rebirthTag}${bonus?` <em>+${bonus}</em>`:''}</span><small>${STAT_HINT[k]}</small><button type="button" data-stat="${k}" title="กดค้างเพื่อเพิ่มต่อเนื่อง" ${v.points<cost||v.stats[k]>=STAT_MAX?'disabled':''} aria-label="เพิ่ม ${STAT_LABEL[k]}">+<i>${cost}</i></button></li>`;}).join('');
  // Preserve pressed buttons and keyboard focus across server snapshots.
  const list=$('status-stats');
  if(!list.children.length)list.innerHTML=statMarkup;
  else{const template=document.createElement('template');template.innerHTML=statMarkup;[...template.content.children].forEach((row,i)=>{const target=list.children[i];target.querySelector('span').innerHTML=row.querySelector('span').innerHTML;const old=target.querySelector('button'),next=row.querySelector('button');old.disabled=next.disabled;old.innerHTML=next.innerHTML;});}
  const groups=statusMetrics(game.online?world.derivedView:v.derived),details=$('status-details');metricRows=new Map(groups.flatMap(g=>g.rows.map(row=>[row.key,row])));
  if(!groups.length){details.textContent='กำลังโหลดค่าพลังจากเซิร์ฟเวอร์…';return;}
  if(!details.querySelector('[data-metric]'))details.innerHTML=groups.map(g=>'<section class="status-metric-group238"><h4>'+escape(g.title)+'</h4><div class="status-metric-grid238">'+g.rows.map(row=>'<button type="button" data-metric="'+row.key+'"><span>'+escape(row.label)+'</span><b>'+escape(row.value)+'</b></button>').join('')+'</div></section>').join('');
  else for(const row of metricRows.values()){const target=details.querySelector('[data-metric="'+row.key+'"]');if(target)target.querySelector('b').textContent=row.value;}
  if(tipKey&&tipTarget)showTip(tipTarget);
 }
 applyOffline();render(true);
 // Refine window hooks (offline gear lives here).
 // 0.98 what the tutorial quests can see (offline; the realm builds the same online)
 const storyContext=()=>{const g=view().gear,worn=Object.values(g).filter(Boolean).map(id=>itemDef(id));return {level:who().level,weapon:!!g.weapon,refined:worn.some(d=>d?.refine>0),carded:worn.some(d=>d?.card),job:classId!=='novice',skilled:(world.skillLevels??[]).reduce((n,v)=>n+v,0)>2,auto:!!world.auto,guild:false};};
 return {storyContext,update(){applyOffline();render();hold.update();resetUI.update();cardPicker.update();},view,gear:()=>game.online?normalizeGear(world.gear):local.gear,setGear(g){local.gear=normalizeGear(g);save();applyOffline();render(true);},who};
}

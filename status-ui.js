import {bindStatHold} from './stat-hold.js';
import {createStatResetUI} from './stat-reset-ui.js';
import {refineTierBadge} from './refine-tier-ui.js';
// Status window (สถานะ · C): STR AGI VIT INT DEX LUK with status points, combat numbers, and the three
// stat-gear slots. Online the server validates and owns everything; offline guests keep it in this browser.
import {statPath,STATS,STAT_MAX,STAT_LABEL,STAT_HINT,GEAR_SLOTS,raiseCost,statPoints,normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,insertCard} from './character-stats.js?v=tier167';
import {ITEMS,ITEM_ERRORS,itemDef,foodBuff} from './items.js?v=stat-reset189';
import {baseProgress} from './experience.js?v=105.3';
import {iconStyle} from './bag-ui.js?v=107';
import {openHudPanel} from './hud-panels.js?v=34';
import {createCardSlotUI,cardArt,cardEffectText} from './card-slot-ui.js?v=cards156';
import {statTip} from './stat-tips.js?v=tips210';

const $=id=>document.getElementById(id);
const SLOT_LABEL={weapon:'อาวุธ',head:'หมวก',armor:'เสื้อเกราะ',garment:'ผ้าคลุม',shoes:'รองเท้า',accessory:'เครื่องประดับ'};

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
 bagUI.onWear=wear;bagUI.gearView=()=>view().gear;bagUI.onTakeOff=takeOff; // 0.83 the bag shows and removes worn gear

 const menuButton=document.createElement('button');menuButton.id='menu-status';menuButton.type='button';menuButton.title='สถานะ';menuButton.setAttribute('aria-label','สถานะ');
 menuButton.innerHTML='<i><b class="status-glyph" aria-hidden="true">✦</b></i><span>สถานะ</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menuButton,$('menu-bag')??$('menu-players')??null);
 const dot=document.createElement('b');dot.className='menu-dot';dot.hidden=true;menuButton.append(dot);
 const dialog=document.createElement('dialog');dialog.id='status-window';dialog.setAttribute('aria-labelledby','status-title');
 dialog.innerHTML='<header><h2 id="status-title">สถานะ</h2><b id="status-points"></b><button class="mp-icon" id="status-close" aria-label="ปิดหน้าสถานะ">×</button></header><ol id="status-stats"></ol><dl id="status-derived"></dl><h3>อุปกรณ์สวมใส่ <small>ค่าพลังจริง · ชุดแต่งกายเลือกแยกที่หน้าอุปกรณ์</small></h3><ul id="status-gear"></ul>';
 ($('game-shell')??document.body).append(dialog);
 const resetUI=createStatResetUI({game,bagUI,stats:()=>view().stats,onOpen:()=>hold.stop(),resetOffline(){local.stats=normalizeStats(null);save();applyOffline();render(true);}});
 const hold=bindStatHold($('status-stats'),{read:stat=>({value:view().stats[stat],allowed:canRaise(stat)}),raise,enabled:()=>dialog.open&&!resetUI.busy&&(!game.online||world.netState?.().startsWith('online/'))});
 dialog.addEventListener('close',()=>{hold.stop();hideTip();});dialog.addEventListener('cancel',()=>hold.stop());
 // 0.122 what a stat does: hover (mouse), focus (keyboard) or tap the row (touch); the + button still raises
 if(!document.querySelector('link[data-stat-tips]')){const css=document.createElement('link');css.rel='stylesheet';css.href='stat-tips.css?v=tips210';css.dataset.statTips='';document.head.append(css);}
 const tip=document.createElement('div');tip.id='stat-tip';tip.hidden=true;tip.setAttribute('role','tooltip');dialog.append(tip);
 let tipStat=null;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 function showTip(li){
  const stat=li?.querySelector('button[data-stat]')?.dataset.stat;if(!stat)return;
  const v=view(),t=statTip(stat,{who:who(),stats:v.stats,gear:v.gear}),rules=el('ul');
  for(const line of t.rules)rules.append(el('li',line));
  tip.replaceChildren(el('strong',t.title+' · '+STAT_HINT[stat]),rules);
  if(t.gains.length){const gains=el('p',null,'stat-tip-gains');gains.append(el('small','อัปอีก 1 แต้มตอนนี้ได้'),...t.gains.map(([k,n])=>el('span',k+' '+n)));tip.append(gains);}
  tip.append(el('p',t.raise,'stat-tip-cost'));
  tipStat=stat;tip.hidden=false;
  tip.style.left=li.offsetLeft+'px';tip.style.width=li.offsetWidth+'px';
  const top=li.offsetTop+li.offsetHeight+4,room=dialog.scrollHeight-tip.offsetHeight-6;tip.style.top=Math.max(4,Math.min(top,room))+'px';
 }
 function hideTip(){tip.hidden=true;tipStat=null;}
 const statList=$('status-stats');
 statList.addEventListener('pointerover',e=>{if(e.pointerType!=='touch')showTip(e.target.closest('li'));});
 statList.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')hideTip();});
 statList.addEventListener('focusin',e=>showTip(e.target.closest('li')));statList.addEventListener('focusout',hideTip);
 statList.addEventListener('click',e=>{if(e.target.closest('button'))return;const li=e.target.closest('li');if(!li)return;const stat=li.querySelector('button[data-stat]')?.dataset.stat;if(tipStat===stat)hideTip();else showTip(li);});
 const cardPicker=createCardSlotUI({game,bag:()=>bagUI.bag(),gear:()=>view().gear,onInsert:slotCard});
 dialog.querySelector('#status-close').onclick=()=>dialog.close();
 menuButton.onclick=()=>{if(dialog.open)dialog.close();else{game.clearInput();openHudPanel(dialog);render(true);}};
 addEventListener('keydown',e=>{if(e.code!=='KeyC'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select')||document.querySelector('dialog:modal'))return;e.preventDefault();menuButton.click();});

 let shown='';
 function render(force=false){
  const v=view(),sig=JSON.stringify([v,dialog.open,Object.entries(bagUI.bag().items??{}).filter(([id])=>itemDef(id)?.kind==='card')]);if(!force&&sig===shown)return;shown=sig;
  dot.hidden=!(v.points>0);
  if(!dialog.open)return;
  $('status-points').textContent='แต้มสถานะ '+v.points;
  const total=v.derived.total??v.stats;
  // 0.104 permanent rebirth bonus, shown green apart from gear/pet/food
  const reborn=v.derived.rebirthBonus??0,rebirthTag=reborn?` <em class="rebirth-bonus" title="โบนัสจุติถาวร">+${reborn}</em>`:'';
  const statMarkup=STATS.map(k=>{const cost=raiseCost(v.stats[k]),bonus=Math.round(((total[k]??v.stats[k])-v.stats[k]-reborn)*100)/100;
   return `<li><b>${STAT_LABEL[k]}</b><span>${v.stats[k]+rebirthTag}${bonus?` <em>+${bonus}</em>`:''}</span><small>${STAT_HINT[k]}</small><button type="button" data-stat="${k}" title="กดค้างเพื่อเพิ่มต่อเนื่อง" ${v.points<cost||v.stats[k]>=STAT_MAX?'disabled':''} aria-label="เพิ่ม ${STAT_LABEL[k]}">+<i>${cost}</i></button></li>`;}).join('');
  // Preserve pressed buttons and keyboard focus across server snapshots.
  const list=$('status-stats');
  if(!list.children.length)list.innerHTML=statMarkup;
  else{const template=document.createElement('template');template.innerHTML=statMarkup;[...template.content.children].forEach((row,i)=>{const target=list.children[i];target.querySelector('span').innerHTML=row.querySelector('span').innerHTML;const old=target.querySelector('button'),next=row.querySelector('button');old.disabled=next.disabled;old.innerHTML=next.innerHTML;});}
  if(tipStat)showTip([...list.children].find(li=>li.querySelector('button[data-stat]')?.dataset.stat===tipStat));
  const d=v.derived,pct=n=>Math.round(n*100)+'%';
  $('status-derived').innerHTML=[['HP สูงสุด',d.maxHp],['MP สูงสุด',d.maxMp],[d.magic?'MATK':'ATK',d.magic?d.matk:d.atk],['DEF',d.def],['หลบหลีก',pct(d.flee)],['คริติคอล',pct(d.crit)],['ความเร็วโจมตี',Math.round(100/d.delay)+'%']].map(([k,n])=>`<div><dt>${k}</dt><dd>${n}</dd></div>`).join('');
  const bagItems=bagUI.bag().items??{};
  $('status-gear').innerHTML=GEAR_SLOTS.map(slot=>{const id=v.gear[slot],it=id&&itemDef(id);
   const cards=Object.keys(bagItems).filter(c=>itemDef(c)?.kind==='card'&&itemDef(c).slot===slot);
   const cardRow=it&&it.slots!==0?(it.card?`<div class="card-equipped">${cardArt(it.card)}<span><strong>${itemDef(it.card).name}</strong><small>${cardEffectText(it.card)}</small></span></div>`:`<span class="card-pick"><button type="button" data-slotcard="${slot}">เลือกการ์ด${cards.length?' · '+cards.length+' ชนิด':''}</button></span>`):'';
   const name=it?.card?it.name.replace(' ['+itemDef(it.card).name+']',''):it?.name;
   return `<li><i class="item-icon" style="${it?iconStyle(id):''}"></i><div><small>${SLOT_LABEL[slot]}</small><strong>${it?name:'— ว่าง —'}</strong>${refineTierBadge(it)}<em>${it?it.text:'แตะอุปกรณ์ในกระเป๋าแล้วกด สวมใส่'}</em>${cardRow}</div>${it?`<button type="button" data-off="${slot}">ถอด</button>`:''}</li>`;}).join('');
  $('status-gear').querySelectorAll('[data-slotcard]').forEach(b=>b.onclick=()=>cardPicker.open(b.dataset.slotcard,b));
  $('status-gear').querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>takeOff(b.dataset.off));
 }
 applyOffline();render(true);
 // Refine window hooks (offline gear lives here).
 // 0.98 what the tutorial quests can see (offline; the realm builds the same online)
 const storyContext=()=>{const g=view().gear,worn=Object.values(g).filter(Boolean).map(id=>itemDef(id));return {level:who().level,weapon:!!g.weapon,refined:worn.some(d=>d?.refine>0),carded:worn.some(d=>d?.card),job:classId!=='novice',skilled:(world.skillLevels??[]).reduce((n,v)=>n+v,0)>2,auto:!!world.auto,guild:false};};
 return {storyContext,update(){applyOffline();render();hold.update();resetUI.update();cardPicker.update();},view,gear:()=>game.online?normalizeGear(world.gear):local.gear,setGear(g){local.gear=normalizeGear(g);save();applyOffline();render(true);},who};
}

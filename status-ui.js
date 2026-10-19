// Status window (สถานะ · C): STR AGI VIT INT DEX LUK with status points, combat numbers, and the three
// stat-gear slots. Online the server validates and owns everything; offline guests keep it in this browser.
import {STATS,STAT_LABEL,STAT_HINT,GEAR_SLOTS,raiseCost,statPoints,normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,insertCard} from './character-stats.js?v=72';
import {ITEMS,ITEM_ERRORS,itemDef} from './items.js?v=70';
import {baseProgress} from './experience.js?v=73';
import {iconStyle} from './bag-ui.js?v=64';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const SLOT_LABEL={weapon:'อาวุธ',armor:'เสื้อเกราะ',accessory:'เครื่องประดับ'};

export function createStatusUI({game,account,bagUI}){
 const world=game.world,key='ayothaya-status:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const classId=account?.character?.classId??world.profession.id;
 let local={stats:normalizeStats(null),gear:normalizeGear(null)};
 try{const v=JSON.parse(localStorage.getItem(key));if(v)local={stats:normalizeStats(v.stats),gear:normalizeGear(v.gear)};}catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(local));}catch{}};
 const who=()=>({classId,level:baseProgress(world).level});
 const view=()=>game.online?{stats:normalizeStats(world.stats),gear:normalizeGear(world.gear),points:world.statPoints??0,derived:world.derivedView??deriveStats({...who()})}
  :{...local,points:statPoints(local.stats,who().level),derived:deriveStats({...who(),...local,pet:world.petBonus})};
 const fail=code=>world.notice(ITEM_ERRORS[code]??code);

 // Offline: keep the local world's combat numbers in step with level / stats / gear.
 let appliedSig='';
 function applyOffline(){
  if(game.online)return;
  const fit=dropInvalidGear(bagUI.bag(),local.gear,who());
  if(JSON.stringify(fit.gear)!==JSON.stringify(local.gear)){local.gear=fit.gear;bagUI.setLocal(fit.bag);save();}
  const sig=JSON.stringify([who(),local,world.petBonus]);if(sig===appliedSig)return;appliedSig=sig;
  world.applyDerived(deriveStats({...who(),...local,pet:world.petBonus}));
 }
 function raise(stat){
  if(game.online){world.statUp?.(stat);return;}
  try{local.stats=raiseStat(local.stats,stat,who().level);save();applyOffline();render(true);}catch(e){fail(e.message);}
 }
 function wear(id){
  if(game.online){world.equipGear?.(id);return;}
  try{const r=equipGear(bagUI.bag(),local.gear,id,who());local.gear=r.gear;bagUI.setLocal(r.bag);save();applyOffline();world.notice('สวมใส่ '+itemDef(id).name);render(true);}catch(e){fail(e.message);}
 }
 // 0.45: slot a card from the bag into a worn piece (permanent).
 function slotCard(slot,card){
  if(!card)return;if(!confirm('ใส่ '+itemDef(card).name+' ถาวร? ใส่แล้วถอดไม่ได้'))return;
  if(game.online){world.insertCard?.(slot,card);return;}
  try{const r=insertCard(bagUI.bag(),local.gear,slot,card);local.gear=r.gear;bagUI.setLocal(r.bag);save();applyOffline();world.notice('ใส่การ์ดแล้ว · '+itemDef(r.gear[slot]).name);render(true);}catch(e){fail(e.message);}
 }
 function takeOff(slot){
  if(game.online){world.unequipGear?.(slot);return;}
  try{const r=unequipGear(bagUI.bag(),local.gear,slot);local.gear=r.gear;bagUI.setLocal(r.bag);save();applyOffline();render(true);}catch(e){fail(e.message);}
 }
 bagUI.onWear=wear;

 const menuButton=document.createElement('button');menuButton.id='menu-status';menuButton.type='button';menuButton.title='สถานะ';menuButton.setAttribute('aria-label','สถานะ');
 menuButton.innerHTML='<i><b class="status-glyph" aria-hidden="true">✦</b></i><span>สถานะ</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menuButton,$('menu-bag')??$('menu-players')??null);
 const dot=document.createElement('b');dot.className='menu-dot';dot.hidden=true;menuButton.append(dot);
 const dialog=document.createElement('dialog');dialog.id='status-window';dialog.setAttribute('aria-labelledby','status-title');
 dialog.innerHTML='<header><h2 id="status-title">สถานะ</h2><b id="status-points"></b><button class="mp-icon" id="status-close" aria-label="ปิดหน้าสถานะ">×</button></header><ol id="status-stats"></ol><dl id="status-derived"></dl><h3>อุปกรณ์สวมใส่ <small>ค่าพลังจริง · ชุดแต่งกายเลือกแยกที่หน้าอุปกรณ์</small></h3><ul id="status-gear"></ul>';
 ($('game-shell')??document.body).append(dialog);
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
  $('status-stats').innerHTML=STATS.map(k=>{const cost=raiseCost(v.stats[k]),bonus=(total[k]??v.stats[k])-v.stats[k];
   return `<li><b>${STAT_LABEL[k]}</b><span>${v.stats[k]}${bonus?` <em>+${bonus}</em>`:''}</span><small>${STAT_HINT[k]}</small><button type="button" data-stat="${k}" ${v.points<cost?'disabled':''} aria-label="เพิ่ม ${STAT_LABEL[k]}">+<i>${cost}</i></button></li>`;}).join('');
  $('status-stats').querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>raise(b.dataset.stat));
  const d=v.derived,pct=n=>Math.round(n*100)+'%';
  $('status-derived').innerHTML=[['HP สูงสุด',d.maxHp],['MP สูงสุด',d.maxMp],[d.magic?'MATK':'ATK',d.magic?d.matk:d.atk],['DEF',d.def],['หลบหลีก',pct(d.flee)],['คริติคอล',pct(d.crit)],['ความเร็วโจมตี',Math.round(100/d.delay)+'%']].map(([k,n])=>`<div><dt>${k}</dt><dd>${n}</dd></div>`).join('');
  const bagItems=bagUI.bag().items??{};
  $('status-gear').innerHTML=GEAR_SLOTS.map(slot=>{const id=v.gear[slot],it=id&&itemDef(id);
   const cards=Object.keys(bagItems).filter(c=>itemDef(c)?.kind==='card'&&itemDef(c).slot===slot);
   const cardRow=it&&it.slots!==0?(it.card?`<small class="card-in">การ์ด: ${itemDef(it.card).text}</small>`:cards.length?`<span class="card-pick"><select data-card="${slot}">${cards.map(c=>`<option value="${c}">${itemDef(c).name}</option>`).join('')}</select><button type="button" data-slotcard="${slot}">ใส่การ์ด</button></span>`:'<small class="card-in">ช่องการ์ด ว่าง</small>'):'';
   return `<li><i class="item-icon" style="${it?iconStyle(id):''}"></i><div><small>${SLOT_LABEL[slot]}</small><strong>${it?it.name:'— ว่าง —'}</strong><em>${it?it.text:'แตะอุปกรณ์ในกระเป๋าแล้วกด สวมใส่'}</em>${cardRow}</div>${it?`<button type="button" data-off="${slot}">ถอด</button>`:''}</li>`;}).join('');
  $('status-gear').querySelectorAll('[data-slotcard]').forEach(b=>b.onclick=()=>slotCard(b.dataset.slotcard,$('status-gear').querySelector(`[data-card="${b.dataset.slotcard}"]`)?.value));
  $('status-gear').querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>takeOff(b.dataset.off));
 }
 applyOffline();render(true);
 // Refine window hooks (offline gear lives here).
 return {update(){applyOffline();render();},view,gear:()=>game.online?normalizeGear(world.gear):local.gear,setGear(g){local.gear=normalizeGear(g);save();applyOffline();render(true);},who};
}

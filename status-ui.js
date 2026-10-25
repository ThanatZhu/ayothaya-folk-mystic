// Status window (สถานะ · C): STR AGI VIT INT DEX LUK with status points, combat numbers, and the three
// stat-gear slots. Online the server validates and owns everything; offline guests keep it in this browser.
import {statPath,STATS,STAT_LABEL,STAT_HINT,GEAR_SLOTS,raiseCost,statPoints,normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,insertCard} from './character-stats.js?v=refine136';
import {ITEMS,ITEM_ERRORS,itemDef,foodBuff} from './items.js?v=refine136';
import {baseProgress} from './experience.js?v=105.3';
import {iconStyle} from './bag-ui.js?v=107';
import {openHudPanel} from './hud-panels.js?v=34';
import {createCardSlotUI,cardArt,cardEffectText} from './card-slot-ui.js?v=cards156';

const $=id=>document.getElementById(id);
const SLOT_LABEL={weapon:'อาวุธ',head:'หมวก',armor:'เสื้อเกราะ',garment:'ผ้าคลุม',shoes:'รองเท้า',accessory:'เครื่องประดับ'};

export function createStatusUI({game,account,bagUI}){
 const world=game.world,key='ayothaya-status:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const classId=account?.character?.classId??world.profession.id;
 const path=statPath(account?.character??{classId});let local={stats:normalizeStats(null),gear:normalizeGear(null),path};
 try{const v=JSON.parse(localStorage.getItem(key));if(v)local={stats:normalizeStats(v.path&&v.path!==path?null:v.stats),gear:normalizeGear(v.gear),path};}catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(local));}catch{}};if(!account?.cloud)save();
 const who=()=>({classId,level:baseProgress(world).level});
 const view=()=>game.online?{stats:normalizeStats(world.stats),gear:normalizeGear(world.gear),points:world.statPoints??0,derived:world.derivedView??deriveStats({...who()})}
  :{...local,points:statPoints(local.stats,who().level),derived:deriveStats({...who(),...local,pet:world.petBonus,food:foodBuff(world)})};
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
  if(game.online){world.statUp?.(stat);return;}
  try{local.stats=raiseStat(local.stats,stat,who().level);save();applyOffline();render(true);}catch(e){fail(e.message);}
 }
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
  $('status-stats').innerHTML=STATS.map(k=>{const cost=raiseCost(v.stats[k]),bonus=(total[k]??v.stats[k])-v.stats[k]-reborn;
   return `<li><b>${STAT_LABEL[k]}</b><span>${v.stats[k]+rebirthTag}${bonus?` <em>+${bonus}</em>`:''}</span><small>${STAT_HINT[k]}</small><button type="button" data-stat="${k}" ${v.points<cost?'disabled':''} aria-label="เพิ่ม ${STAT_LABEL[k]}">+<i>${cost}</i></button></li>`;}).join('');
  $('status-stats').querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>raise(b.dataset.stat));
  const d=v.derived,pct=n=>Math.round(n*100)+'%';
  $('status-derived').innerHTML=[['HP สูงสุด',d.maxHp],['MP สูงสุด',d.maxMp],[d.magic?'MATK':'ATK',d.magic?d.matk:d.atk],['DEF',d.def],['หลบหลีก',pct(d.flee)],['คริติคอล',pct(d.crit)],['ความเร็วโจมตี',Math.round(100/d.delay)+'%']].map(([k,n])=>`<div><dt>${k}</dt><dd>${n}</dd></div>`).join('');
  const bagItems=bagUI.bag().items??{};
  $('status-gear').innerHTML=GEAR_SLOTS.map(slot=>{const id=v.gear[slot],it=id&&itemDef(id);
   const cards=Object.keys(bagItems).filter(c=>itemDef(c)?.kind==='card'&&itemDef(c).slot===slot);
   const cardRow=it&&it.slots!==0?(it.card?`<div class="card-equipped">${cardArt(it.card)}<span><strong>${itemDef(it.card).name}</strong><small>${cardEffectText(it.card)}</small></span></div>`:`<span class="card-pick"><button type="button" data-slotcard="${slot}">เลือกการ์ด${cards.length?' · '+cards.length+' ชนิด':''}</button></span>`):'';
   const name=it?.card?it.name.replace(' ['+itemDef(it.card).name+']',''):it?.name;
   return `<li><i class="item-icon" style="${it?iconStyle(id):''}"></i><div><small>${SLOT_LABEL[slot]}</small><strong>${it?name:'— ว่าง —'}</strong><em>${it?it.text:'แตะอุปกรณ์ในกระเป๋าแล้วกด สวมใส่'}</em>${cardRow}</div>${it?`<button type="button" data-off="${slot}">ถอด</button>`:''}</li>`;}).join('');
  $('status-gear').querySelectorAll('[data-slotcard]').forEach(b=>b.onclick=()=>cardPicker.open(b.dataset.slotcard,b));
  $('status-gear').querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>takeOff(b.dataset.off));
 }
 applyOffline();render(true);
 // Refine window hooks (offline gear lives here).
 // 0.98 what the tutorial quests can see (offline; the realm builds the same online)
 const storyContext=()=>{const g=view().gear,worn=Object.values(g).filter(Boolean).map(id=>itemDef(id));return {level:who().level,weapon:!!g.weapon,refined:worn.some(d=>d?.refine>0),carded:worn.some(d=>d?.card),job:classId!=='novice',skilled:(world.skillLevels??[]).reduce((n,v)=>n+v,0)>2,auto:!!world.auto,guild:false};};
 return {storyContext,update(){applyOffline();render();cardPicker.update();},view,gear:()=>game.online?normalizeGear(world.gear):local.gear,setGear(g){local.gear=normalizeGear(g);save();applyOffline();render(true);},who};
}

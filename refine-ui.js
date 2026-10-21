// Refine window at ครูแสนดาบ (0.44) + the target's element/size badge. Online the server rolls; offline here.
import {SHOPS,ITEM_ERRORS,itemDef,normalizeBag} from './items.js?v=95';
import {REFINE_RATE,REFINE_ORE,REFINE_MAX,LEK_LAI_BONUS,refineCost,refineGear} from './refine.js?v=106.4';
import {affinityOf,ELEMENT_NAME,SIZE_NAME} from './affinity.js?v=02';
import {MONSTER_TYPES} from './combat-core.js?v=101';
import {iconStyle} from './bag-ui.js?v=106.4';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const SLOT={weapon:'อาวุธ',armor:'เสื้อเกราะ'};

export function createRefineUI({game,map,bagUI,statusUI}){
 const world=game.world;let npc=null,lek=false,guard=false,flash=null;
 const dialog=document.createElement('dialog');dialog.id='refine-window';dialog.setAttribute('aria-labelledby','refine-title');
 dialog.innerHTML='<header><h2 id="refine-title">ตีบวกอุปกรณ์</h2><b class="coins" id="refine-coins"></b><button class="mp-icon" id="refine-close" aria-label="ปิดหน้าตีบวก">×</button></header><p class="refine-note">ตีบวกได้เฉพาะอาวุธและเสื้อเกราะที่สวมอยู่ · +1 ถึง +4 ไม่มีวันแตก · ตั้งแต่ +5 ถ้าล้มเหลว <b>อุปกรณ์จะแตกหายไป</b></p><ul id="refine-list"></ul><label class="refine-lek"><input type="checkbox" id="refine-lek"> ใช้เหล็กไหล (+20% โอกาสสำเร็จ) <span id="refine-lek-have"></span></label><label class="refine-lek"><input type="checkbox" id="refine-guard"> ใช้ยันต์กันแตก (+5 ขึ้นไป ล้มเหลวไม่แตก) <span id="refine-guard-have"></span></label><div id="refine-result" aria-live="polite"></div>';
 ($('game-shell')??document.body).append(dialog);
 dialog.querySelector('#refine-close').onclick=()=>dialog.close();
 dialog.querySelector('#refine-lek').onchange=e=>{lek=e.target.checked;render(true);};dialog.querySelector('#refine-guard').onchange=e=>{guard=e.target.checked;render(true);};
 bagUI.talkHooks.push(n=>{
  $('npc-refine')?.remove();const shop=SHOPS[n.name];if(!shop?.refine||shop.mapId!==map.id)return;
  const b=document.createElement('button');b.id='npc-refine';b.type='button';b.innerHTML=`<i class="item-icon small" style="${iconStyle('refine-hammer')}"></i> ตีบวกอาวุธ / เกราะ`;
  b.onclick=()=>{npc=n;$('close-npc').click();openHudPanel(dialog);render(true);};$('close-npc').before(b);
 });
 function show(result,level,slot){
  flash={result,at:performance.now()};
  const name=itemDef(statusUI.gear()[slot])?.name??SLOT[slot];
  $('refine-result').className='refine-'+result;
  $('refine-result').innerHTML=`<i class="item-icon big" style="${iconStyle(result==='success'?'refine-success':'refine-broken')}"></i><strong>${result==='success'?'สำเร็จ! '+name:result==='broken'?'ล้มเหลว · '+SLOT[slot]+' +'+level+' แตกแล้ว':'ล้มเหลว · ยันต์กันไว้ '+name+' ไม่แตก'}</strong>`;
  world.notice(result==='success'?'ตีบวกสำเร็จ · '+name:result==='broken'?'ตีบวกล้มเหลว · อุปกรณ์แตก':'ตีบวกล้มเหลว · อุปกรณ์ไม่แตก');render(true);
 }
 game.onEvent(e=>{if(e.type==='refined'&&game.online)show(e.result,e.level,e.slot);});
 function refine(slot){
  if(game.online){world.refine?.(slot,npc?.name,lek,guard);return;}
  try{const r=refineGear(bagUI.bag(),statusUI.gear(),slot,{lekLai:lek,guard});bagUI.setLocal(r.bag);statusUI.setGear(r.gear);show(r.result,r.level,slot);}
  catch(e){world.notice(ITEM_ERRORS[e.message]??e.message);}
 }
 let shown='';
 function render(force=false){
  if(!dialog.open)return;
  const bag=normalizeBag(bagUI.bag()),gear=statusUI.gear(),sig=JSON.stringify([bag,gear,lek,guard]);if(!force&&sig===shown)return;shown=sig;
  $('refine-coins').innerHTML=`<i class="item-icon small" style="${iconStyle('cowrie')}"></i>${bag.coins.toLocaleString('th-TH')}`;
  $('refine-lek-have').textContent='(มี '+(bag.items['lek-lai']??0)+')';$('refine-guard-have').textContent='(มี '+(bag.items['break-guard']??0)+')';
  $('refine-list').innerHTML=Object.keys(SLOT).map(slot=>{
   const id=gear[slot],d=id&&itemDef(id);
   if(!d)return `<li class="empty"><b>${SLOT[slot]}</b> ยังไม่ได้สวม · สวมจากกระเป๋าก่อน</li>`;
   if(d.refine>=REFINE_MAX)return `<li><i class="item-icon" style="${iconStyle(id)}"></i><div><strong>${d.name}</strong><small>ตีบวกสูงสุดแล้ว</small></div></li>`;
   const next=d.refine+1,chance=Math.min(1,REFINE_RATE[next-1]+(lek?LEK_LAI_BONUS:0)),ore=REFINE_ORE[slot],have=bag.items[ore]??0;
   return `<li><i class="item-icon" style="${iconStyle(id)}"></i><div><strong>${d.name} → +${next}</strong><small>โอกาสสำเร็จ ${Math.round(chance*100)}% · ${refineCost(next)} เบี้ย · ${itemDef(ore).name} 1 (มี ${have})${next>=5?(guard?' · ยันต์กันแตก':' · <em>ล้มเหลว = แตก</em>'):''}</small></div><button type="button" data-slot="${slot}" ${have&&bag.coins>=refineCost(next)?'':'disabled'}>ตีบวก</button></li>`;
  }).join('');
  $('refine-list').querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>refine(b.dataset.slot));
 }
 // Target badge: element + size of the selected monster, under the target name.
 const badge=document.createElement('small');badge.id='target-affinity';$('target-name')?.after(badge);
 let badgeFor=null;
 return {update(){
  if(dialog.open&&npc&&Math.hypot(world.player.x-npc.x,world.player.z-npc.z)>4.5)dialog.close();
  render();
  const mob=world.mobs?.find(m=>m.id===world.targetId&&m.hp>0),id=mob&&MONSTER_TYPES[mob.type]?.id;
  if(id!==badgeFor){badgeFor=id;const a=id&&affinityOf(id);badge.textContent=a?`ธาตุ${ELEMENT_NAME[a.element]} · ตัว${SIZE_NAME[a.size]}`:'';}
 }};
}

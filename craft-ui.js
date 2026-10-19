// 0.94 craft window, opened from the bag header. Online the server crafts; offline the local bag does.
import {ITEM_ERRORS,itemDef,normalizeBag} from './items.js?v=94';
import {RECIPES,CRAFT_GROUPS,craftable,craft} from './crafting.js?v=94';
import {iconStyle} from './bag-ui.js?v=94';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);

export function createCraftUI({game,bagUI}){
 const world=game.world;let group='potion',shown='';
 const dialog=document.createElement('dialog');dialog.id='craft-window';dialog.setAttribute('aria-labelledby','craft-title');
 dialog.innerHTML='<header><h2 id="craft-title">คราฟต์</h2><b class="coins" id="craft-coins"></b><button class="mp-icon" id="craft-close" aria-label="ปิดหน้าคราฟต์">×</button></header>'+
  '<div class="craft-tabs" role="tablist">'+CRAFT_GROUPS.map(([id,name])=>`<button type="button" role="tab" data-group="${id}">${name}</button>`).join('')+'</div>'+
  '<p class="refine-note">ใช้ของดรอปจากมอนสเตอร์ + เบี้ยเล็กน้อย · อาหารเพิ่มสเตตัส 10 นาที (กินได้ทีละอย่าง)</p><ul id="craft-list"></ul>';
 ($('game-shell')??document.body).append(dialog);
 dialog.querySelector('#craft-close').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{group=b.dataset.group;render(true);});
 // Opening button in the bag header, next to the coins.
 const open=document.createElement('button');open.type='button';open.id='bag-craft';open.textContent='⚒ คราฟต์';
 open.onclick=()=>{open.closest('dialog')?.close();openHudPanel(dialog);render(true);}; // the bag sits in the top layer, so it closes first
 $('bag-coins')?.after(open);
 function make(out,times){
  if(game.online){world.market?.('craft',{item:out,times});return;}
  try{const r=craft(bagUI.bag(),out,times);bagUI.setLocal(r.bag);world.notice('คราฟต์สำเร็จ · '+itemDef(out).name+' ×'+r.made);render(true);}
  catch(e){world.notice(ITEM_ERRORS[e.message]??e.message);}
 }
 game.onEvent(e=>{if(e.type==='crafted')world.notice('คราฟต์สำเร็จ · '+itemDef(e.item).name+' ×'+e.count);});
 function render(force=false){
  if(!dialog.open)return;
  const bag=normalizeBag(bagUI.bag()),sig=JSON.stringify([bag,group]);if(!force&&sig===shown)return;shown=sig;
  $('craft-coins').innerHTML=`<i class="item-icon small" style="${iconStyle('cowrie')}"></i>${bag.coins.toLocaleString('th-TH')}`;
  dialog.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.group===group)));
  $('craft-list').innerHTML=RECIPES.filter(r=>r.group===group).map(r=>{
   const it=itemDef(r.out),n=craftable(bag,r);
   const needs=Object.entries(r.needs).map(([id,k])=>{const have=bag.items[id]??0;return `<span class="${have>=k?'ok':'short'}"><i class="item-icon small" style="${iconStyle(id)}"></i>${itemDef(id).name} ${have}/${k}</span>`;}).join('');
   return `<li><i class="item-icon" style="${iconStyle(r.out)}"></i><div><strong>${it.name}${r.count>1?' ×'+r.count:''}</strong><small>${it.text??''}</small><p class="craft-needs">${needs}<span class="${bag.coins>=r.coins?'ok':'short'}">${r.coins} เบี้ย</span></p></div>`+
    `<div class="craft-go"><button type="button" data-out="${r.out}" data-times="1" ${n?'':'disabled'}>ทำ</button>${n>1?`<button type="button" data-out="${r.out}" data-times="${n}">×${n}</button>`:''}</div></li>`;
  }).join('');
  $('craft-list').querySelectorAll('[data-out]').forEach(b=>b.onclick=()=>make(b.dataset.out,Number(b.dataset.times)));
 }
 return {update(){render();}};
}

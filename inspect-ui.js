// 0.108.1 tap another player -> "ดูอุปกรณ์": the server sends what they wear (same map only) and this card shows it.
import {itemDef} from './items.js?v=107';
import {iconStyle} from './bag-ui.js?v=107';
import {className} from './classes.js?v=112.1';
import {rebirthRank} from './character-stats.js?v=107';
import {openHudPanel} from './hud-panels.js?v=34';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const SLOTS=[['head','หมวก'],['armor','เสื้อเกราะ'],['weapon','อาวุธ'],['garment','ผ้าคลุม'],['accessory','เครื่องประดับ'],['shoes','รองเท้า']];

export function createInspectUI({game}){
 const $=id=>document.getElementById(id);
 if(!document.querySelector('link[data-inspect-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='inspect-ui.css?v=108.1';css.dataset.inspectUi='';document.head.append(css);}
 const dialog=document.createElement('dialog');dialog.id='inspect-window';dialog.setAttribute('aria-labelledby','inspect-name');
 dialog.innerHTML='<header><div><small id="inspect-class"></small><h2 id="inspect-name"></h2></div><button class="mp-icon" id="inspect-close" aria-label="ปิด">×</button></header><div id="inspect-body"></div>';
 ($('game-shell')??document.body).append(dialog);dialog.querySelector('#inspect-close').onclick=()=>dialog.close();
 let wanted=null;
 function render(v){
  $('inspect-name').textContent=v?v.name:'กำลังโหลด…';$('inspect-name').dataset.i18nSkip='';
  if(!v){$('inspect-class').textContent='';$('inspect-body').innerHTML='';return;}
  $('inspect-class').textContent=className(v.classId,v.gender)+' · Lv.'+v.level+(v.reborn?' · '+rebirthRank(v.reborn):'');
  const slot=([s,label])=>{const id=v.gear?.[s],it=id&&itemDef(id);
   return `<li class="${it?'r'+(it.rarity??0):'empty'}"><i class="item-icon" style="${it?iconStyle(id):''}" aria-hidden="true"></i><div><small>${label}</small><strong class="r${it?.rarity??0}">${it?esc(it.name):'ว่าง'}</strong></div></li>`;};
  $('inspect-body').innerHTML=`<p class="inspect-meta">${v.guild?'กิลด์ '+esc(v.guild.name)+' · ':''}<span>ค่าพลัง</span> <b>${Number(v.power||0).toLocaleString('th-TH')}</b></p><ol class="inspect-gear">${SLOTS.map(slot).join('')}</ol>`;
 }
 game.onEvent(e=>{if(e.type==='inspect'&&e.id===wanted){render(e);}});
 function open(id){
  if(!game.online)return game.world.notice('ดูอุปกรณ์ผู้เล่นอื่นได้ในโหมดออนไลน์');
  wanted=id;render(null);openHudPanel(dialog);game.world.market?.('inspect',{target:id});
 }
 return {open};
}

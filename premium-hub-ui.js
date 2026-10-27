import {createAmuletGachaPanel} from './amulet-gacha-ui.js';
import {createPetSummonPanel} from './pet-summon-ui.js';
import {createPremiumShopPanel} from './premium-shop-ui.js';
import {openHudPanel} from './hud-panels.js';
import {createGachaRatesHelp} from './gacha-rates-ui.js';

export function loadPremiumStyles(){
 for(const href of ['pet-ui.css?v=premium1','pet-ritual148.css?v=premium1','premium-hub.css?v=menu-icons3'])if(!document.querySelector(`link[href="${href}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link);}
}
export function premiumDialog(id,title){
 const dialog=document.createElement('dialog');dialog.id=id;dialog.className='premium-window';dialog.setAttribute('aria-labelledby',id+'-title');
 dialog.innerHTML=`<header class="premium-window-heading"><div><small>AYOTHAYA · FOLK MYSTIC</small><h2 id="${id}-title">${title}</h2></div><button type="button" class="premium-close" aria-label="ปิดหน้าต่าง"></button></header>`;
 (document.getElementById('game-shell')??document.body).append(dialog);dialog.querySelector('.premium-close').onclick=()=>dialog.close();return dialog;
}
export function createPremiumHub({game}){
 loadPremiumStyles();
 const gacha=premiumDialog('gacha-window','กาชา · อัญเชิญขวัญ'),shop=premiumDialog('premium-store-window','ร้านค้า · ทองแท่ง');
 const parent=document.createElement('div');parent.className='premium-gacha-body';gacha.append(parent);
 parent.innerHTML=`<div class="premium-hero premium-gacha-hero"><div><small>AYOTHAYA · SUMMONING</small><h3>เลือกตำนานที่จะร่วมทาง</h3><p>ตู้พระเครื่องและคู่ขวัญ · ทองแท่งกระเป๋าเดียวกัน</p></div></div><nav class="premium-gacha-tabs" role="tablist" aria-label="เลือกตู้กาชา"><button id="gacha-tab-amulets" role="tab" aria-selected="true" aria-controls="amulet-gacha"><img src="assets/amulets-rainbow/somdej.png" alt="">พระเครื่อง</button><button id="gacha-tab-pets" role="tab" aria-selected="false" aria-controls="pet-summon-premium"><img src="assets/summon147/spirit-egg.webp" alt="">สัตว์เลี้ยง</button></nav>`;
 const amulets=createAmuletGachaPanel({game,parent,dialog:gacha,ratesHelp:false}),pets=createPetSummonPanel({game,parent,dialog:gacha,ratesHelp:false}),store=createPremiumShopPanel({game,dialog:shop});let category='amulets';
 const rates=createGachaRatesHelp({dialog:gacha,game,getCategory:()=>category});parent.querySelector('.premium-gacha-tabs').append(rates.button);
 amulets.root.setAttribute('aria-labelledby','gacha-tab-amulets');pets.root.setAttribute('role','tabpanel');pets.root.setAttribute('aria-labelledby','gacha-tab-pets');
 function setCategory(next){category=next;gacha.dataset.category=next;amulets.root.hidden=next!=='amulets';pets.root.hidden=next!=='pets';for(const tab of parent.querySelectorAll('[role=tab]')){const selected=tab.id==='gacha-tab-'+next;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}render(true);}
 parent.querySelector('#gacha-tab-amulets').onclick=()=>setCategory('amulets');parent.querySelector('#gacha-tab-pets').onclick=()=>setCategory('pets');
 parent.querySelector('[role=tablist]').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||e.target.role!=='tab')return;e.preventDefault();setCategory(e.key==='Home'?'amulets':e.key==='End'?'pets':category==='pets'?'amulets':'pets');parent.querySelector('#gacha-tab-'+category).focus();});
 function show(dialog){game.clearInput?.();openHudPanel(dialog);render(true);}
 for(const [id,label,asset,dialog] of [['menu-gacha','กาชา','menu-gacha',gacha],['menu-premium-store','ร้านค้า','menu-store',shop]]){
  const menu=document.createElement('button');menu.id=id;menu.type='button';menu.title=label;menu.setAttribute('aria-label',label);menu.innerHTML=`<i aria-hidden="true"><img class="premium-menu-art" src="assets/premium-ui/${asset}.webp" alt=""></i><span>${label}</span>`;document.getElementById('game-menu')?.append(menu);menu.onclick=()=>dialog.open?dialog.close():show(dialog);
 }
 function render(force=false){if(gacha.open||force)(category==='amulets'?amulets:pets).render(force);store.render(force);}
 setCategory('amulets');return {gacha,shop,render,openGacha(next='amulets'){setCategory(next);show(gacha);},openShop(){show(shop);}};
}

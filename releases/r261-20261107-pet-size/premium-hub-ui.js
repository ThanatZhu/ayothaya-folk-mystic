import {installJadeSurfaces} from './jade-surfaces222.js?v=surfaces222';
import {createAmuletGachaPanel} from './amulet-gacha-ui.js?v=surfaces222';
import {createPetSummonPanel} from './pet-summon-ui.js?v=surfaces222';
import {createPremiumShopPanel} from './premium-shop-ui.js?v=surfaces222';
import {openHudPanel} from './hud-panels.js';
import {createGachaRatesHelp} from './gacha-rates-ui.js?v=surfaces222';
import {normalizePetAccount} from './pet-account.js';
import {GACHA_BANNERS} from './gacha-banners199.js';

const styleLoads=new Map();let artworkReady;
function loadControlArtwork(){return artworkReady??=Promise.all(['assets/premium-controls202/button-jade.webp','assets/premium-controls202/button-gold.webp',matchMedia('(max-width:600px) and (orientation:portrait)').matches?'assets/gacha-banner199/sanctuary-mobile.webp':'assets/gacha-banner199/sanctuary.webp'].map(src=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=src;})));}
export function loadPremiumStyles(){installJadeSurfaces();
 return Promise.all([loadControlArtwork(),...['pet-ui.css?v=premium1','pet-ritual148.css?v=premium1','premium-hub.css?v=surfaces222','gacha-banner199.css?v=surfaces222','pet-companion201.css?v=petbuild220','gacha-motion201.css?v=202','premium-controls202.css?v=1'].map(href=>{
  if(styleLoads.has(href))return styleLoads.get(href);
  const existing=document.querySelector('link[href="'+href+'"]');
  if(existing?.sheet)return Promise.resolve(true);
  const link=existing??document.createElement('link');link.rel='stylesheet';link.href=href;
  const ready=new Promise(resolve=>{link.addEventListener('load',()=>resolve(true),{once:true});link.addEventListener('error',()=>{console.warn('Premium UI stylesheet unavailable:',href);resolve(false);},{once:true});});
  styleLoads.set(href,ready);if(!existing)document.head.append(link);return ready;
 })]);
}
let companionArtworkReady;
function loadCompanionArtwork(){return companionArtworkReady??=new Promise(resolve=>{const image=new Image();image.onload=image.onerror=resolve;image.src=matchMedia('(max-width:600px) and (orientation:portrait)').matches?'assets/companion203/himmapan-glade-mobile.webp':'assets/companion203/himmapan-glade.webp';});}
export function premiumDialog(id,title){
 const dialog=document.createElement('dialog');dialog.style.visibility='hidden';Promise.all([loadPremiumStyles(),id==='pet-window'?loadCompanionArtwork():Promise.resolve()]).then(()=>dialog.style.removeProperty('visibility'));dialog.id=id;dialog.className='premium-window';dialog.setAttribute('aria-labelledby',id+'-title');
 dialog.innerHTML='<header class="premium-window-heading"><div><small>AYOTHAYA · FOLK MYSTIC</small><h2 id="'+id+'-title">'+title+'</h2></div><button type="button" class="premium-close" aria-label="ปิดหน้าต่าง"></button></header>';
 (document.getElementById('game-shell')??document.body).append(dialog);dialog.querySelector('.premium-close').onclick=()=>dialog.close();return dialog;
}
export function createPremiumHub({game}){
 loadPremiumStyles();
 const gacha=premiumDialog('gacha-window','อัญเชิญขวัญ'),shop=premiumDialog('premium-store-window','ร้านค้า · ทองแท่ง');
 gacha.dataset.gachaStyle='banner199';gacha.querySelector('header small').textContent='AYOTHAYA · GACHA';
 const wallet=document.createElement('div');wallet.className='gacha-header-wallet';wallet.innerHTML='<img src="assets/summon147/gold-bars.webp" alt=""><strong></strong><span class="gacha-wallet-label">ทองแท่ง</span>';
 wallet.setAttribute('aria-label','ทองแท่ง');gacha.querySelector('.premium-close').before(wallet);
 const parent=document.createElement('div');parent.className='premium-gacha-body';gacha.append(parent);
 const nav=document.createElement('nav');nav.className='premium-gacha-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','เลือกตู้กาชา');nav.setAttribute('aria-orientation','vertical');
 for(const definition of GACHA_BANNERS){const button=document.createElement('button');button.type='button';button.id='gacha-tab-'+definition.id;button.role='tab';button.setAttribute('aria-selected','false');button.setAttribute('aria-controls',definition.panelId);const image=document.createElement('img');image.src=definition.art;image.alt='';image.width=image.height=80;const label=document.createElement('span');label.textContent=definition.label;button.append(image,label);nav.append(button);}parent.append(nav);
 const factories={amulets:createAmuletGachaPanel,pets:createPetSummonPanel},panels=new Map();
 for(const definition of GACHA_BANNERS){const panel=factories[definition.id]({game,parent,dialog:gacha,ratesHelp:false,presentation:'banner'});panel.root.role='tabpanel';panel.root.setAttribute('aria-labelledby','gacha-tab-'+definition.id);panels.set(definition.id,panel);}
 const store=createPremiumShopPanel({game,dialog:shop});let category=GACHA_BANNERS[0].id,lastBalance;
 const rates=createGachaRatesHelp({dialog:gacha,game,getCategory:()=>category});const rateLabel=document.createElement('span');rateLabel.textContent='ดูเรท';rates.button.append(rateLabel);
 function setCategory(next){
  if(!panels.has(next))next=GACHA_BANNERS[0].id;category=next;gacha.dataset.category=next;
  for(const [id,panel]of panels)panel.root.hidden=id!==next;
  for(const tab of nav.querySelectorAll('[role=tab]')){const selected=tab.id==='gacha-tab-'+next;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
  panels.get(next).root.querySelector('.gacha-tools').prepend(rates.button);render(true);
 }
 for(const definition of GACHA_BANNERS)nav.querySelector('#gacha-tab-'+definition.id).onclick=()=>setCategory(definition.id);
 nav.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)||e.target.role!=='tab')return;e.preventDefault();const index=GACHA_BANNERS.findIndex(d=>d.id===category),next=e.key==='Home'?0:e.key==='End'?GACHA_BANNERS.length-1:(index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+GACHA_BANNERS.length)%GACHA_BANNERS.length;setCategory(GACHA_BANNERS[next].id);nav.querySelector('#gacha-tab-'+category).focus();});
 function show(dialog){game.clearInput?.();openHudPanel(dialog);render(true);}
 for(const [id,label,asset,dialog] of [['menu-gacha','กาชา','menu-gacha',gacha],['menu-premium-store','ร้านค้า','menu-store',shop]]){
  const menu=document.createElement('button');menu.id=id;menu.type='button';menu.title=label;menu.setAttribute('aria-label',label);menu.innerHTML='<i aria-hidden="true"><img class="premium-menu-art" src="assets/premium-ui/'+asset+'.webp" alt=""></i><span>'+label+'</span>';document.getElementById('game-menu')?.append(menu);menu.onclick=()=>dialog.open?dialog.close():show(dialog);
 }
 function render(force=false){if(gacha.open||force){panels.get(category).render(force);const balance=normalizePetAccount(game.world.petCollection).balance;if(force||balance!==lastBalance){wallet.querySelector('strong').textContent=balance.toLocaleString(globalThis.I18N?.locale??'th-TH');lastBalance=balance;}}store.render(force);}
 setCategory('amulets');return {gacha,shop,render,openGacha(next='amulets'){setCategory(next);show(gacha);},openShop(){show(shop);}};
}

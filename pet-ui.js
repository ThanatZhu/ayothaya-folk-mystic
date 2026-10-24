import {createPremiumPetPanel} from './pet-collection-ui.js?v=ritual148';
import {activePremiumPet} from './pet-account.js';
import {createAnimatedPet} from './pet-motion.js?v=128';
import {createMailboxUI} from './mailbox-ui.js?v=menu135';
import {groundHeight} from './combat-core.js';
import {iconStyle} from './bag-ui.js';
import {openHudPanel} from './hud-panels.js';
export const createPetView=createAnimatedPet;
export function createPetUI({game,scene}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='pet-ui.css?v=gacha147';document.head.append(css);const motionCss=document.createElement('link');motionCss.rel='stylesheet';motionCss.href='pet-ritual148.css?v=ritual148';document.head.append(motionCss);
 const world=game.world,menu=document.createElement('button');menu.id='menu-pet';menu.type='button';menu.title='สัตว์เลี้ยง';menu.setAttribute('aria-label','สัตว์เลี้ยง');menu.innerHTML='<i><i class="item-icon menu-item-icon" style="'+iconStyle('pet-bell')+'"></i></i><span>สัตว์เลี้ยง</span>';
 const nav=document.getElementById('game-menu');nav?.insertBefore(menu,document.getElementById('menu-players')??null);
 const dialog=document.createElement('dialog');dialog.id='pet-window';dialog.setAttribute('aria-labelledby','pet-title');dialog.innerHTML='<header><h2 id="pet-title">สัตว์เลี้ยง</h2><button class="mp-icon" id="pet-close" aria-label="ปิด">×</button></header>';(document.getElementById('game-shell')??document.body).append(dialog);
 const panel=createPremiumPetPanel({game,dialog}),mail=createMailboxUI({game});let view=null;
 menu.onclick=()=>{if(dialog.open)dialog.close();else{game.clearInput();openHudPanel(dialog);panel.render(true);}};dialog.querySelector('#pet-close').onclick=()=>dialog.close();
 game.onEvent(e=>{if(e.type==='petSkill'&&(!e.actor||e.actor===world.networkSelfId))view?.attack(e.to,e.lag??0);});
 return {update(dt){const pet=activePremiumPet(world.petCollection);panel.render();mail.update();world.petBonus=pet?.bonus??{};if(view&&view.id!==pet?.id){view.dispose();view=null;}if(pet&&!view)view=createAnimatedPet(scene,pet.id);view?.follow({x:world.player.x,z:world.player.z,y:groundHeight(world.nav,world.player.x,world.player.z)},dt);}};
}

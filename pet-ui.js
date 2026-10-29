import {createPremiumPetPanel} from './pet-collection-ui.js?v=petbuild220';
import {createPremiumHub,loadPremiumStyles,premiumDialog} from './premium-hub-ui.js?v=surfaces222';
import {activePremiumPet} from './pet-account.js?v=petbuild220';
import {createAnimatedPet} from './pet-motion.js?v=loot219';
import {createMailboxUI} from './mailbox-ui.js?v=surfaces222';
import {groundHeight} from './combat-core.js?v=surfaces222';
import {iconStyle} from './bag-ui.js?v=surfaces222';
import {openHudPanel} from './hud-panels.js';
export const createPetView=createAnimatedPet;
export function createPetUI({game,scene}){
 loadPremiumStyles();
 const world=game.world,menu=document.createElement('button');menu.id='menu-pet';menu.type='button';menu.title='สัตว์เลี้ยง';menu.setAttribute('aria-label','สัตว์เลี้ยง');menu.innerHTML='<i><i class="item-icon menu-item-icon" style="'+iconStyle('pet-bell')+'"></i></i><span>สัตว์เลี้ยง</span>';
 const nav=document.getElementById('game-menu');nav?.insertBefore(menu,document.getElementById('menu-players')??null);
 const dialog=premiumDialog('pet-window','สัตว์เลี้ยง · คู่ขวัญ');
 const showCollection=()=>{game.clearInput();openHudPanel(dialog);panel.render(true);};
 const hub=createPremiumHub({game}),panel=createPremiumPetPanel({game,dialog,onSummon:()=>hub.openGacha('pets')}),mail=createMailboxUI({game});let view=null;
 menu.onclick=()=>dialog.open?dialog.close():showCollection();
 game.onEvent(e=>{if(e.type==='petSkill'&&(!e.actor||e.actor===world.networkSelfId))view?.attack(e.to,e.lag??0);});
 return {update(dt){const pet=activePremiumPet(world.petCollection);panel.render();hub.render();mail.update();world.petBonus=pet?.bonus??{};if(view&&view.id!==pet?.id){view.dispose();view=null;}if(pet&&!view)view=createAnimatedPet(scene,pet.id);const motion=world.groundPet?.id===pet?.id?world.groundPet:null;view?.follow({x:world.player.x,z:world.player.z,y:groundHeight(world.nav,world.player.x,world.player.z)},dt,motion?{...motion,y:groundHeight(world.nav,motion.x,motion.z)}:null);if(view?.sprite)view.sprite.visible=!world.observer;}};
}

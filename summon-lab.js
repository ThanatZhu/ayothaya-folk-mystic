import {createPremiumPetPanel} from './pet-collection-ui.js?v=gacha147';
import {petAccountAction,normalizePetAccount} from './pet-account.js';
import {PREMIUM_PETS} from './premium-pets.js';
const dialog=document.getElementById('pet-window'),game={world:{petCollection:normalizePetAccount(null)}};let sequence=0;
game.world.petCollection.balance=10000;
for(const p of PREMIUM_PETS)game.world.petCollection.collection[p.id]={stars:1,copies:4};
game.world.petCommand=async(type,data,requestId)=>{await new Promise(r=>setTimeout(r,200));const rolls=[.01,.1,.5,.3,.9,.04,.7,.8,.99,.25];const r=petAccountAction(game.world.petCollection,{type,...data,requestId},()=>rolls[sequence++%rolls.length]);game.world.petCollection=r.state;return {petCollection:r.state,...r.result};};
const panel=createPremiumPetPanel({game,dialog});panel.render(true);setInterval(()=>panel.render(),500);document.getElementById('pet-close').onclick=()=>location.reload();

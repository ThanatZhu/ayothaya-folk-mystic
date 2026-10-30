import {createPremiumHub,premiumDialog} from './premium-hub-ui.js?v=surfaces222';
import {createPremiumPetPanel} from './pet-collection-ui.js?v=petbuild220';
import {buyPremiumItem} from './premium-shop-action.js';
import {drawAmulets} from './amulet-gacha.js';
import {normalizePetAccount,publicPetAccount,petAccountAction} from './pet-account.js';
import {PREMIUM_PETS} from './premium-pets.js';
import {itemDef} from './items.js';
import {openHudPanel} from './hud-panels.js';

let record={bag:{coins:0,items:{}},petCollection:normalizePetAccount({balance:10000,collection:Object.fromEntries(PREMIUM_PETS.slice(0,4).map(p=>[p.id,{stars:1,copies:4}]))})};
const game={online:true,clearInput(){},world:{stats:{str:15,agi:40,vit:1,int:1,dex:1,luk:25},petBuildStatus:{blocked:false,reason:null,remaining:0},bag:record.bag,petCollection:publicPetAccount(record.petCollection)}};
game.world.petCommand=async(type,data,id=crypto.randomUUID())=>{
 if(!game.online)throw Error('not-connected');await new Promise(r=>setTimeout(r,180));let result;
 if(type==='premiumBuy'){const r=buyPremiumItem(record,{...data,id});record=r.record;result={purchase:r.purchase,replayed:r.replayed};}
 else if(type==='amuletDraw'){const r=drawAmulets(record,{...data,id});record=r.record;result={results:r.results,replayed:r.replayed};}
 else{const r=petAccountAction(record.petCollection,{type,...data,requestId:id});record={...record,petCollection:r.state};result=r.result;}
 return {...result,petCollection:publicPetAccount(record.petCollection),bag:record.bag};
};
game.world.market=()=>{document.getElementById('lab-inventory').textContent='พรีวิวเมนูเท่านั้น · สกิลคู่ขวัญใช้งานจริงในเกม';};
const collection=premiumDialog('pet-window','สัตว์เลี้ยง · คู่ขวัญ'),hub=createPremiumHub({game}),panel=createPremiumPetPanel({game,dialog:collection,onSummon:()=>hub.openGacha('pets')});
function showCollection(){openHudPanel(collection);panel.render(true);}
const petMenu=document.createElement('button');petMenu.id='menu-pet';petMenu.innerHTML='<i><img src="assets/pets125/garuda-dawn.webp" alt=""></i><span>สัตว์เลี้ยง</span>';petMenu.onclick=showCollection;document.getElementById('game-menu').append(petMenu);
document.getElementById('lab-funds').onclick=()=>{record.petCollection.balance+=1000;game.world.petCollection=publicPetAccount(record.petCollection);hub.render(true);};
document.getElementById('lab-offline').onclick=e=>{game.online=!game.online;e.currentTarget.setAttribute('aria-pressed',String(!game.online));hub.render(true);};
document.getElementById('lab-bag').onclick=()=>{document.getElementById('lab-inventory').textContent=Object.entries(game.world.bag.items).map(([id,n])=>itemDef(id).name+' ×'+n).join(' · ')||'กระเป๋าว่าง';};
setInterval(()=>{panel.render();hub.render();},250);const previewView=new URLSearchParams(location.search).get('view');if(previewView==='companions')showCollection();else hub.openGacha(previewView==='pets'?'pets':'amulets');

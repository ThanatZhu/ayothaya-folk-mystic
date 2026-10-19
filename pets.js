// Pets (0.50), shared by the offline game and the realm server. Lure a weakened monster → egg → hatch → it follows you.
// Hunger falls 1 per minute; feeding when hungry builds intimacy, overfeeding or starving loses it; loyal pets give a stat bonus.
import {normalizeBag,BAG_SLOTS} from './items.js?v=94';
export const PETS={
 rat:{name:'หนูยุ้งข้าว',egg:'egg-rat',chance:.35,bonus:{luk:2},text:'LUK +2'},
 straw:{name:'หุ่นฟางหลง',egg:'egg-straw',chance:.3,bonus:{str:1,dex:1},text:'STR +1 · DEX +1'},
 hopper:{name:'ตั๊กแตนเกราะ',egg:'egg-hopper',chance:.25,bonus:{vit:2},text:'VIT +2'},
 monkey:{name:'ลูกลิงฉกของ',egg:'egg-monkey',chance:.18,bonus:{agi:2},text:'AGI +2'},
};
export const LURE='pet-lure',FOOD='pet-food',LOYAL=750,INTIMACY_MAX=1000;
export const MOODS=[[900,'จงรักภักดี'],[LOYAL,'สนิทสนม'],[250,'คุ้นเคย'],[100,'เขินอาย'],[0,'ห่างเหิน']];
export const mood=pet=>MOODS.find(([n])=>pet.intimacy>=n)[1];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function normalizePet(p){return p&&PETS[p.id]?{id:p.id,intimacy:clamp(Math.round(+p.intimacy||0),0,INTIMACY_MAX),hunger:clamp(+p.hunger||0,0,100)}:null;}
const take=(bag,id)=>{const b=normalizeBag(bag);if(!b.items[id])throw new Error('no-item');b.items[id]--;if(!b.items[id])delete b.items[id];return b;};
const give=(b,id)=>{if(!(id in b.items)&&Object.keys(b.items).length>=BAG_SLOTS)throw new Error('bag-full');b.items[id]=(b.items[id]??0)+1;return b;};
// Weaker monsters are easier: chance × (1.6 − hp share). The lure is spent either way.
export function tame(bag,monsterId,mob,rand=Math.random){
 const pet=PETS[monsterId];if(!pet)throw new Error('not-tameable');if(!mob||mob.hp<=0)throw new Error('not-tameable');
 const b=take(bag,LURE),ok=rand()<pet.chance*(1.6-mob.hp/mob.maxHp);
 return {bag:ok?give(b,pet.egg):b,ok};
}
export function hatch(bag,current,egg){
 if(current)throw new Error('pet-active');const id=Object.keys(PETS).find(k=>PETS[k].egg===egg);if(!id)throw new Error('not-usable');
 return {bag:take(bag,egg),pet:{id,intimacy:250,hunger:80}};
}
export function returnPet(bag,pet){if(!pet)throw new Error('no-pet');return {bag:give(normalizeBag(bag),PETS[pet.id].egg),pet:null};}
export function feedPet(bag,pet){
 if(!pet)throw new Error('no-pet');const b=take(bag,FOOD),gain=pet.hunger<25?80:pet.hunger<75?50:pet.hunger<90?10:-50;
 return {bag:b,pet:{...pet,hunger:Math.min(100,pet.hunger+30),intimacy:clamp(pet.intimacy+gain,0,INTIMACY_MAX)}};
}
export function petTick(pet,dt){if(!pet)return pet;pet.hunger=Math.max(0,pet.hunger-dt/60);if(!pet.hunger)pet.intimacy=Math.max(0,pet.intimacy-dt/20);return pet;}
export const petBonus=pet=>pet&&pet.intimacy>=LOYAL?PETS[pet.id].bonus:null;

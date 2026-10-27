import {AMULETS,AMULET_REWARDS,AMULET_TIERS,AMULET_PITY,AMULET_PRICE,amuletAtTier} from './amulets.js';
import {PREMIUM_PETS} from './premium-pets.js';
import {PET_RATE,PET_PITY,PET_PRICE} from './pet-gacha.js';
import {itemDef} from './items.js';

// Display the same rates and conditional guarantees used by server-owned draws.
export function gachaRateInfo(category){
 if(category==='pets'){
  const highest=PREMIUM_PETS.filter(p=>p.tier==='S');
  return {id:category,name:'สัตว์เลี้ยง',price:PET_PRICE,pity:PET_PITY,highest:'S',
   tiers:Object.entries(PET_RATE).map(([id,rate])=>({id,name:id,rate})),
   rewards:PREMIUM_PETS.map(p=>({id:p.id,name:p.name,tier:p.tier,count:1,rate:PET_RATE[p.tier]/PREMIUM_PETS.filter(x=>x.tier===p.tier).length,art:'assets/pets125/'+p.id+'.webp'})),
   guaranteed:highest.map(p=>({id:p.id,name:p.name,tier:p.tier,count:1,rate:1/highest.length,art:'assets/pets125/'+p.id+'.webp'}))};
 }
 if(category!=='amulets')throw Error('bad-gacha-category');
 return {id:category,name:'พระเครื่องและวัตถุดิบ',price:AMULET_PRICE,pity:AMULET_PITY,highest:'รุ้ง',
  tiers:[...AMULET_TIERS.map(t=>({id:t.id,name:t.name,rate:t.rate})),{id:'material',name:'วัตถุดิบ',rate:AMULET_REWARDS.filter(r=>r.tier==='material').reduce((n,r)=>n+r.rate,0)}],
  rewards:AMULET_REWARDS.map(r=>({...r,name:itemDef(r.id).name})),
  guaranteed:AMULETS.map(a=>{const item=amuletAtTier(a,'rainbow');return {id:item.id,name:itemDef(item.id).name,tier:'rainbow',count:1,rate:1/AMULETS.length};})};
}
export const gachaRatePercent=rate=>(rate*100).toLocaleString('th-TH',{maximumFractionDigits:4})+'%';

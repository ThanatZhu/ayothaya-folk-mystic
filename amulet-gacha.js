import {AMULETS,AMULET_TIERS,AMULET_MATERIALS,AMULET_PITY,AMULET_PRICE,amuletAtTier} from './amulets.js';
import {normalizePetAccount} from './pet-account.js';
import {addLoot,normalizeBag} from './items.js';

// Applied to a server-owned record under the same durable transaction as the wallet and inventory.
export function drawAmulets(record,message,random=Math.random){
 const {count,id}=message;
 if(![1,10].includes(count))throw Error('bad-count');
 if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(id))throw Error('bad-request-id');
 const wallet=normalizePetAccount(record.petCollection),state=wallet.amuletGacha;
 const old=state.receipts.find(r=>r.id===id);
 if(old){if(old.count!==count)throw Error('request-conflict');return {record,results:old.results,replayed:true};}
 if(wallet.balance<AMULET_PRICE*count)throw Error('no-gems');
 const sample=()=>{const x=random();if(!Number.isFinite(x)||x<0||x>=1)throw Error('bad-random');return x;};
 const results=[];
 for(let i=0;i<count;i++){
  const roll=sample(),guaranteed=state.pity>=AMULET_PITY-1;let edge=0;
  const tier=guaranteed?AMULET_TIERS[0]:AMULET_TIERS.find(t=>(edge+=t.rate)>roll);
  if(tier){const a=amuletAtTier(AMULETS[Math.floor(sample()*AMULETS.length)],tier.id);results.push({id:a.id,count:1,tier:tier.id,rainbow:tier.id==='rainbow',guaranteed});}
  else{const reward=AMULET_MATERIALS.find(r=>(edge+=r.rate)>roll)??AMULET_MATERIALS.at(-1);results.push({id:reward.id,count:reward.count,tier:'material',rainbow:false,guaranteed:false});}
  state.pity=results.at(-1).rainbow?0:state.pity+1;
  state.pulls++;
 }
 const loot=addLoot(normalizeBag(record.bag),{items:results});
 // Never charge for a partial batch or lose a reward to capacity/stack limits.
 if(loot.lost.length)throw Error('bag-full');
 wallet.balance-=AMULET_PRICE*count;
 state.receipts=[...state.receipts,{id,count,results}].slice(-64);
 return {record:{...record,bag:loot.bag,petCollection:wallet},results,replayed:false};
}

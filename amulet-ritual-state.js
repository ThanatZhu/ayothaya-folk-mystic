import {itemDef,MAX_STACK} from './items.js';

// Presentation state only. The server has already committed every item and the gold debit.
export function amuletRevealBatch(results){
 if(!Array.isArray(results)||![1,10].includes(results.length))throw Error('bad-amulet-results');
 return {results:results.map(r=>{const item=itemDef(r?.id);if(!item||!Number.isSafeInteger(r.count)||r.count<1||r.count>MAX_STACK)throw Error('bad-amulet-results');return {id:r.id,count:r.count,tier:item.amuletTier??'material',guaranteed:r.guaranteed===true};}),opened:results.map(()=>false)};
}
export function revealAmulet(batch,index){
 if(!Number.isInteger(index)||index<0||index>=batch.results.length||batch.opened[index])return false;
 batch.opened[index]=true;return true;
}
export function revealAllAmulets(batch){const indices=batch.opened.flatMap((open,i)=>open?[]:[i]);batch.opened.fill(true);return indices;}
export const amuletRevealComplete=batch=>batch.opened.every(Boolean);
export const amuletRevealTier=batch=>batch.results.reduce((tier,r)=>['material','orange','red','rainbow'].indexOf(r.tier)>['material','orange','red','rainbow'].indexOf(tier)?r.tier:tier,'material');

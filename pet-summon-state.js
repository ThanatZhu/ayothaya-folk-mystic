import {premiumPet} from './premium-pets.js';
// Presentation only: the server has already saved and charged this batch.
export function summonBatch(results){
 if(!Array.isArray(results)||![1,10].includes(results.length))throw Error('bad-summon-results');
 return {results:results.map(r=>{const p=premiumPet(r.id);return {...r,tier:p.tier};}),opened:results.map(()=>false)};
}
export function openSummonEgg(batch,index){
 if(!Number.isInteger(index)||index<0||index>=batch.results.length||batch.opened[index])return false;
 batch.opened[index]=true;return true;
}
export const allSummonEggsOpen=batch=>batch.opened.every(Boolean);
export function openAllSummonEggs(batch){batch.opened.fill(true);}
// Ambient light announces the highest rarity in the saved batch, even before opening.
export const summonTier=batch=>batch.results.reduce((tier,r)=>'BAS'.indexOf(r.tier)>'BAS'.indexOf(tier)?r.tier:tier,'B');

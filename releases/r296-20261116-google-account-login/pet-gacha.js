// Shared deterministic rules for the isolated preview. No payment or player-profile APIs are exposed.
import {PREMIUM_PETS,premiumPet} from './premium-pets.js';
export const PET_RATE={S:.03,A:.17,B:.80},PET_PITY=80,PET_PRICE=100,PET_STAR_MAX=5;
export const PET_STAR_COST={1:1,2:2,3:3,4:4};
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:0;
export function normalizePetPreview(raw){
 const v=raw&&typeof raw==='object'?raw:{},collection={};
 for(const p of PREMIUM_PETS){const x=v.collection?.[p.id];if(x&&Number.isInteger(x.stars)&&x.stars>=1&&x.stars<=5)collection[p.id]={stars:x.stars,copies:integer(x.copies,1000000)};}
 return {v:1,balance:integer(v.balance,1000000000),pity:Math.min(79,integer(v.pity,10000000)),pulls:integer(v.pulls,10000000),collection};
}
export const newPetPreview=()=>({...normalizePetPreview(null),balance:10000});
export function addPreviewCopy(raw,id){const state=normalizePetPreview(raw);premiumPet(id);const old=state.collection[id];state.collection[id]=old?{...old,copies:old.copies+1}:{stars:1,copies:0};return state;}
export function previewPetDraw(raw,count=1,random=Math.random){
 if(![1,10].includes(count))throw new Error('bad-count');const state=normalizePetPreview(raw);if(state.balance<PET_PRICE*count)throw new Error('no-gems');
 const sample=()=>{const x=random();if(!Number.isFinite(x)||x<0||x>=1)throw new Error('bad-random');return x;};
 const results=[];let next=state;
 for(let i=0;i<count;i++){
  const roll=sample(),guaranteed=next.pity>=PET_PITY-1,tier=guaranteed||roll<PET_RATE.S?'S':roll<PET_RATE.S+PET_RATE.A?'A':'B';
  const pool=PREMIUM_PETS.filter(p=>p.tier===tier),pet=pool[Math.floor(sample()*pool.length)],duplicate=!!next.collection[pet.id];
  next=addPreviewCopy(next,pet.id);next.pity=tier==='S'?0:next.pity+1;next.pulls++;results.push({id:pet.id,tier,duplicate,guaranteed,stars:next.collection[pet.id].stars,copies:next.collection[pet.id].copies});
 }
 next.balance-=PET_PRICE*count;return {state:next,results};
}
export function upgradePreviewPet(raw,id){
 premiumPet(id);const state=normalizePetPreview(raw),pet=state.collection[id];if(!pet)throw new Error('pet-not-owned');if(pet.stars>=PET_STAR_MAX)throw new Error('max-stars');
 const cost=PET_STAR_COST[pet.stars];if(pet.copies<cost)throw new Error('not-enough-copies');state.collection[id]={stars:pet.stars+1,copies:pet.copies-cost};return state;
}

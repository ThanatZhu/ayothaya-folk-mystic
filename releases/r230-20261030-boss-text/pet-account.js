// Server-owned pet collection. Preview storage and payment APIs are deliberately unrelated.
import {normalizePetBuild,petWithBuild} from './pet-stat-build220.js';
import {normalizePetPreview,previewPetDraw,upgradePreviewPet,addPreviewCopy} from './pet-gacha.js';
import {petAtStars,premiumPet} from './premium-pets.js';
import {normalizePremiumShop} from './premium-shop-catalog.js';
import {normalizeAmuletGacha} from './amulets.js';
export const PET_MUTATIONS=['petDraw','petUpgrade','petEquip','petAuto','petStatBuild'];
export function normalizePetAccount(raw){
 const s=normalizePetPreview(raw),v=raw??{};
 return {...s,statBuild:normalizePetBuild(v.statBuild),amuletGacha:normalizeAmuletGacha(v.amuletGacha),premiumShop:normalizePremiumShop(v.premiumShop),equipped:Object.hasOwn(s.collection,v.equipped)?v.equipped:null,auto:v.auto!==false,
  readyAt:Number.isSafeInteger(v.readyAt)&&v.readyAt>0?v.readyAt:0,
  receipts:Array.isArray(v.receipts)?v.receipts.filter(r=>typeof r?.id==='string'&&typeof r?.signature==='string').slice(-32):[]};
}
export const activePremiumPet=raw=>{const s=normalizePetAccount(raw);return s.equipped?petWithBuild(petAtStars(s.equipped,s.collection[s.equipped].stars),s.statBuild):null;};
export const publicPetAccount=raw=>{const {receipts,...s}=normalizePetAccount(raw);const {receipts:amuletReceipts,...amuletGacha}=s.amuletGacha;return {...s,amuletGacha,premiumShop:{}};};
export function petAccountAction(raw,m,random=Math.random){
 if(!/^[a-zA-Z0-9_-]{8,80}$/.test(m.requestId??''))throw Error('bad-request-id');
 const signature=JSON.stringify([m.type,m.count??null,m.pet??null,m.on??null,m.gems??null,...(m.type==='petStatBuild'?[m.stats??null]:[])]),s=normalizePetAccount(raw),old=s.receipts.find(r=>r.id===m.requestId);
 if(old){if(old.signature!==signature)throw Error('request-conflict');return {state:s,result:old.result,replayed:true};}
 let next=s,result={type:m.type};
 if(m.type==='petDraw'){const r=previewPetDraw(s,m.count,random);next={...s,...r.state};result.results=r.results;}
 else if(m.type==='petUpgrade')next={...s,...upgradePreviewPet(s,m.pet)};
 else if(m.type==='petEquip'){if(m.pet!==null&&!Object.hasOwn(s.collection,m.pet))throw Error('pet-not-owned');next={...s,equipped:m.pet};}
 else if(m.type==='petStatBuild'){const build=normalizePetBuild({stats:m.stats});if(!build)throw Error('bad-pet-build');if(!Object.keys(s.collection).some(id=>premiumPet(id).tier==='S'))throw Error('pet-build-no-s');next={...s,statBuild:build};}
 else if(m.type==='petAuto'){if(typeof m.on!=='boolean')throw Error('bad-pet-auto');next={...s,auto:m.on};}
 else if(m.type==='petGrant'){
  if(!Number.isSafeInteger(m.gems)||m.gems<0||m.gems>1000000||s.balance+m.gems>1000000000)throw Error('bad-gems');
  if(m.pet!==null&&m.pet!==undefined){premiumPet(m.pet);next={...s,...addPreviewCopy(s,m.pet)};}
  if(!m.gems&&!m.pet)throw Error('nothing');next.balance+=m.gems;
 }else throw Error('bad-pet-action');
 next.receipts=[...s.receipts,{id:m.requestId,signature,result}].slice(-32);return {state:next,result,replayed:false};
}

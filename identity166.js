import {character} from './realm-state.js';
import {addLoot,normalizeBag} from './items.js';
import {normalizePetAccount} from './pet-account.js';

export const RENAME_CARD='rename-card',RENAME_PRICE=1000;
// The host checkpoints the complete result before exposing either wallet or name.
// Receipts live in the private profile, so a reconnect/retry cannot charge twice.
export function identityAction(record,action){
 const id=action.id;if(typeof id!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(id))throw Error('invalid-request');
 if(!['renameBuy','renameUse'].includes(action.type))throw Error('invalid-action');
 const name=action.type==='renameUse'?character({...record.character,name:action.name}).name:'';
 const signature=JSON.stringify([action.type,name]),receipts=record.identityReceipts??[],previous=receipts.find(r=>r.id===id);
 if(previous){if(previous.signature!==signature)throw Error('request-conflict');return structuredClone(record);}
 const next=structuredClone(record);next.bag=normalizeBag(next.bag);next.petCollection=normalizePetAccount(next.petCollection);
 if(action.type==='renameBuy'){
  if(next.petCollection.balance<RENAME_PRICE)throw Error('not-enough-gold');
  const added=addLoot(next.bag,{items:[{id:RENAME_CARD,count:1}]});if(added.lost.length)throw Error('bag-full');
  next.bag=added.bag;next.petCollection.balance-=RENAME_PRICE;
 }else{
  if(name===next.character.name)throw Error('name-unchanged');
  if(!(next.bag.items[RENAME_CARD]>0))throw Error('no-rename-card');
  if(--next.bag.items[RENAME_CARD]===0)delete next.bag.items[RENAME_CARD];next.character.name=name;
 }
 next.identityReceipts=[...receipts,{id,signature}].slice(-64);return next;
}

import {normalizeBag,itemDef,sell,bagCap,MAX_STACK,composeId} from './items.js';
export const CARD_REMOVAL_FEE=10000;
export const UTILITY_MUTATIONS=['cardRemove','sellBatch'];
export const UTILITY_ERRORS={'no-card':'อุปกรณ์นี้ไม่มีการ์ด','gear-changed':'อุปกรณ์เปลี่ยนแล้ว กรุณาตรวจรายการใหม่','sale-changed':'จำนวนหรือราคาขายเปลี่ยนแล้ว กรุณาตรวจรายการใหม่','empty-sale':'เลือกของที่จะขายก่อน','bad-utility':'รายการไม่ถูกต้อง','card-price-changed':'ค่าถอดการ์ดเปลี่ยนแล้ว กรุณาตรวจยอดใหม่'};
const coinCap=normalizeBag({coins:Number.MAX_SAFE_INTEGER}).coins;
export function extractCard(bag,gear,slot,expected){
 if(!['weapon','head','armor','garment','shoes','accessory'].includes(slot))throw Error('slot-empty');
 const worn=gear?.[slot],it=itemDef(worn);if(!it||it.kind!=='gear')throw Error('slot-empty');if(worn!==expected)throw Error('gear-changed');if(!it.card)throw Error('no-card');
 const b=normalizeBag(bag),card=it.card;if(itemDef(card)?.kind!=='card')throw Error('no-card');
 if(b.coins<CARD_REMOVAL_FEE)throw Error('no-coins');
 if((b.items[card]??0)>=MAX_STACK||!b.items[card]&&Object.keys(b.items).length>=bagCap(b))throw Error('bag-full');
 b.coins-=CARD_REMOVAL_FEE;b.items[card]=(b.items[card]??0)+1;
 return {bag:b,gear:{...gear,[slot]:composeId(it.base,it.refine,null,it.affix,it.grade)},card,fee:CARD_REMOVAL_FEE};
}
export function quoteSale(bag,lines){
 if(!Array.isArray(lines)||!lines.length)throw Error('empty-sale');if(lines.length>bagCap(bag))throw Error('bad-count');
 const seen=new Set();let total=0;
 for(const row of lines){if(!row||typeof row.id!=='string'||seen.has(row.id)||!Number.isSafeInteger(row.count)||row.count<1)throw Error('bad-count');seen.add(row.id);
  const d=itemDef(row.id);if(!d?.sell)throw Error('not-sellable');if((bag.items?.[row.id]??0)<row.count)throw Error('no-item');total+=d.sell*row.count;if(!Number.isSafeInteger(total))throw Error('bad-count');
 }if(total+(bag.coins??0)>coinCap)throw Error('coin-cap');return total;
}
export function sellBatch(bag,lines,quoted){
 const total=quoteSale(bag,lines);if(quoted!==total)throw Error('sale-changed');let next=normalizeBag(bag);for(const row of lines)next=sell(next,row.id,row.count);return {bag:next,total};
}
export function utilityAction(record,m){
 if(!/^[a-zA-Z0-9_-]{8,80}$/.test(m.id??'')||!UTILITY_MUTATIONS.includes(m.type))throw Error('bad-utility');
 const signature=JSON.stringify([m.type,m.slot??null,m.expected??null,m.lines??null,m.quoted??null,m.npc??null]),receipts=(Array.isArray(record.utilityReceipts)?record.utilityReceipts:[]).filter(r=>typeof r?.id==='string'&&typeof r.signature==='string').slice(-32),old=receipts.find(r=>r.id===m.id);
 if(old){if(old.signature!==signature)throw Error('request-conflict');return {record,result:old.result,replayed:true};}
 if(m.type==='cardRemove'&&m.quoted!==CARD_REMOVAL_FEE)throw Error('card-price-changed');
 const result=m.type==='cardRemove'?extractCard(record.bag,record.gear,m.slot,m.expected):sellBatch(record.bag,m.lines,m.quoted);
 const {bag,gear,...detail}=result,next={...record,bag,...(gear?{gear}:{}),utilityReceipts:[...receipts,{id:m.id,signature,result:detail}].slice(-32)};
 return {record:next,result:detail,replayed:false};
}
export const valuableItem=id=>{const d=itemDef(id);return d?.kind==='gear'||d?.kind==='card'||(d?.rarity??0)>=2||(d?.grade??0)>0;};

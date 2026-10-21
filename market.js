// Storage, player trade and vending stalls (0.46). Pure rules shared by client and realm server.
// Offers are {coins, items:{[id]:count}}; every move is all-or-nothing and never creates or loses items.
import {BAG_SLOTS,bagCap,MAX_STACK,MAX_COINS,normalizeBag,itemDef} from './items.js?v=107';

export const STORAGE_SLOTS=100,STORAGE_NPC='ลุงเรือง',STALL_MAX=8,PRICE_MAX=9999999;
export const TRADABLE=id=>['loot','potion','gear','card','scroll'].includes(itemDef(id)?.kind);

export function normalizeStorage(s){return normalizeBag(s,STORAGE_SLOTS);}
export function normalizeOffer(o){
 const out={coins:Number.isSafeInteger(o?.coins)?Math.min(Math.max(o.coins,0),MAX_COINS):0,items:{}};
 for(const [id,n] of Object.entries(o?.items&&typeof o.items==='object'?o.items:{}))if(TRADABLE(id)&&Number.isSafeInteger(n)&&n>0&&Object.keys(out.items).length<12)out.items[id]=Math.min(n,MAX_STACK);
 return out;
}
const slots=(bag,cap)=>id=>id in bag.items||Object.keys(bag.items).length<cap;
// Move `offer` out of `from` and into `to`; throws when `from` lacks it or `to` has no room.
export function moveOffer(from,to,offer,{fromCap=bagCap(from),toCap=bagCap(to)}={}){
 const a=normalizeBag(from,fromCap),b=normalizeBag(to,toCap),o=normalizeOffer(offer);
 if(a.coins<o.coins)throw new Error('no-coins');
 if(b.coins+o.coins>MAX_COINS)throw new Error('coin-cap');
 for(const [id,n] of Object.entries(o.items)){
  if((a.items[id]??0)<n)throw new Error('no-item');
  if(!slots(b,toCap)(id)||(b.items[id]??0)+n>MAX_STACK)throw new Error('bag-full');
  a.items[id]-=n;if(!a.items[id])delete a.items[id];b.items[id]=(b.items[id]??0)+n;
 }
 a.coins-=o.coins;b.coins+=o.coins;return [a,b];
}
export function hasOffer(bag,offer){try{moveOffer(bag,{},offer,{toCap:Infinity});return true;}catch{return false;}}
// Both sides at once: A's offer goes to B and B's to A, or nothing changes.
export function swapOffers(bagA,offerA,bagB,offerB){
 let [a1,b1]=moveOffer(bagA,bagB,offerA);
 const [b2,a2]=moveOffer(b1,a1,offerB);
 return [a2,b2];
}
// A stall lists up to STALL_MAX items from the owner's bag at fixed prices.
export function normalizeStall(stall,bag,max=STALL_MAX){
 const b=normalizeBag(bag),items={};
 for(const [id,v] of Object.entries(stall?.items??{})){
  if(Object.keys(items).length>=max||!TRADABLE(id))continue;
  const count=Math.min(v?.count??0,b.items[id]??0),price=Number.isSafeInteger(v?.price)?Math.min(Math.max(v.price,1),PRICE_MAX):0;
  if(count>0&&price>0)items[id]={count,price};
 }
 return {title:String(stall?.title??'').slice(0,24)||'แผงขายของ',items};
}
export function buyFromStall(sellerBag,stall,buyerBag,id,qty,max=STALL_MAX){
 const s=normalizeStall(stall,sellerBag,max),row=s.items[id];
 if(!row)throw new Error('not-sold');if(!Number.isSafeInteger(qty)||qty<1||qty>row.count)throw new Error('bad-count');
 const cost=row.price*qty;
 const [buyer1,seller1]=moveOffer(buyerBag,sellerBag,{coins:cost,items:{}});
 const [seller2,buyer2]=moveOffer(seller1,buyer1,{coins:0,items:{[id]:qty}});
 s.items[id]={...row,count:row.count-qty};if(!s.items[id].count)delete s.items[id];
 return {sellerBag:seller2,buyerBag:buyer2,stall:s,cost};
}

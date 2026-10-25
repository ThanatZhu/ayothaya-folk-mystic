// 0.70 central market: consignment shops that stay open while the owner is offline (RO @autotrade), buying
// stores, server-wide search (RO @whosell), sales tax, reference prices and the trade skill (merchant perks).
// Pure rules shared by the realm server and the UI. A shop holds its goods (sell) or its coins (buy) in escrow,
// so a purchase never touches an offline player's save: proceeds wait in the shop's pouch until collected.
import {BAG_SLOTS,bagCap,MAX_STACK,MAX_COINS,normalizeBag,itemDef} from './items.js?v=107';
import {TRADABLE,PRICE_MAX,moveOffer} from './market.js?v=107';

// Shops may only stand on the market street of the capital, a few metres apart, so roads stay clear.
export const MARKET_ZONE={mapId:'ayutthaya',x:8,z:-16,w:30,d:20,name:'ถนนตลาดแม่บัว'};
export const SHOP_GAP=2.6,LOG_MAX=20,TITLE_MAX=24;
export const SHOP_DURATION=24*60*60*1000;
export const shopHasListings=s=>Object.values(s?.items??{}).some(r=>Number.isSafeInteger(r?.count)&&r.count>0&&Number.isSafeInteger(r.price)&&r.price>0);
export function shopDeadline(s){
 const end=(Number.isFinite(s?.createdAt)&&s.createdAt>=0?s.createdAt:0)+SHOP_DURATION;
 return Number.isFinite(s?.expiresAt)?Math.min(end,s.expiresAt):end;
}
export const shopIsOpen=(s,now=Date.now())=>s?.status!=='closed'&&shopDeadline(s)>now&&shopHasListings(s);
export function closeInactiveShop(s,now){
 if(s.status==='closed')return s;
 const reason=shopDeadline(s)<=now?'expired':!shopHasListings(s)?s.kind==='buy'?'filled':'sold-out':null;
 return reason?{...s,status:'closed',expiresAt:shopDeadline(s),closedAt:now,closedReason:reason}:s;
}
export const shopHasClaims=s=>(s.pouch?.coins??0)>0||(s.escrow??0)>0||(s.xpOwed??0)>0||Object.values(s.pouch?.items??{}).some(n=>n>0)||(s.kind==='sell'&&Object.values(s.items??{}).some(r=>r?.count>0));
export const inMarket=(mapId,x,z)=>mapId===MARKET_ZONE.mapId&&x>=MARKET_ZONE.x&&x<=MARKET_ZONE.x+MARKET_ZONE.w&&z>=MARKET_ZONE.z&&z<=MARKET_ZONE.z+MARKET_ZONE.d;

// Trade skill: lifetime coins traded through stalls and shops. Each level adds a slot, cuts the tax and
// gives a discount at NPC shops; levels 3 and 5 allow another consignment shop.
export const TRADE_LEVELS=[0,2000,10000,40000,150000];
export function tradePerks(tradeXp=0){
 const xp=Number.isSafeInteger(tradeXp)&&tradeXp>0?tradeXp:0,level=TRADE_LEVELS.filter(t=>xp>=t).length;
 return {level,xp,next:TRADE_LEVELS[level]??null,slots:7+level,shops:level>=5?3:level>=3?2:1,tax:[.03,.025,.02,.015,.01][level-1],npcDiscount:.02*(level-1)};
}
export const taxOf=(coins,perks)=>Math.floor(coins*perks.tax);

const clean=v=>String(v??'').replace(/[<>]/g,'').trim().slice(0,TITLE_MAX);
// Validates a listing request against what the owner actually has. Sell shops escrow items, buy shops escrow coins.
export function normalizeListing(req,bag,perks){
 const b=normalizeBag(bag),kind=req?.kind==='buy'?'buy':'sell',items={};
 for(const [id,v] of Object.entries(req?.items??{})){
  if(Object.keys(items).length>=perks.slots||!TRADABLE(id)||!itemDef(id))continue;
  const price=Number.isSafeInteger(v?.price)?Math.min(Math.max(v.price,1),PRICE_MAX):0;
  let count=Number.isSafeInteger(v?.count)?Math.min(Math.max(v.count,0),MAX_STACK):0;
  if(kind==='sell')count=Math.min(count,b.items[id]??0);
  if(count>0&&price>0)items[id]={count,price};
 }
 const escrow=kind==='buy'?Object.values(items).reduce((s,r)=>s+r.count*r.price,0):0;
 if(!Object.keys(items).length)throw new Error('no-item');
 if(kind==='buy'&&escrow>b.coins)throw new Error('no-coins');
 return {kind,title:clean(req?.title)||(kind==='buy'?'รับซื้อของ':'ร้านค้าง'),items,escrow};
}
export function openShop({bag,req,perks,owner,x,z,mapId,now,id,existing=[]}){
 if(!inMarket(mapId,x,z))throw new Error('shop-zone');
 const active=existing.filter(s=>shopIsOpen(s,now));
 if(active.filter(s=>s.ownerKey===owner.key).length>=perks.shops)throw new Error('shop-limit');
 if(active.some(s=>Math.hypot(s.x-x,s.z-z)<SHOP_GAP))throw new Error('shop-crowded');
 const l=normalizeListing(req,bag,perks);
 const offer=l.kind==='sell'?{coins:0,items:Object.fromEntries(Object.entries(l.items).map(([i,r])=>[i,r.count]))}:{coins:l.escrow,items:{}};
 const [rest]=moveOffer(bag,{coins:0,items:{}},offer,{toCap:Infinity});
 return {bag:rest,shop:{id,serverId:owner.serverId,ownerKey:owner.key,ownerName:owner.name,kind:l.kind,title:l.title,x:Math.round(x*10)/10,z:Math.round(z*10)/10,items:l.items,escrow:l.escrow,pouch:{coins:0,items:{}},log:[],createdAt:now,expiresAt:now+SHOP_DURATION,status:'open'}};
}
const addPouch=(pouch,coins,id,n)=>{const p={coins:Math.min(MAX_COINS,(pouch?.coins??0)+coins),items:{...(pouch?.items??{})}};if(id)p.items[id]=Math.min(MAX_STACK,(p.items[id]??0)+n);return p;};
const logged=(shop,entry)=>[entry,...(shop.log??[])].slice(0,LOG_MAX);
// A customer buys `qty` of `id` from a sell shop: coins go to the shop pouch (less tax), goods to the buyer.
export function buyFromShop(shop,buyerBag,id,qty,perks,{who='',now=0}={}){
 if(!shopIsOpen(shop,now))throw new Error('stall-none');
 if(shop.kind!=='sell')throw new Error('not-sold');const row=shop.items[id];
 if(!row)throw new Error('not-sold');if(!Number.isSafeInteger(qty)||qty<1||qty>row.count)throw new Error('bad-count');
 const cost=row.price*qty,tax=taxOf(cost,perks);
 const [paid]=moveOffer(buyerBag,{coins:0,items:{}},{coins:cost,items:{}},{toCap:Infinity});
 const [,bag]=moveOffer({coins:0,items:{[id]:qty}},paid,{coins:0,items:{[id]:qty}},{fromCap:Infinity,toCap:bagCap(buyerBag)});
 const items={...shop.items,[id]:{...row,count:row.count-qty}};if(!items[id].count)delete items[id];
 return {bag,cost,tax,shop:closeInactiveShop({...shop,items,pouch:addPouch(shop.pouch,cost-tax),log:logged(shop,{t:now,kind:'sold',item:id,count:qty,coins:cost-tax,who})},now)};
}
// A customer sells `qty` of `id` to a buying store: goods go to the shop pouch, escrowed coins (less tax) to the seller.
export function sellToShop(shop,sellerBag,id,qty,perks,{who='',now=0}={}){
 if(!shopIsOpen(shop,now))throw new Error('stall-none');
 if(shop.kind!=='buy')throw new Error('not-wanted');const row=shop.items[id];
 if(!row)throw new Error('not-wanted');if(!Number.isSafeInteger(qty)||qty<1||qty>row.count)throw new Error('bad-count');
 const pay=row.price*qty,tax=taxOf(pay,perks);
 const [gave]=moveOffer(sellerBag,{coins:0,items:{}},{coins:0,items:{[id]:qty}},{toCap:Infinity});
 const [,bag]=moveOffer({coins:pay-tax,items:{}},gave,{coins:pay-tax,items:{}},{fromCap:Infinity});
 const items={...shop.items,[id]:{...row,count:row.count-qty}};if(!items[id].count)delete items[id];
 return {bag,pay,tax,shop:closeInactiveShop({...shop,items,escrow:shop.escrow-pay,pouch:addPouch(shop.pouch,0,id,qty),log:logged(shop,{t:now,kind:'bought',item:id,count:qty,coins:pay,who})},now)};
}
// Owner takes the pouch (and, when closing, the unsold goods / unspent coins). All-or-nothing on bag room.
export function collectShop(shop,bag,{close=false}={}){
 close=close||shop.status==='closed';
 const items={...(shop.pouch?.items??{})};let coins=shop.pouch?.coins??0;
 if(close){if(shop.kind==='sell')for(const [id,r] of Object.entries(shop.items))items[id]=(items[id]??0)+r.count;else coins+=shop.escrow;}
 if(!Number.isSafeInteger(coins)||coins>MAX_COINS)throw new Error('coin-cap');
 const [,next]=moveOffer({coins,items},bag,{coins,items},{fromCap:Infinity});
 return {bag:next,shop:close?null:{...shop,pouch:{coins:0,items:{}}},coins,items};
}
// Reference prices: last sale and a moving average per base item (refine/card/affix variants share the base).
export const priceKey=id=>itemDef(id)?.base??id;
export function recordPrice(prices,id,unit,now){
 const k=priceKey(id),p=prices[k];
 return {...prices,[k]:{last:unit,avg:p?Math.round(p.avg*.8+unit*.2):unit,n:(p?.n??0)+1,t:now}};
}
export function priceHint(prices,id,price){
 const p=prices?.[priceKey(id)];if(!p||p.n<2)return null;
 return price>p.avg*3?'high':price<p.avg/3?'low':null;
}
// RO @whosell: every open offer for an item across the server, cheapest sells first / best buys first.
export function searchMarket(shops,stalls,query,now=Date.now()){
 const q=String(query??'').trim().toLowerCase();if(!q)return [];
 const match=id=>{const d=itemDef(id);return id.includes(q)||(d?.name??'').toLowerCase().includes(q);};
 const rows=[];
 for(const s of shops.filter(s=>shopIsOpen(s,now)))for(const [id,r] of Object.entries(s.items))if(match(id))rows.push({kind:s.kind,shop:s.id,live:false,name:s.ownerName,title:s.title,item:id,price:r.price,count:r.count,x:s.x,z:s.z,mapId:MARKET_ZONE.mapId});
 for(const s of stalls)for(const [id,r] of Object.entries(s.items))if(match(id))rows.push({kind:'sell',owner:s.owner,live:true,name:s.name,title:s.title,item:id,price:r.price,count:r.count,x:s.x,z:s.z,mapId:s.mapId});
 return rows.sort((a,b)=>a.kind===b.kind?(a.kind==='buy'?b.price-a.price:a.price-b.price):a.kind==='sell'?-1:1).slice(0,40);
}
// What players see of a shop (no log or pouch of other people's shops).
export const publicShop=s=>({id:s.id,kind:s.kind,title:s.title,ownerName:s.ownerName,x:s.x,z:s.z,items:s.items,createdAt:s.createdAt??0,expiresAt:shopDeadline(s),status:s.status??'open',...(s.closedReason?{closedReason:s.closedReason}:{})});

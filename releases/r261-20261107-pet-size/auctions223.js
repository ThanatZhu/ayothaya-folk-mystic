// Server-owned auction rules. Items and bids are escrowed; credits survive logout/restart.
import {normalizeBag,MAX_COINS,itemDef,stackLimit,addLoot} from './items.js';
import {TRADABLE,PRICE_MAX} from './market.js';
export const AUCTION={durations:[1,6,24],tax:.03,perCharacter:3,maxActive:160,maxCredits:1800,history:300,receipts:1000,snipeWindow:60000,maxExtension:300000};
export const AUCTION_ACTIONS=['auctionCreate','auctionBid','auctionCancel','auctionClaim'];
export const AUCTION_ERRORS={'auction-none':'ไม่พบรายการประมูลนี้','auction-closed':'รายการประมูลปิดแล้ว','auction-own':'ประมูลของบัญชีตัวเองไม่ได้','auction-bid-low':'ราคาถูกเสนอทับแล้ว กรุณาตรวจราคาล่าสุด','auction-has-bids':'มีผู้เสนอราคาแล้ว ยกเลิกไม่ได้','auction-limit':'รายการประมูลเต็มแล้ว','auction-invalid':'ข้อมูลประมูลไม่ถูกต้อง','auction-capacity':'พื้นที่ประมูลเต็มชั่วคราว กรุณารับของที่ค้างก่อน','auction-credit':'ไม่พบของหรือเงินที่รอรับ','auction-owner':'รายการนี้ไม่ใช่ของคุณ','auction-conflict':'รหัสคำขอนี้ถูกใช้กับรายการอื่นแล้ว'};
const copy=x=>structuredClone(x),int=(n,max=MAX_COINS)=>Number.isSafeInteger(n)&&n>0&&n<=max;
export const auctionKey=a=>[a.serverId,a.uid,a.slotId].join(':');
const who=a=>({key:auctionKey(a),uid:a.uid,name:String(a.name??'').slice(0,32)});
export function emptyAuctions(){return {version:1,lots:[],credits:[],receipts:[]};}
function credit(book,id,owner,lot,coins=0,items=[]){if(!book.credits.some(c=>c.id===id))book.credits.push({id,key:owner.key,lotId:lot.id,item:lot.item,count:lot.count,coins,items});}
export function settleAuctions(source,now){
 const book=copy(source??emptyAuctions());let changed=false;
 for(const lot of book.lots){if(lot.status!=='open'||lot.endsAt>now)continue;changed=true;lot.status=lot.bid?'sold':'expired';lot.closedAt=now;
  if(lot.bid){const tax=Math.floor(lot.bid.amount*AUCTION.tax);credit(book,lot.id+'-sale',lot.owner,lot,lot.bid.amount-tax);credit(book,lot.id+'-win',lot.bid,lot,0,[{id:lot.item,count:lot.count}]);lot.tax=tax;}
  else credit(book,lot.id+'-return',lot.owner,lot,0,[{id:lot.item,count:lot.count}]);
 }
 // Never prune a lot while a refund, item or proceeds are still waiting.
 const pending=new Set(book.credits.map(c=>c.lotId)),closed=book.lots.filter(l=>l.status!=='open'&&!pending.has(l.id)).sort((a,b)=>b.closedAt-a.closedAt),keep=new Set(closed.slice(0,AUCTION.history).map(l=>l.id));
 book.lots=book.lots.filter(l=>l.status==='open'||pending.has(l.id)||keep.has(l.id));
 return {book,changed};
}
export const minimumBid=lot=>lot.bid?Math.min(MAX_COINS+1,lot.bid.amount+Math.max(1,Math.ceil(lot.bid.amount*.05))):lot.start;
export function auctionAction(source,record,m,actor,now=Date.now(),lotId){
 if(!AUCTION_ACTIONS.includes(m.type)||!/^[a-zA-Z0-9_-]{8,80}$/.test(m.id??''))throw Error('auction-invalid');
 const key=auctionKey(actor),signature=JSON.stringify([m.type,m.lotId??null,m.item??null,m.count??null,m.start??null,m.hours??null,m.amount??null,m.creditId??null]),book=settleAuctions(source,now).book;
 const receipt=book.receipts.find(r=>r.key===key&&r.id===m.id);if(receipt){if(receipt.signature!==signature)throw Error('auction-conflict');return {book,record,result:receipt.result,replayed:true};}
 let bag=normalizeBag(record.bag),result={type:m.type};const owner=who(actor),find=()=>{const l=book.lots.find(l=>l.id===m.lotId);if(!l)throw Error('auction-none');return l;};
 if(m.type==='auctionCreate'){
  if(!TRADABLE(m.item)||!itemDef(m.item)||!int(m.count,stackLimit(m.item))||!int(m.start,Math.min(PRICE_MAX,MAX_COINS))||!AUCTION.durations.includes(m.hours)||typeof lotId!=='string')throw Error('auction-invalid');
  if((bag.items[m.item]??0)<m.count)throw Error('no-item');
  if(book.lots.filter(l=>l.status==='open').length>=AUCTION.maxActive||book.lots.filter(l=>l.status==='open'&&l.owner.key===key).length>=AUCTION.perCharacter)throw Error('auction-limit');
  bag.items[m.item]-=m.count;if(!bag.items[m.item])delete bag.items[m.item];
  const endsAt=now+m.hours*3600000;book.lots.push({id:lotId,owner,item:m.item,count:m.count,start:m.start,createdAt:now,endsAt,maxEnd:endsAt+AUCTION.maxExtension,status:'open',bid:null});result.lotId=lotId;
 }else if(m.type==='auctionBid'){
  const lot=find();if(lot.status!=='open')throw Error('auction-closed');if(lot.owner.uid===actor.uid)throw Error('auction-own');
  if(!int(m.amount)||m.amount<minimumBid(lot))throw Error('auction-bid-low');
  if(lot.bid?.uid===actor.uid&&lot.bid.key!==key)throw Error('auction-own');
  const same=lot.bid?.key===key,cost=m.amount-(same?lot.bid.amount:0);if(bag.coins<cost)throw Error('no-coins');bag.coins-=cost;
  if(lot.bid&&!same)credit(book,lot.id+'-refund-'+lot.bid.request,lot.bid,lot,lot.bid.amount);
  lot.bid={...owner,amount:m.amount,request:m.id};if(lot.endsAt-now<AUCTION.snipeWindow)lot.endsAt=Math.min(lot.maxEnd,now+AUCTION.snipeWindow);result.lotId=lot.id;result.amount=m.amount;
 }else if(m.type==='auctionCancel'){
  const lot=find();if(lot.owner.key!==key)throw Error('auction-owner');if(lot.status!=='open')throw Error('auction-closed');if(lot.bid)throw Error('auction-has-bids');
  lot.status='cancelled';lot.closedAt=now;credit(book,lot.id+'-return',lot.owner,lot,0,[{id:lot.item,count:lot.count}]);result.lotId=lot.id;
 }else{
  const c=book.credits.find(c=>c.id===m.creditId&&c.key===key);if(!c)throw Error('auction-credit');if(bag.coins+c.coins>MAX_COINS)throw Error('coin-cap');
  const added=addLoot(bag,{coins:c.coins,items:c.items});if(added.lost.length)throw Error('bag-full');bag=added.bag;book.credits=book.credits.filter(r=>r!==c);result.creditId=c.id;
 }
 book.receipts.push({key,id:m.id,signature,result});book.receipts=book.receipts.slice(-AUCTION.receipts);
 if(['auctionCreate','auctionBid'].includes(m.type)&&(book.credits.length>AUCTION.maxCredits||JSON.stringify(book).length>650000))throw Error('auction-capacity');
 return {book,record:{...record,bag},result,replayed:false};
}
export function publicAuctions(book,actor,now=Date.now()){
 const key=auctionKey(actor),clean=l=>({id:l.id,item:l.item,count:l.count,start:l.start,price:l.bid?.amount??l.start,minimum:minimumBid(l),endsAt:l.endsAt,status:l.status,seller:l.owner.name,bidder:l.bid?.name??'',mine:l.owner.key===key,leading:l.bid?.key===key,hasBids:!!l.bid});
 return {now,tax:AUCTION.tax,durations:AUCTION.durations,active:book.lots.filter(l=>l.status==='open').sort((a,b)=>a.endsAt-b.endsAt).map(clean),mine:book.lots.filter(l=>l.owner.key===key||l.bid?.key===key).sort((a,b)=>b.createdAt-a.createdAt).slice(0,100).map(clean),credits:book.credits.filter(c=>c.key===key).map(c=>({id:c.id,item:c.item,count:c.count,coins:c.coins,items:c.items}))};
}

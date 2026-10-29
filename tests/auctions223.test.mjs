import test from 'node:test';import assert from 'node:assert/strict';import {auctionAction,emptyAuctions,settleAuctions,publicAuctions,minimumBid} from '../auctions223.js';import {MAX_COINS,ITEMS,composeId,normalizeBag} from '../items.js';
const owner={uid:'seller',slotId:'slot-1',serverId:'server-1',name:'Seller'},a={uid:'a',slotId:'slot-1',serverId:'server-1',name:'Bidder A'},b={uid:'b',slotId:'slot-1',serverId:'server-1',name:'Bidder B'},profile=(coins=10000)=>({bag:{coins,slots:80,items:{'card-rat':2}}}),start=100000;
const create=(book=emptyAuctions(),record=profile(),id='create-0001')=>auctionAction(book,record,{type:'auctionCreate',id,item:'card-rat',count:1,start:100,hours:1},owner,start,'lot-1');
test('auction item escrow preserves exact graded/refined/carded identity; stale, nontradable, negative and capacity inputs do not debit',()=>{
 const base=Object.keys(ITEMS).find(i=>ITEMS[i].graded&&ITEMS[i].slot==='weapon'),item=composeId(base,15,'card-rat','a2',3),record={bag:{coins:500,items:{[item]:1}}},before=structuredClone(record);
 const r=auctionAction(null,record,{type:'auctionCreate',id:'create-gear1',item,count:1,start:100,hours:6},owner,start,'gear-1');assert.equal(r.book.lots[0].item,item);assert.equal(r.record.bag.items[item],undefined);assert.deepEqual(record,before);
 for(const change of [{count:-1},{count:2},{start:0},{hours:2},{item:'bogus'}])assert.throws(()=>auctionAction(null,record,{type:'auctionCreate',id:'create-bad11',item,count:1,start:100,hours:1,...change},owner,start,'bad'));
});
test('outbid funds remain escrowed as private credits; raising own bid only debits difference; no self-account bids or cancellation with bidders',()=>{
 const c=create(),r=auctionAction(c.book,profile(),{type:'auctionBid',id:'bidder-a001',lotId:'lot-1',amount:100},a,start+10);
 const raised=auctionAction(r.book,r.record,{type:'auctionBid',id:'bidder-a002',lotId:'lot-1',amount:105},a,start+20);assert.equal(raised.record.bag.coins,9895);assert.equal(raised.book.credits.length,0);
 const outbid=auctionAction(raised.book,profile(),{type:'auctionBid',id:'bidder-b001',lotId:'lot-1',amount:111},b,start+30);assert.equal(outbid.record.bag.coins,9889);assert.equal(outbid.book.credits[0].coins,105);
 assert.throws(()=>auctionAction(outbid.book,c.record,{type:'auctionBid',id:'selfbid-001',lotId:'lot-1',amount:200},{...owner,slotId:'slot-2'},start+40),/auction-own/);
 assert.throws(()=>auctionAction(outbid.book,c.record,{type:'auctionCancel',id:'cancel-0001',lotId:'lot-1'},owner,start+40),/auction-has-bids/);
 const view=publicAuctions(outbid.book,a,start+50);assert.equal(view.credits.length,1);assert.ok(!JSON.stringify(view).includes('"uid"'));assert.ok(!JSON.stringify(view).includes('"key"'));assert.equal(publicAuctions(outbid.book,b).credits.length,0);
});
test('settlement awards item and after-tax proceeds once; credits claim atomically without loss on full bag or coin cap',()=>{
 const c=create(),bid=auctionAction(c.book,profile(),{type:'auctionBid',id:'winning-001',lotId:'lot-1',amount:101},a,start+10),closed=settleAuctions(bid.book,start+3600001);assert.equal(closed.book.credits.length,2);assert.equal(settleAuctions(closed.book,start+3600002).changed,false);
 const seller=publicAuctions(closed.book,owner).credits[0],winner=publicAuctions(closed.book,a).credits[0];assert.equal(seller.coins,98);
 const m={type:'auctionClaim',id:'winnerclaim1',creditId:winner.id},claim=auctionAction(closed.book,bid.record,m,a,start+3600002);assert.equal(claim.record.bag.items['card-rat'],3);
 const replay=auctionAction(claim.book,claim.record,m,a,start+3600003);assert.equal(replay.replayed,true);assert.equal(replay.record.bag.items['card-rat'],3);
 assert.throws(()=>auctionAction(claim.book,profile(MAX_COINS),{type:'auctionClaim',id:'sellerclaim1',creditId:seller.id},owner,start+3600004),/coin-cap/);assert.equal(publicAuctions(claim.book,owner).credits.length,1);
 const full={bag:{coins:0,slots:80,items:Object.fromEntries(Object.keys(normalizeBag({slots:100,items:Object.fromEntries(Object.keys(ITEMS).filter(id=>id!=='card-rat').map(id=>[id,1]))}).items).slice(0,80).map(id=>[id,1]))}};assert.throws(()=>auctionAction(closed.book,full,{...m,id:'fullbag-0001'},a,start+3600003),/bag-full/);
});
test('bounded anti-sniping, expiry/return, cancellation and idempotency preserve total items and money',()=>{
 const c=create(),lot=c.book.lots[0],near=lot.endsAt-1000,bid=auctionAction(c.book,profile(),{type:'auctionBid',id:'late-bid001',lotId:lot.id,amount:100},a,near);assert.equal(bid.book.lots[0].endsAt,near+60000);
 const replay=auctionAction(bid.book,bid.record,{type:'auctionBid',id:'late-bid001',lotId:lot.id,amount:100},a,near+20);assert.equal(replay.record.bag.coins,9900);assert.equal(replay.book.lots[0].endsAt,near+60000);
 assert.throws(()=>auctionAction(bid.book,bid.record,{type:'auctionBid',id:'late-bid001',lotId:lot.id,amount:200},a,near+30),/auction-conflict/);
 assert.throws(()=>auctionAction(bid.book,profile(),{type:'auctionBid',id:'expired-bid1',lotId:lot.id,amount:200},b,near+60001),/auction-closed/);
 const noBid=create(),cancel=auctionAction(noBid.book,noBid.record,{type:'auctionCancel',id:'cancel-safe1',lotId:'lot-1'},owner,start+20);assert.equal(cancel.book.lots[0].status,'cancelled');assert.equal(cancel.book.credits.length,1);
 assert.equal(settleAuctions(create().book,start+3600001).book.credits[0].items[0].count,1);assert.equal(minimumBid({...lot,bid:{amount:MAX_COINS}}),MAX_COINS+1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,MAX_STACK,addLoot,normalizeBag,bagSlotsUsed,bagStacks,itemRoom,buy,sell,useItem,discard,composeId} from '../items.js';
import {composeMail,deliverMail,mailboxAction,mailboxBulkAction} from '../mailbox.js';
import {moveOffer,normalizeStorage,buyFromStall} from '../market.js';
import {extractCard} from '../farm-utility221.js';
import {equipGear,unequipGear} from '../character-stats.js';
import {craft,RECIPES} from '../crafting.js';
const filler=n=>Object.fromEntries(Object.keys(ITEMS).filter(id=>!['lek-lai','break-guard'].includes(id)&&['loot','potion','card'].includes(ITEMS[id].kind)).slice(0,n).map(id=>[id,1]));
const gift=()=>composeMail({id:'stack-gift-243',title:'Test',body:'Test',attachments:{items:[{id:'lek-lai',count:999},{id:'break-guard',count:999}]}});
test('40/70 mail case creates two extra stacks, remains durable and cannot be claimed twice',()=>{
 const r={serverId:'server-1',bag:{coins:0,slots:70,items:{...filler(38),'lek-lai':100,'break-guard':100}},mailbox:deliverMail(null,gift()).mailbox};
 assert.equal(bagSlotsUsed(r.bag),40);const next=mailboxAction(r,{type:'mailClaim',mailId:gift().id},[],1000);
 assert.equal(bagSlotsUsed(next.bag),42);for(const id of ['lek-lai','break-guard'])assert.deepEqual(bagStacks(next.bag).filter(s=>s.id===id).map(s=>s.count),[999,100]);
 const restored=JSON.parse(JSON.stringify(next));restored.bag=normalizeBag(restored.bag);assert.deepEqual(restored.bag,next.bag);assert.deepEqual(mailboxAction(restored,{type:'mailClaim',mailId:gift().id},[],2000).bag,next.bag);assert.equal(r.mailbox.messages[0].claimedAt,0);
});
test('mail with room for only one of two new stacks is atomic and can retry after room is freed',()=>{
 const r={serverId:'server-1',bag:{coins:0,items:{'lek-lai':999*38,'break-guard':1}},mailbox:deliverMail(null,gift()).mailbox},before=structuredClone(r);
 assert.throws(()=>mailboxAction(r,{type:'mailClaim',mailId:gift().id},[],1000),/bag-full/);assert.equal(JSON.stringify(r),JSON.stringify(before));
 const bulk=mailboxBulkAction(r,{type:'mailClaimAll'},[],1000);assert.equal(bulk.summary.claimed,0);assert.deepEqual(bulk.record.bag,r.bag);
 r.bag=discard(r.bag,'lek-lai',999);const next=mailboxAction(r,{type:'mailClaim',mailId:gift().id},[],2000);assert.equal(bagSlotsUsed(next.bag),40);assert.equal(next.bag.items['break-guard'],1000);
});
test('loot fills the partial stack, then free slots, and reports only real overflow',()=>{
 let bag={coins:0,items:{'rat-tooth':999*39+990}};assert.equal(bagSlotsUsed(bag),40);assert.equal(itemRoom(bag,'rat-tooth'),9);
 const result=addLoot(bag,{items:[{id:'rat-tooth',count:20},{id:'hp-small',count:1}]});assert.equal(result.bag.items['rat-tooth'],999*40);assert.deepEqual(result.lost,[{id:'rat-tooth',count:11},{id:'hp-small',count:1}]);
 bag=discard(result.bag,'rat-tooth',1000);assert.equal(bagSlotsUsed(bag),39);assert.equal(addLoot(bag,{items:[{id:'hp-small',count:999}]}).lost.length,0);
});
test('buy, consume and sell use totals across stack boundaries without changing prices',()=>{
 const b=buy({coins:10000,items:{'hp-small':999}},'แม่บัว','hp-small',5);assert.equal(b.items['hp-small'],1004);assert.equal(b.coins,10000-5*ITEMS['hp-small'].buy);
 const used=useItem(b,'hp-small',{hp:1,maxHp:140,mp:0,maxMp:100}).bag;assert.equal(used.items['hp-small'],1003);
 const sold=sell(used,'hp-small',1000);assert.equal(sold.items['hp-small'],3);assert.equal(bagSlotsUsed(sold),1);
});
test('storage and trades transfer multi-stack totals exactly and respect destination capacity',()=>{
 const src={coins:0,slots:70,items:{'hp-small':2500}};const [rest,storage]=moveOffer(src,{}, {items:{'hp-small':2500}}, {toCap:100});assert.equal(rest.items['hp-small'],undefined);assert.equal(normalizeStorage(storage).items['hp-small'],2500);
 const [empty,back]=moveOffer(storage,{slots:70,items:{}},{items:{'hp-small':2500}},{fromCap:100});assert.deepEqual(empty.items,{});assert.equal(back.items['hp-small'],2500);
 const full={coins:0,items:{'rat-tooth':999*40}};assert.throws(()=>moveOffer(src,full,{items:{'hp-small':2500}}),/bag-full/);assert.equal(src.items['hp-small'],2500);
 const deal=buyFromStall(src,{title:'Test',items:{'hp-small':{count:2000,price:1}}},{coins:3000,items:{'hp-small':900}},'hp-small',2000);assert.equal(deal.buyerBag.items['hp-small'],2900);assert.equal(deal.sellerBag.items['hp-small'],500);assert.equal(deal.cost,2000);
});
test('card removal and equipment return consume new stack slots without overflow',()=>{
 const id=Object.keys(ITEMS).find(id=>ITEMS[id].kind==='gear'&&ITEMS[id].slot==='weapon'&&ITEMS[id].slots!==0),worn=composeId(id,5,'card-rat');
 const removed=extractCard({coins:10000,items:{'card-rat':999}},{weapon:worn},'weapon',worn);assert.equal(removed.bag.items['card-rat'],1000);assert.equal(bagSlotsUsed(removed.bag),2);
 const back=unequipGear({coins:0,items:{[id]:999}},{weapon:id},'weapon');assert.equal(back.bag.items[id],1000);
 assert.throws(()=>unequipGear({items:{[id]:999*40}},{weapon:id},'weapon'),/bag-full/);
});
test('crafting consumes materials across stacks and opens another output stack',()=>{
 const recipe=RECIPES.find(r=>r.out==='hp-small');assert(recipe);const bag={coins:recipe.coins*2,items:{'hp-small':999}};for(const [id,n] of Object.entries(recipe.needs))bag.items[id]=n*2;
 const result=craft(bag,recipe.out,2);assert(result.bag.items['hp-small']>999);assert(bagStacks(result.bag).filter(s=>s.id==='hp-small').length>1);
});


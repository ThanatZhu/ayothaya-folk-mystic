import test from 'node:test';
import assert from 'node:assert/strict';
import {AMULETS,AMULET_TIERS,AMULET_MATERIALS,AMULET_PITY,AMULET_RATE,AMULET_REWARDS,normalizeAmuletGacha,amuletAtTier} from '../amulets.js';
import {drawAmulets} from '../amulet-gacha.js';
import {normalizePetAccount,petAccountAction,publicPetAccount} from '../pet-account.js';
import {ITEMS,itemDef,MAX_STACK,bagCap} from '../items.js';
import {deriveStats,equipGear,unequipGear} from '../character-stats.js';
import {monsterHit} from '../combat-core.js';
const record=()=>({bag:{coins:10,items:{}},petCollection:{balance:2000}});
const draw=(r,count=1,random=()=>.5,id='amulet-test-0001')=>drawAmulets(r,{count,id},random);

test('five amulets have orange, red and rainbow variants plus material rewards; every variant refines to +20',()=>{
 assert.equal(AMULETS.length,5);assert.equal(AMULET_REWARDS.length,19);assert.deepEqual(AMULET_TIERS.map(t=>t.id),['rainbow','red','orange']);assert.ok(Math.abs(AMULET_REWARDS.reduce((n,r)=>n+r.rate,0)-1)<1e-12);
 for(const a of AMULETS)for(const tier of AMULET_TIERS){const id=amuletAtTier(a,tier.id).id,it=itemDef(id);assert.ok(it.amulet);assert.equal(it.rainbow,tier.id==='rainbow');assert.equal(it.amuletTier,tier.id);assert.equal(it.slot,'accessory');assert.equal(it.rarity,4);assert.equal(it.slots,0);assert.equal(itemDef(id+'+20').refine,20);assert.equal(itemDef(id+'+21'),null);assert.match(it.image,/assets\/amulets-rainbow\/.+\.png$/);}
});
test('rates total 100%: rainbow .5%, red 4.5%, orange 20% and materials 75%; equal designs within each tier',()=>{
 assert.equal(AMULET_RATE,.005);let lower=0;
 for(const tier of AMULET_TIERS){for(let i=0;i<AMULETS.length;i++){
  const rolls=[lower+tier.rate/2,(i+.5)/AMULETS.length];
  const r=draw(record(),1,()=>rolls.shift()),id=amuletAtTier(AMULETS[i],tier.id).id;
  assert.equal(r.results[0].id,id);assert.equal(r.results[0].tier,tier.id);assert.equal(r.record.bag.items[id],1);
  assert.equal(AMULET_REWARDS.find(r=>r.id===id).rate,tier.rate/5);
 }lower+=tier.rate;}
 for(const reward of AMULET_MATERIALS){const r=draw(record(),1,()=>lower+reward.rate/2);assert.equal(r.results[0].id,reward.id);assert.equal(r.record.bag.items[reward.id],reward.count);assert.equal(r.results[0].tier,'material');lower+=reward.rate;}
 for(const [roll,tier] of [[0,'rainbow'],[.004999,'rainbow'],[.005,'red'],[.049999,'red'],[.05,'orange'],[.249999,'orange'],[.25,'material'],[.999999,'material']]){const values=[roll,.5];assert.equal(draw(record(),1,()=>values.shift()).results[0].tier,tier);}
});
test('red and orange have scaled flat stats only; all special effects are exclusive to rainbow',()=>{
 for(const base of AMULETS){const rainbow=amuletAtTier(base,'rainbow');for(const tier of AMULET_TIERS.filter(t=>t.id!=='rainbow')){const lower=amuletAtTier(base,tier.id);
  for(const [stat,value] of Object.entries(rainbow.bonus))assert.equal(lower.bonus[stat],value*tier.power);
  for(const key of ['atk','matk','def','mdef'])assert.equal(lower[key],rainbow[key]*tier.power);
  assert.deepEqual(lower.pct,{});assert.deepEqual(lower.effect,{});assert.deepEqual(lower.effects,[]);
  assert.equal(itemDef(lower.id).image,itemDef(rainbow.id).image);assert.equal(itemDef(lower.id).rainbow,false);assert.match(itemDef(lower.id).text,/ไม่มีเอฟเฟกต์พิเศษ/);
  const d=deriveStats({gear:{accessory:lower.id}});assert.equal(d.coinPct,0);assert.equal(d.dmgReduce,0);assert.equal(d.cdr,0);assert.equal(d.mpCut,0);assert.equal(d.moveSpeed,0);assert.equal(d.fleeBonus,0);
 }
 }
 assert.match(itemDef('amulet-sum-kor').text,/เบี้ยจากมอนสเตอร์ \+200%/);assert.match(itemDef('amulet-somdej').text,/HP สูงสุด \+100%/);
 assert.throws(()=>amuletAtTier(AMULETS[0],'purple'),/bad-amulet-tier/);
});
test('pity, gold, inventory and receipts commit as one batch without mutating input',()=>{
 const before=record();before.petCollection.amuletGacha={pity:AMULET_PITY-5,pulls:95};const copy=structuredClone(before);
 const r=draw(before,10,()=>.9);assert.equal(r.results.length,10);assert.ok(r.results[4].rainbow&&r.results[4].guaranteed);assert.equal(r.record.petCollection.amuletGacha.pity,5);assert.equal(r.record.petCollection.amuletGacha.pulls,105);assert.equal(r.record.petCollection.balance,1000);assert.deepEqual(before,copy);
 const again=draw(r.record,10,()=>{throw Error('retry must not reroll');});assert.ok(again.replayed);assert.deepEqual(again.results,r.results);assert.equal(again.record.petCollection.balance,1000);assert.throws(()=>draw(r.record,1),/request-conflict/);
});
test('natural rainbow resets pity, duplicates remain real inventory items',()=>{
 let r=record();r.petCollection.amuletGacha={pity:50};r=draw(r,1,()=>0).record;assert.equal(r.petCollection.amuletGacha.pity,0);r=draw(r,1,()=>0,'amulet-test-0002').record;assert.equal(r.bag.items[AMULETS[0].id],2);
});
test('invalid requests, insufficient gold, random errors and full bags cannot debit the wallet',()=>{
 for(const count of [0,2,11,1.5,'1'])assert.throws(()=>draw(record(),count),/bad-count/);
 assert.throws(()=>draw(record(),1,()=>.5,'x'),/bad-request-id/);
 const poor=record();poor.petCollection.balance=99;assert.throws(()=>draw(poor),/no-gems/);assert.equal(poor.petCollection.balance,99);
 for(const x of [-1,1,NaN,Infinity])assert.throws(()=>draw(record(),1,()=>x),/bad-random/);
 const full=record();full.bag.items=Object.fromEntries(Object.keys(ITEMS).filter(k=>['loot','potion','card'].includes(itemDef(k).kind)).slice(0,bagCap(full.bag)).map(k=>[k,1]));assert.equal(Object.keys(full.bag.items).length,bagCap(full.bag));assert.throws(()=>draw(full,1,()=>0),/bag-full/);assert.equal(full.petCollection.balance,2000);
 const stack=record();stack.bag.items['break-guard']=MAX_STACK;assert.throws(()=>draw(stack,1,()=>.6),/bag-full/);assert.equal(stack.petCollection.balance,2000);
});
test('pet draws and mail grants preserve independent amulet pity; public wallets omit receipts',()=>{
 let r=draw(record(),1,()=>.8).record;
 r.petCollection=petAccountAction(r.petCollection,{type:'petDraw',count:1,requestId:'pet-test-0001'},()=>.8).state;
 r.petCollection=petAccountAction(r.petCollection,{type:'petGrant',gems:100,requestId:'mail-test-0001'}).state;
 assert.equal(r.petCollection.amuletGacha.pity,1);assert.equal(r.petCollection.pity,1);assert.equal(r.petCollection.amuletGacha.receipts.length,1);
 const view=publicPetAccount(r.petCollection);assert.ok(!('receipts' in view));assert.ok(!('receipts' in view.amuletGacha));assert.equal(normalizePetAccount(null).amuletGacha.pity,0);assert.equal(normalizeAmuletGacha({pity:1e6}).pity,99);
});
test('equipping each amulet produces live stats; unequip removes bonuses and there is only one accessory slot',()=>{
 const base=deriveStats({level:50,classId:'swordsman'});
 for(const a of AMULETS){let worn=equipGear({items:{[a.id]:1}},null,a.id,{classId:'swordsman',level:1});const d=deriveStats({level:50,classId:'swordsman',gear:worn.gear});assert.ok(d.atk>base.atk||d.maxHp>base.maxHp||d.flee>base.flee,a.id);const off=unequipGear(worn.bag,worn.gear,'accessory');assert.deepEqual(deriveStats({level:50,classId:'swordsman',gear:off.gear}),base);}
 const rod=deriveStats({level:50,gear:{accessory:'amulet-phra-rod'}});assert.ok(rod.flee>deriveStats({level:50}).flee);assert.equal(rod.moveSpeed,.15);assert.equal(rod.fleeBonus,.35);
 const sum=deriveStats({gear:{accessory:'amulet-sum-kor'}});assert.equal(sum.coinPct,2);
 const somdej=deriveStats({gear:{accessory:'amulet-somdej'}});assert.equal(somdej.dmgReduce,.30);
 const phaya=deriveStats({classId:'shaman',gear:{accessory:'amulet-nang-phaya'}});assert.ok(phaya.matk>0);assert.equal(phaya.critMult,2.5);assert.equal(phaya.armorPen,.3);
 const supan=deriveStats({gear:{accessory:'amulet-phong-suphan'}});assert.equal(supan.mpCut,.4);assert.equal(supan.cdr,.4);
 let worn=equipGear({items:{[AMULETS[0].id]:1,[AMULETS[1].id]:1}},null,AMULETS[0].id,{classId:'novice',level:1});worn=equipGear(worn.bag,worn.gear,AMULETS[1].id,{classId:'novice',level:1});assert.equal(worn.gear.accessory,AMULETS[1].id);assert.equal(worn.bag.items[AMULETS[0].id],1);
});
test('flat evasion from the rainbow Rod actually dodges monster attacks, beyond the FLEE comparison',()=>{
 const world={player:{hp:100,maxHp:100,shield:0},status:{},profession:{id:'novice'},derived:{fleeStat:0,total:{luk:1},fleeBonus:0}};
 assert.ok(monsterHit(world,100,()=>.2,'straw')>0);world.derived.fleeBonus=.35;assert.equal(monsterHit(world,100,()=>.2,'straw'),0);
});

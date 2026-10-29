import test from 'node:test';import assert from 'node:assert/strict';
import {ITEMS,composeId,itemDef,normalizeBag,bagCap} from '../items.js';import {extractCard,CARD_REMOVAL_FEE,sellBatch,quoteSale,utilityAction} from '../farm-utility221.js';
import {CombatWorld,MONSTER_TYPES} from '../combat-core.js';import {startWalk,setWalkPace} from '../server/auto-walk.js';
const base=Object.keys(ITEMS).find(id=>ITEMS[id].kind==='gear'&&ITEMS[id].slot==='weapon'&&ITEMS[id].slots!==0&&ITEMS[id].graded),card=Object.keys(ITEMS).find(id=>ITEMS[id].kind==='card'&&ITEMS[id].slot==='weapon');
test('paid card extraction returns one card, preserves refine/grade and rejects stale signatures without changing inputs',()=>{
 const expected=composeId(base,15,card,null,3),gear={weapon:expected},bag={coins:30000,items:{}},before=structuredClone({bag,gear}),r=extractCard(bag,gear,'weapon',expected);
 assert.equal(r.fee,10000);assert.equal(r.bag.coins,20000);assert.equal(r.bag.items[card],1);assert.equal(r.gear.weapon,composeId(base,15,null,null,3));assert.equal(itemDef(r.gear.weapon).refine,15);
 assert.deepEqual({bag,gear},before);assert.throws(()=>extractCard(r.bag,r.gear,'weapon',expected),/gear-changed/);assert.throws(()=>extractCard({...bag,coins:CARD_REMOVAL_FEE-1},gear,'weapon',expected),/no-coins/);
});
test('extraction with a full bag keeps both fee and equipped card when no card stack has room',()=>{
 const valid=normalizeBag({slots:100,items:Object.fromEntries(Object.keys(ITEMS).filter(id=>id!==card).map(id=>[id,1]))}),ids=Object.keys(valid.items).slice(0,100),bag={coins:30000,slots:100,items:Object.fromEntries(ids.map(id=>[id,1]))},gear={weapon:composeId(base,5,card)};
 assert.throws(()=>extractCard(bag,gear,'weapon',gear.weapon),/bag-full/);assert.equal(bag.coins,30000);assert.equal(itemDef(gear.weapon).card,card);
});
test('batch sale validates every row and exact quote before changing a bag; duplicate, negative, missing and coin-overflow offers fail',()=>{
 const bag={coins:20,items:{'rat-tooth':10,'straw-bundle':12}},lines=[{id:'rat-tooth',count:4},{id:'straw-bundle',count:3}],total=quoteSale(bag,lines),r=sellBatch(bag,lines,total);
 assert.equal(r.bag.coins,20+total);assert.equal(r.bag.items['rat-tooth'],6);assert.equal(r.bag.items['straw-bundle'],9);assert.equal(bag.items['rat-tooth'],10);
 for(const invalid of [[...lines,lines[0]],[{id:'rat-tooth',count:-1}],[{id:'rat-tooth',count:11}]])assert.throws(()=>quoteSale(bag,invalid));
 assert.throws(()=>sellBatch(bag,lines,total+1),/sale-changed/);assert.throws(()=>quoteSale({...bag,coins:1000000000},lines),/coin-cap/);
});
test('utility receipts apply each extraction/sale once across reconnect serialization and reject ID conflicts',()=>{
 const expected=composeId(base,5,card),record={bag:{coins:30000,items:{'rat-tooth':10}},gear:{weapon:expected}},m={type:'cardRemove',id:'remove-test-0001',slot:'weapon',expected,quoted:10000};
 const first=utilityAction(record,m),replay=utilityAction(JSON.parse(JSON.stringify(first.record)),m);assert.equal(replay.replayed,true);assert.equal(replay.record.bag.coins,20000);assert.equal(replay.record.bag.items[card],1);assert.throws(()=>utilityAction(first.record,{...m,slot:'armor'}),/request-conflict/);
 const lines=[{id:'rat-tooth',count:5}],sale={type:'sellBatch',id:'selling-test-0001',npc:'แม่บัว',lines,quoted:quoteSale(first.record.bag,lines)};const next=utilityAction(first.record,sale);assert.equal(utilityAction(next.record,sale).record.bag.items['rat-tooth'],5);
});
const nav={zones:[{x:-25,z:-25,w:50,d:50}],obstacles:[],props:[]},type=MONSTER_TYPES.findIndex(m=>m.id==='straw');
function world(){const w=new CombatWorld({classId:'swordsman',nav,spawn:{x:0,z:0},mobs:[[12,0,type]]});w.mobs[0].hp=w.mobs[0].maxHp=100000;return w;}
test('an explicit basic attack walks to the selected monster and attacks without enabling AUTO or using skills',()=>{
 const w=world();w.select(0);assert.equal(w.requestAttack(),true);const events=[];for(let i=0;i<300;i++){w.update(.05,{x:0,z:0},{monsters:false});events.push(...w.events.splice(0));}
 assert.ok(w.player.x>3);assert.ok(events.some(e=>e.type==='damage'));assert.equal(w.auto,false);assert.ok(!events.some(e=>e.type==='cast'&&Number.isInteger(e.skillIndex)));
 w.update(.05,{x:-1,z:0},{monsters:false});assert.equal(w.attackOrder,null);
});
test('attack intent ends on target death and never jumps to another monster',()=>{
 const w=world();w.select(0);w.requestAttack();w.mobs[0].hp=0;w.update(.05,{x:0,z:0},{monsters:false});assert.equal(w.attackOrder,null);assert.equal(w.auto,false);
});
test('quest routes automatically run when supported; ordinary map routes keep explicit pace and old servers stay at walking speed',()=>{
 const p=()=>({room:{map:{id:'field',nav}},world:{player:{x:0,z:0,hp:100},clearEmote(){}}}),m={id:'quest-walk-221',mapId:'field',kind:'quest',x:5,z:0,run:false};
 const a=p();startWalk(a,m,true);assert.equal(a.walkRoute.run,true);setWalkPace(a,{id:m.id,run:false},true);assert.equal(a.walkRoute.run,true);
 const b=p();startWalk(b,{...m,kind:'map'},true);assert.equal(b.walkRoute.run,false);
 const c=p();startWalk(c,m,false);assert.equal(c.walkRoute.run,false);
});

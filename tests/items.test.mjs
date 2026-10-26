import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITEMS,DROPS,SHOPS,BAG_SLOTS,MAX_STACK,normalizeBag,addLoot,rollLoot,buy,sell,discard,useItem} from '../items.js';
import {MONSTER_TYPES} from '../combat-core.js';

const world=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));

test('atlas cells are unique and every drop, shop and monster reference is real', () => {
 for(const atlas of [undefined,'gear','refine','cards','social','emblems','emotes','items48']){const icons=Object.entries(ITEMS).filter(([id,i])=>i.atlas===atlas&&!i.tint&&!i.image).map(([,i])=>i.icon); // ponytail: 0.117 boss shards borrow loot cells until painted (shard-soul is untinted, reported) // tinted tier 3/4 gear reuses a tier-2 cell on purpose
  assert.equal(new Set(icons).size,icons.length,'unique cells in '+(atlas??'items'));assert.ok(icons.every(i=>i>=0&&i<24));}
 for(const item of Object.values(ITEMS).filter(i=>i.image))assert.ok(readFileSync(new URL('../'+item.image,import.meta.url)).length>100,'standalone item artwork exists');
 for(const [monster,d] of Object.entries(DROPS)){
  assert.ok(MONSTER_TYPES.some(t=>t.id===monster),monster);
  for(const [id,chance] of d.items){assert.ok(ITEMS[id],id);assert.ok(chance>0&&chance<=1);}
 }
 for(const map of world.maps)for(const [,,type] of map.mobs??[]){const id=MONSTER_TYPES[type]?.id;if(id)assert.ok(DROPS[id],`${id} spawns in ${map.id} but has no drops`);}
 for(const [npc,shop] of Object.entries(SHOPS)){
  assert.ok(world.maps.find(m=>m.id===shop.mapId)?.npcs.some(n=>n.name===npc),`${npc} in ${shop.mapId}`);
  for(const id of shop.stock){if(shop.currency)assert.ok(ITEMS[id].tokens>0,`${id} has no token price`);else assert.ok(ITEMS[id].buy>ITEMS[id].sell,`${id} sells for less than it costs`);}
 }
});

test('bags clamp junk, stacks cap at MAX_STACK and a full bag reports what was lost', () => {
 assert.deepEqual(normalizeBag({coins:-5,items:{'hp-small':3,'nope':2,'cowrie':9,'rat-tooth':0}}),{coins:0,items:{'hp-small':3}});
 const r=addLoot({coins:1,items:{'rat-tooth':MAX_STACK-1}},{coins:5,items:[{id:'rat-tooth',count:3},{id:'hp-small',count:1}]});
 assert.equal(r.bag.coins,6);assert.equal(r.bag.items['rat-tooth'],MAX_STACK);
 assert.deepEqual(r.lost,[{id:'rat-tooth',count:2}]);
 const many=Object.fromEntries(Array.from({length:BAG_SLOTS},(_,i)=>['x'+i,1]));
 assert.equal(Object.keys(normalizeBag({items:many}).items).length,0,'unknown ids never take a slot');
 assert.equal(addLoot({items:{'hp-small':1}},{items:[{id:'hp-small',count:1}]}).bag.items['hp-small'],2);
});

test('shops: buy needs coins, the item and room; selling pays the sell price', () => {
 let bag={coins:100,items:{}};
 bag=buy(bag,'แม่บัว','hp-small',2);assert.deepEqual(bag,{coins:50,items:{'hp-small':2}});
 assert.throws(()=>buy(bag,'แม่บัว','hp-large',1),/no-coins/);
 assert.throws(()=>buy(bag,'ป้าละไม','hp-large',1),/not-sold/);
 assert.throws(()=>buy(bag,'ลุงเรือง','hp-small',1),/not-sold/);
 assert.throws(()=>buy(bag,'แม่บัว','hp-small',0),/bad-count/);
 bag=sell({coins:0,items:{'rat-tooth':4}},'rat-tooth',3);assert.deepEqual(bag,{coins:9,items:{'rat-tooth':1}});
 assert.throws(()=>sell(bag,'rat-tooth',2),/no-item/);
 assert.throws(()=>sell(bag,'cowrie',1),/not-sellable/);
});

test('potions heal up to max, are consumed, and refuse when already full or defeated', () => {
 const r=useItem({items:{'hp-small':2}},'hp-small',{hp:100,maxHp:140,mp:10,maxMp:100});
 assert.equal(r.hp,140);assert.equal(r.mp,10);assert.equal(r.bag.items['hp-small'],1);
 assert.throws(()=>useItem({items:{'hp-small':1}},'hp-small',{hp:140,maxHp:140,mp:0,maxMp:100}),/already-full/);
 assert.throws(()=>useItem({items:{'hp-small':1}},'hp-small',{hp:0,maxHp:140,mp:0,maxMp:100}),/defeated/);
 assert.throws(()=>useItem({items:{}},'hp-small',{hp:1,maxHp:140,mp:0,maxMp:100}),/no-item/);
 assert.throws(()=>useItem({items:{'rat-tooth':1}},'rat-tooth',{hp:1,maxHp:140,mp:0,maxMp:100}),/not-usable/);
});

test('loot rolls stay inside the table', () => {
 let seed=7;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<300;i++){const l=rollLoot('straw',rand);assert.ok(l.coins>=3&&l.coins<=7);for(const it of l.items)assert.ok(DROPS.straw.items.some(([id])=>id===it.id));}
 const boss=rollLoot('mill-keeper',()=>0);assert.ok(boss.items.some(i=>i.id==='spirit-rope'));
 assert.deepEqual(rollLoot('unknown'),{coins:0,items:[]});
});

test('0.100.10 discard removes 1..stack of an item; buy takes one quantity up to MAX_STACK in a single step', () => {
 const bag={coins:0,items:{'rat-tooth':5,'hp-small':1}};
 assert.deepEqual(discard(bag,'rat-tooth',3),{coins:0,items:{'rat-tooth':2,'hp-small':1}});
 assert.deepEqual(discard(bag,'rat-tooth',5).items,{'hp-small':1},'the whole stack frees the slot');
 for(const n of [0,-1,1.5,6,'2',NaN])assert.throws(()=>discard(bag,'rat-tooth',n),/bad-count/);
 assert.throws(()=>discard(bag,'hp-large',1),/no-item/);
 const rich={coins:1e6,items:{}};
 assert.equal(buy(rich,'แม่บัว','hp-small',150).items['hp-small'],150,'more than the old 99 cap');
 assert.equal(buy({coins:1e6,items:{'hp-small':990}},'แม่บัว','hp-small',9).items['hp-small'],MAX_STACK);
 assert.throws(()=>buy({coins:1e6,items:{'hp-small':990}},'แม่บัว','hp-small',10),/bag-full/,'stack cap, nothing is charged');
 assert.throws(()=>buy(rich,'แม่บัว','hp-small',MAX_STACK+1),/bad-count/);
 assert.throws(()=>buy({coins:ITEMS['hp-small'].buy*3-1,items:{}},'แม่บัว','hp-small',3),/no-coins/);
});

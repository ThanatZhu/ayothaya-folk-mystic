import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeRevival,revivalCount} from '../revival-item.js';
import {normalizeBag,addLoot,sell,useItem,ITEMS} from '../items.js';
test('revival item stacks in inventory, is not an ordinary potion and cannot be sold',()=>{
 assert.equal(ITEMS['soul-talisman'].kind,'revival');
 const b=addLoot({items:{'soul-talisman':1}},{items:[{id:'soul-talisman',count:2}]}).bag;assert.equal(revivalCount(b),3);
 assert.throws(()=>sell(b,'soul-talisman',1),/not-sellable/);assert.throws(()=>useItem(b,'soul-talisman',{hp:1,maxHp:100,mp:0,maxMp:100}),/not-usable/);
});
test('shared offline/online consumption is pure and validates death and quantity before decrementing',()=>{
 const b=normalizeBag({coins:100,items:{'soul-talisman':2,'hp-small':3}});
 assert.throws(()=>consumeRevival(b,{hp:10}),/respawn-invalid/);assert.equal(revivalCount(b),2);
 const next=consumeRevival(b,{hp:0});assert.equal(revivalCount(next),1);assert.equal(revivalCount(b),2);assert.equal(next.coins,100);assert.equal(next.items['hp-small'],3);
 const last=consumeRevival(next,{hp:0});assert.equal(last.items['soul-talisman'],undefined);assert.throws(()=>consumeRevival(last,{hp:0}),/no-revival-item/);
});

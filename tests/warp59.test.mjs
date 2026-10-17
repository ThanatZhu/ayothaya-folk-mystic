import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {warpCost} from '../world-state.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));

test('warp fares: 30 to the capital, 50 per hop, never into the party instance', () => {
 assert.equal(warpCost(catalog,'ayutthaya','rice-fields'),50);assert.equal(warpCost(catalog,'ayutthaya','moonlit-mill'),150);
 assert.equal(warpCost(catalog,'moonlit-mill','ayutthaya'),30);assert.equal(warpCost(catalog,'ayutthaya','mill-cellar'),null);assert.equal(warpCost(catalog,'ayutthaya','ayutthaya'),null);
});
test('server: warp charges the fare from anywhere on the map and refuses without coins', () => {
 const realm=new RealmServer({catalog});const join=coins=>{const state=initialSave();return realm.join({uid:'u'+coins,serverId:'server-1',slotId:'slot-1',record:{character:{name:'นักวาร์ป',gender:'male',classId:'novice'},state,daily:{day:'2099-01-01',streak:1},bag:{coins,items:{}}},send:()=>{}});};
 const rich=join(500);Object.assign(rich.world.player,{x:30,z:-60});const before=rich.bag.coins; // includes today's login gift
 assert.equal(realm.travelDestination(rich,'moonlit-mill',{warp:true}).id,'moonlit-mill');assert.equal(rich.bag.coins,before-150);
 const poor=join(1);poor.bag.coins=10;assert.throws(()=>realm.travelDestination(poor,'rice-fields',{warp:true}),/no-coins/);assert.equal(poor.bag.coins,10);
 assert.throws(()=>realm.travelDestination(rich,'mill-cellar',{warp:true}),/travel-invalid/);
});

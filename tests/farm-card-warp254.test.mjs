import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {warpCost} from '../world-state.js';
import {farmMapFor} from '../story-quests.js';
import {rebirthAccess} from '../rebirth-content196.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('the farm card has a paid warp at every level, rebirth and campaign from every map a player can stand on',()=>{
 const stands=catalog.maps.filter(m=>!m.instance&&!m.guildHall&&!m.pvpArena&&!m.prologue&&m.id!=='duel-arena');let checked=0;
 for(let rebirth=0;rebirth<=10;rebirth++)for(const campaign of ['main','rebirth'])for(let level=1;level<=99;level++){
  const farm=farmMapFor(catalog.maps,level,{rebirth,campaign});assert.ok(farm,`no farm at Lv.${level} rebirth ${rebirth} ${campaign}`);
  assert.ok(rebirthAccess(farm,rebirth,level),`${farm.id} locked at Lv.${level} rebirth ${rebirth}`);
  for(const from of stands){if(from.id===farm.id)continue;assert.ok(warpCost(catalog,from.id,farm.id)>0,`${from.id} -> ${farm.id}`);checked++;}
 }
 assert.ok(checked>1000);
});
test('the card warps only with no story step, and the client refuses a short purse before asking the server',()=>{
 const story=read('story-ui.js'),world=read('world-ui.js');
 assert.match(story,/if\(!obj&&worldUI\.warpCost\?\.\(farmMap\)!=null\)/,'story steps keep their free walk');
 assert.match(world,/if\(coins<cost\)\{world\.notice\(`เบี้ยไม่พอ · ขาดอีก/);
 assert.match(world,/return travel\(id,false,true\);/);
});
test('server: the warp the card asks for charges the normal fare and refuses without coins',()=>{
 const realm=new RealmServer({catalog});
 const join=uid=>{const state=initialSave();return realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:'นักฟาร์ม',gender:'male',classId:'hunter',jobId:''},state,daily:{day:'2099-01-01',streak:1},bag:{coins:0,items:{}}},send(){}});};
 const p=join('rich'),from=p.room.map.id,farm=catalog.maps.find(m=>m.id==='bamboo-grove'),fare=warpCost(catalog,from,farm.id);
 p.bag.coins=fare+5;assert.equal(realm.travelDestination(p,farm.id,{warp:true}).id,farm.id);assert.equal(p.bag.coins,5);
 const poor=join('poor');poor.bag.coins=fare-1;assert.throws(()=>realm.travelDestination(poor,farm.id,{warp:true}),/no-coins/);assert.equal(poor.bag.coins,fare-1);
});

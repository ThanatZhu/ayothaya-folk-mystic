import test from 'node:test';
import assert from 'node:assert/strict';
import {planActivityDock} from '../activity-dock.js';
import {bossEntries,bossCountdown} from '../boss-directory.js';
import {publicBossDirectory} from '../server/boss-directory.js';
const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height});
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
test('quest/party dock chooses free space and falls back to a modal on occupied touch screens',()=>{
 const obstacles=[box(10,8,268,90),box(10,104,280,50),box(10,600,480,280),box(1170,10,250,700)];
 const p=planActivityDock({width:1440,height:900,obstacles});assert.equal(p.overlay,false);const rect=box(p.left,p.top,p.width,p.maxHeight);for(const b of obstacles)assert.equal(overlaps(rect,b),false);
 const tiny=planActivityDock({width:568,height:320,touch:true,obstacles:[box(0,0,568,320)]});assert.equal(tiny.overlay,true);assert.equal(tiny.small,true);
});
test('boss catalog deduplicates encounters per map, keeps instances and separates MVP from mini',()=>{
 const types=[{id:'king',boss:true,mvp:true},{id:'mini',elite:true},{id:'normal'}],catalog={maps:[{id:'town',safe:true,mobs:[[0,0,0]]},{id:'field',name:'Field',mobs:[[1,2,0],[2,3,0],[3,4,1],[0,0,2]]},{id:'dungeon',instance:true,mobs:[[0,0,0]]}]};
 const list=bossEntries(catalog,types);assert.equal(list.length,3);assert.equal(list[0].group,'mvp');assert.equal(list[1].group,'mini');assert.equal(list[2].instance,true);assert.equal(bossCountdown({in:10},1000,4500),7);assert.equal(bossCountdown({in:null},0,100),null);assert.equal(bossCountdown({in:1},0,5000),0);
});
test('public boss status reads only the current realm/channel, preserves unknown maps and never creates rooms',()=>{
 const types=[{id:'world',boss:true,worldBoss:true},{id:'mini',elite:true},{id:'king',boss:true,mvp:true}],catalog={maps:[{id:'field',name:'Field',mobs:[[0,0,0],[0,0,1],[0,0,2]]}]};
 const realm={catalog,now:()=>10000,mvpState:()=>({nextAt:25000}),mapBosses:{remaining:room=>room.channel===2?50:99},rooms:new Map([['other',{serverId:'server-1',channel:1,map:{id:'field'},mobs:[{type:1,hp:0,dead:123}]}]])},peer={serverId:'server-1',channel:2};
 const result=publicBossDirectory(realm,peer,types);assert.equal(result.channel,2);assert.deepEqual(result.rows.map(r=>r.in),[50,null,15]);assert.equal(realm.rooms.size,1);
 realm.rooms.set('mine',{serverId:'server-1',channel:2,map:{id:'field'},mobs:[{type:1,hp:0,dead:12.2}]});assert.equal(publicBossDirectory(realm,peer,types).rows[1].in,13);
});

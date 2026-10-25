import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {arenaWeek} from '../arena.js';
const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url)));
const join=(realm,uid,extra={})=>realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:uid,gender:'female',classId:'swordsman',appearance:{hairColor:'silver'}},state:initialSave(),...extra},send(){}});
test('top-ten power response retains full own rank and persists an offline character look',()=>{
 const realm=new RealmServer({catalog}),p=join(realm,'PodiumQA');
 const board=Object.fromEntries(Array.from({length:14},(_,i)=>['other'+i,{name:'Player'+i,classId:'hunter',gender:'male',level:99,power:100000-i*1000}]));
 realm.leaders.set(p.serverId,board);let r=realm.leaderboard(p);
 assert.equal(r.rows.length,10);assert.deepEqual(r.rows.map(x=>x.rank),[1,2,3,4,5,6,7,8,9,10]);assert.equal(r.me.rank,15);
 assert.equal(r.me.gender,'female');assert.equal(r.me.appearance.hairColor,'silver');assert.equal(r.me.equipment.weapon,'swordsman-weapon-basic');
 const previous=r.me.power;p.equipment={weapon:'swordsman-weapon-crafted',outfit:'swordsman-outfit-crimson'};r=realm.leaderboard(p);
 assert.equal(r.me.power,previous);assert.equal(r.me.equipment.weapon,'swordsman-weapon-crafted');assert.equal(r.me.equipment.outfit,'swordsman-outfit-crimson');
 const original={state:initialSave()};realm.record(p,original);realm.leave(p.id);
 const offline=realm.leaders.get('server-1')[p.key];assert.equal(offline.appearance.hairColor,'silver');assert.equal(offline.equipment.outfit,'swordsman-outfit-crimson');
 assert.equal(r.rows.some(x=>'uid'in x||'key'in x||'bag'in x||'stats'in x),false);
});
test('arena returns ten ranks, preserves a lower personal rank and uses saved looks without changing points or prizes',()=>{
 const realm=new RealmServer({catalog}),p=join(realm,'ArenaQA'),rows={};
 for(let i=0;i<14;i++)rows['arena'+i]={name:'Fighter'+i,classId:'rogue',points:100-i,wins:3,draws:1,losses:2,t:i};
 rows[p.key]={name:p.character.name,classId:'swordsman',points:1,wins:0,draws:1,losses:0,t:100};
 realm.leaders.set('arena:'+p.serverId,{week:arenaWeek(realm.now()),rows,prizes:{},last:[]});
 const response=realm.leaderboard(p).arena;assert.equal(response.rows.length,10);assert.equal(response.me.rank,15);assert.equal(response.rows[0].points,100);assert.equal(response.rows[0].wins,3);
 const source=realm.leaders.get('arena:'+p.serverId);assert.equal(Object.keys(source.rows).length,15);assert.deepEqual(source.prizes,{});
});

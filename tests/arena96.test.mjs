import{rankedRound}from'./helpers/ranked223.mjs';import{ARENA_MAP}from'../server/arena-rooms166.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {ARENA,arenaWeek,arenaEnds} from '../arena.js';
import {discordPoster} from '../server/discord-webhook.js';
const map={id:'f',safe:true,nav:{zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
const monday=Date.UTC(2026,9,18,17,0); // Mon 19 Oct 2026 00:00 Thai time
test('the tournament week runs Monday 00:00 to Sunday 23:59 Thai time',()=>{
 assert.equal(arenaWeek(monday),arenaWeek(monday+7*864e5-1));assert.equal(arenaWeek(monday-1)+1,arenaWeek(monday));assert.equal(arenaEnds(monday),monday+7*864e5);
});
test('matched duels score per account pair per day, the week rolls over with prizes, and Discord hears about it',()=>{
 let time=monday+36e5;const realm=new RealmServer({catalog:{capital:'f',maps:[map,{...map,id:ARENA_MAP,safe:false}]},now:()=>time}),posts=[];realm.onAnnounce=t=>posts.push(t);
 const join=(uid,slot='slot-1')=>realm.join({uid,serverId:'server-1',slotId:slot,record:{character:{name:'hero-'+uid+slot.slice(-1),gender:'male',classId:'swordsman'},state:initialSave(),bag:{coins:0,items:{}}},send:()=>{}});
 let a=join('a'),b=join('b');
 for(let i=0;i<4;i++){({a,b}=rankedRound(realm,a,b));}
 let board=realm.arenaView(a);assert.equal(board.rows[0].points,ARENA.win*ARENA.pairDaily,'only 3 bouts a day score');assert.equal(board.rows[1].losses,3);
 time+=864e5;({a,b}=rankedRound(realm,a,b,{winner:'b',draw:true}));board=realm.arenaView(a);assert.equal(board.rows[0].points,ARENA.win*3+ARENA.draw);
 const coins=a.bag.coins;realm.leave(b.id);time=monday+7*864e5+60e3;realm.arena('server-1');
 assert.equal(realm.arenaView(a).rows.length,0);assert.deepEqual(realm.arenaView(a).last.map(x=>x.name),['hero-a1','hero-b1']);
 assert.equal(a.bag.coins-coins,ARENA.prizes[0].coins,'online winner is paid at once');assert.ok(posts.some(t=>t.includes('ผลทัวร์นาเมนต์')&&t.includes('เซิร์ฟ 1')));
 const back=join('b');assert.ok(back.bag.items['break-guard']>=1,'offline second place is paid on login');
 assert.equal(realm.leaders.get('arena:server-1').prizes[back.key],undefined);
});
test('the Discord poster is off without a webhook URL and posts plain text with no pings',async()=>{
 assert.equal(discordPoster(''),null);
 const calls=[],old=globalThis.fetch;globalThis.fetch=async(url,opt)=>{calls.push([url,JSON.parse(opt.body)]);return {ok:true};};
 try{await discordPoster('https://discord.test/hook')('สวัสดี @everyone');}finally{globalThis.fetch=old;}
 assert.equal(calls[0][0],'https://discord.test/hook');assert.deepEqual(calls[0][1],{content:'สวัสดี @everyone',allowed_mentions:{parse:[]}});
});

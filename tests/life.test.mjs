import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld,MONSTER_TYPES} from '../combat-core.js';
import {deathPenalty,baseProgress,levelStart} from '../experience.js';
import {useItem} from '../items.js';
import {claimDaily,thaiDay,DAILY} from '../daily.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

const nav={zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]};
const field=()=>new CombatWorld({classId:'swordsman',safe:false,nav,spawn:{x:0,z:0},mobs:[[1,0,MONSTER_TYPES.findIndex(t=>t.id==='rat')]]});

test('ailments: poison ticks but never kills, stun stops acting, silence stops skills, curse slows', () => {
 const w=field(),p=w.player;
 w.inflict('poison');p.hp=10;for(let i=0;i<200;i++)w.update(.05,{x:0,z:0},{monsters:false});
 assert.equal(p.hp,1,'poison stops at 1 HP');assert.equal(w.status.poison,undefined,'and wears off');
 w.inflict('stun');assert.equal(w.basicAttack(true),false);
 w.update(.05,{x:1,z:0},{monsters:false});assert.equal(p.x,0,'cannot walk while stunned');
 w.status={};w.inflict('silence');assert.equal(w.skill(0),false);
 w.status={};w.inflict('curse');w.update(.05,{x:1,z:0},{monsters:false});const cursed=p.x;
 w.status={};p.x=0;w.update(.05,{x:1,z:0},{monsters:false});assert.ok(cursed<p.x*.7,'curse slows walking');
});

test('a monster blow wakes the sleeper; ยาเขียว cures and is spent, but not when healthy', () => {
 const w=field();w.player.hp=w.player.maxHp=9999;w.inflict('sleep');
 const type=MONSTER_TYPES.find(t=>t.id==='straw');let hit=false;for(let i=0;i<50&&!hit;i++)hit=w.takeMonsterHit(type);
 assert.equal(w.status.sleep,undefined);
 const r=useItem({coins:0,items:{'green-herb':2}},'green-herb',w.player,{poison:3,blind:2});
 assert.deepEqual(r.status,{});assert.equal(r.bag.items['green-herb'],1);
 assert.throws(()=>useItem(r.bag,'green-herb',w.player,{}),/no-ailment/);
 assert.throws(()=>useItem({coins:0,items:{'hp-small':1}},'hp-small',{hp:1,maxHp:9,mp:0,maxMp:9},{stun:1}),/held/);
});

test('death penalty: 5 base EXP from Lv.5 outside town, never a level, none for beginners or in town', () => {
 const L5=levelStart(5),w=field();w.baseXp=L5+2;assert.equal(deathPenalty(w),2);assert.equal(baseProgress(w).level,5,'stays at the level start');
 w.baseXp=L5+60;assert.equal(deathPenalty(w),5);assert.equal(w.baseXp,L5+55);
 w.baseXp=L5-10;assert.equal(deathPenalty(w),0,'Lv.4');
 const town=new CombatWorld({classId:'swordsman',safe:true,nav});town.baseXp=L5+60;assert.equal(deathPenalty(town),0);
});

test('daily login: once per Thai day, 7-day cycle, a missed day restarts', () => {
 const day=864e5,t0=Date.UTC(2026,9,16,1);
 const first=claimDaily(null,t0);assert.equal(first.streak,1);assert.equal(first.daily.day,thaiDay(t0));
 assert.equal(claimDaily(first.daily,t0+3600e3),null,'same day');
 let d=first.daily;for(let i=2;i<=8;i++){const r=claimDaily(d,t0+(i-1)*day);assert.equal(r.streak,(i-1)%7+1);d=r.daily;}
 assert.equal(claimDaily(d,t0+10*day).streak,1,'gap resets');
 assert.equal(thaiDay(Date.UTC(2026,9,16,17,30)),'2026-10-17','Thai midnight is 17:00 UTC');
 assert.equal(DAILY.length,7);
});

test('server: daily reward on the first join of the day, bubble emotes broadcast to the room', () => {
 const city={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]};
 let time=Date.UTC(2026,9,16,3);const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[city]},now:()=>time});
 const record={character:{name:'ทดสอบ',gender:'male',classId:'novice'},state:{...initialSave(),mapId:'ayutthaya'}};
 const p=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 assert.equal(p.bag.coins,DAILY[0].coins);assert.ok(p.world.events.some(e=>e.type==='daily'&&e.streak===1));
 assert.deepEqual(realm.record(p,record).daily,{day:'2026-10-16',streak:1});
 time+=1000;assert.equal(realm.receive(p.id,{type:'bubble',seq:1,id:3}),true);
 assert.ok(p.room.events.some(e=>e.type==='bubble'&&e.id===3&&e.actor===p.id));
 assert.equal(realm.receive(p.id,{type:'bubble',seq:2,id:4}),false,'one per second');
});

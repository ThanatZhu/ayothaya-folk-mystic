import{rankedRound}from'./helpers/ranked223.mjs';import{ARENA_MAP}from'../server/arena-rooms166.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {ARENA,arenaWeek} from '../arena.js';
import {isRankingExcluded} from '../server/ranking-eligibility197.js';
const map={id:'f',safe:true,nav:{zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
const names=['PowerRanger','Chok fag web web','ThanatZhu','Chok teohman'];
function fixture(){let now=Date.UTC(2026,9,19,12);const realm=new RealmServer({catalog:{capital:'f',maps:[map,{...map,id:ARENA_MAP,safe:false}]},now:()=>now});
 const join=(uid,name,slot='slot-1')=>realm.join({uid,serverId:'server-1',slotId:slot,record:{character:{name,gender:'male',classId:'swordsman'},state:initialSave(),bag:{coins:0,items:{}}},send(){}});
 return {realm,join,advance:ms=>now+=ms};
}
test('only the four exact normalized staff names are seeded as exclusions',()=>{
 for(const name of names)assert.ok(isRankingExcluded({name}));
 assert.ok(isRankingExcluded({name:'  CHOK   FAG WEB WEB  '}));
 assert.ok(isRankingExcluded({name:'renamed',excludedFromRankings:true}));
 for(const name of ['PowerRanger2','ThanatZhuFan','Chok','regular'])assert.equal(isRankingExcluded({name}),false);
});
test('server power board excludes all four staff, renumbers players and hides own staff rank',()=>{
 const {realm,join}=fixture(),staff=names.map((n,i)=>join('staff'+i,n)),a=join('a','Alice'),b=join('b','Bob');
 const board=realm.leaderboard(a);assert.deepEqual(board.rows.map(r=>r.name).sort(),['Alice','Bob']);assert.deepEqual(board.rows.map(r=>r.rank),[1,2]);
 for(const p of staff){assert.equal(realm.leaderboard(p).me,null);assert.equal(realm.leaders.get(p.serverId)[p.key].excludedFromRankings,true);}
 assert.ok(realm.leaderboard(b).me);
});
test('offline legacy staff entries are filtered before sorting and cannot occupy a top slot',()=>{
 const {realm,join}=fixture(),p=join('a','Alice'),board=realm.leaders.get(p.serverId);
 names.forEach((name,i)=>board['old-'+i]={name,power:999999,level:99});board.ordinary={name:'OfflinePlayer',power:99999,level:50};
 const result=realm.leaderboard(p);assert.deepEqual(result.rows.map(r=>r.name),['OfflinePlayer','Alice']);assert.equal(result.me.rank,2);
});
test('a renamed staff character remains excluded after persisted board reload',()=>{
 const first=fixture(),p=first.join('staff','PowerRanger');p.character.name='NewName';first.realm.rank(p);
 const saved=structuredClone([...first.realm.leaders]);const second=fixture();second.realm.leaders=new Map(saved);
 const q=second.join('staff','NewName');assert.equal(second.realm.leaderboard(q).me,null);
 assert.ok(second.realm.leaders.get(q.serverId)[q.key].excludedFromRankings);
});
test('the 200-player power cap does not spend places on staff',()=>{
 const {realm,join}=fixture(),board={};for(let i=0;i<200;i++)board['p'+i]={name:'Player'+i,power:1000+i};
 names.forEach((name,i)=>board['staff'+i]={name,power:999999});realm.leaders.set('server-1',board);const p=join('new','NewPlayer');
 const entries=Object.values(realm.leaders.get('server-1'));assert.equal(entries.filter(r=>!isRankingExcluded(r)).length,200);assert.equal(entries.filter(r=>isRankingExcluded(r)).length,4);
 assert.equal(realm.leaderboard(p).rows.length,10);
});
test('legacy arena rows and last-week names are filtered and eligible ranks close gaps',()=>{
 const {realm,join}=fixture(),p=join('a','Alice'),a=realm.arena(p.serverId);
 names.forEach((name,i)=>a.rows['old'+i]={name,points:999,wins:99,t:i});
 a.rows[p.key]={name:'Alice',points:3,wins:1,t:10};a.rows.b={name:'Bob',points:6,wins:2,t:9};
 a.last=[{name:'PowerRanger',place:1},{name:'Bob',place:2},{name:'Alice',place:3}];
 const view=realm.arenaView(p);assert.deepEqual(view.rows.map(r=>[r.name,r.rank]),[['Bob',1],['Alice',2]]);assert.equal(view.me.rank,2);
 assert.deepEqual(view.last.map(r=>[r.name,r.place]),[['Bob',1],['Alice',2]]);
});
test('staff bouts cannot award either side tournament points; real players still score',()=>{
 const {realm,join}=fixture(),s=join('s','ThanatZhu'),a=join('a','Alice'),b=join('b','Bob');
 realm.arenaScore(s,a,false);realm.arenaScore(a,s,false);realm.arenaScore(s,a,true);assert.equal(realm.arenaView(a).rows.length,0);
 s.character.name='TesterRenamed';realm.rank(s);realm.arenaScore(a,s,false);assert.equal(realm.arenaView(a).rows.length,0);
 const match=rankedRound(realm,a,b);assert.equal(realm.arenaView(match.a).me.points,ARENA.win);
});
test('weekly payouts skip staff and promote eligible players, including persisted staff prizes',()=>{
 const {realm,join,advance}=fixture(),s=join('s','Chok teohman'),a=join('a','Alice'),b=join('b','Bob'),arena=realm.arena('server-1');
 arena.rows[s.key]={name:s.character.name,points:100,wins:99,t:1};arena.rows[a.key]={name:'Alice',points:9,wins:3,t:2};arena.rows[b.key]={name:'Bob',points:6,wins:2,t:3};
 arena.prizes[s.key]={place:1,week:arena.week-1};const coins=s.bag.coins;realm.arenaClaim(s,arena);assert.equal(s.bag.coins,coins);assert.equal(arena.prizes[s.key],undefined);
 const aliceCoins=a.bag.coins,bobCoins=b.bag.coins;advance(7*864e5);const next=realm.arena('server-1');assert.deepEqual(next.last.map(r=>r.name),['Alice','Bob']);assert.equal(a.bag.coins-aliceCoins,ARENA.prizes[0].coins);assert.equal(b.bag.coins-bobCoins,ARENA.prizes[1].coins);assert.equal(s.bag.coins,coins);
});


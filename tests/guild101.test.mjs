// 1.01 guild progression and the private guild hall: every rule is the realm server's.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {GUILD_COST,GUILD_UPGRADES,GUILD_RITE,GUILD_GOAL,GUILD_HALL,DEPUTY_MAX,guildLevel} from '../social.js';

const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const city={id:'ayutthaya',name:'อยุธยา',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[{to:GUILD_HALL,x:30,z:30}],npcs:[]};
const field={id:'rice-fields',name:'ทุ่งขวัญข้าว',safe:false,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]};
const hall={id:GUILD_HALL,name:'ทุ่งชุมพล',safe:true,guildHall:true,nav,spawn:{x:0,z:0},mobs:[],portals:[{to:'ayutthaya',x:0,z:20}],npcs:[]};
function realm(){
 let time=1e4;const r=new RealmServer({catalog:{capital:'ayutthaya',maps:[city,field,hall]},now:()=>time});const saved=[];r.onGuild=(g,deleted)=>saved.push([g.name,deleted]);
 const add=(name,mapId='ayutthaya',extra={})=>{const state=initialSave();state.mapId=mapId;const p=r.join({uid:'u-'+name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state,daily:{day:'1970-01-01',streak:1},...extra},send:()=>{}});return p;};
 const send=(p,type,data={})=>{time+=1500;return r.receive(p.id,{type,seq:p.seq+1,...data});};
 const events=(p,type)=>p.world.events.filter(e=>e.type===type);
 const guild=(...names)=>{const [lead,...rest]=names.map(n=>add(n,'ayutthaya',{bag:{coins:GUILD_COST+200000,items:{}}}));
  assert.equal(send(lead,'guildCreate',{name:'ช้างศึก',emblem:2}),true);
  for(const p of rest){send(lead,'guildInvite',{name:p.character.name});assert.equal(send(p,'guildAnswer',{guild:events(p,'guildAsk').at(-1).guild,accept:true}),true);}
  return [lead,...rest];};
 return {r,add,send,events,saved,guild,tick:ms=>{time+=ms;}};
}

test('donations move coins from the bag into the treasury, give guild EXP and contribution, and are validated', () => {
 const {r,send,events,guild}=realm(),[a,b]=guild('เอ','บี');
 const coins=b.bag.coins;
 assert.equal(send(b,'guildDonate',{coins:50}),false,'below the minimum');
 assert.equal(send(b,'guildDonate',{coins:-500}),false);
 assert.equal(send(b,'guildDonate',{coins:'5000'}),false,'numbers only');
 assert.equal(send(b,'guildDonate',{coins:1e9}),false);
 assert.equal(send(b,'guildDonate',{coins:coins+100}),false,'cannot give more than the bag holds');
 assert.equal(b.bag.coins,coins);
 assert.equal(send(b,'guildDonate',{coins:12000}),true);
 assert.equal(b.bag.coins,coins-12000);
 const g=r.guildOf(a);assert.equal(g.treasury,12000);assert.equal(g.exp,1200);assert.equal(guildLevel(g.exp),2);
 const view=events(a,'guild').at(-1).guild;
 assert.equal(view.level,2);assert.equal(view.treasury,12000);
 assert.deepEqual(view.members.map(m=>[m.name,m.rank,m.contrib]),[['เอ','leader',0],['บี','member',1200]]);
});

test('ranks: only the leader promotes; deputies invite, kick plain members and post notices, but not upgrades', () => {
 const {r,add,send,events,guild}=realm(),[a,b,c,d]=guild('เอ','บี','ซี','ดี');
 assert.equal(send(b,'guildRank',{name:'ซี',rank:'deputy'}),false,'member cannot promote');
 assert.equal(send(b,'guildNotice',{text:'x'}),false,'member cannot post');
 assert.equal(send(a,'guildRank',{name:'บี',rank:'deputy'}),true);
 assert.equal(send(a,'guildRank',{name:'บี',rank:'king'}),false);
 assert.equal(send(b,'guildNotice',{text:'  รวมพลเสาร์นี้ 20:00 <b>ที่ทุ่งชุมพล</b>  '}),true);
 assert.equal(r.guildOf(a).notice,'รวมพลเสาร์นี้ 20:00 bที่ทุ่งชุมพล/b','trimmed, no markup');
 assert.equal(send(b,'guildNotice',{text:'ก'.repeat(500)}),true);assert.equal(r.guildOf(a).notice.length,120);
 const e=add('อี');assert.equal(send(b,'guildInvite',{name:'อี'}),true,'deputy invites');
 assert.equal(send(b,'guildKick',{name:'เอ'}),false,'deputy cannot kick the leader');
 assert.equal(send(a,'guildRank',{name:'ซี',rank:'deputy'}),true);
 assert.equal(send(b,'guildKick',{name:'ซี'}),false,'deputy cannot kick another deputy');
 assert.equal(send(b,'guildKick',{name:'ดี'}),true,'deputy kicks a member');assert.equal(r.guildOf(d),null);
 assert.equal(send(b,'guildEmblem',{emblem:5}),false,'emblem stays leader only');
 r.guildOf(a).treasury=1e6;r.guildOf(a).exp=1e6;
 assert.equal(send(b,'guildUpgrade',{id:'flag'}),false,'upgrades are leader only');
 assert.equal(send(c,'guildRank',{name:'บี',rank:'member'}),false,'deputy cannot demote');
 // hand-over: the old leader stays on as a deputy
 assert.equal(send(a,'guildRank',{name:'บี',rank:'leader'}),true);
 const g=r.guildOf(a);assert.equal(g.leader,b.key);assert.equal(r.guildRank(g,a.key),'deputy');
 assert.ok(events(e,'guildAsk').length);
});

test('deputy cap, and a leaving leader is replaced by a deputy first', () => {
 const {r,send,guild}=realm(),[a,...rest]=guild('เอ','บี','ซี','ดี','อี');
 for(const p of rest.slice(0,DEPUTY_MAX))assert.equal(send(a,'guildRank',{name:p.character.name,rank:'deputy'}),true);
 assert.equal(send(a,'guildRank',{name:rest[DEPUTY_MAX].character.name,rank:'deputy'}),false,'deputy cap');
 assert.equal(send(a,'guildRank',{name:'บี',rank:'member'}),true);
 assert.equal(send(a,'guildLeave'),true);
 assert.equal(r.guildOf(rest[0]).leader,rest[1].key,'first deputy (ซี) leads, not the first member (บี)');
});

test('upgrades need guild level and treasury, cost the treasury, cap at three tiers and add seats', () => {
 const {r,send,guild}=realm(),[a]=guild('เอ'),g=r.guildOf(a),u=GUILD_UPGRADES.stable;
 g.treasury=u.costs[0]-1;g.exp=1e6;
 assert.equal(send(a,'guildUpgrade',{id:'stable'}),false,'treasury short');
 g.treasury=1e7;g.exp=0;
 assert.equal(send(a,'guildUpgrade',{id:'stable'}),false,'level too low');
 assert.equal(send(a,'guildUpgrade',{id:'__proto__'}),false);
 g.exp=1e6;
 for(let i=0;i<3;i++)assert.equal(send(a,'guildUpgrade',{id:'stable'}),true);
 assert.equal(send(a,'guildUpgrade',{id:'stable'}),false,'max tier');
 assert.equal(g.treasury,1e7-u.costs.reduce((s,c)=>s+c,0));
 assert.equal(r.guildView(g).seats,30+3*u.seats);
});

test('flag, rite and armory raise members\' EXP and coin bonus; the rite expires', () => {
 const {r,send,guild,add,tick}=realm(),[a,b]=guild('เอ','บี'),g=r.guildOf(a),loner=add('โล');
 assert.deepEqual(r.guildBonus(loner),{exp:0,coins:0});
 g.exp=1e6;g.treasury=1e6;
 assert.equal(send(b,'guildRite'),false,'member cannot hold the rite');
 send(a,'guildUpgrade',{id:'flag'});send(a,'guildUpgrade',{id:'armory'});
 assert.equal(send(a,'guildRite'),true);assert.equal(send(a,'guildRite'),false,'already running');
 assert.equal(g.treasury,1e6-GUILD_UPGRADES.flag.costs[0]-GUILD_UPGRADES.armory.costs[0]-GUILD_RITE.cost);
 const bonus=r.guildBonus(b);assert.ok(Math.abs(bonus.exp-(GUILD_UPGRADES.flag.exp+GUILD_RITE.exp))<1e-9);assert.equal(bonus.coins,GUILD_UPGRADES.armory.coins);
 tick(GUILD_RITE.minutes*6e4+1);
 assert.ok(Math.abs(r.guildBonus(b).exp-GUILD_UPGRADES.flag.exp)<1e-9,'rite over');
});

test('member kills feed guild EXP, contribution and the shared daily goal (paid once)', () => {
 const {r,guild,saved}=realm(),[a,b]=guild('เอ','บี'),g=r.guildOf(a);
 for(let i=0;i<GUILD_GOAL.kills-1;i++)r.guildKill(i%2?a:b);
 assert.equal(g.goal.done,false);assert.ok(r.guildsDirty.has(g),'kill counts wait for the minute flush');
 r.guildKill(a);r.guildKill(b);
 assert.equal(g.goal.done,true);assert.equal(g.treasury,GUILD_GOAL.treasury,'goal paid once');
 assert.equal(g.exp,GUILD_GOAL.kills+1+GUILD_GOAL.exp);
 assert.equal(g.members.reduce((s,m)=>s+(m.contrib??0),0),GUILD_GOAL.kills+1);
 const n=saved.length;r.guildsDirty.add(g);for(let i=0;i<1200;i++)r.step(.05);assert.ok(saved.length>n,'dirty guild flushed');
});

test('guild hall: members travel in for free, each guild gets its own room, outsiders cannot enter', () => {
 const {r,add,send,guild,events}=realm(),[a,b]=guild('เอ','บี');
 const other=add('โอ','ayutthaya',{bag:{coins:GUILD_COST,items:{}}});send(other,'guildCreate',{name:'ม้าเร็ว',emblem:4});
 const outsider=add('นอก');
 assert.throws(()=>r.travelDestination(outsider,GUILD_HALL),/guild-hall/);
 assert.throws(()=>r.travelDestination(outsider,GUILD_HALL,{warp:true}),/guild-hall/);
 const coins=a.bag.coins;assert.equal(r.travelDestination(a,GUILD_HALL,{warp:true}).id,GUILD_HALL);assert.equal(a.bag.coins,coins,'free');
 // the host re-joins a traveller with mapId = guild-hall: rooms are keyed by guild
 for(const p of [a,b,other])r.leave(p.id,{travel:true});r.leave(outsider.id);
 const join=(name,mapId=GUILD_HALL)=>{const state=initialSave();state.mapId=mapId;state.position={x:5,z:5};return r.join({uid:'u-'+name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state},send:()=>{}});};
 const a2=join('เอ'),b2=join('บี'),o2=join('โอ'),out2=join('นอก');
 assert.equal(a2.room,b2.room,'guildmates share their hall');assert.equal(a2.room.map.id,GUILD_HALL);
 assert.notEqual(o2.room,a2.room,'another guild has another hall');assert.equal(o2.room.map.id,GUILD_HALL);
 assert.equal(out2.room.map.id,'ayutthaya','a non-member is put in the capital');
 assert.ok(!r.snapshot(o2).players.some(x=>x.id===a2.id),'halls do not see each other');
 // kicked while inside: told to leave, and the next login lands in the capital
 assert.equal(send(a2,'guildKick',{name:'บี'}),true);
 assert.ok(events(b2,'guildHallExit').length);
 assert.equal(r.travelDestination(b2,'ayutthaya').id,'ayutthaya','the hall gate home is free');
 r.leave(b2.id,{travel:true});assert.equal(join('บี').room.map.id,'ayutthaya');
});

import test from 'node:test';import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';import {initialSave} from '../realm-state.js';
import {GUILD_COST,GUILD_APPLICATION_TTL,GUILD_SEARCH_LIMIT,GUILD_APPLICATION_LIMIT,GUILD_APPLICATION_MAX,guildSeats} from '../social.js';
const city={id:'ayutthaya',name:'อยุธยา',safe:true,spawn:{x:0,z:0},nav:{zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},mobs:[],npcs:[],portals:[]},catalog={capital:'ayutthaya',maps:[city]};
function setup(){let now=10000,index=0;const r=new RealmServer({catalog,now:()=>now}),writes=[];r.onGuild=g=>writes.push(structuredClone(g));
 const add=(name,serverId='server-1')=>r.join({uid:'u'+(++index),serverId,slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state:initialSave(),bag:{coins:GUILD_COST+5,items:{}}},send(){}});
 const send=(p,type,data={})=>{now+=100;return r.receive(p.id,{type,seq:p.seq+1,...data});},events=(p,type)=>p.world.events.filter(e=>e.type===type),create=(name,serverId)=>{const p=add((name+'หัวหน้า').slice(0,16),serverId);assert.equal(send(p,'guildCreate',{name,emblem:3}),true);return [p,r.guildOf(p)];};
 return {r,add,send,events,create,writes,advance:t=>{now+=t;}};
}
test('directory searches partial Thai and case-insensitive names, caps results, isolates realms and publishes only summary data',()=>{
 const {r,add,send,events,create}=setup(),p=add('ผู้ค้นหา');const [,g]=create('ช้างศึก');g.notice='รวมพล';g.treasury=12345;
 create('Elephant');create('ช้างศึกต่างภพ','server-2');
 assert.equal(send(p,'guildSearch',{query:'ช้าง'}),true);let e=events(p,'guildDirectory').at(-1);assert.equal(e.total,1);assert.equal(e.list[0].id,g.id);assert.equal(e.list[0].leader,'ช้างศึกหัวหน้า');assert.equal(e.list[0].online,1);
 assert.deepEqual(Object.keys(e.list[0]).sort(),['id','name','emblem','level','members','seats','leader','online','notice','applied'].sort());assert.ok(!JSON.stringify(e.list).includes(g.leader));
 assert.equal(send(p,'guildSearch',{query:'eLEp'}),true);assert.equal(events(p,'guildDirectory').at(-1).list[0].name,'Elephant');
 assert.equal(send(p,'guildSearch',{query:{bad:true}}),false);assert.equal(send(p,'guildSearch',{query:'ไม่มีชื่อ'}),true);assert.equal(events(p,'guildDirectory').at(-1).list.length,0);
 for(let i=0;i<28;i++)r.guilds.set('extra'+i,{id:'extra'+i,serverId:'server-1',name:'ทัพ'+i,leader:'head'+i,members:[{key:'head'+i,name:'หัวหน้า'}],emblem:1});
 send(p,'guildSearch',{query:''});e=events(p,'guildDirectory').at(-1);assert.equal(e.list.length,GUILD_SEARCH_LIMIT);assert.equal(e.more,true);assert.equal(e.total,30);
});
test('requests persist once, expose opaque IDs only to staff, require approval and update the applicant',()=>{
 const {r,add,send,events,create,writes}=setup(),[leader,g]=create('ช้างศึก'),p=add('ผู้สมัคร'),member=add('สมาชิก');
 send(leader,'guildInvite',{name:member.character.name});send(member,'guildAnswer',{guild:g.id,accept:true});
 assert.equal(send(p,'guildApply',{guild:g.id}),true);const a=g.applications[0],writeCount=writes.length;assert.ok(a.id&&a.key===p.key);assert.equal(r.guildOf(p),null);
 assert.equal(send(p,'guildApply',{guild:g.id}),true);assert.equal(writes.length,writeCount,'duplicate request does not write again');
 assert.equal(r.guildView(g,leader.key).applications.length,1);assert.equal(r.guildView(g,member.key).applications,undefined);assert.equal(r.guildView(g,p.key).applications,undefined);assert.equal(r.guildView(g).applications,undefined);assert.ok(!JSON.stringify(r.guildView(g,leader.key).applications).includes(p.key));
 assert.equal(send(member,'guildApplicationAnswer',{application:a.id,accept:true}),false);assert.equal(send(leader,'guildApplicationAnswer',{application:a.id,accept:'true'}),false);
 assert.equal(send(leader,'guildRank',{name:member.character.name,rank:'deputy'}),true);assert.equal(send(member,'guildApplicationAnswer',{application:a.id,accept:true}),true);assert.equal(r.guildOf(p),g);assert.equal(g.members.filter(x=>x.key===p.key).length,1);assert.equal(g.applications.length,0);assert.ok(events(p,'guild').at(-1).guild.members.some(x=>x.name===p.character.name));
 assert.equal(send(leader,'guildApplicationAnswer',{application:a.id,accept:true}),false);assert.equal(send(p,'guildApply',{guild:g.id}),false);
});
test('an applicant can cancel their own request without affecting another applicant',()=>{
 const {r,add,send,create}=setup(),[,g]=create('ช้างศึก'),a=add('คนหนึ่ง'),b=add('คนสอง');send(a,'guildApply',{guild:g.id});send(b,'guildApply',{guild:g.id});
 assert.equal(send(a,'guildApply',{guild:g.id,cancel:true}),true);assert.deepEqual(r.guildApplications(g).map(x=>x.key),[b.key]);assert.equal(send(a,'guildApply',{guild:g.id,cancel:true}),true);assert.equal(r.guildOf(a),null);
});
test('full, missing and foreign guilds, per-player and guild caps, expiry and rejection are enforced by the server',()=>{
 const {r,add,send,create,advance}=setup(),p=add('ผู้สมัคร'),groups=Array.from({length:6},(_,i)=>create('กิลด์'+i));const [leader,g]=groups[0],foreign=create('ต่างภพ','server-2')[1];
 assert.equal(send(p,'guildApply',{guild:'missing'}),false);assert.equal(send(p,'guildApply',{guild:foreign.id}),false);
 const members=g.members;g.members=Array.from({length:guildSeats(g)},(_,i)=>({key:'m'+i,name:'คน'+i}));assert.equal(send(p,'guildApply',{guild:g.id}),false);g.members=members;
 for(const [,g]of groups.slice(0,GUILD_APPLICATION_LIMIT))assert.equal(send(p,'guildApply',{guild:g.id}),true);assert.equal(send(p,'guildApply',{guild:groups[5][1].id}),false);
 const a=g.applications[0];assert.equal(send(leader,'guildApplicationAnswer',{application:a.id,accept:false}),true);assert.equal(r.guildOf(p),null);assert.equal(send(p,'guildApply',{guild:groups[5][1].id}),true);
 advance(GUILD_APPLICATION_TTL+1);assert.equal(r.guildApplications(groups[1][1]).length,0);assert.equal(send(groups[1][0],'guildApplicationAnswer',{application:groups[1][1].applications[0].id,accept:true}),false);
 g.applications=Array.from({length:GUILD_APPLICATION_MAX},(_,i)=>({id:'a'+i,key:'k'+i,name:'คน',at:r.now()}));assert.equal(send(p,'guildApply',{guild:g.id}),false);
});
test('offline applications survive a realm reload; approval cannot create memberships in two guilds',()=>{
 const {r,add,send,create}=setup(),[leader,g]=create('ทัพหนึ่ง'),[,other]=create('ทัพสอง'),p=add('ออฟไลน์');send(p,'guildApply',{guild:g.id});send(p,'guildApply',{guild:other.id});const id=g.applications[0].id,key=p.key;
 r.leave(p.id);const saved=structuredClone(g);r.guilds.set(g.id,saved);assert.equal(send(leader,'guildApplicationAnswer',{application:id,accept:true}),true);assert.ok(saved.members.some(x=>x.key===key));assert.equal(other.applications.length,0);
 const p2=add('อีกคน');send(p2,'guildApply',{guild:other.id});const stale=structuredClone(other.applications[0]);send(p2,'guildCreate',{name:'สร้างเอง',emblem:2});assert.equal(other.applications.length,0);
 other.applications=[stale];const leader2=[...r.peers.values()].find(x=>x.key===other.leader);assert.equal(send(leader2,'guildApplicationAnswer',{application:stale.id,accept:true}),false);assert.ok(!other.members.some(x=>x.key===p2.key));
});

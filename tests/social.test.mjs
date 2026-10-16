import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {GUILD_COST} from '../social.js';

const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const city={id:'ayutthaya',name:'อยุธยา',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]};
const field={id:'rice-fields',name:'ทุ่งขวัญข้าว',safe:false,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]};
function realm(){
 let time=1e4;const r=new RealmServer({catalog:{capital:'ayutthaya',maps:[city,field]},now:()=>time});const saved=[];r.onGuild=(g,deleted)=>saved.push([g.name,deleted]);
 const add=(name,mapId='ayutthaya',extra={})=>{const state=initialSave();state.mapId=mapId;const sent=[];const p=r.join({uid:'u-'+name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state,daily:{day:'1970-01-01',streak:1},...extra},send:m=>sent.push(m)});p.sent=sent;return p;};
 const send=(p,type,data={})=>{time+=1500;return r.receive(p.id,{type,seq:p.seq+1,...data});};
 const events=(p,type)=>p.world.events.filter(e=>e.type===type);
 return {r,add,send,events,saved};
}

test('whisper reaches one named player on another map; unknown names fail', () => {
 const {add,send}=realm(),a=add('เอ'),b=add('บี','rice-fields');
 assert.equal(send(a,'chat',{channel:'whisper',to:'บี',text:'สวัสดี'}),true);
 assert.ok(b.sent.some(m=>m.type==='chat'&&m.channel==='whisper'&&m.name==='เอ'&&m.to==='บี'&&m.text==='สวัสดี'));
 assert.ok(a.sent.some(m=>m.channel==='whisper'),'sender sees their own line');
 assert.equal(send(a,'chat',{channel:'whisper',to:'ไม่มีใคร',text:'x'}),false);
});

test('friends are mutual after an accepted request, survive the save, and show who is online', () => {
 const {r,add,send,events}=realm(),a=add('เอ'),b=add('บี','rice-fields');
 assert.equal(send(a,'friendAdd',{name:'บี'}),true);
 assert.equal(send(b,'friendAnswer',{from:a.id,accept:true}),true);
 assert.deepEqual(r.record(a,{state:initialSave()}).friends.map(f=>f.name),['บี']);
 assert.deepEqual(r.record(b,{state:initialSave()}).friends.map(f=>f.name),['เอ']);
 assert.ok(a.saveNow&&b.saveNow);
 assert.deepEqual(events(a,'friends').at(-1).list,[{name:'บี',online:true,map:'ทุ่งขวัญข้าว'}]);
 assert.equal(send(a,'friendAdd',{name:'บี'}),false,'already friends');
 assert.equal(send(b,'friendAnswer',{from:a.id,accept:true}),false,'request was used');
 assert.equal(send(a,'friendRemove',{name:'บี'}),true);assert.equal(a.friends.length,0);
});

test('guild: found for coins, invite, guild chat, kick, leader hand-off and disband are all saved', () => {
 const {r,add,send,events,saved}=realm(),a=add('เอ','ayutthaya',{bag:{coins:GUILD_COST+5,items:{}}}),b=add('บี','rice-fields'),c=add('ซี');
 assert.equal(send(b,'guildCreate',{name:'ช้างศึก',emblem:1}),false,'no coins');
 assert.equal(send(a,'guildCreate',{name:'ช',emblem:1}),false,'name too short');
 assert.equal(send(a,'guildCreate',{name:'ช้างศึก',emblem:3}),true);assert.equal(a.bag.coins,5);
 assert.equal(send(a,'guildInvite',{name:'บี'}),true);
 const ask=events(b,'guildAsk').at(-1);assert.equal(ask.name,'ช้างศึก');
 assert.equal(send(b,'guildAnswer',{guild:ask.guild,accept:true}),true);
 assert.equal(send(b,'guildInvite',{name:'ซี'}),false,'only the leader invites');
 assert.equal(send(c,'guildCreate',{name:'ช้างศึก',emblem:2}),false,'name taken');
 assert.equal(send(b,'chat',{channel:'guild',text:'ไปล่าบอส'}),true);assert.ok(a.sent.some(m=>m.channel==='guild'&&m.text==='ไปล่าบอส'));
 assert.equal(send(c,'chat',{channel:'guild',text:'x'}),false,'not in a guild');
 assert.deepEqual(r.snapshot(c).players.find(x=>x.id===a.id).guild,{name:'ช้างศึก',emblem:3},'others see the guild tag');
 assert.deepEqual(events(b,'guild').at(-1).guild.members.map(m=>[m.name,m.leader,m.online]),[['เอ',true,true],['บี',false,true]]);
 assert.equal(send(a,'guildLeave'),true);
 assert.equal(r.guildOf(b).leader,b.key,'leadership passes on');assert.equal(r.guildOf(a),null);
 assert.equal(send(b,'guildLeave'),true);assert.equal(r.guilds.size,0);
 assert.deepEqual(saved.at(-1),['ช้างศึก',true],'empty guild is deleted from the store');
 const again=add('ดี');assert.equal(again.guildId,null);
});

test('guild membership comes back on join from the stored guild', () => {
 const {r,add}=realm();
 r.guilds.set('g1',{id:'g1',serverId:'server-1',name:'นาคา',emblem:5,leader:'u-เอ:slot-1',members:[{key:'u-เอ:slot-1',name:'เอ'}]});
 const a=add('เอ');assert.deepEqual(r.guildTag(a),{name:'นาคา',emblem:5});
});

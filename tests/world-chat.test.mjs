import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer,refineAnnouncement,WORLD_CHAT_COOLDOWN} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const city={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[{name:'ครูแสนดาบ',x:5,z:0,text:'-'}]};
const field={id:'rice-fields',safe:false,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[]};
function setup(){
 let time=1e4;const r=new RealmServer({catalog:{capital:'ayutthaya',maps:[city,field]},now:()=>time});
 const add=(name,mapId,serverId='server-1',extra={})=>{const state=initialSave();state.mapId=mapId;const sent=[];const p=r.join({uid:'u-'+name,serverId,slotId:'slot-1',record:{character:{name,gender:'male',classId:'swordsman'},state,daily:{day:'1970-01-01',streak:1},...extra},send:m=>sent.push(m)});p.sent=sent;return p;};
 const send=(p,type,data={},wait=1500)=>{time+=wait;return r.receive(p.id,{type,seq:p.seq+1,...data});};
 return {add,send};
}
const world=p=>p.sent.filter(m=>m.type==='chat'&&m.channel==='world');

test('world chat reaches every map on the same server only, with its own cooldown', () => {
 const {add,send}=setup(),a=add('เอ','ayutthaya'),b=add('บี','rice-fields'),c=add('ซี','ayutthaya','server-2');
 assert.equal(send(a,'chat',{channel:'world',text:' หาปาร์ตี้ ‮'}),true);
 assert.deepEqual(world(b).map(m=>[m.name,m.text]),[['เอ','หาปาร์ตี้']],'other map hears it, sanitized');
 assert.equal(world(a).length,1,'sender sees their own line');
 assert.equal(world(c).length,0,'other server does not');
 assert.equal(send(a,'chat',{channel:'world',text:'อีก'}),false,'cooldown');
 assert.ok(a.sent.some(m=>m.type==='error'&&m.code==='world-rate'));
 assert.equal(send(a,'chat',{channel:'room',text:'ในห้อง'}),true,'room chat is not blocked by the world cooldown');
 assert.equal(send(a,'chat',{channel:'world',text:'x'.repeat(241)},WORLD_CHAT_COOLDOWN),false,'length limit');
 assert.equal(send(a,'chat',{channel:'world',text:'อีก'}),true);
});

test('refine announcement threshold: +7 and up succeed, +7 and up break', () => {
 const ok=level=>({result:'success',level});
 assert.equal(refineAnnouncement('ก',ok(6),'ดาบ +5','ดาบ +6'),null);
 assert.equal(refineAnnouncement('ก',ok(7),'ดาบ +6','ดาบ +7'),'📣 ก ตีบวก ดาบ +7 สำเร็จ!');
 assert.equal(refineAnnouncement('ก',{result:'broken',level:5},'ดาบ +5',undefined),null);
 assert.match(refineAnnouncement('ก',{result:'broken',level:6},'ดาบ +6',undefined),/ดาบ \+6 → \+7 .*แตก/);
 assert.equal(refineAnnouncement('ก',{result:'guarded',level:8},'ดาบ +8','ดาบ +8'),null);
});

test('a real +7 refine on the server is announced to a player on another map', t => {
 const {add,send}=setup(),a=add('ThanatZhu','ayutthaya','server-1',{bag:{coins:5000,items:{'iron-ore':2}},gear:{weapon:'sword-iron+6'}}),b=add('บี','rice-fields');
 Object.assign(a.world.player,{x:4,z:0});t.mock.method(Math,'random',()=>0);
 assert.equal(send(a,'refine',{slot:'weapon',npc:'ครูแสนดาบ'}),true);
 assert.match(world(b).at(-1).text,/^📣 ThanatZhu ตีบวก .*\+7 สำเร็จ!$/);
 assert.equal(world(b).at(-1).actor,null,'server-authored, not a player line');
 assert.equal(send(a,'chat',{channel:'world',text:'เย้'}),true,'announcement does not use up the player cooldown');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {isAdmin,adminEmails,adminPlayers,adminGive} from '../server/admin.js';
test('only verified emails listed in ADMIN_EMAILS are admins',()=>{
 const emails=adminEmails({ADMIN_EMAILS:' Boss@Example.com ,x@y.z'});
 assert.equal(isAdmin({email:'boss@example.com',email_verified:true},emails),true);
 assert.equal(isAdmin({email:'boss@example.com',email_verified:false},emails),false);
 assert.equal(isAdmin({email:'other@example.com',email_verified:true},emails),false);
 assert.equal(isAdmin({email:'boss@example.com',email_verified:true},adminEmails({})),false);
});
test('admin lists online players and gives items and cowries with checks',()=>{
 const map={id:'f',name:'ทุ่ง',safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[]};
 const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>1e4}),state=initialSave();state.mapId='f';
 const p=realm.join({uid:'u1',serverId:'server-1',slotId:'slot-1',record:{character:{name:'ผู้ทดสอบ',gender:'male',classId:'novice'},state,bag:{coins:5,items:{}}},send:()=>{}});
 const list=adminPlayers(realm);assert.equal(list.length,1);assert.equal(list[0].name,'ผู้ทดสอบ');assert.equal(list[0].map,'ทุ่ง');
 const before=p.bag.coins,potions=p.bag.items['hp-small']??0,r=adminGive(realm,{peer:p.id,coins:100,items:[{id:'hp-small',count:3}]});
 assert.equal(r.coins,before+100);assert.equal(p.bag.items['hp-small'],potions+3);assert.equal(p.saveNow,true);
 assert.throws(()=>adminGive(realm,{peer:p.id,items:[{id:'no-such-item',count:1}]}),/bad-item/);assert.throws(()=>adminGive(realm,{peer:p.id,items:[{id:'whisper',count:1}]}),/bad-item/);
 assert.throws(()=>adminGive(realm,{peer:p.id,items:[{id:'hp-small',count:0}]}),/bad-count/);
 assert.throws(()=>adminGive(realm,{peer:p.id,coins:-1}),/bad-coins/);
 assert.throws(()=>adminGive(realm,{peer:'nobody',coins:1}),/player-offline/);
 assert.throws(()=>adminGive(realm,{peer:p.id}),/nothing/);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {canObserve,observerEmails,adminEmails,isAdmin} from '../server/admin.js';
const map={id:'f',name:'ทุ่ง',safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[1,0,0]]};
function world(){
 const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>1e4}),errors=[];
 const join=(uid,name,allowed=false)=>{const state=initialSave();state.mapId='f';return realm.join({uid,serverId:'server-1',slotId:'slot-1',canObserve:allowed,record:{character:{name,gender:'male',classId:'novice'},state,bag:{coins:5,items:{}}},send:m=>{if(m.type==='error')errors.push(uid+':'+m.code);}});};
 const admin=join('a','Observer',true),player=join('b','Player');
 const say=(p,m)=>realm.receive(p.id,{seq:(p.seq??0)+1,...m});
 return {realm,admin,player,say,errors};
}
test('only an allowed e-mail can turn observer mode on, and the player is then hidden from everyone else', ()=>{
 const {realm,admin,player,say,errors}=world();
 assert.equal(realm.snapshot(player).players.length,1,'visible before');
 assert.equal(say(player,{type:'observer',on:true}),false);assert.ok(errors.includes('b:observer-not-allowed'));
 assert.equal(say(admin,{type:'observer',on:true}),true);assert.equal(admin.observer,true);
 assert.equal(realm.snapshot(player).players.length,0,'not in the other player\'s view');
 assert.equal(realm.snapshot(admin).self.observer,true);assert.equal(realm.snapshot(admin).self.canObserve,true);assert.equal(realm.snapshot(player).self.canObserve,false);
 assert.equal(realm.channelCounts('f')[0].players,1,'not counted on the channel list');
 say(admin,{type:'observer',on:false});assert.equal(realm.snapshot(player).players.length,1,'visible again');
});
test('an observer cannot act, only walk; monsters and boss blasts ignore them', ()=>{
 const {realm,admin,say,errors}=world();
 say(admin,{type:'observer',on:true});
 for(const type of ['attack','skill','chat','auto','emote','duel'])assert.equal(say(admin,{type,index:0,on:true,text:'hi',name:'bow',target:'x'}),false,type);
 assert.ok(errors.filter(e=>e==='a:observer-mode').length>=6);
 assert.equal(say(admin,{type:'input',x:1,z:0,attack:true}),true);assert.equal(admin.input.attack,false,'walking never swings');
 // a monster right next to the observer, with the normal player far away: it never hits the observer
 const mob=admin.room.mobs[0];Object.assign(mob,{x:.3,z:0,aggro:true,dead:0,hp:mob.maxHp});admin.world.player.x=0;admin.world.player.z=0;
 const hp=admin.world.player.hp;for(let i=0;i<120;i++)realm.step(.05);
 assert.equal(admin.world.player.hp,hp);
});
test('observer mode has its own verified e-mail list: the owner always, OBSERVER_EMAILS adds, admins are not included', ()=>{
 const env={OBSERVER_EMAILS:' Streamer@Example.com ; casting.host@sample.studio',ADMIN_EMAILS:'boss@example.com'},list=observerEmails(env);
 assert.ok(list.has('casting.host@sample.studio'),'an address with an s in it stays whole');
 assert.equal(canObserve({email:'chokkungfn@gmail.com',email_verified:true},list),true,'owner');
 assert.equal(canObserve({email:'streamer@example.com',email_verified:true},list),true,'listed');
 assert.equal(canObserve({email:'streamer@example.com',email_verified:false},list),false,'unverified');
 assert.equal(isAdmin({email:'boss@example.com',email_verified:true},adminEmails(env)),true);
 assert.equal(canObserve({email:'boss@example.com',email_verified:true},list),false,'an admin is not an observer by default');
 assert.equal(canObserve({email:'someone@else.com',email_verified:true},observerEmails({})),false);
});

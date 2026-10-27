import test from 'node:test';import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {canObserve,observerEmails,cleanObservers,adminEmails,isAdmin} from '../server/admin.js';
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
test('observer e-mails saved from the back office are cleaned and join the list', ()=>{
 assert.deepEqual(cleanObservers([' Live@Gmail.com','live@gmail.com','','cast.studio@sample.co.th']),['live@gmail.com','cast.studio@sample.co.th']);
 for(const bad of [['no-at-sign'],['a@b'],['x y@z.com'],['<a>@b.com']])assert.throws(()=>cleanObservers(bad),/bad-email/);
 assert.throws(()=>cleanObservers('a@b.com'),/invalid/);assert.throws(()=>cleanObservers(Array.from({length:51},(_,i)=>i+'@x.com')),/invalid/);
 const list=observerEmails({},['live@gmail.com']);
 assert.equal(canObserve({email:'Live@gmail.com',email_verified:true},list),true);
 assert.equal(canObserve({email:'chokkungfn@gmail.com',email_verified:true},list),true);
});
test('the back office edits the saved observer list; taking an address off ends that player\'s observer mode at once', async()=>{
 const {readFile}=await import('node:fs/promises'),{FirebaseStore}=await import('../server/storage.js'),{createHost}=await import('../server/host.js');
 const docs=new Map([['multiplayerRuntime/observerEmails',{emails:['live@gmail.com']}]]);
 const ref=(name,id)=>({get:async()=>({exists:docs.has(name+'/'+id),data:()=>docs.get(name+'/'+id)}),set:async d=>{docs.set(name+'/'+id,d);},delete:async()=>{}});
 const db={collection:name=>({get:async()=>({docs:[]}),doc:id=>ref(name,id),where:()=>({get:async()=>({docs:[]})})}),runTransaction:async fn=>fn({get:r=>r.get(),set:(r,d)=>r.set(d),delete:()=>{}})};
 const store=Object.assign(Object.create(FirebaseStore.prototype),{db,authorityUntil:Infinity,renewAuthority:async()=>{},releaseAuthority:async()=>{},appendEvidence:undefined});
 const users={owner:{uid:'o',email:'chokkungfn@gmail.com',email_verified:true},player:{uid:'p',email:'p@example.com',email_verified:true}};
 const authenticate=async t=>{if(!users[t])throw new Error('bad');return users[t];};
 const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origin='http://127.0.0.1:8871';
 const host=await createHost({mode:'firebase',store,authenticate,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+host.server.address().port;
 const call=async(body,token)=>{const r=await fetch(url+'/admin/observers',{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+token},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{
  const state=initialSave();
  const peer=host.realm.join({uid:'s',serverId:'server-1',slotId:'slot-1',canObserve:true,record:{character:{name:'Streamer',gender:'male',classId:'novice'},state,bag:{coins:0,items:{}}},send:()=>{}});
  peer.observerEmail='live@gmail.com';host.realm.receive(peer.id,{seq:1,type:'observer',on:true});assert.equal(peer.observer,true);
  assert.deepEqual((await call(null,'owner')).data.emails,['live@gmail.com'],'loaded from the store at start');
  assert.equal((await call(null,'player')).status,403,'only admins');
  assert.equal((await call({emails:['nope']},'owner')).status,400);
  const r=await call({emails:['Second@Example.com']},'owner');
  assert.equal(r.status,200);assert.deepEqual(r.data.emails,['second@example.com']);assert.deepEqual(docs.get('multiplayerRuntime/observerEmails').emails,['second@example.com']);
  assert.equal(peer.canObserve,false);assert.equal(peer.observer,false,'removed address: observer mode off straight away');
 }finally{await host.close();}
});

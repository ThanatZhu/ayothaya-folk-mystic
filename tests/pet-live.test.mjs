import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {WebSocket} from 'ws';
import {normalizePetAccount,petAccountAction,activePremiumPet,publicPetAccount} from '../pet-account.js';
import {PREMIUM_PETS} from '../premium-pets.js';import {RealmServer} from '../server/realm.js';import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';import {initialSave} from '../realm-state.js';
import {CombatWorld,MONSTER_TYPES,lineClear} from '../combat-core.js';import {castPremiumPet,tickPetEffects,petIncoming} from '../pet-combat.js';
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},straw=MONSTER_TYPES.findIndex(t=>t.id==='straw'),map={id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[[2,0,straw],[3,0,straw]],npcs:[]},catalog={capital:'field',maps:[map]};
const grant=(s,pet,gems=0,requestId='grant-0001')=>petAccountAction(s,{type:'petGrant',requestId,pet,gems}).state;
test('live wallets start empty, retain duplicate receipts and never take preview grants implicitly',()=>{
 let s=normalizePetAccount(null);assert.equal(s.balance,0);assert.equal(s.equipped,null);s=grant(s,'rice-rabbit',1000);
 const action={type:'petDraw',count:10,requestId:'roll-0001'},draw=petAccountAction(s,action,()=>.7);assert.equal(draw.state.balance,0);assert.equal(draw.result.results.length,10);assert.equal(petAccountAction(draw.state,action,()=>{throw Error('must not roll again');}).replayed,true);assert.throws(()=>petAccountAction(draw.state,{...action,count:1}),/request-conflict/);assert.throws(()=>petAccountAction(draw.state,{...action,requestId:'roll-0002'}),/no-gems/);
 assert.ok(!('receipts' in publicPetAccount(draw.state)));assert.throws(()=>petAccountAction(s,{type:'petEquip',pet:'garuda-dawn',requestId:'equip-0001'}),/pet-not-owned/);
 s=petAccountAction(s,{type:'petEquip',pet:'rice-rabbit',requestId:'equip-0002'}).state;assert.equal(activePremiumPet(s).id,'rice-rabbit');s=petAccountAction(grant(s,'rice-rabbit',0,'grant-0002'),{type:'petUpgrade',pet:'rice-rabbit',requestId:'upgrade-001'}).state;assert.equal(activePremiumPet(s).stars,2);
});
test('all ten pet skills affect live combat; shield, root, slow, armor and cleanse have real consequences',()=>{
 for(const p of PREMIUM_PETS){const w=new CombatWorld({...map,roleSkills:true,classId:'swordsman'});w.player.hp=70;w.player.mp=20;w.status.poison=4;w.targetId=0;const before=w.mobs[0].hp;castPremiumPet(w,{...p,stars:1},{lineClear,types:MONSTER_TYPES});assert.ok(w.events.some(e=>e.type==='petSkill'),p.id);
  if(['fireBurst','flowerBind','echoSlow'].includes(p.skill.kind))assert.ok(w.mobs[0].hp<before,p.id);
  if(p.skill.kind==='trueSight')assert.ok(w.guardOf(w.mobs[0],false)>w.guardOf(w.mobs[1],false));
  if(p.skill.kind==='lotusCleanse'){assert.ok(w.player.hp>70);assert.equal(w.status.poison,undefined);}
  if(p.skill.kind==='waterMana')assert.ok(w.player.mp>20);
  if(p.skill.kind==='flowerBind')assert.ok(w.mobs[0].root>0);
  if(p.skill.kind==='echoSlow')assert.ok(w.mobs[0].petSlow>0);
  if(['moonBarrier','jadeShell'].includes(p.skill.kind)){assert.ok(petIncoming(w,10)<10);tickPetEffects(w,10);assert.equal(petIncoming(w,10),10);}
 }
 const w=new CombatWorld({...map});w.safe=true;w.targetId=0;assert.throws(()=>castPremiumPet(w,PREMIUM_PETS[0],{lineClear,types:MONSTER_TYPES}),/pet-safe-zone/);w.safe=false;w.mobs[0].pvp=true;assert.throws(()=>castPremiumPet(w,PREMIUM_PETS[0],{lineClear,types:MONSTER_TYPES}),/pet-no-target/);
});
test('equipped pet bonus, global cooldown, public look and saved collection survive realm reloads',()=>{
 let now=100000,s=petAccountAction(grant(null,'garuda-dawn'),{type:'petEquip',pet:'garuda-dawn',requestId:'equip-0001'}).state;
 const realm=new RealmServer({catalog,roleSkills:true,now:()=>now}),record={character:{name:'PetTest',gender:'male',classId:'swordsman'},state:{...initialSave(),mapId:'field',position:{x:0,z:0}},pet:{id:'rat',intimacy:900,hunger:80},petCollection:s},p=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send(){}});
 const observer=realm.join({uid:'observer',serverId:'server-1',slotId:'slot-1',record:{...record,petCollection:null},send(){}});observer.known.clear();assert.equal(realm.snapshot(observer).players.find(x=>x.id===p.id).pet,'garuda-dawn');const withPet=p.derived.atk;p.petCollection.equipped=null;realm.refreshStats(p);assert.ok(p.derived.atk<withPet);p.petCollection.equipped='garuda-dawn';realm.refreshStats(p);p.world.targetId=0;realm.petCast(p);assert.throws(()=>realm.petCast(p),/pet-cooldown/);assert.equal(realm.record(p,record).petCollection.readyAt,now+18000);assert.equal(realm.record(p,record).pet,null);
 now+=18000;p.world.mobs[1].hp=p.world.mobs[1].maxHp;p.world.targetId=1;assert.equal(realm.petCast(p),true);
});
function waitMessage(ws,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',on);reject(Error('message-timeout'));},5000);const on=raw=>{const x=JSON.parse(raw);if(predicate(x)){clearTimeout(timer);ws.off('message',on);resolve(x);}};ws.on('message',on);});}
test('host saves before acknowledging a draw, replays after reconnect and restricts grants to admin routes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ayothaya-pets-')),store=await new LocalStore(dir).init(),c=await store.createLocal({name:'LivePetTest'});store.rows.get(c.uid).state.mapId='field';
 const service=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost']}),sockets=[];await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;
 try{
  const post=body=>fetch(base+'/admin/pets',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await fetch(base+'/admin/pets',{method:'POST',headers:{origin:'https://evil.invalid'},body:'{}'})).status,403);
  const grantBody={peer:'off:'+c.uid+':slot-1',gems:2000,pet:'rice-rabbit',requestId:'admin-0001'};assert.equal((await post(grantBody)).status,200);assert.equal((await post(grantBody)).status,200);assert.equal(store.rows.get(c.uid).petCollection,undefined);assert.equal(store.rows.get(c.uid).mailbox.messages.length,1);
  const ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:'http://localhost'});sockets.push(ws);await new Promise(r=>ws.on('open',r));let next=waitMessage(ws,m=>m.type==='welcome');ws.send(JSON.stringify({type:'join',token:c.token,serverId:'server-1',slotId:'slot-1'}));const welcome=await next;assert.equal(welcome.snapshot.self.petCollection.balance,0);next=waitMessage(ws,m=>m.type==='mailChanged');ws.send(JSON.stringify({type:'mailClaim',mailId:'admin-0001',id:'claim-admin-0001',seq:1}));assert.equal((await next).petCollection.balance,2000);
  next=waitMessage(ws,m=>m.type==='petChanged');ws.send(JSON.stringify({type:'petDraw',count:10,id:'draw-0001',seq:2}));const rolled=await next;assert.equal(rolled.petCollection.balance,1000);assert.equal(store.rows.get(c.uid).petCollection.balance,1000,'acknowledgement follows durable checkpoint');
  next=waitMessage(ws,m=>m.type==='petChanged');ws.send(JSON.stringify({type:'petDraw',count:10,id:'draw-0001',seq:3}));assert.equal((await next).replayed,true);assert.equal(store.rows.get(c.uid).petCollection.balance,1000);
  next=waitMessage(ws,m=>m.type==='error');ws.send(JSON.stringify({type:'petGrant',gems:999999,seq:4}));assert.equal((await next).code,'invalid-message');assert.equal(store.rows.get(c.uid).petCollection.balance,1000);
  const originalCheckpoint=store.checkpoint.bind(store);store.checkpoint=async(session,record,options)=>{if(record.petCollection?.pulls>10)throw Error('simulated-save-failure');return originalCheckpoint(session,record,options);};
  let failedRollAcknowledged=false;ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='petChanged'&&m.id==='draw-failed')failedRollAcknowledged=true;});const closed=new Promise(r=>ws.once('close',r));ws.send(JSON.stringify({type:'petDraw',count:10,id:'draw-failed',seq:5}));await closed;assert.equal(failedRollAcknowledged,false);assert.equal(service.realm.peers.size,0,'uncertain writes cannot resume stale in-memory wallets');assert.equal(store.rows.get(c.uid).petCollection.balance,1000);store.checkpoint=originalCheckpoint;
  const reloaded=await new LocalStore(dir).init();assert.equal(reloaded.rows.get(c.uid).petCollection.balance,1000);assert.equal(reloaded.rows.get(c.uid).petCollection.pulls,10);

 }finally{for(const ws of sockets)ws.terminate();await service.close();await rm(dir,{recursive:true,force:true});}
});

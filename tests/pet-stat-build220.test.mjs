import test from 'node:test';import assert from 'node:assert/strict';
import {normalizePetBuild,recommendPetBuild,petWithBuild,petBuildStatus} from '../pet-stat-build220.js';
import {PREMIUM_PETS,petAtStars} from '../premium-pets.js';
import {petAccountAction,normalizePetAccount,publicPetAccount,activePremiumPet} from '../pet-account.js';
import {deriveStats} from '../character-stats.js';
import {CombatWorld,MONSTER_TYPES,lineClear} from '../combat-core.js';
import {castPremiumPet} from '../pet-combat.js';
const nav={zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},map={id:'field',nav,spawn:{x:0,z:0},mobs:[[2,0,MONSTER_TYPES.findIndex(t=>t.id==='straw')]],npcs:[]};
const grant=(id='garuda-dawn')=>petAccountAction(null,{type:'petGrant',gems:0,pet:id,requestId:'grant-0001'}).state;
test('three distinct stats only; recommendation uses raw allocations and ignores gear, class and bonus objects',()=>{
 for(const bad of [null,{}, {stats:['str']},{stats:['str','str','int']},{stats:['str','agi','fake']},{stats:['str','agi','luk','vit']},{stats:['STR','agi','luk']}])assert.equal(normalizePetBuild(bad),null);
 assert.deepEqual(recommendPetBuild({agi:60,luk:30,str:20,vit:1,int:1,dex:1,derived:{total:{int:999}},gear:{vit:999}}).stats,['agi','luk','str']);
 assert.deepEqual(recommendPetBuild({int:80,vit:40,dex:30,agi:1,luk:1,str:1}).stats,['int','vit','dex']);
 assert.deepEqual(recommendPetBuild(null).stats,['str','agi','vit']);
});
test('all 120 stat orders preserve the exact existing budget of each S companion at every star rank; A/B stay unchanged',()=>{
 const names=['str','agi','vit','int','dex','luk'];let cases=0;
 for(const p of PREMIUM_PETS)for(let stars=1;stars<=5;stars++){
  const base=petAtStars(p.id,stars);assert.equal(petWithBuild(base,null),base);
  for(const a of names)for(const b of names)for(const c of names)if(new Set([a,b,c]).size===3){
   const actual=petWithBuild(base,{stats:[a,b,c]});cases++;
   if(p.tier!=='S'){assert.equal(actual,base);continue;}
   assert.deepEqual(Object.keys(actual.bonus),[a,b,c]);assert.equal(Object.values(actual.bonus).reduce((n,v)=>n+v,0),Object.values(base.bonus).reduce((n,v)=>n+v,0));
   assert.ok(actual.bonus[a]>=actual.bonus[b]&&actual.bonus[b]>=actual.bonus[c]);assert.deepEqual(actual.skill,base.skill);
  }
 }assert.equal(cases,6000);
});
test('one character build applies to every owned S, survives draws/upgrades and save normalization without spending money or changing old receipts',()=>{
 let s=grant();s.balance=500;s=petAccountAction(s,{type:'petGrant',pet:'lotus-naga',gems:0,requestId:'grant-0002'}).state;
 const oldSignature=JSON.stringify(['petEquip',null,'garuda-dawn',null,null]);
 const equip=petAccountAction(s,{type:'petEquip',pet:'garuda-dawn',requestId:'equip-0001'});s=equip.state;assert.equal(s.receipts.at(-1).signature,oldSignature);
 const action={type:'petStatBuild',stats:['agi','luk','str'],requestId:'build-0001'};
 const r=petAccountAction(s,action);s=r.state;assert.equal(s.balance,500);assert.deepEqual(s.collection,equip.state.collection);assert.deepEqual(activePremiumPet(s).bonus,{agi:4,luk:2,str:2});
 assert.equal(petAccountAction(s,action).replayed,true);
 assert.throws(()=>petAccountAction(s,{...action,stats:['int','vit','dex']}),/request-conflict/);
 s=petAccountAction(s,{type:'petEquip',pet:'lotus-naga',requestId:'equip-0002'}).state;assert.deepEqual(activePremiumPet(s).bonus,{agi:4,luk:2,str:2});
 const rolled=petAccountAction(s,{type:'petDraw',count:1,requestId:'draw-0001'},()=>.5).state;assert.deepEqual(rolled.statBuild,s.statBuild);
 const more=structuredClone(rolled);more.collection['garuda-dawn'].copies=10;const upgraded=petAccountAction(more,{type:'petUpgrade',pet:'garuda-dawn',requestId:'upgrade-0001'}).state;assert.equal(upgraded.collection['garuda-dawn'].stars,2);assert.deepEqual(upgraded.statBuild,s.statBuild);
 assert.deepEqual(normalizePetAccount(JSON.parse(JSON.stringify(rolled))).statBuild,s.statBuild);assert.deepEqual(publicPetAccount(s).statBuild,s.statBuild);assert.ok(!('receipts'in publicPetAccount(s)));
 assert.throws(()=>petAccountAction(grant('rice-rabbit'),action),/pet-build-no-s/);assert.throws(()=>petAccountAction(s,{...action,requestId:'build-0002',stats:['str','str','vit']}),/bad-pet-build/);
});
test('custom selection benefits DPS sword, fast rogue and magic priest without changing class or raw allocations',()=>{
 for(const classId of ['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'])for(const gender of ['male','female']){
  const pet=petWithBuild(petAtStars('garuda-dawn'),{stats:['int','agi','luk']}),raw={str:20,agi:30,vit:10,int:40,dex:20,luk:15},before=structuredClone(raw);
  const d=deriveStats({classId,gender,level:30,stats:raw,pet:pet.bonus});
  assert.equal(d.total.int,44);assert.equal(d.total.agi,32);assert.equal(d.total.luk,17);assert.deepEqual(raw,before);
 }
});
test('editing is gated by authority combat activity, pending casts, health and observer state; collection is unrelated',()=>{
 const peer={world:{player:{hp:100},events:[],auto:false},petBuildCombatAt:10};
 assert.equal(petBuildStatus(peer,15).blocked,true);assert.equal(petBuildStatus(peer,16).blocked,false);
 peer.world.auto=true;assert.equal(petBuildStatus(peer,30).blocked,true);peer.world.auto=false;
 peer.world.events=[{type:'damage'}];assert.equal(petBuildStatus(peer,30).blocked,true);peer.world.events=[];
 peer.world.player.hp=0;assert.equal(petBuildStatus(peer,30).reason,'pet-build-unavailable');peer.world.player.hp=100;peer.observer=true;assert.equal(petBuildStatus(peer,30).blocked,true);peer.observer=false;
 peer.groundPet={mode:'collect'};assert.equal(petBuildStatus(peer,30).blocked,false);
});
test('offensive pet skills scale with the owner attack channel and matching enemy defence, including magic and physical',()=>{
 for(const classId of ['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'])for(const gender of ['male','female'])for(const id of ['garuda-dawn','blossom-fox','lantern-bat']){
  const w=new CombatWorld({...map,classId});w.targetId=0;w.player.hp=100;w.derived={magic:['shaman','acolyte'].includes(classId),atk:20,matk:100,crit:0};const hits=[];let guard;
  w.guardOf=(mob,magic)=>{guard=magic;return .5;};w.hurt=(mob,amount,color)=>hits.push({amount,context:{...w.damageContext}});
  const pet=petAtStars(id);castPremiumPet(w,pet,{lineClear,types:MONSTER_TYPES});
  assert.equal(guard,w.derived.magic);assert.equal(hits[0].amount,Math.round((w.derived.magic?100:20)*pet.skill.power*.5));assert.equal(hits[0].context.magic,w.derived.magic);assert.equal(hits[0].context.source,'petSkill');
 }
});

test('changing pet build never restores current health or mana',()=>{const w=new CombatWorld({...map,classId:'swordsman'});for(const stats of [['vit','int','dex'],['agi','luk','str'],['vit','int','dex']]){if(w.derived){w.player.hp=17;w.player.mp=3;}const pet=petWithBuild(petAtStars('garuda-dawn'),{stats});w.applyDerived(deriveStats({classId:'swordsman',level:30,pet:pet.bonus}));if(w.player.hp===17)assert.equal(w.player.mp,3);}assert.equal(w.player.hp,17);assert.equal(w.player.mp,3);});

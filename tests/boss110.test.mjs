import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMonster,BOSS_SIGHT,BOSS_GIVE_UP} from '../monster-catalog.js';
import {CombatWorld,MONSTER_TYPES,moveBody,lineClear} from '../combat-core.js';
const nav={zones:[{x:-60,z:-60,w:120,d:120}],obstacles:[],props:[]},T=id=>MONSTER_TYPES.find(t=>t.id===id);
const mob=(type,x=0,z=0,aggro=false)=>({type:MONSTER_TYPES.indexOf(type),x,z,home:{x,z},hp:100,maxHp:100,root:0,attackCD:0,hit:0,step:0,aggro,dead:0});
const step=(m,target,type,secs)=>{for(let t=0;t<secs;t+=.05)advanceMonster(m,target,type,.05,nav,{moveBody,lineClear});};
test('a boss picks a fight with anyone in sight, while a normal monster waits to be hit',()=>{
 const boss=T('straw-king'),b=mob(boss),target={x:BOSS_SIGHT-1,z:0};step(b,target,boss,.1);assert.equal(b.aggro,true);
 const rat=T('rat'),r=mob(rat);step(r,target,rat,.1);assert.equal(r.aggro,false);
});
test('a boss chases past the old 9 m leash and only gives up when the target is far away',()=>{
 const boss=T('straw-king'),b=mob(boss,0,0,true),target={x:20,z:0};step(b,target,boss,30);
 assert.ok(b.x>12,'followed well past 9 m: '+b.x.toFixed(1));assert.equal(b.aggro,true);
 const gone={x:b.x+BOSS_GIVE_UP+2,z:0};step(b,gone,boss,.1);assert.equal(b.aggro,false,'lost interest');
});
test('push and bind skills hurt a boss but never move or root it',()=>{
 const boss=T('straw-king'),pushI=0;
 const w=new CombatWorld({classId:'novice',safe:false,nav,spawn:{x:0,z:0},mobs:[[1.5,0,MONSTER_TYPES.indexOf(boss)]]});
 const m=w.mobs[0];w.player.mp=999;const skills=w.skills??[];
 const push=skills.findIndex(s=>s.type==='push'),bind=skills.findIndex(s=>s.type==='root');
 for(const i of [push,bind].filter(i=>i>=0)){w.select(m.id);w.cooldowns&&(w.cooldowns[i]=0);const x=m.x,hp=m.hp;w.player.face={x:1,z:0};w.skill(i);
  assert.ok(m.hp<hp,'took damage from '+skills[i].type);assert.equal(m.x,x,'not pushed');assert.equal(m.root,0,'not rooted');}
});

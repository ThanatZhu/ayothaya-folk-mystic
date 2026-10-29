import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMonster,MONSTER_BEHAVIOUR,markMonsterHit} from '../monster-catalog.js';
import {CombatWorld,MONSTER_TYPES,moveBody,lineClear} from '../combat-core.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},T=id=>MONSTER_TYPES.find(t=>t.id===id);
const mob=(x=0,z=0)=>({x,z,home:{x,z},hp:100,maxHp:100,root:0,attackCD:0,hit:0,step:0,aggro:true,dead:0});
const run=(m,target,type,secs)=>{const out=[];for(let t=0;t<secs;t+=.05)out.push(advanceMonster(m,target,type,.05,nav,{moveBody,lineClear}));return out;};

test('lantern bursts at the end of its wind-up even if you stepped back, so the ring decides', () => {
 const m=mob(),out=run(m,{x:1,z:0},T('lantern'),1.2);assert.ok(out.includes('burst'));assert.ok(!out.includes('hit'));
 assert.equal(MONSTER_BEHAVIOUR.lantern.aoe,2.2);
});
test('monkey hops back after a hit (0.123: only for a moment, then fights on); hopper leaps in; bosses enrage under 40%', () => {
 const m=mob(),target={x:1,z:0};let low=0;const out=[];for(let t=0;t<2.5;t+=.05){out.push(advanceMonster(m,target,T('monkey'),.05,nav,{moveBody,lineClear}));low=Math.min(low,m.x);}
 assert.ok(out.includes('hit'));assert.ok(low<-.3,'hopped away from the target');assert.ok(low>-1.6,'but not far');assert.ok(m.x>low+.3,'and came back');
 const h=mob(0,0);assert.ok(run(h,{x:4.5,z:0},T('hopper'),.2).includes('leap'));assert.ok(h.x>2.5);
 const b=mob();b.hp=30;run(b,{x:10,z:0},T('mill-keeper'),.1);assert.equal(b.enraged,true);
});
test('a skill on a rooted monster is a 30% combo', () => {
 const w=new CombatWorld({classId:'swordsman',safe:false,nav,spawn:{x:0,z:0},mobs:[[1,0,MONSTER_TYPES.findIndex(t=>t.id==='rat')]]});
 const m=w.mobs[0],plain=w.power(100,m);m.root=2;assert.equal(w.power(100,m),Math.round(plain*1.3));assert.ok(w.events.some(e=>e.type==='combo'));
});
test('0.123 a monster that was just hit keeps fighting past the 9 m leash, up to 20 m, then gives up',()=>{
 const far=x=>{const m=mob(x,0);m.home={x:0,z:0};return m;};
 let m=far(12);advanceMonster(m,{x:13,z:0},T('monkey'),.05,nav,{moveBody,lineClear});assert.equal(m.aggro,false,'idle monster past 9 m walks home');
 m=far(12);markMonsterHit(m,{x:13,z:0});advanceMonster(m,{x:13,z:0},T('monkey'),.05,nav,{moveBody,lineClear});assert.equal(m.aggro,true,'just hit: still fighting');
 m=far(21);markMonsterHit(m,{x:22,z:0});advanceMonster(m,{x:22,z:0},T('monkey'),.05,nav,{moveBody,lineClear});assert.equal(m.aggro,false,'past 20 m it gives up');
});

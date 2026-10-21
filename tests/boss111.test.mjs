import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMonster,markMonsterHit,monsterFrame,MONSTER_BEHAVIOUR} from '../monster-catalog.js';
import {CombatWorld,MONSTER_TYPES,moveBody,lineClear} from '../combat-core.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},T=id=>MONSTER_TYPES.find(t=>t.id===id);
const mob=(x=0,z=0)=>({x,z,home:{x,z},hp:100,maxHp:100,root:0,attackCD:0,hit:0,step:0,aggro:true,dead:0});

test('a boss hit every tick still attacks, shows no hurt pose, and answers with a slam', () => {
 const m=mob(),target={x:1,z:0},type=T('straw-king'),out=[];
 for(let t=0;t<6;t+=.05){markMonsterHit(m,target);out.push(advanceMonster(m,target,type,.05,nav,{moveBody,lineClear}));}
 assert.equal(m.armor,true);assert.notEqual(monsterFrame(m,0),5);assert.notEqual(monsterFrame(m,0),6);
 assert.ok(out.includes('slam'),'stun-locked boss never slammed');
 // A normal monster is still stunned by the same pressure.
 const r=mob(),rout=[];for(let t=0;t<3;t+=.05){markMonsterHit(r,target);rout.push(advanceMonster(r,target,T('rat'),.05,nav,{moveBody,lineClear}));}
 assert.ok(!rout.includes('hit'));
});
test('the slam knocks players in the ring back and hurts; outside the ring nothing happens', () => {
 const type=T('straw-king'),s=MONSTER_BEHAVIOUR['straw-king'].slam;
 const w=new CombatWorld({classId:'swordsman',safe:false,nav,spawn:{x:2,z:0},mobs:[]}),m={x:0,z:0};
 w.derived=null;w.player.maxHp=w.player.hp=5000;const hp=w.player.hp; // survives the hit, so the slide is what we measure
 assert.equal(w.takeSlam(type,m,s),true);assert.ok(w.player.hp<hp);
 for(let i=0;i<7;i++)w.update(.05,{x:-1,z:0,attack:false},{monsters:false}); // holding toward the boss can't cancel the throw
 assert.ok(w.player.x>2+s.push*.9,'thrown back about push metres');assert.ok(w.events.some(e=>e.type==='knock'));
 const far=new CombatWorld({classId:'swordsman',safe:false,nav,spawn:{x:s.radius+1,z:0},mobs:[]});assert.equal(far.takeSlam(type,m,s),false);
});

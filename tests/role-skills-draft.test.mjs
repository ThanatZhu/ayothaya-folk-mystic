import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROLES,ALL_SKILLS,loadout} from '../assets/skills-next/catalog.js';
import {createTraining} from '../assets/skills-next/simulation.js';
const advance=(sim,seconds)=>{for(let t=0;t<seconds;t+=.05)sim.tick(Math.min(.05,seconds-t));};
const cast=(sim,id,target)=>{assert.equal(sim.cast(id,target).ok,true,id);advance(sim,3);};
test('7 roles and 14 preserved Master identities have distinct art for all 112 skills',()=>{
 assert.equal(ROLES.length,7);assert.equal(ROLES.flatMap(r=>r.branches).length,14);assert.equal(ALL_SKILLS.length,112);assert.equal(new Set(ALL_SKILLS.map(s=>s.id)).size,112);assert.equal(new Set(ALL_SKILLS.map(s=>JSON.stringify(s.icon))).size,112);
 for(const r of ROLES){assert.equal(r.base.length,6);for(const b of r.branches){assert.equal(b.active.length,3);assert.equal(b.passives.length,2);assert.equal(loadout(r.id,b.id).active.length,9);}}
 assert.throws(()=>loadout('hunter','healer'));
});
test('every active release works in each loadout; conditional skills require a setup',()=>{
 for(const r of ROLES)for(const branch of ['',...r.branches.map(b=>b.id)])for(const s of loadout(r.id,branch).active){
  const sim=createTraining(r.id,branch);sim.scenario('setup');let target='enemy';
  if(['heal','cleanse','link','intercept','reflect'].includes(s.kind)){target='ally';sim.get('ally').hp=300;}
  if(['revive','greatRevive'].includes(s.kind)){sim.scenario('down');target='ally';}
  const before=JSON.stringify({hero:sim.state.hero,allies:sim.state.allies,enemies:sim.state.enemies,summons:sim.state.summons,fields:sim.state.fields,combo:sim.state.combo});
  assert.equal(sim.cast(s.id,target).ok,true,s.id);advance(sim,s.windup+.15);
  const after=JSON.stringify({hero:sim.state.hero,allies:sim.state.allies,enemies:sim.state.enemies,summons:sim.state.summons,fields:sim.state.fields,combo:sim.state.combo});assert.notEqual(after,before,s.id);
  assert.ok(sim.drainEvents().some(e=>e.type==='release'&&e.skill.id===s.id),s.id);
  assert.ok(sim.state.mp>=0);for(const u of [...sim.state.allies,...sim.state.enemies])assert.ok(Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp,s.id);
 }
});
test('failed casts spend no resources and a skill from another Master is rejected',()=>{const sim=createTraining('hunter','ranger'),mp=sim.state.mp;assert.equal(sim.cast('peck').ok,false);assert.equal(sim.cast('mythic-rooster').ok,false);assert.equal(sim.state.mp,mp);assert.deepEqual(sim.state.cooldowns,{});});
test('ally healing, poison cleansing and revival are genuinely different actions',()=>{
 const sim=createTraining('acolyte');sim.scenario('poison');const ally=sim.get('ally');cast(sim,'cleanse','ally');assert.equal(ally.status.poison,undefined);assert.equal(ally.status.fear,undefined);const hp=ally.hp;cast(sim,'heal','ally');assert.ok(ally.hp>hp);assert.equal(sim.cast('revive','ally').ok,false);
 sim.scenario('down');assert.equal(sim.cast('heal','ally').ok,false);assert.equal(sim.cast('revive','ally').ok,true);advance(sim,1.8);assert.equal(ally.hp,0);advance(sim,.3);assert.equal(ally.hp,ally.maxHp*.35);
});
test('Master healer improves revival but keeps the long cast and cooldown',()=>{const sim=createTraining('acolyte','healer');sim.scenario('down');assert.equal(sim.cast('great-revive','ally').ok,true);advance(sim,2);assert.equal(sim.get('ally').hp,0);advance(sim,.5);assert.equal(sim.get('ally').hp,sim.get('ally').maxHp*.75);assert.ok(sim.get('ally').shield>0);assert.ok(sim.state.cooldowns['great-revive']>60);});
test('a dead caster cannot finish reviving and a revived target is not revived twice',()=>{
 const sim=createTraining('acolyte');sim.scenario('down');sim.cast('revive','ally');sim.damage('hero',5000);advance(sim,3);assert.equal(sim.get('ally').hp,0);assert.equal(sim.state.pending,null);
 const next=createTraining('acolyte');next.scenario('down');next.cast('revive','ally');next.get('ally').hp=100;advance(next,3);assert.equal(next.get('ally').hp,100);
});
test('directional guard blocks from the front and leaves a rear opening',()=>{const sim=createTraining('swordsman');cast(sim,'guard','enemy');const hp=sim.state.hero.hp;sim.damage('hero',100);assert.equal(Math.round(hp-sim.state.hero.hp),35);sim.get('enemy').x=-4;const after=sim.state.hero.hp;sim.damage('hero',100);assert.equal(Math.round(after-sim.state.hero.hp),100);});
test('guardian transfers damage and sanctuary protects only inside its area',()=>{
 const sim=createTraining('swordsman','guardian');cast(sim,'shield-link','ally');const hp=sim.state.hero.hp,friend=sim.get('ally').hp;sim.damage('ally',100);assert.equal(Math.round(hp-sim.state.hero.hp),55);assert.equal(Math.round(friend-sim.get('ally').hp),45);
 sim.scenario('idle');cast(sim,'bastion','hero');const before=sim.get('ally').hp;sim.damage('ally',100);assert.equal(Math.round(before-sim.get('ally').hp),55);sim.get('ally').x=20;const outside=sim.get('ally').hp;sim.damage('ally',100);assert.equal(Math.round(outside-sim.get('ally').hp),100);
});
test('taunt redirects attacks; counter fires once and stops after being consumed',()=>{const sim=createTraining('swordsman');sim.scenario('swarm');cast(sim,'challenge');assert.equal(sim.get('enemy').target,'hero');cast(sim,'counter');const hp=sim.get('enemy').hp;sim.damage('hero',50);const after=sim.get('enemy').hp;assert.ok(after<hp);sim.damage('hero',50);assert.equal(sim.get('enemy').hp,after);});
test('boss crowd control builds stagger without moving or instantly rooting the boss',()=>{const sim=createTraining('lancer','vanguard');sim.scenario('boss');const boss=sim.get('enemy'),x=boss.x;cast(sim,'hook');assert.equal(boss.x,x);assert.equal(boss.status.root,undefined);assert.equal(boss.stagger,35);sim.state.cooldowns={};cast(sim,'brace');sim.state.cooldowns={};cast(sim,'brace');assert.equal(boss.stagger,0);assert.ok(sim.state.log.some(e=>e.text.includes('เสียหลัก')));});
test('poison detonation consumes existing poison and cannot be spammed on a clean target',()=>{const sim=createTraining('rogue','assassin');assert.equal(sim.cast('venom-burst').ok,false);cast(sim,'venom-blade');const hp=sim.get('enemy').hp;cast(sim,'venom-burst');assert.equal(sim.get('enemy').status.poison,undefined);assert.ok(sim.get('enemy').hp<hp);sim.state.cooldowns={};assert.equal(sim.cast('venom-burst').ok,false);});
test('rooster is a persistent timed summon, follows selected enemy, and is required for peck',()=>{const sim=createTraining('hunter','spirit-hunter');cast(sim,'mythic-rooster');assert.equal(sim.state.summons.length,1);sim.select('enemy2');advance(sim,2);assert.ok(sim.get('enemy2').hp<sim.get('enemy2').maxHp);cast(sim,'peck','enemy2');advance(sim,30);assert.equal(sim.state.summons.length,0);sim.state.cooldowns={};assert.equal(sim.cast('peck').ok,false);});
test('Master passives change meaningful outcomes and active branches stay mutually exclusive',()=>{const base=createTraining('acolyte'),master=createTraining('acolyte','healer');for(const sim of [base,master]){sim.get('ally').hp=300;cast(sim,'heal','ally');}assert.ok(master.get('ally').hp>base.get('ally').hp);const boxer=createTraining('boxer','iron-boxer');assert.equal(boxer.state.hero.maxHp,1200);assert.equal(boxer.cast('mae-mai').ok,false);});
test('line attack does not hit off-axis enemies and cooldown blocks repeated casts',()=>{const sim=createTraining('lancer');const rear=sim.get('enemy2'),side=sim.get('enemy3');rear.z=0;cast(sim,'pierce');assert.ok(rear.hp<rear.maxHp);assert.equal(side.hp,side.maxHp);assert.equal(sim.cast('pierce').ok,false);});

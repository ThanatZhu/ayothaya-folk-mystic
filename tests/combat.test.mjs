import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld,screenDirection,moveBody,walkable,findPath,lineClear,SKILLS} from '../combat-core.js';
const tick=(w,seconds,input)=>{for(let t=0;t<seconds;t+=1/60)w.update(1/60,input);};

test('walking stays camera-relative at four camera headings and diagonal speed is capped',()=>{
 for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const f=screenDirection(0,1,a),r=screenDirection(1,0,a),d=screenDirection(1,1,a);
  assert.ok(Math.abs(f.x+Math.sin(a))<1e-8);assert.ok(Math.abs(f.z+Math.cos(a))<1e-8);
  assert.ok(Math.abs(f.x*r.x+f.z*r.z)<1e-8);assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-8);
 }
});
test('dash-sized movement cannot tunnel through a house or the canal',()=>{
 const a={x:-3,z:-2};moveBody(a,0,-12);assert.ok(a.z>-4.2);assert.ok(walkable(a.x,a.z));
 const b={x:-3,z:1.2};moveBody(b,0,20);assert.ok(b.z<=4.021);assert.ok(walkable(b.x,b.z));
 const pier={x:-.5,z:3.5};moveBody(pier,0,9);assert.ok(pier.z>6.5&&pier.z<7.1);
});
test('auto path goes around the north house, never through its footprint',()=>{
 const from={x:-8.2,z:-6},to={x:.5,z:-6};assert.equal(lineClear(from,to),false);
 const path=findPath(from,to);assert.ok(path.length>10);assert.ok(path.some(p=>p.z>-4));
 path.forEach(p=>assert.ok(walkable(p.x,p.z,.32)));assert.ok(Math.hypot(path.at(-1).x-to.x,path.at(-1).z-to.z)<.7);
});
test('all player and monster spawn points are on walkable land',()=>{
 const w=new CombatWorld();[w.player,...w.mobs].forEach(p=>assert.ok(walkable(p.x,p.z),JSON.stringify(p)));
});
test('auto reaches a target, damages it and counts a kill; manual input overrides pursuit',()=>{
 const w=new CombatWorld();w.select(0);w.toggleAuto();const x=w.player.x;
 w.update(.05,{x:-1,z:0});assert.ok(w.player.x<x);assert.ok(w.manualGrace>0);assert.equal(w.path.length,0);
 tick(w,14);assert.ok(w.kills>=1);assert.ok(walkable(w.player.x,w.player.z));
});
test('auto never chases a distant monster outside the bounded scan area',()=>{
 const w=new CombatWorld();w.mobs.forEach(m=>Object.assign(m,{x:12,z:-10,home:{x:12,z:-10}}));
 w.toggleAuto();const start={x:w.player.x,z:w.player.z};tick(w,3);assert.equal(w.player.x,start.x);assert.equal(w.player.z,start.z);
});
test('invalid casts do not consume mana, and cooldown prevents repeated damage',()=>{
 const w=new CombatWorld();w.mobs.forEach(m=>Object.assign(m,{x:12,z:-10}));const mp=w.player.mp;
 assert.equal(w.skill(0),false);assert.equal(w.player.mp,mp);assert.equal(w.cooldowns[0],0);
 Object.assign(w.mobs[0],{x:0,z:1.2});w.select(0);assert.equal(w.skill(0),true);
 const hp=w.mobs[0].hp,mana=w.player.mp;assert.equal(w.skill(0),false);assert.equal(w.mobs[0].hp,hp);assert.equal(w.player.mp,mana);
});
test('skills cannot shoot through buildings; mana and HP remain bounded',()=>{
 const w=new CombatWorld();Object.assign(w.player,{x:-9,z:-.1});Object.assign(w.mobs[0],{x:-9,z:-4.8});w.select(0);
 assert.equal(w.skill(0),false);assert.equal(w.player.mp,100);
 w.player.hp=130;assert.equal(w.skill(4),true);assert.equal(w.player.hp,140);w.skill(8);assert.ok(w.player.mp<=100);
});
test('root holds a monster, shield reduces retaliation, dead player respawns safely',()=>{
 const w=new CombatWorld();Object.assign(w.mobs[0],{x:-.8,z:1.2});w.select(0);w.skill(2);const start={x:w.mobs[0].x,z:w.mobs[0].z};
 tick(w,.5);assert.equal(w.mobs[0].x,start.x);assert.equal(w.mobs[0].z,start.z);
 w.skill(5);w.mobs[0].attackCD=0;const hp=w.player.hp;w.update(.05);assert.ok(hp-w.player.hp<=3);
 w.player.hp=0;w.player.down=.1;tick(w,.2);assert.equal(w.player.hp,140);assert.ok(walkable(w.player.x,w.player.z));
});
test('ten skill slots map to 1 through 9 then 0, each is usable with sufficient resources',()=>{
 assert.deepEqual(SKILLS.map(s=>s.key),['1','2','3','4','5','6','7','8','9','0']);
 SKILLS.forEach((s,i)=>{const w=new CombatWorld();Object.assign(w.mobs[0],{x:0,z:1.2});w.select(0);assert.equal(w.skill(i),true,s.name);assert.ok(w.cooldowns[i]>0);assert.ok(w.player.mp>=0);});
});

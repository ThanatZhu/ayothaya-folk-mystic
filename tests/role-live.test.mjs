import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld} from '../combat-core.js';
import {ROLES} from '../assets/skills-next/catalog.js';
import {SKILL_PROFILES} from '../assets/skill-polish/library-profiles.js';
import {normalizeRoleSkills,ROLE_MARK,upgradeRoleSkill,liveRoleSkills} from '../role-skill-progress.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]};
function world(classId='swordsman',jobId='guardian'){const w=new CombatWorld({classId,jobId,roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[2,0,0],[3,1,0],[3,-1,0]]});w.skillLevels.fill(10);w.player.hp=w.player.maxHp=5000;w.player.mp=w.player.maxMp=10000;w.mobs.forEach(m=>m.hp=m.maxHp=100000);w.targetId=0;return w;}
const step=(w,t)=>{for(let n=0;n<t;n+=.05)w.update(.05,{x:0,z:0,attack:false},{monsters:false});};
test('every one of the 84 active role skills executes through the live combat engine',()=>{
 const ids=new Set();for(const role of ROLES)for(const branch of role.branches){const w=world(role.id,branch.id),ally=world('acolyte','healer');w.roleOwnerId='hero';ally.roleOwnerId='ally';const allies=()=>[{id:'hero',world:w,player:w.player},{id:'ally',world:ally,player:ally.player}];w.roleAllies=ally.roleAllies=allies;w.supportTargetId='ally';
  for(let i=0;i<15;i++){const s=w.skills[i];if(s.reserved||s.passive||ids.has(s.roleSkillId))continue;ids.add(s.roleSkillId);w.cooldowns.fill(0);w.player.mp=10000;w.targetId=0;w.player.x=w.player.z=0;w.roleCombat.state.pending=null;w.mobs[0].roleStatus={poison:{left:8,power:30},curse:{left:8,power:0}};w.roleCombat.state.pets=[{kind:'rooster',x:1,z:0,left:20,power:20,tick:1}];ally.player.hp=['revive','greatRevive'].includes(s.type)?0:2000;ally.player.down=20;
   assert.equal(w.skill(i),true,s.roleSkillId+' accepted');step(w,(SKILL_PROFILES[s.roleSkillId].impacts.at(-1)??1)+.35);assert.equal(w.roleCombat.state.pending,null,s.roleSkillId+' released');assert.ok(w.events.some(e=>e.type==='roleRelease'&&e.roleSkillId===s.roleSkillId),s.roleSkillId+' server release');assert.ok(Number.isFinite(w.player.hp)&&w.player.mp>=0,s.roleSkillId);
  }
 }assert.equal(ids.size,84);
});
test('role save migration refunds old allocation once, keeps active Novice skills and does not destroy the input',()=>{
 const raw={_tree84:Array(15).fill(0),swordsman:Array(15).fill(10),novice:[1,2,0,0,1,0,0,0,0,0,0,0,0,0,0]},before=JSON.stringify(raw),next=normalizeRoleSkills(raw,'swordsman');assert.equal(JSON.stringify(raw),before);assert.equal(next.swordsman.reduce((n,v)=>n+Math.max(0,v-1),0),0);assert.deepEqual(next.novice,raw.novice.map((n,i)=>[0,4,5].includes(i)?n:0));assert.ok(next[ROLE_MARK]);assert.deepEqual(normalizeRoleSkills(next,'swordsman'),next);
 assert.throws(()=>upgradeRoleSkill(next,'swordsman',10,{jobId:'',classId:'swordsman'}),/locked/);assert.throws(()=>upgradeRoleSkill(next,'swordsman',6,{jobId:'guardian',classId:'swordsman'}),/locked/);
 for(const role of ROLES)for(const b of role.branches)assert.equal(liveRoleSkills(role.id,b.id).filter(s=>!s.reserved).length,11);
});
test('casting has authoritative wind-up, respects walls, and stun cancels the pending hit',()=>{
 const w=world(),i=w.skills.findIndex(s=>s.roleSkillId==='cleave'),hp=w.mobs[0].hp;assert.equal(w.skill(i),true);assert.equal(w.mobs[0].hp,hp);w.status.stun=2;step(w,2);assert.equal(w.mobs[0].hp,hp);assert.equal(w.roleCombat.state.pending,null);
 w.cooldowns[i]=0;w.status={};assert.equal(w.skill(i),true);step(w,1.6);assert.ok(w.mobs[0].hp<hp);
 const v=world('hunter','ranger');v.nav={...nav,obstacles:[{x:.6,z:-1,w:1,d:2}]};assert.equal(v.skill(2),false);
});
test('live friendly healing/revive only targets same-party players on the same room; legacy allocation is archived',()=>{
 const map={id:'f',safe:false,nav,spawn:{x:0,z:0},mobs:[]},realm=new RealmServer({catalog:{capital:'f',maps:[map]},roleSkills:true});
 const old={_tree84:Array(15).fill(0),acolyte:Array(15).fill(10)};
 const join=(uid,cls='acolyte')=>realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:uid,gender:'male',classId:cls,jobId:cls==='acolyte'?'healer':undefined},skills:old,state:initialSave(),bag:{coins:0,items:{}}},send:()=>{}});
 const a=join('healer'),b=join('friend','swordsman');a.world.skillLevels.fill(10);a.world.player.mp=1000;
 assert.equal(realm.receive(a.id,{type:'selectAlly',seq:1,target:b.id}),false);a.partyId=b.partyId='party-test';assert.equal(realm.receive(a.id,{type:'selectAlly',seq:2,target:b.id}),true);
 b.world.player.hp=0;b.world.player.down=20;const i=a.world.skills.findIndex(s=>s.roleSkillId==='great-revive');assert.equal(a.world.skill(i),true);step(a.world,3);assert.ok(b.world.player.hp>b.world.player.maxHp*.6);assert.equal(b.world.player.down,0);
 assert.deepEqual(realm.record(a,{state:initialSave()}).roleSkillBackup,old);assert.equal(realm.snapshot(a).self.roleSchema,1);
});
test('rooster attacks repeatedly, taunt has an owner, and a counter is consumed exactly once',()=>{
 const w=world('hunter','spirit-hunter');w.skill(0);step(w,6);assert.ok(w.roleCombat.state.pets.some(p=>p.kind==='rooster'));assert.ok(w.mobs[0].hp<100000);
 const tank=world();tank.roleOwnerId='tank';tank.skill(0);step(tank,1.5);assert.equal(tank.mobs[0].roleStatus.taunt.owner,'tank');tank.cooldowns.fill(0);tank.skill(5);step(tank,1.3);const before=tank.mobs[0].hp;tank.roleCombat.incoming(100,tank.mobs[0]);assert.ok(tank.mobs[0].hp<before);assert.equal(tank.status.counter,undefined);const after=tank.mobs[0].hp;tank.roleCombat.incoming(100,tank.mobs[0]);assert.equal(tank.mobs[0].hp,after);
});
import {roleEffectSpace} from '../role-skill-vfx.js';
import {stepRoleMonsters} from '../role-combat.js';

test('all 28 Master passives activate only after learning, including the HP modifier without compounding',()=>{
 let count=0;for(const role of ROLES)for(const branch of role.branches){const w=world(role.id,branch.id);w.skillLevels[13]=w.skillLevels[14]=0;assert.deepEqual(w.roleCombat.mods(),{});for(let j=0;j<2;j++){const passive=branch.passives[j];w.skillLevels[13+j]=1;assert.equal(w.roleCombat.mods()[passive.modifier],passive.value);count++;}const hp=w.player.maxHp;step(w,.1);if(branch.passives.some(s=>s.modifier==='maxHp')){assert.equal(w.player.maxHp,Math.round(hp*1.2));step(w,1);assert.equal(w.player.maxHp,Math.round(hp*1.2));}}
 assert.equal(count,28);
});

test('damage sharing can knock out the tank and circular links cannot recurse indefinitely',()=>{
 const tank=world(),friend=world();tank.roleOwnerId='tank';friend.roleOwnerId='friend';const roster=()=>[{id:'tank',world:tank,player:tank.player},{id:'friend',world:friend,player:friend.player}];tank.roleAllies=friend.roleAllies=roster;
 for(const [w,owner] of [[friend,'tank'],[tank,'friend']]){w.status.link=5;w.roleCombat.state.meta.link={owner,power:50};}
 tank.player.hp=1;const damage=friend.roleCombat.incoming(100,{x:2,z:0,hp:100});assert.equal(damage,50);assert.equal(tank.player.hp,0);assert.equal(tank.player.down,20);assert.ok(tank.events.some(e=>e.type==='notice'));
});

test('ground casts reject distant or blocked points without consuming MP; detonation requires poison',()=>{
 const w=world('hunter','ranger'),mp=w.player.mp;w.roleGround={x:999,z:0,hp:1};assert.equal(w.skill(3),false);assert.equal(w.player.mp,mp);assert.equal(w.cooldowns[3],0);
 w.nav={...nav,obstacles:[{x:.5,z:-1,w:1,d:2}]};w.roleGround={x:2,z:0,hp:1};assert.equal(w.skill(3),false);
 const rogue=world('rogue','assassin'),i=rogue.skills.findIndex(s=>s.type==='detonatePoison');assert.equal(rogue.skill(i),false);
});

test('poison advances once per shared room and retains the original owner for damage credit',()=>{
 const mob={id:1,x:0,z:0,hp:1000,roleStatus:{poison:{left:5,power:10,owner:'caster'}}},hits=[];const owner={hurt:(m,n)=>{hits.push(n);m.hp-=n;}};
 for(let i=0;i<21;i++)stepRoleMonsters([mob],.1,id=>id==='caster'?owner:null);assert.equal(hits.length,2);assert.equal(mob.hp,980);
});

function roleRealm(now=()=>10000){const map={id:'f',safe:false,nav,spawn:{x:-5,z:-5},mobs:[]};return new RealmServer({catalog:{capital:'f',maps:[map]},roleSkills:true,now});}
const joinRole=(realm,uid,record)=>realm.join({uid,serverId:'server-1',slotId:'slot-1',record:record??{character:{name:'Hero'+uid,gender:'male',classId:'swordsman',jobId:'guardian'},skills:{[ROLE_MARK]:Array(15).fill(0),swordsman:Array(15).fill(10)},state:initialSave(),bag:{coins:0,items:{}}},send:()=>{}});

test('private cooldowns survive relog, elapsed down time respawns at the map spawn, and snapshots omit the backup',()=>{
 const realm=roleRealm(),a=joinRole(realm,'a');a.world.cooldowns[12]=25;a.world.player.hp=0;a.world.player.down=5;a.world.player.x=8;const saved=realm.record(a,{state:initialSave()});
 const next=roleRealm(()=>12000),b=joinRole(next,'a',saved);assert.equal(b.world.cooldowns[12],23);assert.equal(b.world.player.down,3);assert.equal(b.world.player.hp,0);assert.equal(next.snapshot(b).self.roleSkillBackup,undefined);
 const later=roleRealm(()=>20000),c=joinRole(later,'a',saved);assert.ok(c.world.player.hp>0);assert.equal(c.world.player.x,-5);assert.equal(c.world.player.z,-5);
});

test('PvP reflection resolves once per hit and cannot recurse or award two wins on a reflection knockout',t=>{
 t.mock.method(Math,'random',()=>.99); // Test reflection/KO rather than the independent dodge roll.
 const realm=roleRealm(),a=joinRole(realm,'a'),b=joinRole(realm,'b');b.world.player.x=a.world.player.x+1;const send=(p,target)=>realm.receive(p.id,{type:'duel',seq:p.seq+1,target});assert.equal(send(a,b.id),true);assert.equal(send(b,a.id),true);
 for(const p of [a,b]){p.world.status.reflect=10;p.world.roleCombat.state.meta.reflect={power:50};}
 let hits=0;const hurt=realm.hurt.bind(realm);realm.hurt=(...args)=>{assert.ok(++hits<5);return hurt(...args);};a.world.roleCombat.damage(a.world.foe,30);assert.ok(hits<=2);assert.ok(a.world.player.hp<a.world.player.maxHp);assert.ok(b.world.player.hp<b.world.player.maxHp);
 let awards=0;realm.arenaScore=()=>awards++;a.world.player.hp=1;realm.duelSync(b);a.world.roleCombat.damage(a.world.foe,100);assert.equal(awards,1);assert.equal(a.duel,null);assert.equal(b.duel,null);
});

test('painted skill space maps the authored caster and target to actual world positions',()=>{
 const space=roleEffectSpace({x:10,z:20},{x:10,z:25},nav);assert.deepEqual(space.point({x:-2,y:0,z:0}),{x:10,y:0,z:20});assert.deepEqual(space.point({x:1.55,y:0,z:0}),{x:10,y:0,z:25});assert.ok(Math.abs(space.yaw-Math.PI/2)<1e-6);
});

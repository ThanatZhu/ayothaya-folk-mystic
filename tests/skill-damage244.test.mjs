import test from 'node:test';
import assert from 'node:assert/strict';
import {skillDamageFormula,skillDamageBase,skillDamageText} from '../skill-damage244.js';
import {deriveStats} from '../character-stats.js';
import {itemDef,composeId} from '../items.js';
import {CombatWorld} from '../combat-core.js';
import {ROLES} from '../assets/skills-next/catalog.js';
import {SKILL_PROFILES} from '../assets/skill-polish/library-profiles.js';
import {roleTiming} from '../combat-timing.js';
import {liveRoleSkills} from '../role-skill-progress.js';
import {scaledSkill} from '../skill-progress.js';

test('explicit attack percentage plus flat damage uses final attack, not stats or the old multiplier again',()=>{
 assert.equal(skillDamageBase({stat:'atk',attackPercent:300,flatDamage:200},{atk:1000,matk:9,skillPower:999,total:{str:999}}),3200);
 assert.equal(skillDamageBase({stat:'matk',attackPercent:200,flatDamage:50},{atk:9000,matk:500}),1050);
 assert.deepEqual(skillDamageFormula(90),{stat:'atk',attackPercent:225,flatDamage:90});
 assert.equal(skillDamageBase(skillDamageFormula(90),{atk:500}),1215);
 assert.equal(skillDamageBase(skillDamageFormula(90),null),90,'flat part supports unequipped beginners');
});

for(const classId of ['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'])test(`${classId}: equipment, refine and main stats all contribute once to skill damage`,()=>{
 const weapon='weapon-'+classId+'-one';assert.ok(itemDef(weapon));
 const primary=classId==='hunter'?'dex':['shaman','acolyte'].includes(classId)?'int':'str';
 const derive=extra=>deriveStats({classId,level:40,...extra});
 const naked=derive({}),gear=derive({gear:{weapon}}),stat=derive({stats:{[primary]:40}}),both=derive({gear:{weapon},stats:{[primary]:40}}),refined=derive({gear:{weapon:composeId(weapon,20)},stats:{[primary]:40}});
 const damage=d=>skillDamageBase(skillDamageFormula(90,d.magic),d);
 assert.ok(damage(gear)>damage(naked));assert.ok(damage(stat)>damage(naked));
 assert.ok(damage(both)>damage(gear));assert.ok(damage(both)>damage(stat));assert.ok(damage(refined)>damage(both));
 const w=new CombatWorld({classId,mobs:[]});w.applyDerived({...refined,skillPower:999});
 assert.equal(w.power(90),Math.round(damage(refined)),'live engine uses final attack and ignores stale skillPower');
});

test('all class and Master rank formulas preserve the existing damage curve',()=>{
 let count=0;
 for(const role of ROLES)for(const branch of role.branches)for(const base of liveRoleSkills(role.id,branch.id)){
  if(base.reserved||base.passive)continue;
  const d=deriveStats({classId:role.id,level:80,stats:{str:70,dex:70,int:70},gear:{weapon:'weapon-'+role.id+'-one'}});
  for(const rank of [1,2,3,4,5]){
   const s=scaledSkill(base,rank),n=s.power??0,result=skillDamageBase(skillDamageFormula(n,d.magic),d);
   assert.ok(Math.abs(result-n*d.skillPower)<1e-8,base.id+' rank '+rank);
  }count++;
 }assert.equal(count,140); // Base six appear in each of the two branch variants.
});

test('live multi-hit physical and magic casts split the formula before one critical per hit',t=>{
 t.mock.method(Math,'random',()=>.5);
 for(const classId of ['swordsman','shaman']){
  const w=new CombatWorld({classId,roleSkills:true,mobs:[[1,0,0]],spawn:{x:0,z:0},nav:{zones:[{x:-10,z:-10,w:20,d:20}],obstacles:[],props:[]}});
  w.skillLevels.fill(0);w.skillLevels[0]=1;w.player.mp=10000;
  w.applyDerived({...deriveStats({classId,stats:{str:20,int:40}}),crit:1,critMult:2});
  w.affinity=()=>1;w.guardOf=()=>1;w.mobs[0].hp=w.mobs[0].maxHp=1e7;w.targetId=0;
  const s=w.skills[0],timing=roleTiming(s,SKILL_PROFILES[s.roleSkillId]),hits=[];
  w.hurt=(m,n)=>hits.push({n,crit:w.damageContext?.crit});
  assert.equal(w.skill(0),true);
  for(let t=0;t<timing.duration+.2;t+=.05)w.update(.05,{x:0,z:0,attack:false},{monsters:false});
  assert.equal(hits.length,timing.impacts.length);
  const perHit=Math.round(skillDamageBase(skillDamageFormula(s.power/hits.length,w.derived.magic),w.derived))*2;
  assert.deepEqual(hits,hits.map(()=>({n:perHit,crit:true})));
 }
});

test('skill text separates direct damage, per-tick damage and support effects',()=>{
 const d={atk:500,matk:900,magic:false};
 const s=liveRoleSkills('swordsman')[0];
 assert.match(skillDamageText(s,d,'swordsman'),/225% ATK \+ 90 ≈ 1,215/);
 assert.match(skillDamageText(s,d,'swordsman',2),/รวมทุกฮิต/);
 const mist=liveRoleSkills('shaman').find(s=>s.type==='zone');
 assert.match(skillDamageText(mist,{...d,magic:true},'shaman'),/MATK/);
 assert.match(skillDamageText({...s,type:'poison'},d,'rogue'),/112.5% ATK \+ 45.*225% ATK \+ 90/);
 for(const type of ['heal','guard','sanctuary','reflect','revive','ward'])assert.equal(skillDamageText({...s,type},d,'swordsman'),null);
 assert.match(skillDamageText({...s,type:'greatSummon'},d,'hunter'),/120% ATK \+ 48/);
 assert.match(skillDamageText({type:'bolt',damage:24},d,'novice'),/60% ATK \+ 24/);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {ROLES} from '../assets/skills-next/catalog.js';
import {POSE_SHEETS} from '../assets/skills-next/poses-2026-10/pose-map.js';
import {SKILL_PROFILES} from '../assets/skill-polish/library-profiles.js';
import {poseFrame,posesFit,hasPoseSheet} from '../skill-pose-art.js';
import {createRoleAnimation,sampleRolePose,retimeRoleAnimation} from '../combat-animation165.js';
const dir=new URL('../assets/skills-next/poses-2026-10/',import.meta.url);

test('every class and Master active skill has its own pose sheet by skill id, on disk for desktop and mobile; Novice has none',()=>{
 const actives=ROLES.flatMap(r=>[...r.base,...r.branches.flatMap(b=>b.active)]),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));
 assert.equal(actives.length,98);assert.equal(Object.keys(POSE_SHEETS).length,98);
 for(const s of actives){
  const e=POSE_SHEETS[s.id];assert.ok(e,s.id);assert.equal(e.classId,s.classId,s.id);assert.equal(SKILL_PROFILES[s.id]?.id,s.id,'live cast id '+s.id);
  for(const g of ['male','female'])assert.ok(e.scale[g]>.7&&e.scale[g]<2.2,s.id+' '+g+' scale '+e.scale[g]);
  for(const tier of ['hd','sd'])assert.ok(existsSync(new URL('game/'+tier+'/pose-'+s.id+'.webp',dir)),tier+'/'+s.id);
  assert.ok(existsSync(new URL('pose-'+s.id+'.png',dir)),'PNG master kept '+s.id);
 }
 assert.deepEqual(manifest.sheets.map(s=>s.id).sort(),actives.map(s=>s.id).sort());
 assert.equal(hasPoseSheet('novice:0'),false);
});
test('ready → wind-up → release before the blow, contact on every real beat, follow-through and recover after',()=>{
 const impacts=[.3,.55,.8],duration=1;
 assert.deepEqual([0,.1,.2,.29].map(t=>poseFrame(impacts,duration,t)),[0,1,1,2]);
 for(const at of impacts)assert.equal(poseFrame(impacts,duration,at),3,'beat '+at);
 assert.equal(poseFrame(impacts,duration,.5),2,'2 → 3 between blows');
 assert.deepEqual([.82,.9,.99].map(t=>poseFrame(impacts,duration,t)),[3,4,5]);
 // Faster attacks squeeze the same six frames into the shorter timing.
 assert.equal(poseFrame([.12],.3,.12),3);assert.equal(poseFrame([.12],.3,.05),1);
});
test('the cast pose carries the sheet frame; a real release retimes it once per hit index, whatever the target count',()=>{
 const e={type:'cast',roleSkillId:'sword-open',castId:7,from:{x:0,z:0},to:{x:2,z:0},timing:{impacts:[.4],duration:.8}};
 const a=createRoleAnimation(e,10);
 assert.deepEqual(sampleRolePose(a,10.4).skillArt,{id:'sword-open',frame:3});
 assert.equal(sampleRolePose(a,10.05).skillArt.frame,0);assert.equal(sampleRolePose(a,10.79).skillArt.frame,5);
 assert.equal(sampleRolePose(a,10.05,{reduced:true}).skillArt.frame,0);
 // The server released .1 s late: contact moves there; seven more targets on the same hit change nothing.
 for(let n=0;n<8;n++)retimeRoleAnimation(a,{castId:7,hitIndex:0,lag:0},10.5+n*.01);
 assert.ok(Math.abs(a.start-10.1)<1e-9);assert.equal(sampleRolePose(a,10.5).skillArt.frame,3);
 retimeRoleAnimation(a,{castId:8,hitIndex:1},11);assert.ok(Math.abs(a.start-10.1)<1e-9,'another cast');
 assert.equal(sampleRolePose(a,11),null,'ends after its duration');
});
test('the sheets show the class look: dyes, cosmetics and crafted weapons keep the equipped frames',()=>{
 assert.equal(posesFit('swordsman',{},null),true);
 assert.equal(posesFit('swordsman',{hair:'topknot'},null),false);
 assert.equal(posesFit('swordsman',{},{version:1,weapon:'swordsman-weapon-crafted'}),false);
 assert.equal(posesFit('swordsman',{},{version:1,outfit:'swordsman-outfit-crimson'}),false);
 assert.equal(posesFit('swordsman',{bogus:1},null),false);
});

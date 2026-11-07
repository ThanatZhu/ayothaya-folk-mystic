import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skillInReach,ROLE_SELF_KINDS} from '../role-combat.js';
import {liveRoleSkills} from '../role-skill-progress.js';
import {roleById} from '../assets/skills-next/catalog.js';
import {SKILL_PROFILES} from '../assets/skill-polish/library-profiles.js';

const target={x:0,z:0};
test('standing still, the edge of the range is close enough',()=>{
 assert.equal(skillInReach(target,5,{x:5.2,z:0,moving:false}),true);
 assert.equal(skillInReach(target,5,{x:5.4,z:0,moving:false}),false);
});
test('still walking, keep going: the server sees us a moment behind',()=>{
 assert.equal(skillInReach(target,5,{x:5.2,z:0,moving:true}),false);
 assert.equal(skillInReach(target,5,{x:4.3,z:0,moving:true}),true);
});
test('the walk stops inside the moving limit, so an approach always ends in a cast',()=>{
 for(const range of [1.4,2.5,5,7]){const stop=Math.max(.5,range-.8);assert.equal(skillInReach(target,range,{x:stop,z:0,moving:true}),true,String(range));}
});
test('close enough but behind a wall is not in reach, for the server refuses it',()=>{
 const blocked=()=>false;
 assert.equal(skillInReach(target,7,{x:3,z:0,moving:false},blocked),false);
});
test('rounding a corner, the server is still a step behind: it must see the target too',()=>{
 // Only the walker's own spot sees past the corner; the step behind it does not.
 const corner=a=>a.x===0;
 assert.equal(skillInReach(target,7,{x:0,z:3,moving:true,face:{x:1,z:0}},corner),false);
 assert.equal(skillInReach(target,7,{x:0,z:3,moving:false,face:{x:1,z:0}},corner),true);
 assert.equal(skillInReach(target,7,{x:0,z:3,moving:true,face:{x:0,z:-1}},corner),true);
});
test('every active skill of every class and Master path can be walked to and cast',()=>{
 let checked=0;
 for(const classId of ['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'])for(const job of ['',...roleById(classId).branches.map(b=>b.id)])for(const s of liveRoleSkills(classId,job)??[]){
  if(!s||s.reserved||s.passive)continue;checked++;
  // No profile means the press never walks; a self skill needs no walk at all.
  assert.ok(SKILL_PROFILES[s.id],classId+' '+s.id);
  if(ROLE_SELF_KINDS.has(s.type))continue;
  assert.ok(Number.isFinite(s.range),classId+' '+s.id);
  assert.equal(skillInReach(target,s.range,{x:Math.max(.5,s.range-.8),z:0,moving:true}),true,classId+' '+s.id);
 }
 assert.ok(checked>=90,String(checked));
});
test('the action bar presses through the walking path, never straight to the server',()=>{
 const bar=fs.readFileSync(new URL('../actionbar-ui.js',import.meta.url),'utf8');
 assert.equal(bar.includes('world.skill('),false);assert.equal(bar.includes('game.pressSkill('),true);
});

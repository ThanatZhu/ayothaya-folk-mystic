import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTION_COLUMNS,defaultActionbar,normalizeActionbar,resizeActionbar,actionKey} from '../actionbar-state.js';
import {liveRoleSkills} from '../role-skill-progress.js';
import {ROLES} from '../assets/skills-next/catalog.js';

test('adding and removing rows keeps the bottom eight assignments and restores hidden top rows',()=>{
 const skills=Array.from({length:15},(_,i)=>({name:String(i)})),initial=defaultActionbar(skills,skills.map((_,i)=>i),['hp-small','mp-small']);
 assert.equal(ACTION_COLUMNS,8);assert.equal(initial.rows,3);const base=initial.slots.slice(0,8);
 const bigger=resizeActionbar(initial,1),smaller=resizeActionbar(resizeActionbar(resizeActionbar(bigger,-1),-1),-1);
 assert.equal(smaller.rows,1);assert.equal(resizeActionbar(smaller,-1).rows,1);assert.deepEqual(smaller.slots.slice(0,8),base);
 assert.deepEqual(resizeActionbar(smaller,1).slots,initial.slots);
});
test('saved shortcuts reject invalid skills/items and isolate mutable fallback state',()=>{
 const skills=[{},{passive:true},{reserved:true}],fallback=defaultActionbar(skills,[0,1,2],['hp-small']);
 const state=normalizeActionbar({version:1,rows:99,slots:[{kind:'skill',index:0},{kind:'skill',index:1},{kind:'item',id:'hp-small'},{kind:'item',id:'bad'}]},fallback,skills,id=>id==='hp-small');
 assert.equal(state.rows,4);assert.deepEqual(state.slots.slice(0,4),[{kind:'skill',index:0},null,{kind:'item',id:'hp-small'},null]);
 const fresh=normalizeActionbar(null,fallback,skills,()=>true);fresh.slots[0]=null;assert.ok(fallback.slots[0]);
 assert.equal(actionKey(0,7),'8');assert.equal(actionKey(1,0),'Shift+1');assert.equal(actionKey(2,0),'Alt+1');assert.equal(actionKey(3,0),'Shift+Alt+1');
});
test('every class and Master branch receives all active skills, with no passive/reserved shortcuts',()=>{
 for(const role of ROLES)for(const branch of [{id:''},...role.branches]){
  const skills=liveRoleSkills(role.id,branch.id),state=defaultActionbar(skills,skills.map((_,i)=>i),['hp-small','mp-small']);
  const active=skills.map((s,i)=>!s.reserved&&!s.passive?i:null).filter(i=>i!==null);
  assert.deepEqual(state.slots.filter(e=>e?.kind==='skill').map(e=>e.index),active);
  assert.ok(state.rows*8>=active.length+2);
 }
});

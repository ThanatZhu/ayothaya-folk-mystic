import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as THREE from '../vendor/build/three.module.js';
import {ROLES} from '../assets/skills-next/catalog.js';
import {VFX_SHEETS,VFX_UNMATCHED} from '../assets/skills-next/vfx-2026-10/vfx-map.js';
globalThis.matchMedia??=()=>({matches:false});
const {sheetFrame,sheetTail,vfxPlacement,createSheetVfx,BASIC_SHEETS,BASIC_COMBO_VFX,basicAttackVfxId,hasSheet}=await import('../role-sheet-vfx.js');
const dir=new URL('../assets/skills-next/vfx-2026-10/game/',import.meta.url);

test('every class and Master active skill has its own painted sheet, on disk for desktop and mobile',()=>{
 const actives=ROLES.flatMap(r=>[...r.base,...r.branches.flatMap(b=>b.active)]);
 assert.equal(actives.length,98);
 for(const s of actives){const e=VFX_SHEETS[s.id];assert.ok(e?.effect,s.id);assert.equal(e.name,s.name,s.id);assert.equal(e.classId,s.classId,s.id);}
 for(const id of ['novice:0','novice:4','novice:5'])assert.ok(VFX_SHEETS[id]?.effect,id);
 const keys=Object.values(VFX_SHEETS).flatMap(e=>[e.effect,e.ground].filter(Boolean));
 assert.equal(new Set(keys).size,keys.length,'a sheet is used once');
 for(const k of keys)for(const tier of ['hd','sd'])assert.ok(existsSync(new URL(tier+'/'+k+'.webp',dir)),tier+'/'+k);
 assert.deepEqual(VFX_UNMATCHED.map(u=>u.file).sort(),['fx-novice-n4-ground.png','fx-novice-n4.png']);
});
test('all 8 classes have 4-stage basic attack combo painted sheets on disk for slash and magic classes',()=>{
 for(const b of Object.values(BASIC_SHEETS))for(const tier of ['hd','sd'])assert.ok(existsSync(new URL(tier+'/'+b.effect+'.webp',dir)),tier+'/'+b.effect);
 const scene=new THREE.Scene(),world={player:{x:0,z:0},nav:null,networkSelfId:'me'},vfx=createSheetVfx(scene,world,{tier:'sd'});
 let castId=100;
 for(const [classId,seq] of Object.entries(BASIC_COMBO_VFX)){
  assert.equal(seq.length,4,classId);
  for(let step=0;step<4;step++){
   const id=basicAttackVfxId(classId,step);
   assert.equal(hasSheet(id),true,`${classId}:${step} -> ${id}`);
   assert.equal(vfx.spawn({roleSkillId:id,basic:true,comboStep:step,castId:++castId,from:{x:0,z:0},to:{x:2,z:0},timing:{impacts:[.24],duration:.55}}),true);
  }
 }
 vfx.clear();vfx.dispose();assert.equal(scene.children.length,0);
});
test('the peak frame sits on every real release beat; build-up before, fade after',()=>{
 const impacts=[.3,.55,.8],tail=sheetTail({duration:.96},false);
 for(const at of impacts)assert.equal(sheetFrame(impacts,tail,at).frame,3,'beat '+at);
 assert.deepEqual([0,.11,.21].map(t=>sheetFrame(impacts,tail,t).frame),[0,1,2]);
 let prev=3;for(let t=.8;t<.8+tail;t+=.02){const f=sheetFrame(impacts,tail,t);assert.ok(f.frame>=prev);prev=f.frame;}
 assert.equal(prev,7);assert.equal(sheetFrame(impacts,tail,.8+tail+.01),null);assert.equal(sheetFrame(impacts,tail,-.01),null);
 // Faster casts (shorter timing) fade faster; ultimates linger.
 assert.ok(sheetTail({duration:.5},false)<sheetTail({duration:1.2},false));assert.ok(sheetTail({duration:.6},true)>sheetTail({duration:.6},false));
});
test('art is placed by what the skill does',()=>{
 assert.equal(vfxPlacement('meteor'),'area');assert.equal(vfxPlacement('guard'),'self');assert.equal(vfxPlacement('cleave'),'around');
 assert.equal(vfxPlacement('holy'),'shot');assert.equal(vfxPlacement('line'),'line');assert.equal(vfxPlacement('execute'),'target');
 assert.equal(vfxPlacement('break','hunt-shot'),'shot','an arrow leaves the bow');assert.equal(vfxPlacement('line','hunt-rama'),'shot');
 assert.equal(vfxPlacement('break','sword-open'),'target','the same kind on a sword stays on the blow');assert.equal(vfxPlacement('line','war-drill'),'line');
});
test('one clip per cast, bounded pool, hits retime once, cancel and clear free everything',()=>{
 const scene=new THREE.Scene(),world={player:{x:0,z:0},nav:null,networkSelfId:'me'},vfx=createSheetVfx(scene,world,{tier:'sd'});
 const cast=(castId,actor='me',id='sham-naga')=>vfx.spawn({roleSkillId:id,castId,actor,from:{x:0,z:0},to:{x:3,z:0},timing:{impacts:[.5],duration:.66}});
 assert.equal(cast(1),true);assert.equal(cast(1),true);assert.equal(vfx.metrics.clips,1,'duplicate delivery ignored');
 assert.equal(vfx.spawn({roleSkillId:'cross-finish',castId:9,from:{x:0,z:0},to:{x:1,z:0}}),false,'no sheet: legacy profile plays');
 for(let i=2;i<20;i++)cast(i,'p'+i);assert.equal(vfx.metrics.clips,5,'mobile cap');assert.ok(vfx.metrics.pool<=5);
 vfx.update(.1);vfx.hit({castId:19,actor:'p19',hitIndex:0,lag:0,x:4,z:1});vfx.hit({castId:19,actor:'p19',hitIndex:0,lag:0,x:9,z:9});
 vfx.cancel(19,'p19');assert.equal(vfx.metrics.clips,4);
 for(let i=0;i<20;i++)vfx.update(.25);assert.equal(vfx.metrics.clips,0,'clips end by themselves');
 cast(30);vfx.clear();assert.equal(vfx.metrics.clips,0);
 vfx.dispose();assert.equal(scene.children.length,0,'no objects left in the scene');
});

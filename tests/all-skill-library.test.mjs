import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ALL_SKILLS} from '../assets/skills-next/catalog.js';
import {ALL_PROFILES,SKILL_PROFILES,PAINTED_SHEETS,sampleSkill} from '../assets/skill-polish/library-profiles.js';
import {sampleClip} from '../assets/skill-polish/timing.js';
test('every base, Master and passive skill has an explicit painted animation profile',()=>{
 assert.equal(ALL_PROFILES.length,112);assert.equal(ALL_PROFILES.filter(p=>!p.passive).length,84);assert.equal(ALL_PROFILES.filter(p=>p.passive).length,28);assert.deepEqual(new Set(Object.keys(SKILL_PROFILES)),new Set(ALL_SKILLS.map(s=>s.id)));
 const modes=new Set(['pulse','sweep','hold','travel','link','orbit','dome','planted','wall','clones','pet','rain','fan']);
 for(const p of ALL_PROFILES){assert.ok(p.layers.length>0,p.id);assert.ok(p.duration>2&&p.duration<6,p.id);assert.ok(p.scenario.length>10,p.id);for(const at of p.impacts)assert.ok(at>0&&at<p.duration,p.id);for(const l of p.layers){assert.ok(PAINTED_SHEETS[l.sheet],p.id+' sheet');assert.ok(modes.has(l.mode),p.id+' mode');assert.ok(l.start>=0&&l.span>0&&l.start+l.span<=p.duration+.2,p.id+' layer timing');assert.ok(Number.isFinite(l.y)&&l.scale>0,p.id+' placement');assert.ok(l.count>0&&l.count<=12,p.id+' budget');}}
});
test('all 17 atlases exist as native RGBA flipbooks; no procedural icon substitutes',async()=>{
 assert.equal(Object.keys(PAINTED_SHEETS).length,17);
 for(const [id,url] of Object.entries(PAINTED_SHEETS)){const b=await readFile(new URL('../'+url.slice(2),import.meta.url));assert.equal(b.subarray(1,4).toString(),'PNG',id);const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.equal(w,h*2,id);assert.equal(b[25],6,id+' RGBA');assert.ok(b.length>500000,id+' painted source');}
});
test('all clips support deterministic arbitrary seeking and finite positions without body deformation',()=>{
 for(const p of ALL_PROFILES)for(let t=0;t<=p.duration;t+=.031){const a=sampleSkill(p.id,t);sampleSkill(p.id,p.duration-t);assert.deepEqual(sampleSkill(p.id,t),a,p.id);assert.ok(a.frame>=0&&a.frame<=11,p.id);assert.ok(a.hp>=0&&a.hp<=700,p.id);for(const value of Object.values(a))if(typeof value==='number')assert.ok(Number.isFinite(value),p.id);const reduced=sampleSkill(p.id,t,{reduced:true});assert.equal(reduced.shake,0,p.id);assert.equal(reduced.heroX,-2,p.id);}for(const p of ALL_PROFILES)assert.equal(sampleSkill(p.id,p.duration).frame,0,p.id+' recovers');
});
test('the three approved clips retain their exact pose and impact timing',()=>{
 for(const [id,approved] of [['cross-finish','sword'],['peck','rooster'],['great-revive','lotus']])for(let t=0;t<3;t+=.037){const a=sampleSkill(id,t),b=sampleClip(approved,t);for(const key of ['frame','heroX','heroY','targetX','hp','fxFrame','fxOpacity','roosterFrame','roosterX','roosterY','shake'])assert.equal(a[key],b[key],id+' '+key);}
});
test('role signatures keep the right direction, targets and distinct mechanics',()=>{
 assert.equal(SKILL_PROFILES['retreat-shot'].movement,'retreat');assert.ok(sampleSkill('retreat-shot',1).heroX<-2);assert.equal(SKILL_PROFILES['reverse-fate'].layers[2].reflect,true);assert.equal(SKILL_PROFILES['shield-edge'].layers[1].reverse,false);assert.ok(SKILL_PROFILES.clones.ghosts);assert.equal(SKILL_PROFILES.crow.layers[0].sheet,'rooster-crow');assert.equal(SKILL_PROFILES['life-tree'].layers[0].sheet,'life-tree');assert.equal(SKILL_PROFILES['arrow-rain'].layers[0].waves,4);
 for(const p of ALL_PROFILES.filter(p=>p.target==='down')){const hit=p.impacts[0];assert.equal(sampleSkill(p.id,hit-.01).targetMode,'sleep');assert.equal(sampleSkill(p.id,hit+.01).targetMode,'standUp');}
});

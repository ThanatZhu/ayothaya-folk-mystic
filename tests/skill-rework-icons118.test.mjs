import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {ROLES,ALL_SKILLS} from '../assets/skills-next/catalog.js';
import {REWORK_ICONS,NOVICE_ICONS,UNMATCHED} from '../assets/skills-next/rework-icon-map.js';
const dir=new URL('../assets/skills-next/',import.meta.url);
const kinds=Object.fromEntries(JSON.parse(readFileSync(new URL('rework-icons-2026-10-26/icon-map.json',dir),'utf8')).icons.map(i=>['rework-icons-2026-10-26/'+i.file,i.kind]));
const passives=new Set(ROLES.flatMap(r=>r.branches.flatMap(b=>b.passives.map(p=>p.id))));

test('every rework icon belongs to a live skill, exists on disk and is used once',()=>{
 const ids=new Set(ALL_SKILLS.map(s=>s.id)),files=[...Object.values(REWORK_ICONS),...Object.values(NOVICE_ICONS)];
 for(const id of Object.keys(REWORK_ICONS))assert.ok(ids.has(id),id);
 for(const f of files){assert.ok(existsSync(new URL(f,dir)),f);assert.ok(kinds[f],f+' is in icon-map.json');}
 assert.equal(new Set(files).size,files.length);
});
test('passives wear round passive art; active skills never do; ultimates stay on actives',()=>{
 for(const [id,f] of Object.entries(REWORK_ICONS))assert.equal(kinds[f]==='passive',passives.has(id),id+' → '+f);
 for(const f of Object.values(NOVICE_ICONS))assert.notEqual(kinds[f],'passive');
});
test('every live skill is either mapped or listed as unmatched',()=>{
 for(const s of ALL_SKILLS)assert.ok(REWORK_ICONS[s.id]||UNMATCHED.includes(s.id),s.id);
 for(const id of UNMATCHED)assert.equal(REWORK_ICONS[id],undefined,id);
 assert.deepEqual(Object.keys(NOVICE_ICONS).map(Number),[0,4,5]);
});

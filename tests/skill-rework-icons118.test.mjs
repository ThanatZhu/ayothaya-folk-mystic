import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {ALL_SKILLS} from '../assets/skills-next/catalog.js';
import {NOVICE_ICONS} from '../assets/skills-next/rework-icon-map.js';
const dir=new URL('../assets/skills-next/',import.meta.url);
const kinds=Object.fromEntries(JSON.parse(readFileSync(new URL('rework-icons-2026-10-26/icon-map.json',dir),'utf8')).icons.map(i=>['rework-icons-2026-10-26/'+i.file,i.kind]));

test('0.119: every class skill wears its own rework icon, on disk and listed in icon-map.json',()=>{
 assert.equal(ALL_SKILLS.length,161);
 const files=[...ALL_SKILLS.map(s=>s.art),...Object.values(NOVICE_ICONS)];
 for(const f of files){assert.ok(f,'art');assert.ok(existsSync(new URL(f,dir)),f);assert.ok(kinds[f],f+' is in icon-map.json');}
 assert.equal(new Set(files).size,files.length,'each icon used once');
 assert.deepEqual(Object.keys(NOVICE_ICONS).map(Number),[0,4,5]);
});
test('passives wear round passive art; active skills and ultimates never do',()=>{
 for(const s of ALL_SKILLS)assert.equal(kinds[s.art]==='passive',!!s.passive,s.id+' → '+s.art);
 for(const f of Object.values(NOVICE_ICONS))assert.notEqual(kinds[f],'passive');
});

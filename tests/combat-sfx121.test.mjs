import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {COMBAT_CLASSES,COMBAT_FAMILIES,COMBAT_NAMES,combatFile} from '../audio-catalog180.js';
import {SKILL_PROFILES} from '../assets/skill-polish/library-profiles.js';
// 0.121 combat sounds: every class and every skill has its files (scripts/build-combat-sfx.mjs)
const has=f=>existsSync(new URL('../assets/audio-combat/'+f+'.mp3',import.meta.url));
test('every class has its swing, hit and ultimate sounds', ()=>{
 for(const c of COMBAT_CLASSES){for(const part of ['swing','hit'])for(const v of [0,1,2])assert.ok(has(combatFile('cls',c,part,v)),c+' '+part+v);assert.ok(has(combatFile('cls',c,'ult',0)),c+' ult');assert.ok(COMBAT_NAMES[c]);}
});
test('every active skill falls in a sound family whose cast and hit files exist', ()=>{
 const active=Object.values(SKILL_PROFILES).filter(p=>!p.passive);assert.ok(active.length>=180);
 for(const p of active){const f=p.layers?.[0]?.sheet;assert.ok(COMBAT_FAMILIES.includes(f),p.id+' has family '+f);}
 for(const f of COMBAT_FAMILIES){assert.ok(COMBAT_NAMES[f]);for(const part of ['cast','hit'])for(const v of [0,1])assert.ok(has(combatFile('fam',f,part,v)),f+' '+part+v);}
});

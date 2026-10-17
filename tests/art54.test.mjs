import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ATLASES} from '../items.js';
import {MONSTER_TYPES} from '../combat-core.js';
const size=f=>{const b=fs.readFileSync(new URL('../'+f,import.meta.url));assert.equal(b.toString('ascii',12,16),'IHDR',f);return [b.readUInt32BE(16),b.readUInt32BE(20)];};

test('0.54 painted atlases are 1536×1024 (6×4 cells of 256) and every item points inside them', () => {
 for(const [key,file] of Object.entries(ATLASES))assert.deepEqual(size(file),[1536,1024],key);
});

test('boss sheet: 8 frames × 2 rows of 256 with metadata the monster loader reads', () => {
 assert.deepEqual(size('assets/frontier38/boss-monsters.png'),[2048,512]);
 const meta=JSON.parse(fs.readFileSync(new URL('../assets/frontier38/boss-monsters.json',import.meta.url)));
 assert.equal(meta.columns,8);assert.equal(meta.rects.length,16);assert.equal(meta.scales.length,2);
 for(const [x,y,w,h] of meta.rects)assert.ok(x>=0&&y>=0&&x+w<=2048&&y+h<=512);
 assert.deepEqual(['lantern-lord','straw-king'].map(id=>{const t=MONSTER_TYPES.find(t=>t.id===id);return [t.sheet,t.row];}),[['boss-monsters',0],['boss-monsters',1]]);
});

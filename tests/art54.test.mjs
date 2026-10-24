import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ATLASES,ATLAS_LAYOUTS,ITEMS} from '../items.js';
import {MONSTER_TYPES} from '../combat-core.js';
const size=f=>{const b=fs.readFileSync(new URL('../'+f,import.meta.url));if(f.endsWith('.svg'))return b.toString().match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number); // 0.85 stand-in vector atlas
assert.equal(b.toString('ascii',12,16),'IHDR',f);return [b.readUInt32BE(16),b.readUInt32BE(20)];};

test('standard painted item atlases remain 6×4; monster-card sheets declare their own 4×2 layout', () => {
 for(const [key,file] of Object.entries(ATLASES)){if(/^gear10[46]/.test(key)&&!fs.existsSync(new URL('../'+file,import.meta.url)))continue; // 0.107 sheets still being painted (stand-in icons meanwhile)
  const layout=ATLAS_LAYOUTS[key];
  if(layout){const [w,h]=size(file);assert.deepEqual(layout,{columns:4,rows:2});assert.equal(w/layout.columns,h/layout.rows,key);assert.ok(w>=1024&&h>=512);const cards=Object.values(ITEMS).filter(i=>i.atlas===key);assert.ok(cards.length>0&&cards.every(i=>i.kind==='card'&&i.monsterCard&&i.icon===0));}
  else assert.deepEqual(size(file),[1536,1024],key);}
});

test('boss sheet: 8 frames × 2 rows of 256 with metadata the monster loader reads', () => {
 assert.deepEqual(size('assets/frontier38/boss-monsters.png'),[2048,512]);
 const meta=JSON.parse(fs.readFileSync(new URL('../assets/frontier38/boss-monsters.json',import.meta.url)));
 assert.equal(meta.columns,8);assert.equal(meta.rects.length,16);assert.equal(meta.scales.length,2);
 for(const [x,y,w,h] of meta.rects)assert.ok(x>=0&&y>=0&&x+w<=2048&&y+h<=512);
 assert.deepEqual(['lantern-lord','straw-king'].map(id=>{const t=MONSTER_TYPES.find(t=>t.id===id);return [t.sheet,t.row];}),[['boss-monsters',0],['boss-monsters',1]]);
});

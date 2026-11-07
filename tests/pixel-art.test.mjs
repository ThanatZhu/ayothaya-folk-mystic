import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLASSES,NOVICE,atlasPath} from '../classes.js';
import {PIXEL_CLASSES} from '../pixel-art.js';
import {MONSTER_TYPES} from '../combat-core.js';

const manifest=JSON.parse(fs.readFileSync(new URL('../assets/pixel/manifest.json',import.meta.url)));
const png=name=>{const b=fs.readFileSync(new URL('../assets/pixel/'+name,import.meta.url));return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};};

test('every class and gender has a complete pixel sheet',()=>{
 for(const {id} of [NOVICE,...CLASSES]){
  assert.ok(PIXEL_CLASSES.has(id),id);
  for(const [gender,tag] of [['male','m'],['female','f']]){
   const cell=manifest.actors[id+'-'+gender]?.cell,size=png('pc-'+id+'-'+tag+'.png');
   assert.ok(cell>0,id+gender);assert.deepEqual(size,{width:cell*manifest.columns,height:cell*manifest.rows});
   const pose=manifest.actors[id+'-'+gender].emote;assert.ok(pose>0,id+gender);assert.deepEqual(png('pe-'+id+'-'+tag+'.png'),{width:pose*manifest.columns,height:pose*manifest.rows});
  }
  assert.deepEqual(png(id+'-atlas.png'),{width:1774,height:887});
  assert.match(atlasPath(id),/^\.\/assets\/pixel\/[a-z]+-atlas\.png/);
 }
});
test('every pixel monster is a real type with a complete eight-pose strip',()=>{
 const monsters=JSON.parse(fs.readFileSync(new URL('../assets/pixel/monsters.json',import.meta.url)));
 for(const [id,{art,cell,body}] of Object.entries(monsters)){
  assert.ok(MONSTER_TYPES.some(t=>t.id===id),id);
  assert.deepEqual(png(art+'.png'),{width:cell*8,height:cell},id);
  assert.ok(body>0&&body<=cell,id);
 }
});

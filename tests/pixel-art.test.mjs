import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLASSES,NOVICE,atlasPath} from '../classes.js';
import {PIXEL_CLASSES} from '../pixel-art.js';

const manifest=JSON.parse(fs.readFileSync(new URL('../assets/pixel/manifest.json',import.meta.url)));
const png=name=>{const b=fs.readFileSync(new URL('../assets/pixel/'+name,import.meta.url));return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};};

test('every class and gender has a complete pixel sheet',()=>{
 for(const {id} of [NOVICE,...CLASSES]){
  assert.ok(PIXEL_CLASSES.has(id),id);
  for(const [gender,tag] of [['male','m'],['female','f']]){
   const cell=manifest.actors[id+'-'+gender]?.cell,size=png('pc-'+id+'-'+tag+'.png');
   assert.ok(cell>0,id+gender);assert.deepEqual(size,{width:cell*manifest.columns,height:cell*manifest.rows});
  }
  assert.deepEqual(png(id+'-atlas.png'),{width:1774,height:887});
  assert.match(atlasPath(id),/^\.\/assets\/pixel\/[a-z]+-atlas\.png/);
 }
});

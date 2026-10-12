import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASSES} from '../classes.js';
import {DIRECTIONS,DIRECTIONAL_CLASSES,directionalManifestPath,placement} from '../directional-sprite.js';

test('directional art covers the full playable class registry and rejects unknown paths',()=>{
 assert.deepEqual(DIRECTIONAL_CLASSES,CLASSES.map(c=>c.id));
 assert.throws(()=>directionalManifestPath('../unknown'),/invalid-class/);
 assert.equal(directionalManifestPath(),directionalManifestPath('shaman'));
});
for(const classId of DIRECTIONAL_CLASSES)test(`${classId}: sixteen distinct crops fit the real PNG and common foot baseline`,()=>{
 const manifest=JSON.parse(readFileSync(new URL('../'+directionalManifestPath(classId),import.meta.url)));
 const dimensions={};
 for(const [key,source] of Object.entries(manifest.sources)){
  const png=readFileSync(new URL('../'+source.path,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  dimensions[key]=[png.readUInt32BE(16),png.readUInt32BE(20)];
  assert.deepEqual(dimensions[key],source.size);
 }
 const crops=new Set();
 for(const gender of ['male','female']){
  assert.deepEqual(Object.keys(manifest.frames[gender]).sort(),[...DIRECTIONS].sort());
  for(const direction of DIRECTIONS){
   const frame=manifest.frames[gender][direction],[x,y,w,h]=frame.rect,[width,height]=dimensions[frame.source];
   assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height,`${gender}/${direction} crop`);
   const dest=placement(frame,manifest.cell,manifest.anchor),scale=dest.w/w;
   assert.ok(Object.values(dest).every(Number.isFinite));
   assert.ok(Math.abs(dest.x+frame.foot[0]*scale-manifest.anchor[0])<1e-8);
   assert.ok(Math.abs(dest.y+frame.foot[1]*scale-manifest.anchor[1])<1e-8);
   assert.ok(dest.x>=0&&dest.y>=0&&dest.x+dest.w<=manifest.cell&&dest.y+dest.h<=manifest.cell);
   crops.add(frame.source+':'+frame.rect.join(','));
  }
 }
 assert.equal(crops.size,16);
});

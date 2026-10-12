import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DIRECTIONS,viewDirection,placement} from '../directional-sprite.js';
import {screenDirection} from '../combat-core.js';
const manifest=JSON.parse(readFileSync(new URL('../assets/directional/shaman-16.json',import.meta.url)));
test('all eight screen movement directions stay correct through a full camera orbit',()=>{
 for(let camera=-Math.PI*2;camera<=Math.PI*2;camera+=Math.PI/16){
  DIRECTIONS.forEach((d,i)=>{const angle=i*Math.PI/4;const face=screenDirection(Math.sin(angle),-Math.cos(angle),camera);assert.equal(viewDirection(face,camera),d);});
 }
});
test('stationary world heading changes visible view when camera rotates',()=>{
 const face={x:0,z:1};assert.equal(viewDirection(face,0),'S');assert.equal(viewDirection(face,Math.PI/2),'W');assert.equal(viewDirection(face,Math.PI),'N');assert.equal(viewDirection(face,-Math.PI/2),'E');
 assert.equal(viewDirection({x:0,z:0},1,'NE'),'NE');assert.equal(viewDirection({x:NaN,z:0},0),'S');
});
test('both genders have independent authored frames for all directions, valid crops and common sole anchor',()=>{
 for(const gender of ['male','female']){
  assert.deepEqual(Object.keys(manifest.frames[gender]).sort(),[...DIRECTIONS].sort());
  const crops=new Set();
  for(const d of DIRECTIONS){
   const f=manifest.frames[gender][d],source=manifest.sources[f.source],[x,y,w,h]=f.rect,[width,height]=source.size;
   assert.ok(existsSync(new URL('../'+source.path,import.meta.url)));assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height);
   const dest=placement(f,manifest.cell,manifest.anchor),scale=dest.w/w;
   assert.ok(Math.abs(dest.x+f.foot[0]*scale-96)<1e-8);assert.ok(Math.abs(dest.y+f.foot[1]*scale-180)<1e-8);
   assert.ok(dest.x>=7.99&&dest.y>=7.99&&dest.x+dest.w<=184.01&&dest.y+dest.h<=180.01);
   crops.add(f.source+':'+f.rect.join(','));
  }
  assert.equal(crops.size,8); // No mirrored weapon hand or duplicate direction rectangle.
 }
});

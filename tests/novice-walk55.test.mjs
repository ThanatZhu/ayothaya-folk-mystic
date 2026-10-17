import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {walkCycle,characterMotion} from '../character-motion.js';
const load=d=>JSON.parse(fs.readFileSync(new URL('../assets/'+d+'/novice.json',import.meta.url)));
const size=(d,f)=>{const b=fs.readFileSync(new URL('../assets/'+d+'/'+f,import.meta.url));return [b.readUInt32BE(16),b.readUInt32BE(20)];};

// animation37 = plain novice; equipment41 = novice with the crafted hand wraps (0.55.1: same cycle, wraps painted on)
for(const [dir,stand] of [['animation37',{male:234,female:240}],['equipment41',{male:237,female:243}]])test('novice walk ('+dir+'): one fixed frame box and pivot, one scale per gender, 8 frames per strip', () => {
 const meta=load(dir);
 for(const g of ['male','female']){
  const walk=meta.frames[g].slice(12,20);assert.equal(walk.length,8);
  assert.deepEqual(size(dir,'novice-walk-'+g+'.png'),[2048,320]);
  walk.forEach((f,i)=>{assert.deepEqual(f.rect,[i*256,0,256,308],'pivot y 308 is the rect bottom');assert.equal(f.anchor,128);assert.equal(f.source,'novice-walk-'+g+'.png');});
  assert.equal(new Set(walk.map(f=>f.scale)).size,1,'no per-frame rescale');
  const idle=meta.frames[g][0];assert.ok(Math.abs(walk[0].scale*278-stand[g]*idle.scale)<.5,'walking body = idle body height');
 }
});

test('the walk phase is driven by distance (1.23 world units per cycle for novice) and the art bob is not doubled', () => {
 assert.equal(walkCycle('novice'),1.23);assert.equal(walkCycle('swordsman'),2.1);
 for(let i=0;i<8;i++)assert.equal(characterMotion({mode:'walk',classId:'novice',phase:i/8+.01}).artFrame,12+i);
 assert.equal(characterMotion({mode:'walk',classId:'novice',phase:.3}).y,0);
});

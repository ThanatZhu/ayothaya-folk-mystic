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
 assert.equal(walkCycle('novice'),1.23);assert.equal(walkCycle('acolyte'),.788);
 for(let i=0;i<8;i++)assert.equal(characterMotion({mode:'walk',classId:'novice',phase:i/8+.01}).artFrame,12+i);
 assert.equal(characterMotion({mode:'walk',classId:'novice',phase:.3}).y,0);
});

test('0.56 walk view: up/down the screen picks the front/back cycle (20–27 / 28–35), diagonals keep the last view', async () => {
 const {walkView}=await import('../character-motion.js');const {motionFrame}=await import('../animation-frames.js');
 assert.equal(walkView({x:1,z:0},0),'side');assert.equal(walkView({x:0,z:1},0),'front');assert.equal(walkView({x:0,z:-1},0),'back');
 assert.equal(walkView({x:1,z:1},0,'front'),'front');assert.equal(walkView({x:1,z:1},0,'side'),'side');
 assert.equal(motionFrame('walk',0,.01,false,'novice','front'),20);assert.equal(motionFrame('walk',0,.99,false,'novice','back'),35);
});

test('0.56.1 cadence cap: at most 2 walk cycles per second, the art stride below that', async () => {
 const {gaitStep,WALK_CADENCE}=await import('../character-motion.js');
 assert.equal(WALK_CADENCE,2);
 assert.ok(Math.abs(gaitStep(1.23*1/60,1/60,'novice')-1/60)<1e-9,'1.23 u/s → 1 cycle/s, no slide');
 assert.ok(Math.abs(gaitStep(5.3/60,1/60,'novice')-2/60)<1e-9,'town pace 5.3 u/s capped at 2 cycles/s');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {BOUNTY_POOL,dailyBounties} from '../bounty.js';
import {BOUNTY_STORYBOARDS,bountyScene} from '../bounty-storyboards163.js';
import {taskScene} from '../quest-cinematic-data155.js';
test('every rotating daily target has its own storyboard; no unrelated straw fallback',()=>{
 const expected=new Set(BOUNTY_POOL.flat().map(b=>b.leader?'leader-camp':b.monster));
 assert.equal(expected.size,14);assert.deepEqual(new Set(Object.keys(BOUNTY_STORYBOARDS)),expected);
 const paths=new Set();
 for(const pool of BOUNTY_POOL)for(const b of pool){const target=b.leader?'leader-camp':b.monster,scene=taskScene({kind:'bounty',...b,goal:'ตรงตามเป้าหมาย'});assert.equal(scene.target,target);assert.equal(scene.art.src,`./assets/bounty163/${target}.webp`);assert.equal(scene.art.panels,3);assert.equal(scene.captions.length,3);assert.equal(scene.captions[1],'ตรงตามเป้าหมาย');assert.ok(scene.captions[0].length>30);assert.ok(!('reward' in scene));paths.add(scene.art.src);}
 assert.equal(paths.size,14);
 assert.equal(bountyScene({monster:'not-a-real-monster'}),null);
 assert.equal(bountyScene({}),null);
});
test('leader bounties retain their leader selector even without a monster id',()=>{
 const tasks=dailyBounties(Date.UTC(2026,9,24,5));
 for(const task of tasks){const s=taskScene({kind:'bounty',...task});assert.equal(s.target,task.leader?'leader-camp':task.monster);}
 const leader=tasks.find(t=>t.leader);assert.equal(leader.monster,undefined);assert.equal(taskScene({kind:'bounty',...leader}).target,'leader-camp');
});

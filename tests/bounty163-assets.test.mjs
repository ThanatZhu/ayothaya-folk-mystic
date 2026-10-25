import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BOUNTY_STORYBOARDS,bountyScene} from '../bounty-storyboards163.js';
test('every daily target ships a distinct real illustrated atlas',async()=>{
 const crypto=await import('node:crypto'),hashes=new Set();
 for(const id of Object.keys(BOUNTY_STORYBOARDS)){
  const b=await readFile(new URL('../assets/bounty163/'+id+'.webp',import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length>30000,id+' must contain real artwork');hashes.add(crypto.createHash('sha256').update(b).digest('hex'));
  const frames=bountyScene({monster:id,leader:id==='leader-camp'}).art.frames;
  assert.equal(frames.length,3,id+' needs three measured panel crops');
  let end=0;for(const [x,y,w,h]of frames){assert.equal(w/h,2);assert.ok(x>=0&&y>=end&&x+w<=1024&&y+h<=1536,id+' must crop inside its own panel');end=y+h;}
 }
 assert.equal(hashes.size,14,'all target illustrations must be distinct');
});
test('the saved built-in prompt set covers the exact runtime target set',async()=>{
 const p=JSON.parse(await readFile(new URL('../assets/bounty163/prompts.json',import.meta.url),'utf8'));
 assert.equal(p.mode,'built-in image_gen');assert.deepEqual(new Set(p.images.map(i=>i.id)),new Set(Object.keys(BOUNTY_STORYBOARDS)));
});

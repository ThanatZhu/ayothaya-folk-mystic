import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {REBIRTH_BOARDS} from '../rebirth-storyboards.js';
import {REBIRTH_STORY} from '../rebirth-content196.js';
import {storyScene} from '../quest-cinematic-data155.js';
import {createPlayback,acceleratePlayback,playbackFrame} from '../story-playback160.js';

const panels=JSON.parse(readFileSync(new URL('../assets/rebirth196/story/panels.json',import.meta.url),'utf8'));

test('every rebirth quest plays the chosen triptych: measured 2:1 crops, three safe captions',()=>{
 assert.deepEqual(Object.keys(REBIRTH_BOARDS),REBIRTH_STORY.map(q=>q.id));
 for(const q of REBIRTH_STORY){
  const b=REBIRTH_BOARDS[q.id];
  assert.deepEqual(b.frames,panels.quests[q.id],q.id+' crops');
  for(const [,,w,h] of b.frames)assert.ok(Math.abs(w/h-2)<.02,q.id+' 2:1');
  assert.equal(b.lines.length,3);for(const l of b.lines)assert.ok((l.match(/\{0\}/g)??[]).length<=1&&!/[<>]/.test(l),q.id);
  assert.ok(existsSync(new URL('../assets/rebirth196/story/'+q.id+'.webp',import.meta.url)),q.id+' art');
 }
 const scene=storyScene(0,0,'rebirth',1);
 assert.equal(scene.tap,'complete');assert.deepEqual(scene.art.frames,panels.quests.rb1);assert.match(scene.art.src,/rebirth196\/story\/rb1\.webp/);
 assert.deepEqual(scene.captions,REBIRTH_BOARDS.rb1.lines);
 // the chapter-1 story is untouched: no tap mode, its own art
 const main=storyScene(0,0);assert.equal(main.tap,undefined);assert.match(main.art.src,/story160/);
});

test('a tap shows the whole rebirth caption, the next tap moves on; chapter-1 taps still speed up',()=>{
 const p=createPlayback(['หนึ่งสองสาม','สี่ห้า'],{tap:'complete'});
 acceleratePlayback(p);assert.equal(playbackFrame(p).complete,true);assert.equal(p.shot,0);
 p.age=1;acceleratePlayback(p);assert.equal(p.shot,1);
 const old=createPlayback(['หนึ่งสองสาม']);acceleratePlayback(old);assert.equal(old.speed,120);
});

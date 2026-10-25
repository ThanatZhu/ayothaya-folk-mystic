import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {STORY} from '../story-quests.js';
import {STORYBOARDS} from '../quest-storyboard160.js';
import {storyScene,sceneUnlocked,sceneForNPCTalk,taskScene} from '../quest-cinematic-data155.js';
import {storyGraphemes,createPlayback,advancePlayback,acceleratePlayback,playbackFrame} from '../story-playback160.js';
test('all 43 steps have three authored shots, with one distinct painted atlas per quest',async()=>{
 const images=new Set();
 for(const [q,quest]of STORY.entries())for(const [s,step]of quest.steps.entries()){
  const scene=storyScene(q,s);assert.deepEqual(scene.step,step);assert.equal(scene.title,quest.title);assert.equal(scene.captions.length,3);
  assert.ok(scene.captions.every(x=>x.length>30));assert.equal(scene.art.panels,3);images.add(scene.art.src);
  assert.ok((await stat(new URL('../'+scene.art.src,import.meta.url))).size>10000);
 }
 assert.equal(images.size,22);assert.equal(Object.keys(STORYBOARDS).length,22);assert.equal(storyScene(999,0),null);
});
test('replays retain current/past-step locks',()=>{
 const state={quest:3,step:0,done:false};assert.ok(sceneUnlocked(storyScene(0,0),state));assert.ok(sceneUnlocked(storyScene(3,0),state));
 assert.ok(!sceneUnlocked(storyScene(3,1),state));assert.ok(!sceneUnlocked(storyScene(4,0),state));assert.ok(!sceneUnlocked(storyScene(0,0),null));
});
test('only the matching quest NPC can introduce the current scene',()=>{
 const state={quest:0,step:0,done:false},before=structuredClone(state);
 assert.ok(sceneForNPCTalk(state,{name:'ลุงเรือง'},'ayutthaya'));
 assert.equal(sceneForNPCTalk(state,{name:'ครูแสนดาบ'},'ayutthaya'),null);
 assert.equal(sceneForNPCTalk(state,{name:'ลุงเรือง'},'rice-fields'),null);
 assert.equal(sceneForNPCTalk({...state,done:true},{name:'ลุงเรือง'},'ayutthaya'),null);
 assert.deepEqual(state,before);
 for(const [q,quest]of STORY.entries())for(const [s,step]of quest.steps.entries())if(step.type==='talk'){
  const scene=sceneForNPCTalk({quest:q,step:s,done:false},{name:step.npc},step.mapId);assert.equal(scene.seenId,'story:'+quest.id);
 }
});
test('system quests are introduced by their teacher, rather than state observation',()=>{
 assert.ok(sceneForNPCTalk({quest:1,step:0},{name:'ครูแสนดาบ'},'ayutthaya'));
 assert.equal(sceneForNPCTalk({quest:1,step:0},{name:'ลุงเรือง'},'ayutthaya'),null);
 const q=STORY.findIndex(q=>q.id==='t17');assert.ok(sceneForNPCTalk({quest:q,step:0},{name:'ครู',mentorId:'rogue'},'ayutthaya'));
});
test('Thai combining marks stay attached; first tap accelerates without skipping the shot',()=>{
 const line='ผู้ฝึกตนได้ยินเสียงกระซิบจากท่าน้ำ '+ 'สายใยขวัญ'.repeat(20),p=createPlayback([line,'ซีนถัดไป']);
 advancePlayback(p,.05);assert.equal(p.shot,0);assert.ok(p.revealed<storyGraphemes(line).length);
 const before=p.revealed;acceleratePlayback(p);assert.equal(p.speed,120);assert.equal(p.revealed,before);assert.equal(p.shot,0);
 advancePlayback(p,.1);assert.ok(p.revealed>before+10);
 assert.equal(storyGraphemes('น้ำ').join(''),'น้ำ');
 const f=playbackFrame(p);assert.equal(f.text,storyGraphemes(line).slice(0,Math.floor(p.revealed)).join(''));
});
test('complete text holds for reading, later tap advances and speed resets',()=>{
 const p=createPlayback(['หนึ่ง','สอง','สาม']);advancePlayback(p,1);assert.equal(p.shot,0);assert.equal(playbackFrame(p).complete,true);
 acceleratePlayback(p);assert.equal(p.shot,1);assert.equal(p.speed,30);assert.equal(p.revealed,0);
 advancePlayback(p,6);assert.equal(p.shot,2);advancePlayback(p,6);assert.equal(p.done,true);
});
test('acceleration is capped, reduced motion removes fades, invalid clocks are ignored',()=>{
 const p=createPlayback(['ข้อความ'.repeat(100)]);for(let i=0;i<10;i++)acceleratePlayback(p);assert.equal(p.speed,240);
 const before=structuredClone(p);for(const dt of [NaN,-1,Infinity,0])advancePlayback(p,dt);assert.deepEqual(p,before);
 assert.equal(playbackFrame(p,true).opacity,1);assert.equal(playbackFrame(p,false).opacity,0);
});
test('daily/weekly/trial previews use painted context without gameplay reward fields',()=>{
 for(const kind of ['bounty','weekly','training']){const scene=taskScene({kind,title:'บททดสอบ',goal:'ล่ามอนสเตอร์สิบตัว',monster:'straw'});assert.equal(scene.captions[1],'ล่ามอนสเตอร์สิบตัว');assert.equal(scene.art.panels,3);assert.ok(!('reward'in scene));}
});
test('all narrative lines have complete English translations before letter reveal',async()=>{
 await import('../i18n-en.js');for(const board of Object.values(STORYBOARDS))for(const line of board.lines)assert.ok(globalThis.I18N_EN[line]);
});
test('runtime has no bottom playback UI and no quest-state autoplay scheduler',async()=>{
 const src=await readFile(new URL('../quest-cinematic155.js',import.meta.url),'utf8');
 for(const removed of ['cinematic-pause','cinematic-replay','cinematic-seek','cinematic-time','autoAt','queued','heroAction','loadPaintedCharacter'])assert.ok(!src.includes(removed),removed);
 assert.ok(src.includes('onTalk(npc)'));assert.ok(src.includes('sceneForNPCTalk(state(),npc,map.id)'));
});
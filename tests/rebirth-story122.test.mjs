import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {REBIRTH_STORY,REBIRTH_MAPS,normalizeRebirthStory,rebirthTalk,rebirthUnlocked,rebirthScene,rebirthSceneForNPCTalk,rebirthPreload} from '../rebirth-story.js';
import {createPlayback,acceleratePlayback,playbackFrame} from '../story-playback160.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

const NPCS=new Set(['พระปัญญา','ยายจันทร์','มาลัย','ทิพย์สุวรรณ','นางจันทรา']);
const panels=JSON.parse(readFileSync(new URL('../assets/story-rebirth/panels.json',import.meta.url),'utf8'));

test('20 rebirth intros, 60 captions, crops from the art pack, the five named NPCs only',()=>{
 assert.deepEqual(REBIRTH_STORY.map(q=>q.id),Array.from({length:20},(_,i)=>'rb'+(i+1)));
 assert.equal(REBIRTH_STORY.flatMap(q=>q.lines).length,60);
 for(const q of REBIRTH_STORY){
  assert.deepEqual(q.frames,panels.quests[q.id],q.id+' crops');
  for(const [,,w,h] of q.frames)assert.ok(Math.abs(w/h-2)<.02,q.id+' shots are 2:1');
  assert.ok(NPCS.has(q.npc),q.id+' npc '+q.npc);
  assert.ok(q.mapId==='ayutthaya'||REBIRTH_MAPS.some(m=>m.id===q.mapId),q.id+' map');
  assert.ok(existsSync(new URL('../assets/story-rebirth/'+q.id+'.webp',import.meta.url)),q.id+' art');
  for(const line of q.lines)assert.ok((line.match(/\{0\}/g)??[]).length<=1&&!/[<>]/.test(line),q.id+' caption');
 }
 // four quests per chapter, in order
 assert.deepEqual(REBIRTH_STORY.map(q=>q.chapter),[1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5]);
});

test('only reborn characters meet the story, at the right NPC on the right map, once',()=>{
 const npc={npc:'พระปัญญา',mapId:'ayutthaya'};
 assert.equal(rebirthTalk(null,npc,0).changed,false,'not reborn');
 assert.equal(rebirthTalk(null,{npc:'ยายจันทร์',mapId:'ayutthaya'},1).changed,false,'wrong npc');
 assert.equal(rebirthTalk(null,{npc:'พระปัญญา',mapId:'rice-fields'},1).changed,false,'wrong map');
 const r=rebirthTalk(null,npc,1);assert.equal(r.changed,true);assert.deepEqual(r.state,{v:1,quest:0,started:true});
 assert.equal(rebirthTalk(r.state,npc,1).changed,false,'second talk changes nothing');
 assert.deepEqual(rebirthUnlocked(null,1),[]);assert.deepEqual(rebirthUnlocked(r.state,1).map(q=>q.id),['rb1']);assert.deepEqual(rebirthUnlocked(r.state,0),[]);
 assert.deepEqual(normalizeRebirthStory({v:1,quest:99,started:true}),{v:1,quest:20,started:false});
 assert.equal(rebirthSceneForNPCTalk(null,{name:'พระปัญญา'},'ayutthaya',0),null);
 const scene=rebirthSceneForNPCTalk(null,{name:'พระปัญญา'},'ayutthaya',1,'<b>Kaew</b>');
 assert.equal(scene.id,'rebirth:rb1');assert.equal(scene.captions.length,3);assert.equal(scene.name,'<b>Kaew</b>');assert.equal(scene.tap,'complete');
 assert.equal(rebirthScene('rb99'),null);
 assert.deepEqual(rebirthPreload(null),[rebirthScene('rb1').art.src,rebirthScene('rb2').art.src]);
});

test('a tap shows the whole rebirth caption, the next tap moves on; chapter-1 taps still speed up',()=>{
 const p=createPlayback(['หนึ่งสองสาม','สี่ห้า'],{tap:'complete'});
 acceleratePlayback(p);assert.equal(playbackFrame(p).complete,true);assert.equal(p.shot,0);
 p.age=1;acceleratePlayback(p);assert.equal(p.shot,1);
 const old=createPlayback(['หนึ่งสองสาม']);acceleratePlayback(old);assert.equal(old.speed,120);assert.equal(playbackFrame(old).complete,false);
});

test('the realm keeps rebirth story apart, sends it only to reborn characters and saves it',()=>{
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
 const city={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[{name:'พระปัญญา',x:2,z:0,text:'-'}]};
 const join=rebirth=>{let time=1e4;const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[city]},now:()=>time});const state=initialSave();state.mapId='ayutthaya';
  const record={character:{name:'Kaew',gender:'female',classId:'hunter'},state,rebirth};const peer=realm.join({uid:'u'+rebirth,serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
  return {realm,peer,record,send:(type,data)=>{time+=200;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});}};};
 const plain=join(0);
 assert.equal(plain.realm.snapshot(plain.peer).self.rebirthStory,null);
 assert.equal(plain.send('rebirthTalk',{npc:'พระปัญญา'}),false,'not reborn: no progress');
 assert.equal(plain.peer.rebirthStory.started,false);
 const reborn=join(1);
 assert.deepEqual(reborn.realm.snapshot(reborn.peer).self.rebirthStory,{v:1,quest:0,started:false});
 Object.assign(reborn.peer.world.player,{x:-20,z:0});
 assert.equal(reborn.send('rebirthTalk',{npc:'พระปัญญา'}),false,'too far');
 Object.assign(reborn.peer.world.player,{x:0,z:0});
 assert.equal(reborn.send('rebirthTalk',{npc:'พระปัญญา'}),true);
 assert.equal(reborn.send('rebirthTalk',{npc:'พระปัญญา'}),false,'repeat');
 assert.deepEqual(reborn.realm.record(reborn.peer,reborn.record).rebirthStory,{v:1,quest:0,started:true});
 // the chapter-1 story is untouched
 assert.deepEqual(reborn.peer.story,plain.peer.story);
});

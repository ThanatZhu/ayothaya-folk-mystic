import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CHAO_CHUK,storyNPCIdentity,storyNPCPlacement,loadStoryNPCLife} from '../npc-identity175.js';
import {npcActorId} from '../npc-portrait155.js';
import {storyPortrait} from '../story-dialogue.js';
import {FRAME_SIZE,FRAME_FOOT,CHARACTER_WORLD_SCALE,LOGICAL_SIZE} from '../character-size.js';
const world=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const chuk=world.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='เจ้าจุก');

test('Chao Chuk owns a child identity, without changing the shared merchant identity or quest coordinates',()=>{
 assert.deepEqual([chuk.x,chuk.z],[35.5,22]);assert.equal(storyNPCIdentity(chuk),CHAO_CHUK);assert.equal(npcActorId(chuk),CHAO_CHUK.id);
 assert.equal(storyPortrait(chuk).src,CHAO_CHUK.portrait);
 for(const name of ['แม่บัว','จ้อย','ผู้ขายดอกไม้']){const n={name,texture:2};assert.equal(storyNPCIdentity(n),null);assert.equal(npcActorId(n),'people-2');assert.equal(storyPortrait(n).src,'./assets/story124/npc-2.webp');}
 assert.equal(storyNPCPlacement({texture:2}),null);assert.equal(loadStoryNPCLife('people-2'),null);
});

test('standing and authored life playback share the same child scale and foot baseline',()=>{
 const p=storyNPCPlacement(chuk),size=FRAME_SIZE/LOGICAL_SIZE*CHARACTER_WORLD_SCALE*.78;
 assert.equal(p.width,size);assert.equal(p.height,size);assert.equal(p.centerX,.5);assert.equal(p.centerY,(FRAME_SIZE-FRAME_FOOT)/FRAME_SIZE);
 assert.ok(CHAO_CHUK.worldScale<1,'child is shorter than adult NPCs');
});

test('four separate transparent poses and the dialogue portrait are shipped locally',async()=>{
 const meta=JSON.parse(await readFile(new URL('../assets/npc175/chao-chuk.json',import.meta.url),'utf8'));
 assert.equal(meta.id,CHAO_CHUK.id);assert.equal(meta.worldScale,CHAO_CHUK.worldScale);assert.equal(meta.foot,FRAME_FOOT);assert.equal(meta.frameSize,FRAME_SIZE);
 const png=await readFile(new URL('../assets/npc175/chao-chuk.png',import.meta.url));assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),320);assert.equal(png[25],6,'RGBA output retains real transparency');
 assert.equal(meta.frames.length,4);for(const [i,f] of meta.frames.entries())assert.deepEqual(f.rect,[i*320,0,320,320]);
 assert.deepEqual(meta.clips.idle.frames,[0,1,0]);assert.deepEqual(meta.clips.talk.frames,[2,0]);assert.deepEqual(meta.clips.sit.frames,[3]);
 const portrait=await readFile(new URL('../'+CHAO_CHUK.portrait,import.meta.url));assert.ok(portrait.length>1000);
});

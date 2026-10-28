import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {storyScene,sceneForNPCTalk} from '../quest-cinematic-data155.js';
import {REBIRTH_CHAPTERS,REBIRTH_MONSTER_SPECS,REBIRTH_STORY} from '../rebirth-content196.js';import {normalizeStory,normalizeRebirthStory,currentObjective,storyEvent,STORY,STORY_VERSION} from '../story-quests.js';
import {RealmServer} from '../server/realm.js';import {initialSave} from '../realm-state.js';import {levelStart,XP_CURVE} from '../experience.js';import {walkable,findPath,MONSTER_TYPES} from '../combat-core.js';import {itemDef,DROPS} from '../items.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../maps/rebirth196/manifest.json',import.meta.url)));
test('five editable GLBs have no embedded actors/lights/cameras; gameplay points are connected and under budget',()=>{
 assert.equal(manifest.maps.length,5);for(const c of REBIRTH_CHAPTERS){const m=catalog.maps.find(m=>m.id===c.id),info=manifest.maps.find(m=>m.id===c.id);assert.ok(m.draft);assert.equal(m.minRebirth,1);assert.ok(info.bytes<5000000);assert.ok(info.triangles<600000); // v7 scenes sit at 270k-540k like the other mapsassert.ok(fs.existsSync(new URL('../'+info.source,import.meta.url)));
  const glb=fs.readFileSync(new URL('../'+info.scene,import.meta.url));assert.equal(glb.readUInt32LE(0),0x46546c67);const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());assert.ok(!json.cameras?.length);assert.ok(!json.animations?.length);assert.ok(!json.extensions?.KHR_lights_punctual);
  for(const p of [...m.portals,...m.npcs,...m.mobs.map(([x,z])=>({x,z}))]){assert.ok(walkable(p.x,p.z,.5,m.nav),c.id+' walkable '+JSON.stringify(p));assert.ok(findPath(m.spawn,p,m.nav).length,c.id+' connected '+JSON.stringify(p));}
 }
});
test('all twenty quests reference reachable real NPCs, monsters and real rewards with one illustrated triptych each',()=>{
 assert.equal(REBIRTH_STORY.length,20);assert.equal(REBIRTH_MONSTER_SPECS.length,30);for(const q of REBIRTH_STORY){assert.equal(q.beats.length,3);assert.ok(fs.existsSync(new URL('../assets/rebirth196/story/'+q.id+'.webp',import.meta.url)));for(const s of q.steps){if(s.mapId){const map=catalog.maps.find(m=>m.id===s.mapId);assert.ok(map,q.id);if(s.npc)assert.ok(map.npcs.some(n=>n.name===s.npc),q.id+' '+s.npc);if(s.monster){assert.ok(MONSTER_TYPES.some(t=>t.id===s.monster));assert.ok(map.mobs.some(m=>MONSTER_TYPES[m[2]].id===s.monster));}}}for(const r of q.reward.items)assert.ok(itemDef(r.id));}
 for(const m of REBIRTH_MONSTER_SPECS)assert.ok(DROPS[m.id]);
});
test('river, lava, sky gaps and sea rings block feet while bridges remain connected',()=>{
 for(const [id,x,z]of [['rebirth-ferry',0,0],['rebirth-kalpa',0,16],['rebirth-gandharva',0,-30],['rebirth-rahu',0,0],['rebirth-sithandon',15,-30]])assert.equal(walkable(x,z,.4,catalog.maps.find(m=>m.id===id).nav),false,id+' cannot walk through a gap');
});
test('rebirth progress is independent, every quest pays once and a later rebirth keeps the finished arc',()=>{
 const original=normalizeStory({v:STORY_VERSION,quest:7,step:0}),copy=structuredClone(original);let progress=normalizeRebirthStory(null,1),paid=0,guard=0;
 while(!progress.done&&guard++<2000){const q=currentObjective(progress),s=q.step;const event=s.type==='level'?{type:'check',ctx:{level:99}}:s.type==='defeat'?{type:'defeat',mapId:s.mapId,monster:s.monster}:{type:s.type,npc:s.npc,mapId:s.mapId};const r=storyEvent(progress,event);assert.ok(r.changed);if(r.reward)paid++;progress=r.state;}
 assert.equal(paid,20);assert.equal(progress.done,true);assert.equal(progress.cycle,1);assert.deepEqual(original,copy);assert.equal(storyEvent(progress,{type:'talk',mapId:'rebirth-sithandon',npc:'พระปัญญา'}).changed,false);assert.equal(normalizeRebirthStory(progress,1).done,true);assert.equal(normalizeRebirthStory(progress,2).done,true);assert.equal(normalizeRebirthStory(progress,2).cycle,1);assert.equal(normalizeRebirthStory({v:1,quest:3,started:true},1).quest,0,'the earlier intro-only state starts the arc fresh');assert.equal(normalizeRebirthStory(null,0),null);assert.equal(STORY.includes(REBIRTH_STORY[0]),false);
});
test('rebirth cinematics are marked seen once per arc, whatever the rebirth count',()=>{
 const first=storyScene(0,0,'rebirth',1);assert.equal(first.art.panels,3);assert.equal(sceneForNPCTalk(normalizeRebirthStory(null,2),{name:'พระปัญญา'},'ayutthaya').seenId,first.seenId);assert.equal(storyScene(0,0).seenId,'story:t1');
});
function realmFixture({rebirth=1,mapId='ayutthaya',level=99,rebirthStory}={}){let now=10000;const realm=new RealmServer({catalog,now:()=>now}),record={character:{name:'Rebirth Tester',classId:'shaman',gender:'male'},state:{...initialSave(),mapId,traveler:{...initialSave().traveler,baseXp:levelStart(level)},position:catalog.maps.find(m=>m.id===mapId).spawn},xpCurve:XP_CURVE,rebirth,rebirthStory,story:{v:STORY_VERSION,quest:STORY.length,step:0},bag:{coins:2000000,items:{}}},peer=realm.join({uid:'rb196',serverId:'server-1',slotId:'slot-1',record,send(){}});return {realm,peer,record,send(m){now+=1000;return realm.receive(peer.id,{seq:peer.seq+1,...m});}};}
test('authority rejects non-reborn entry and low-level travel before charging; inaccessible saved maps return to capital',()=>{
 const a=realmFixture({rebirth:0});const before=structuredClone(a.peer.bag);assert.throws(()=>a.realm.travelDestination(a.peer,'rebirth-ferry',{warp:true}),/rebirth-required/);assert.deepEqual(a.peer.bag,before);
 const low=realmFixture({level:1});assert.throws(()=>low.realm.travelDestination(low.peer,'rebirth-kalpa',{warp:true}),/rebirth-level-gate/);
 const forged=realmFixture({rebirth:0,mapId:'rebirth-ferry'});assert.equal(forged.peer.room.map.id,'ayutthaya');assert.equal(forged.peer.world.player.x,catalog.maps[0].spawn.x);
});
test('authoritative dialogue validates NPC distance, campaign and cycle, persists separately and ignores stale replays',()=>{
 const f=realmFixture(),p=f.peer,before=structuredClone(p.story),npc=p.room.map.npcs.find(n=>n.name==='พระปัญญา');const action={type:'questTalk',npc:npc.name,expected:{quest:0,step:0,campaign:'rebirth',cycle:1}};
 assert.equal(f.send(action),false);Object.assign(p.world.player,{x:npc.x,z:npc.z+1});assert.equal(f.send({...action,expected:{...action.expected,cycle:2}}),false);assert.equal(f.send(action),true);assert.equal(p.rebirthStory.step,1);assert.equal(f.send(action),false);assert.deepEqual(p.story,before);const saved=f.realm.record(p,f.record);assert.equal(saved.rebirthStory.cycle,1);assert.equal(saved.rebirthStory.step,1);assert.deepEqual(saved.story,before);
});
test('rebirthing again keeps the arc where it was: no restart, no second reward (docs/world-roadmap.md)',()=>{
 const mid={v:STORY_VERSION,campaign:'rebirth',cycle:1,quest:7,step:1,count:0},f=realmFixture({rebirth:1,rebirthStory:mid});
 const before=structuredClone(f.peer.rebirthStory);assert.equal(before.quest,7);
 assert.equal(f.send({type:'rebirth'}),true);assert.equal(f.peer.rebirth,2);
 assert.deepEqual(f.peer.rebirthStory,before);assert.equal(f.realm.record(f.peer,f.record).rebirthStory.quest,7);
});

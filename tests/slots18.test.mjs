import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRealmStore} from '../realm-store.js';
import {initialSave,guestKey,validEntry} from '../realm-state.js';
import {CLASSES,NOVICE,atlasPath} from '../classes.js';
import {CombatWorld} from '../combat-core.js';
const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url)));
const hero={name:'ผู้ฝึกตน',gender:'female',classId:'swordsman',jobId:'guardian'};
function memory(){const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
function cloud(){const docs=new Map();let queue=Promise.resolve();const connection={auth:{currentUser:{uid:'alice'}},db:{},sdk:{doc:(_, ...parts)=>parts.join('/'),serverTimestamp:()=>1,runTransaction:(_,fn)=>{const job=queue.then(async()=>{const writes=new Map();let written=false;const result=await fn({get:async key=>{assert.equal(written,false,'all reads precede writes');return {exists:()=>docs.has(key),data:()=>structuredClone(docs.get(key))};},set:(key,value)=>{written=true;writes.set(key,structuredClone(value));}});for(const [k,v] of writes)docs.set(k,v);return result;});queue=job.catch(()=>{});return job;}}};return {docs,connection};}
for(const mode of ['guest','cloud'])test(`${mode}: five total slots across servers, independent saves and sixth rejected`,async()=>{
 const mem=memory(),c=cloud(),store=createRealmStore({catalog,...(mode==='guest'?{storage:mem}:{connection:c.connection,owner:'alice'})});
 const rows=await Promise.all(Array.from({length:5},(_,i)=>store.create(i%2?'server-2':'server-1',{...hero,name:'คนที่'+i})));
 assert.equal(new Set(rows.map(r=>r.slotId)).size,5);assert.equal((await store.list()).length,5);
 for(const r of rows){assert.equal(r.character.classId,'novice');assert.equal(r.character.jobId,'');assert.equal(r.state.traveler.kills,0);}
 await assert.rejects(store.create('server-2',hero),/slots-full/);
 const first=rows[0],state=structuredClone(first.state);Object.assign(state.traveler,{kills:25,baseXp:295,jobXp:164});
 const saved=await store.save(first.serverId,first,state);assert.equal((await store.load(first.serverId,first.slotId)).state.traveler.kills,25);
 assert.equal((await store.load(rows[2].serverId,rows[2].slotId)).state.traveler.kills,0);
 const reloaded=await store.load(first.serverId,first.slotId);assert.equal(reloaded.state.traveler.baseXp,295);assert.equal(reloaded.state.traveler.jobXp,164);
 assert.equal((await store.load(rows[2].serverId,rows[2].slotId)).state.traveler.jobXp,0);
 if(mode==='cloud'){const persisted=c.docs.get('players/alice/characters/'+first.slotId);assert.equal(persisted.state.traveler.baseXp,295);assert.equal(persisted.state.traveler.jobXp,164);}
 await assert.rejects(store.save(first.serverId,first,state),/save-conflict/);
 await assert.rejects(store.save('server-2',saved,state),/character-scope/);
 assert.equal(await store.load('server-2',first.slotId),null);
});
test('a profession opens only at a maxed novice Job 10 (Base Lv.23+); Master only at a maxed Job 40 (Base Lv.39+)',async()=>{
 const {advanceReady}=await import('../advancement.js');assert.equal(advanceReady({baseXp:99999,jobXp:1259},'novice').ok,false);assert.equal(advanceReady({baseXp:99999,jobXp:17159},'boxer').ok,false);
 for(const c of CLASSES){const store=createRealmStore({catalog,storage:memory()});let r=await store.create('server-1',hero);
  for(const [baseXp,jobXp] of [[0,0],[2485,1260]]){r=await store.save('server-1',r,{...r.state,traveler:{...r.state.traveler,kills:240,baseXp,jobXp}});await assert.rejects(store.changeClass('server-1',r,c.id),/class-locked/);}
  r=await store.save('server-1',r,{...r.state,traveler:{...r.state.traveler,kills:240,baseXp:2856,jobXp:1260}});r=await store.changeClass('server-1',r,c.id);assert.equal(r.character.classId,c.id);
  const {JOBS}=await import('../advancement.js');const job=JOBS[c.id][0].id;
  r=await store.save('server-1',r,{...r.state,traveler:{...r.state.traveler,kills:589,baseXp:6117,jobXp:17160}});await assert.rejects(store.customize('server-1',r,{},job),/job-locked/);
  r=await store.save('server-1',r,{...r.state,traveler:{...r.state.traveler,kills:590,baseXp:13216,jobXp:17160}});r=await store.customize('server-1',r,{},job);assert.equal((await store.load('server-1',r.slotId)).character.jobId,job);
  await assert.rejects(store.customize('server-1',r,{},JOBS[c.id][1].id),/job-final/);
 }
});
test('legacy cloud characters migrate once without losing old low-level Master or backups',async()=>{
 const {docs,connection}=cloud(),state=initialSave();state.traveler.kills=90;
 const old={character:{name:'รุ่นเก่า',gender:'male',classId:'boxer',jobId:'master-boxer'},revision:7,state};
 docs.set('players/alice/saves/server-1',structuredClone(old));docs.set('players/alice/saves/server-2',{...structuredClone(old),character:{...old.character,name:'คนที่สอง'}});
 const store=createRealmStore({catalog,connection,owner:'alice'});let rows=await store.list();assert.equal(rows.length,2);assert.equal(rows[0].revision,7);assert.equal(rows[0].character.jobId,'master-boxer');
 await store.customize('server-1',rows[0],{outfit:'crimson'});rows=await store.list();assert.equal(rows.length,2);assert.equal(rows[0].revision,8);assert.deepEqual(docs.get('players/alice/saves/server-1'),old);
});
test('corrupt legacy data blocks migration before writes; invalid slot cannot enter',async()=>{
 const mem=memory();mem.setItem(guestKey('server-1'),JSON.stringify({character:{name:'เก่า',gender:'male',classId:'shaman'},state:initialSave(),revision:2}));mem.setItem(guestKey('server-2'),'{broken');
 await assert.rejects(createRealmStore({catalog,storage:mem}).list());assert.equal(mem.getItem('ayothaya-character-v2:slot-1'),null);
 assert.equal(validEntry({owner:'alice',serverId:'server-1',slotId:'slot-6'},'alice','server-1'),false);
});
test('novice artwork and basic combat are available',()=>{
 const png=readFileSync(new URL('../'+atlasPath('novice'),import.meta.url));assert.equal(png.readUInt32BE(16)/png.readUInt32BE(20),2);
 const w=new CombatWorld({classId:NOVICE.id});assert.equal(w.profession.id,'novice');assert.equal(w.skills.length,10);assert.ok(w.profession.damage>0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {EvidenceLog,playerEvent,evidenceDay} from '../server/evidence.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origin='http://127.0.0.1:8870';
const temp=async()=>{const directory=await mkdtemp(path.join(tmpdir(),'evidence118-'));return {store:await new LocalStore(directory).init(),directory};};
const peer={uid:'u1',slotId:'slot-1',serverId:'server-1',character:{name:'Somchai'},ip:'1.2.3.4',channel:2,room:{map:{id:'ayothaya'}}};

test('events are batched per Bangkok day, searchable, and old days are purged', async()=>{
 const {store,directory}=await temp();let now=Date.parse('2026-10-26T16:30:00Z'); // 23:30 in Bangkok
 const log=new EvidenceLog(store,{now:()=>now});
 try{
  log.add('players',playerEvent(peer,'chat',{channel:'world',text:'ขายดาบ 500'}));
  now+=60*60e3;log.add('players',playerEvent(peer,'trade',{with:{uid:'u2',name:'Malee'},gave:{coins:500},got:{items:{sword:1}}})); // 00:30 next day
  await log.flush();
  assert.deepEqual((await readdir(path.join(directory,'evidence','players'))).sort(),['2026-10-26.jsonl','2026-10-27.jsonl']);
  const all=await log.search({from:'2026-10-26',to:'2026-10-27'});
  assert.deepEqual(all.events.map(e=>e.type),['trade','chat'],'newest first');assert.equal(all.events[0].ip,'1.2.3.4');assert.equal(all.events[1].map,'ayothaya');
  assert.equal((await log.search({from:'2026-10-26',to:'2026-10-27',q:'ขายดาบ'})).events.length,1);
  assert.equal((await log.search({from:'2026-10-26',to:'2026-10-27',q:'malee'})).events[0].type,'trade');
  assert.equal((await log.search({from:'2026-10-26',to:'2026-10-27',type:'chat'})).events.length,1);
  await assert.rejects(log.search({from:'2026-09-01',to:'2026-10-27'}),/range-too-long/);
  now=Date.parse('2027-02-01T00:00:00Z');await log.purge();
  assert.deepEqual(await readdir(path.join(directory,'evidence','players')),[],'older than 90 days is removed');
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('a failed write keeps the batch for the next try', async()=>{
 let fail=true;const saved=[];const store={appendEvidence:async(s,d)=>{if(fail)throw Error('offline');saved.push(d);}};
 const log=new EvidenceLog(store);log.add('admin',{type:'admin-boss',admin:'a@x'});
 await assert.rejects(log.flush());fail=false;await log.flush();assert.equal(saved[0].events[0].type,'admin-boss');
});

test('the realm reports chat on each channel with the recipient of a whisper', () => {
 const realm=new RealmServer({catalog}),seen=[];realm.evidence=(p,type,detail)=>seen.push({name:p.character.name,type,...detail});
 const join=(uid,name)=>realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'novice'},state:initialSave()},send:()=>{}});
 const a=join('a','Alpha');join('b','Bravo');
 realm.receive(a.id,{type:'chat',channel:'room',text:'hello',seq:1});
 realm.now=()=>Date.now()+999999;realm.receive(a.id,{type:'chat',channel:'whisper',to:'Bravo',text:'psst',seq:2});
 assert.deepEqual(seen.map(e=>[e.type,e.channel,e.text]),[['chat','room','hello'],['chat','whisper','psst']]);
 assert.equal(seen[1].to.name,'Bravo');
});

test('admins search the log over HTTP and every admin action is audited, searches included', async()=>{
 const {store,directory}=await temp();
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+host.server.address().port,api=async(p,body)=>{const r=await fetch(url+p,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{
  host.realm.evidence(peer,'chat',{channel:'world',text:'scam link'});
  assert.equal((await api('/admin/weather',{serverId:'server-1',weather:'storm',minutes:30})).status,200);
  const today=evidenceDay(Date.now());
  const found=await api(`/admin/evidence?stream=players&from=${today}&to=${today}&q=scam`);
  assert.equal(found.status,200);assert.equal(found.data.events[0].name,'Somchai');assert.equal(found.data.events[0].ip,'1.2.3.4');
  const admin=await api(`/admin/evidence?stream=admin&from=${today}&to=${today}`);
  assert.deepEqual(admin.data.events.map(e=>e.type).sort(),['admin-evidence-search','admin-weather']);
  assert.equal((await api(`/admin/evidence?stream=players&from=2026-01-01&to=${today}`)).status,400,'ranges over 31 days are refused');
 }finally{await host.close();await rm(directory,{recursive:true,force:true});}
});

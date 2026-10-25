import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';
import {WorldReset,RESET_PHRASE} from '../server/world-reset.js';
import {LocalResetStore,FirebaseResetStore,resetTarget,resetSummary} from '../server/world-reset-store.js';
import {LocalStore,FirebaseStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {createRealmStore} from '../realm-store.js';
import {initialSave} from '../realm-state.js';

const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const row=()=>({serverId:'server-1',revision:1,character:{name:'Reset Tester',gender:'male',classId:'novice',jobId:''},state:initialSave()});
const wait=async check=>{for(let i=0;i<200;i++){const result=await check();if(result)return result;await new Promise(r=>setTimeout(r,20));}assert.fail('Timed out');};
async function local(){await mkdir('outputs',{recursive:true});const directory=await mkdtemp(path.resolve('outputs/reset166-'));return new LocalStore(directory).init();}
const confirm=p=>({challenge:p.challenge,confirmation:RESET_PHRASE,acknowledge:true});
function memoryRepo(){return {job:null,docs:[{path:'players/a/characters/slot-1',data:row()}],backups:new Map(),async state(){return this.job;},async mark(j){this.job=structuredClone(j);},async inventory(){return structuredClone(this.docs);},async archive(j,ds){for(const d of ds)if(!this.backups.has(d.path))this.backups.set(d.path,d.data);return this.backups.size;},async remove(){this.docs=[];}};}
const control=repo=>new WorldReset({repository:repo,quiesce:async()=>{},finish:async()=>{},log:()=>{}});

test('reset scope targets both realms and orphan slots, never auth/config/backup/authority documents',()=>{
 for(const p of ['players/a/characters/slot-5','multiplayerProfiles/a/characters/slot-1','players/b/saves/main','players/b/saves/server-2','multiplayerGuilds/g','multiplayerShops/s','multiplayerLeases/a','multiplayerRuntime/mailAnnouncements','multiplayerRuntime/mapBossTimers','multiplayerRuntime/dashboardLogs'])assert.equal(resetTarget(p),true,p);
 for(const p of ['players/a','players/a/preferences/p','other/a/characters/slot-1','players/a/characters/slot-6','multiplayerRuntime/authority','multiplayerRuntime/worldReset','multiplayerResetBackups/id','settings/balance','users/a','multiplayerGuilds/g/members/a'])assert.equal(resetTarget(p),false,p);
 assert.deepEqual(resetSummary([{path:'players/a/characters/slot-1'},{path:'multiplayerProfiles/a/characters/slot-1'},{path:'players/a/saves/server-1'},{path:'players/b/characters/slot-5'}]),{accounts:2,characters:2,documents:4});
});
test('preview is read-only; exact phrase, checkbox, expiry and actor are enforced; replay cannot wipe twice',async()=>{
 const repo=memoryRepo(),c=await control(repo).init();let now=100;c.now=()=>now;const p=await c.preview('owner');assert.equal(repo.job,null);assert.equal(repo.backups.size,0);assert.equal(repo.docs.length,1);
 assert.throws(()=>c.execute('other',confirm(p)),/challenge/);
 assert.throws(()=>c.execute('owner',{...confirm(p),confirmation:'reset cbt'}),/confirmation/);
 assert.throws(()=>c.execute('owner',{...confirm(p),acknowledge:false}),/confirmation/);
 now=p.expiresAt;assert.throws(()=>c.execute('owner',confirm(p)),/challenge/);now++;
 const fresh=await c.preview('owner');c.execute('owner',confirm(fresh));assert.equal(c.maintenance,true);assert.throws(()=>c.execute('owner',confirm(fresh)),/challenge/);await c.running;
 assert.equal(c.job.status,'completed');assert.equal(c.maintenance,false);assert.equal(repo.docs.length,0);assert.equal(repo.backups.size,1);
});
test('a backup failure performs zero deletes and keeps maintenance durable across restart',async()=>{
 const repo=memoryRepo();let removed=0;repo.archive=async()=>{throw Error('backup-unavailable');};repo.remove=async()=>{removed++;};
 const c=await control(repo).init();c.execute('owner',confirm(await c.preview('owner')));await c.running;
 assert.equal(removed,0);assert.equal(c.job.status,'failed');assert.equal(repo.docs.length,1);
 const restarted=await control(repo).init();assert.equal(restarted.maintenance,true);assert.equal((await restarted.preview('owner')).resume,true);
});
test('partial reset resumes the same private backup without replacing original source data',async()=>{
 const repo=memoryRepo();repo.docs.push({path:'players/b/characters/slot-2',data:row()});let first=true;
 repo.remove=async function(){if(first){first=false;this.docs.shift();throw Error('temporary-failure');}this.docs=[];};
 let c=await control(repo).init();c.execute('owner',confirm(await c.preview('owner')));await c.running;const id=c.job.id;
 assert.equal(c.job.status,'failed');assert.equal(repo.backups.size,2);repo.docs[0].data.revision=99;
 c=await control(repo).init();const p=await c.preview('owner');assert.equal(p.backupId,id);c.execute('owner',confirm(p));await c.running;
 assert.equal(c.job.status,'completed');assert.equal(c.job.id,id);assert.equal(repo.backups.get('players/b/characters/slot-2').revision,1);
});
test('failure to drain active writes cannot reach archive or deletion',async()=>{
 const repo=memoryRepo(),c=await control(repo).init();c.quiesce=async()=>{throw Error('reset-save-failed');};c.execute('owner',confirm(await c.preview('owner')));await c.running;
 assert.equal(repo.backups.size,0);assert.equal(repo.docs.length,1);assert.equal(c.maintenance,true);
});
test('local reset archives all profiles and shared files; stale token/lease cannot restore a deleted character',async()=>{
 const store=await local(),a=await store.createLocal({name:'Reset One'});await store.createLocal({name:'Reset Two'});
 const session=await store.acquire({uid:a.uid,slotId:'slot-1',serverId:'server-1'},'lease');
 const files={'guilds.json':[{}],'shops.json':[{}],'leaders.json':{'server-1':[]},'prices.json':{'server-2':{}},'mail-announcements.json':[{}],'map-bosses.json':[{}],'dashboard-logs.json':[{}]};
 for(const [name,data] of Object.entries(files))await writeFile(path.join(store.directory,name),JSON.stringify(data));
 const repo=new LocalResetStore(store),c=await control(repo).init();c.execute('local',confirm(await c.preview('local')));await c.running;
 assert.equal(c.job.status,'completed');assert.equal(store.rows.size,0);assert.equal(store.leases.size,0);assert.equal(store.verifyLocal(a.token),undefined);
 const backup=JSON.parse(await readFile(path.join(store.directory,'reset-backups',c.job.id+'.json')));assert.equal(Object.keys(backup.documents).length,9);
 for(const name of Object.keys(files))assert.equal(Object.keys(JSON.parse(await readFile(path.join(store.directory,name)))).length,0);
 await assert.rejects(store.checkpoint(session,session.record),/session-lost/);assert.equal((await new LocalStore(store.directory).init()).rows.size,0);
});

// Admin SDK transaction harness, with strict read-before-write and atomic commits.
function database(){
 const docs=new Map(),deleted=[];let queue=Promise.resolve();
 const snap=p=>({id:p.split('/').at(-1),ref:ref(p),exists:docs.has(p),data:()=>structuredClone(docs.get(p))});
 function ref(p){return {path:p,id:p.split('/').at(-1),collection:c=>collection(p+'/'+c),get:async()=>snap(p),set:async d=>docs.set(p,structuredClone(d)),delete:async()=>docs.delete(p)};}
 const query=select=>({get:async()=>({docs:[...docs.keys()].filter(select).map(snap)}),limit:()=>{throw Error('reset-must-not-limit');}});
 const collection=p=>({...query(k=>k.startsWith(p+'/')&&k.split('/').length===p.split('/').length+1),doc:id=>ref(p+'/'+id)});
 return {docs,deleted,doc:ref,collection,collectionGroup:c=>query(k=>k.split('/').at(-2)===c),runTransaction(fn){const job=queue.then(async()=>{let written=false;const writes=[];const tx={get:async r=>{assert.equal(written,false,'Firestore reads precede writes');return snap(r.path);},set:(r,d)=>{written=true;writes.push(()=>docs.set(r.path,structuredClone(d)));},update:(r,d)=>{written=true;writes.push(()=>docs.set(r.path,{...docs.get(r.path),...structuredClone(d)}));},delete:r=>{written=true;writes.push(()=>{deleted.push(r.path);docs.delete(r.path);});}};const result=await fn(tx);writes.forEach(f=>f());return result;});queue=job.catch(()=>{});return job;}};
}
test('Firebase reset scans over 2,000 profiles, backs up every target, deletes migration sources first and preserves unrelated data',async()=>{
 const db=database(),store=new FirebaseStore(db);await store.renewAuthority();
 for(let i=0;i<2101;i++)db.docs.set('multiplayerProfiles/u'+i+'/characters/slot-5',{record:row()});
 db.docs.set('players/old/saves/server-2',row());db.docs.set('players/old/characters/slot-2',row());db.docs.set('multiplayerRuntime/mapBossTimers',{rows:[{id:'boss'}]});
 for(const p of ['players/account','settings/balance','other/u/characters/slot-1','multiplayerResetBackups/older'])db.docs.set(p,{retain:true});
 const repo=new FirebaseResetStore(store),docs=await repo.inventory(),job={id:randomUUID(),status:'preparing',startedAt:1};
 assert.equal(docs.length,2104);assert.equal(docs[0].path,'players/old/saves/server-2');
 await assert.rejects(repo.remove(job,docs),/backup-missing/);assert.equal(db.deleted.length,0);
 assert.equal(await repo.archive(job,docs),2104);await repo.remove(job,docs);assert.equal((await repo.inventory()).length,0);assert.equal(db.deleted[0],'players/old/saves/server-2');
 for(const p of ['players/account','settings/balance','other/u/characters/slot-1','multiplayerResetBackups/older','multiplayerRuntime/authority'])assert.equal(db.docs.has(p),true,p);
});
test('Firebase backup/delete operations require current world authority on every transaction',async()=>{
 const db=database(),store=new FirebaseStore(db);await store.renewAuthority();db.docs.set('players/a/characters/slot-1',row());
 const repo=new FirebaseResetStore(store),docs=await repo.inventory(),job={id:randomUUID(),status:'preparing',startedAt:1};await repo.archive(job,docs);await store.releaseAuthority();
 await assert.rejects(repo.remove(job,docs),/authority-lost/);await assert.rejects(repo.mark(job),/authority-lost/);assert.equal(db.docs.has(docs[0].path),true);
});
test('Firebase character leases held before reset cannot recreate private data or overwrite a fresh character',async()=>{
 const db=database(),store=new FirebaseStore(db);await store.renewAuthority();const identity={uid:'alice',slotId:'slot-1',serverId:'server-1'};
 db.docs.set('players/alice/characters/slot-1',row());const stale=await store.acquire(identity,'old-lease');stale.record.bag={coins:999999,items:{}};
 const repo=new FirebaseResetStore(store),c=await control(repo).init();c.execute('owner',confirm(await c.preview('owner')));await c.running;
 await assert.rejects(store.checkpoint(stale,stale.record),/session-lost/);assert.equal((await repo.inventory()).length,0);
 db.docs.set('players/alice/characters/slot-1',row());const fresh=await store.acquire(identity,'new-lease');
 await assert.rejects(store.checkpoint(stale,stale.record),/session-lost/);assert.equal(fresh.record.bag,undefined);assert.equal(fresh.record.state.traveler.baseXp,0);
});
test('lobby cannot migrate an erased old save or autosave a stale character; fresh creation remains possible',async()=>{
 const db=database(),store=new FirebaseStore(db);await store.renewAuthority();const original=row();db.docs.set('players/alice/saves/server-1',original);db.docs.set('players/alice/characters/slot-1',original);
 const connection={auth:{currentUser:{uid:'alice'}},db,sdk:{doc:(_, ...parts)=>db.doc(parts.join('/')),serverTimestamp:()=>1,runTransaction:(_,fn)=>db.runTransaction(tx=>fn({get:async r=>{const s=await tx.get(r);return {exists:()=>s.exists,data:s.data};},set:tx.set}))}};
 const lobby=createRealmStore({catalog,connection,owner:'alice'}),old=await lobby.load('server-1','slot-1'),repo=new FirebaseResetStore(store),c=await control(repo).init();
 c.execute('owner',confirm(await c.preview('owner')));await c.running;assert.equal(c.job.status,'completed');assert.deepEqual(await lobby.list(),[]);await assert.rejects(lobby.save('server-1',old,old.state),/character-scope/);
 const fresh=await lobby.create('server-2',{name:'New Player',gender:'female'});assert.equal(fresh.character.classId,'novice');assert.equal(fresh.state.traveler.baseXp,0);assert.equal(fresh.revision,1);
});

const origin='http://127.0.0.1:8871';
async function hosted(store,options={}){const host=await createHost({mode:'local',store,catalog,origins:[origin],...options});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));return {host,url:'http://127.0.0.1:'+host.server.address().port};}
const api=async(url,p,body,headers={})=>{const r=await fetch(url+p,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json()};};
test('a restarted host keeps an interrupted reset locked and requires a fresh owner confirmation to resume',async()=>{
 const store=await local();await store.createLocal({name:'Pending Reset'});const repo=new LocalResetStore(store),id=randomUUID();
 await repo.mark({id,status:'failed',phase:'backup',actor:'local',startedAt:1,updatedAt:2,deleted:0,backedUp:0,summary:null,error:'interrupted'});
 const {host,url}=await hosted(store);
 try{
  assert.equal((await api(url,'/game-status')).data.maintenance,true);assert.equal((await api(url,'/dev/session',{name:'Blocked'})).status,503);assert.equal(store.rows.size,1);
  const p=(await api(url,'/admin/world-reset/preview',{})).data;assert.equal(p.resume,true);assert.equal(p.backupId,id);assert.equal(store.rows.size,1);
  assert.equal((await api(url,'/admin/world-reset/execute',confirm(p))).status,202);
  await wait(async()=>(await api(url,'/admin/world-reset')).data.job?.status==='completed');assert.equal(store.rows.size,0);
 }finally{await host.close();}
});
test('real local HTTP reset disconnects connected players, blocks new mutations, clears memory and survives host restart',async()=>{
 const store=await local(),a=await store.createLocal({name:'Online Reset'}),{host,url}=await hosted(store);const messages=[];let socket;
 try{
  socket=new WebSocket(url.replace('http:','ws:')+'/realtime',{origin});socket.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j);});socket.send(JSON.stringify({type:'join',token:a.token,serverId:'server-1',slotId:'slot-1'}));await wait(()=>messages.some(m=>m.type==='welcome'));
  host.realm.peers.values().next().value.bag.coins=4567;
  const p=await api(url,'/admin/world-reset/preview',{});assert.equal(p.data.online,1);assert.equal(store.rows.size,1);
  assert.equal((await api(url,'/admin/world-reset/execute',{...confirm(p.data),acknowledge:false})).status,400);
  let release;const gate=new Promise(r=>{release=r;}),checkpoint=store.checkpoint.bind(store);store.checkpoint=async(...args)=>{await gate;return checkpoint(...args);};
  const result=await api(url,'/admin/world-reset/execute',confirm(p.data));assert.equal(result.status,202);assert.equal((await api(url,'/game-status')).data.maintenance,true);
  assert.equal((await api(url,'/dev/session',{name:'Blocked Player'})).status,503);assert.equal((await api(url,'/admin/weather',{weather:'clear'})).status,503);
  release();await wait(()=>messages.some(m=>m.code==='world-reset'));const done=await wait(async()=>{const s=(await api(url,'/admin/world-reset')).data;return s.job?.status==='completed'&&s;});
  assert.equal(done.maintenance,false);assert.equal(store.rows.size,0);for(const key of ['peers','rooms','guilds','shops','leaders','prices'])assert.equal(host.realm[key].size,0,key);
  const backup=JSON.parse(await readFile(path.join(store.directory,'reset-backups',done.job.id+'.json')));assert.equal(backup.documents['localProfiles/'+a.uid].bag.coins,4567);
 }finally{socket?.terminate();await host.close();}
 const restarted=await hosted(await new LocalStore(store.directory).init());try{assert.equal((await api(restarted.url,'/game-status')).data.maintenance,false);assert.equal(restarted.host.realm.peers.size,0);}finally{await restarted.host.close();}
});
test('reset HTTP endpoints reject bad origins, bad tokens, unverified admins and non-owner admins',async()=>{
 const previous=process.env.ADMIN_EMAILS;process.env.ADMIN_EMAILS='helper@example.com';const db=database(),store=new FirebaseStore(db);
 const {host,url}=await hosted(store,{mode:'firebase',authenticate:async token=>{if(token==='bad')throw Error('bad');return {uid:token,email:token==='owner'?'chokkungfn@gmail.com':token==='unverified'?'chokkungfn@gmail.com':'helper@example.com',email_verified:token!=='unverified'};}});
 try{
  for(const [token,code] of [['bad',401],['helper',403],['unverified',403]])assert.equal((await api(url,'/admin/world-reset/preview',{}, {Authorization:'Bearer '+token})).status,code);
  assert.equal((await api(url,'/admin/world-reset/preview',{}, {Authorization:'Bearer owner',Origin:'https://evil.invalid'})).status,403);
  assert.equal((await api(url,'/admin/world-reset/preview',{}, {Authorization:'Bearer owner'})).status,200);
  assert.equal(db.docs.has('multiplayerRuntime/worldReset'),false,'preview did not create a reset');
 }finally{await host.close();if(previous===undefined)delete process.env.ADMIN_EMAILS;else process.env.ADMIN_EMAILS=previous;}
});
test('a standby host reloads completed reset state and cannot revive its pre-reset guilds or rankings',async()=>{
 const db=database(),old=new FirebaseStore(db);await old.renewAuthority();const id=randomUUID();
 db.docs.set('multiplayerRuntime/worldReset',{id,status:'running',phase:'deleting',actor:'owner',deleted:0,backedUp:2});
 db.docs.set('multiplayerGuilds/g',{id:'g',serverId:'server-1',members:[]});db.docs.set('multiplayerLeaders/server-1',{rows:{old:100}});
 const store=new FirebaseStore(db),{host,url}=await hosted(store,{mode:'firebase',authenticate:async()=>({email:'chokkungfn@gmail.com',email_verified:true})});
 try{
  assert.equal(host.realm.guilds.size,1);assert.equal((await api(url,'/game-status')).data.maintenance,true);
  db.docs.delete('multiplayerGuilds/g');db.docs.delete('multiplayerLeaders/server-1');db.docs.set('multiplayerRuntime/worldReset',{id,status:'completed',phase:'completed',completedAt:Date.now()});await old.releaseAuthority();
  for(let i=0;i<120;i++){if((await api(url,'/health')).data.authority)break;await new Promise(r=>setTimeout(r,50));}
  assert.equal((await api(url,'/health')).data.authority,true);assert.equal((await api(url,'/game-status')).data.maintenance,false);assert.equal(host.realm.guilds.size,0);assert.equal(host.realm.leaders.size,0);
 }finally{await host.close();}
});

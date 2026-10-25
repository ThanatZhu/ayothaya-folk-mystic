import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const RUNTIME=['mailAnnouncements','mapBossTimers','dashboardLogs'];
const SHARED=['multiplayerGuilds','multiplayerShops','multiplayerLeaders','multiplayerPrices','multiplayerLeases'];
const LOCAL_FILES={'guilds.json':[],'shops.json':[],'leaders.json':{},'prices.json':{},'mail-announcements.json':[],'map-bosses.json':[],'dashboard-logs.json':[]};
const active=s=>s&&s.status!=='completed';
const jobId=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('reset-id');return id;};
export const resetTarget=p=>/^(multiplayerProfiles|players)\/[^/]+\/characters\/slot-[1-5]$/.test(p)||/^players\/[^/]+\/saves\/(server-[12]|main)$/.test(p)||SHARED.some(c=>new RegExp('^'+c+'/[^/]+$').test(p))||RUNTIME.some(id=>p==='multiplayerRuntime/'+id);
const hash=p=>createHash('sha256').update(p).digest('hex');
// Remove migration sources first: a lobby transaction must never import an old save into an erased slot.
const order=p=>p.includes('/saves/')?0:p.startsWith('players/')?1:p.startsWith('multiplayerProfiles/')?2:3;
const copy=x=>structuredClone(x);
async function json(file,fallback){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function atomic(file,value){await writeFile(file+'.tmp',JSON.stringify(value),{mode:0o600});await rename(file+'.tmp',file);}

export function resetSummary(docs){
 const accounts=new Set(),characters=new Set();
 for(const d of docs){const p=d.path.split('/');if(p[0]==='localProfiles'){accounts.add(p[1]);characters.add(p[1]+'/slot-1');}
  else if(['multiplayerProfiles','players'].includes(p[0])){accounts.add(p[1]);if(p[2]==='characters')characters.add(p[1]+'/'+p[3]);else if(p[2]==='saves')characters.add(p[1]+'/'+(p[3]==='server-1'?'slot-1':p[3]==='server-2'?'slot-2':'legacy-main'));}}
 return {accounts:accounts.size,characters:characters.size,documents:docs.length};
}

export class LocalResetStore{
 constructor(store){this.store=store;this.stateFile=path.join(store.directory,'world-reset.json');}
 state(){return json(this.stateFile,null);}
 async mark(job){await atomic(this.stateFile,job);return job;}
 async inventory(){
  await this.store.queue;const docs=[...this.store.rows].map(([uid,data])=>({path:'localProfiles/'+uid,data:copy(data)}));
  for(const name of Object.keys(LOCAL_FILES)){const data=await json(path.join(this.store.directory,name),null);if(data&&Object.keys(data).length)docs.push({path:'localRuntime/'+name,data});}
  return docs;
 }
 async archive(job,docs){
  const folder=path.join(this.store.directory,'reset-backups');await mkdir(folder,{recursive:true});
  const file=path.join(folder,jobId(job.id)+'.json'),backup=await json(file,{id:job.id,createdAt:job.startedAt,documents:{}});
  for(const d of docs)if(!(d.path in backup.documents))backup.documents[d.path]=d.data;
  await atomic(file,backup);return Object.keys(backup.documents).length;
 }
 async remove(job,docs){
  const backup=await json(path.join(this.store.directory,'reset-backups',jobId(job.id)+'.json'),null);
  if(!backup||docs.some(d=>!(d.path in backup.documents)))throw Error('reset-backup-missing');
  for(const d of docs){const [type,id]=d.path.split('/');if(type==='localProfiles')this.store.rows.delete(id);else if(type==='localRuntime'&&id in LOCAL_FILES)await atomic(path.join(this.store.directory,id),LOCAL_FILES[id]);else throw Error('reset-target');}
  this.store.leases.clear();await this.store.flush();
 }
}

export class FirebaseResetStore{
 constructor(store){this.store=store;this.db=store.db;this.control=this.db.collection('multiplayerRuntime').doc('worldReset');}
 async state(){const s=await this.control.get();return s.exists?s.data():null;}
 async mark(job){return this.db.runTransaction(async tx=>{await this.store.checkAuthority(tx);tx.set(this.control,job);tx.set(this.db.collection('multiplayerResetBackups').doc(jobId(job.id)),job);return job;});}
 async inventory(){
  const groups=await Promise.all(['characters','saves'].map(c=>this.db.collectionGroup(c).get()));
  const shared=await Promise.all(SHARED.map(c=>this.db.collection(c).get()));
  const runtime=await Promise.all(RUNTIME.map(id=>this.db.collection('multiplayerRuntime').doc(id).get()));
  const docs=[...groups.flatMap(s=>s.docs),...shared.flatMap(s=>s.docs),...runtime.filter(s=>s.exists)];
  return docs.filter(d=>resetTarget(d.ref.path)).map(d=>({path:d.ref.path,data:d.data()})).sort((a,b)=>order(a.path)-order(b.path));
 }
 refs(job,docs){return docs.map(d=>this.db.collection('multiplayerResetBackups').doc(jobId(job.id)).collection('documents').doc(hash(d.path)));}
 async archive(job,docs){
  for(let i=0;i<docs.length;i+=50){const chunk=docs.slice(i,i+50);if(chunk.some(d=>!resetTarget(d.path)))throw Error('reset-target');
   await this.db.runTransaction(async tx=>{await this.store.checkAuthority(tx);const refs=this.refs(job,chunk),old=await Promise.all(refs.map(r=>tx.get(r)));
    for(let n=0;n<chunk.length;n++)if(!old[n].exists)tx.set(refs[n],{path:chunk[n].path,data:chunk[n].data});
   });
  }
  return (await this.db.collection('multiplayerResetBackups').doc(job.id).collection('documents').get()).docs.length;
 }
 async remove(job,docs){
  for(let i=0;i<docs.length;i+=50){const chunk=docs.slice(i,i+50);if(chunk.some(d=>!resetTarget(d.path)))throw Error('reset-target');
   await this.db.runTransaction(async tx=>{await this.store.checkAuthority(tx);const backup=await Promise.all(this.refs(job,chunk).map(r=>tx.get(r)));
    if(backup.some((s,n)=>!s.exists||s.data().path!==chunk[n].path))throw Error('reset-backup-missing');
    for(const d of chunk)tx.delete(this.db.doc(d.path));
   });
  }
 }
}
export function createResetStore(store){return typeof store?.db?.collectionGroup==='function'?new FirebaseResetStore(store):store?.rows instanceof Map&&store.directory?new LocalResetStore(store):null;}
export const resetPending=active;

import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {character,initialSave} from '../realm-state.js';
import {validateCharacterChange} from '../realm-store.js';
const copy=v=>structuredClone(v),ttl=30000;
// Local mode never accepts Firebase users and is bound to loopback by the host.
export class LocalStore{
 constructor(directory){this.directory=directory;this.rows=new Map();this.leases=new Map();this.queue=Promise.resolve();}
 async init(){await mkdir(this.directory,{recursive:true});try{this.rows=new Map(JSON.parse(await readFile(path.join(this.directory,'profiles.json'),'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}return this;}
 async createLocal({name,gender='male'}){const uid='dev-'+randomUUID(),token=randomUUID()+randomUUID(),record={serverId:'server-1',slotId:'slot-1',revision:1,character:character({name,gender,classId:'novice'}),state:initialSave(),localTokenHash:createHash('sha256').update(token).digest('hex')};this.rows.set(uid,record);await this.flush();return {uid,token,record:copy(record)};}
 verifyLocal(token){const hash=createHash('sha256').update(token).digest('hex');return [...this.rows].find(([,v])=>v.localTokenHash===hash)?.[0];}
 async acquire(identity,leaseId){
  const row=this.rows.get(identity.uid);if(!row||identity.slotId!=='slot-1')throw new Error('character-not-found');
  const lock=this.leases.get(identity.uid);if(lock&&lock.expires>Date.now())throw new Error('already-online');
  if(row.serverId!==identity.serverId)throw new Error('character-server');
  this.leases.set(identity.uid,{id:leaseId,expires:Date.now()+ttl});return {identity,leaseId,record:copy(row)};
 }
 async checkpoint(session,record,{release=false}={}){
  const lock=this.leases.get(session.identity.uid);if(!lock||lock.id!==session.leaseId||lock.expires<Date.now())throw new Error('session-lost');
  this.rows.set(session.identity.uid,copy({...record,revision:(this.rows.get(session.identity.uid)?.revision??0)+1}));
  if(release)this.leases.delete(session.identity.uid);else lock.expires=Date.now()+ttl;
  await this.flush();
 }
 flush(){const data=JSON.stringify([...this.rows]);this.queue=this.queue.catch(()=>{}).then(async()=>{const file=path.join(this.directory,'profiles.json'),tmp=file+'.tmp';await writeFile(tmp,data,{mode:0o600});await rename(tmp,file);});return this.queue;}
}
export class FirebaseStore{
 constructor(db){this.db=db;this.authorityId=randomUUID();this.authorityRef=db.collection('multiplayerRuntime').doc('authority');this.authorityUntil=0;}
 async renewAuthority(){
  const until=await this.db.runTransaction(async tx=>{const snap=await tx.get(this.authorityRef),now=Date.now();
   if(snap.exists&&snap.data().id!==this.authorityId&&snap.data().expires>now)throw new Error('another-authority-active');
   tx.set(this.authorityRef,{id:this.authorityId,expires:now+30000});return now+25000;
  });this.authorityUntil=until;
 }
 async checkAuthority(tx){const snap=await tx.get(this.authorityRef);if(!snap.exists||snap.data().id!==this.authorityId||snap.data().expires<Date.now())throw new Error('authority-lost');}
 async releaseAuthority(){await this.db.runTransaction(async tx=>{const s=await tx.get(this.authorityRef);if(s.exists&&s.data().id===this.authorityId)tx.delete(this.authorityRef);});this.authorityUntil=0;}
 refs(identity){const root=this.db.collection('multiplayerProfiles').doc(identity.uid);return {profile:root.collection('characters').doc(identity.slotId),lease:this.db.collection('multiplayerLeases').doc(identity.uid),legacy:this.db.collection('players').doc(identity.uid).collection('characters').doc(identity.slotId)};}
 async acquire(identity,leaseId){
  const refs=this.refs(identity);return this.db.runTransaction(async tx=>{
   await this.checkAuthority(tx);
   const [online,legacy,lease]=await Promise.all([tx.get(refs.profile),tx.get(refs.legacy),tx.get(refs.lease)]);
   if(lease.exists&&lease.data().expires>Date.now())throw new Error('already-online');
   if(!legacy.exists)throw new Error('character-not-found');
   const record=online.exists?online.data().record:legacy.data();
   if(record.serverId!==identity.serverId||legacy.data().serverId!==identity.serverId)throw new Error('character-server');
   character(record.character); // Legacy XP is imported once; later joins use the private server profile.
   if(online.exists){const next=character(legacy.data().character);validateCharacterChange(record.character,next,record.state);
    if(next.classId!==record.character.classId||next.jobId!==record.character.jobId)record.state.traveler.jobXp=0;record.character=next;}
   tx.set(refs.lease,{leaseId,expires:Date.now()+ttl,slotId:identity.slotId});
   if(!online.exists)tx.set(refs.profile,{record,updatedAt:Date.now()});
   return {identity,leaseId,refs,record:copy(record),mirrorRevision:legacy.data().revision};
  });
 }
 async checkpoint(session,record,{release=false}={}){
  const revision=await this.db.runTransaction(async tx=>{
   await this.checkAuthority(tx);
   const [lease,legacy]=await Promise.all([tx.get(session.refs.lease),tx.get(session.refs.legacy)]);
   if(!lease.exists||lease.data().leaseId!==session.leaseId||lease.data().expires<Date.now())throw new Error('session-lost');
   if(!legacy.exists||legacy.data().revision!==session.mirrorRevision)throw new Error('save-conflict');
   const next={...copy(record),revision:session.mirrorRevision+1};delete next.slotId;
   // Skill levels stay in the private profile; the client-readable mirror keeps its rule-checked shape.
   const mirror={...next};delete mirror.skills;
   tx.set(session.refs.profile,{record:next,updatedAt:Date.now()});tx.set(session.refs.legacy,{...mirror,updatedAt:new Date()});
   if(release)tx.delete(session.refs.lease);else tx.update(session.refs.lease,{expires:Date.now()+ttl});return next.revision;
  });session.mirrorRevision=revision;
 }
}

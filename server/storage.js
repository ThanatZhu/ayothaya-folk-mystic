import {deliverMail} from '../mailbox.js';
import {readFile,writeFile,mkdir,rename,rm,appendFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {character,initialSave} from '../realm-state.js';
import {validateCharacterChange} from '../realm-store.js';
export const MIRROR_CUTOFF=Date.parse('2026-10-26T00:00:00+07:00');
// Firestore Spark allows 20k writes/day. 0.41.1 budget: world authority renews every 40 s (~90 writes/h) and a
// player saves only when changed, at most once a minute (lease kept alive at least every 100 s).
// Firestore Spark allows 20k writes a day: every save is 3 writes, so players save every 150-240 s (things that must not
// be lost - trades, sales, quest steps, leaving - still save at once) and the authority lease renews once a minute.
export const AUTHORITY_TTL=120000,AUTHORITY_RENEW=60000,SAVE_MIN_GAP=150000,SAVE_MAX_GAP=240000;
const copy=v=>structuredClone(v),ttl=300000; // a player's lease outlives the longest save gap
// 0.116 back-office finance: one revisioned document (a save names the revision it started from) plus one row per slip.
const staleFinance=current=>Object.assign(new Error('finance-stale'),{current});
// Local mode never accepts Firebase users and is bound to loopback by the host.
export class LocalStore{
 constructor(directory){this.directory=directory;this.rows=new Map();this.leases=new Map();this.queue=Promise.resolve();}
 async init(){await mkdir(this.directory,{recursive:true});try{this.rows=new Map(JSON.parse(await readFile(path.join(this.directory,'profiles.json'),'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}return this;}
 async createLocal({name,gender='male'}){const uid='dev-'+randomUUID(),token=randomUUID()+randomUUID(),record={serverId:'server-1',slotId:'slot-1',revision:1,character:character({name,gender,classId:'novice'}),state:initialSave(),localTokenHash:createHash('sha256').update(token).digest('hex')};this.rows.set(uid,record);await this.flush();return {uid,token,record:copy(record)};}
 verifyLocal(token){const hash=createHash('sha256').update(token).digest('hex');return [...this.rows].find(([,v])=>v.localTokenHash===hash)?.[0];}
 async acquire(identity,leaseId,{takeover=false}={}){
  const row=this.rows.get(identity.uid);if(!row||identity.slotId!=='slot-1')throw new Error('character-not-found');
  const lock=this.leases.get(identity.uid);if(!takeover&&lock&&lock.expires>Date.now())throw new Error('already-online');
  if(row.serverId!==identity.serverId)throw new Error('character-server');
  this.leases.set(identity.uid,{id:leaseId,expires:Date.now()+ttl});return {identity,leaseId,record:copy(row)};
 }
 async loadMailAnnouncements(){try{return JSON.parse(await readFile(path.join(this.directory,'mail-announcements.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 saveMailAnnouncement(mail){const job=(this.mailQueue??Promise.resolve()).catch(()=>{}).then(async()=>{const rows=await this.loadMailAnnouncements(),r=deliverMail({messages:rows},mail);const file=path.join(this.directory,'mail-announcements.json');await writeFile(file+'.tmp',JSON.stringify(r.mailbox.messages),{mode:0o600});await rename(file+'.tmp',file);return r;});this.mailQueue=job;return job;}
 async loadDashboardLogs(){try{return JSON.parse(await readFile(path.join(this.directory,'dashboard-logs.json'),'utf8'));}catch{return [];}}
 async loadMapBosses(){try{return JSON.parse(await readFile(path.join(this.directory,'map-bosses.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 saveMapBosses(rows){const data=JSON.stringify(rows);this.bossQueue=(this.bossQueue??Promise.resolve()).catch(()=>{}).then(async()=>{const file=path.join(this.directory,'map-bosses.json'),tmp=file+'.tmp';await writeFile(tmp,data,{mode:0o600});await rename(tmp,file);});return this.bossQueue;}
 async saveDashboardLogs(logs){try{const recent=Array.isArray(logs)?logs.slice(-200):[];await writeFile(path.join(this.directory,'dashboard-logs.json'),JSON.stringify(recent),{mode:0o600});}catch{}}
 async checkpoint(session,record,{release=false}={}){
  const lock=this.leases.get(session.identity.uid);if(!lock||lock.id!==session.leaseId||lock.expires<Date.now())throw new Error('session-lost');
  this.rows.set(session.identity.uid,copy({...record,revision:(this.rows.get(session.identity.uid)?.revision??0)+1,savedAt:Date.now()}));
  if(release)this.leases.delete(session.identity.uid);else lock.expires=Date.now()+ttl;
  await this.flush();
 }
 // 0.103 back office: every saved character, and a gift written into one that is not in a game right now.
 async listProfiles(){return [...this.rows].map(([uid,r])=>({uid,slotId:'slot-1',record:copy(r),savedAt:r.savedAt??null}));}
 async classRewardPage({after=null,limit=100}={}){const rows=(await this.listProfiles()).sort((a,b)=>a.uid.localeCompare(b.uid)).filter(r=>after===null||r.uid.localeCompare(after)>0),page=rows.slice(0,limit);return {rows:page,after:page.at(-1)?.uid??after,done:rows.length<=limit};}
 async loadClassRewardState(){try{return JSON.parse(await readFile(path.join(this.directory,'class-reward192.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 saveClassRewardState(state){const data=JSON.stringify(state);this.rewardQueue=(this.rewardQueue??Promise.resolve()).catch(()=>{}).then(async()=>{const file=path.join(this.directory,'class-reward192.json');await writeFile(file+'.tmp',data,{mode:0o600});await rename(file+'.tmp',file);});return this.rewardQueue;}
 async deleteCharacter(identity){
  const row=this.rows.get(identity.uid);if(!row||identity.slotId!=='slot-1')throw new Error('character-not-found');
  const lock=this.leases.get(identity.uid);if(lock&&lock.expires>Date.now())throw new Error('player-online');
  this.rows.delete(identity.uid);await this.flush();
 }
 async giveOffline(identity,apply){
  const row=this.rows.get(identity.uid);if(!row||identity.slotId!=='slot-1')throw new Error('character-not-found');
  const lock=this.leases.get(identity.uid);if(lock&&lock.expires>Date.now())throw new Error('player-online');
  const next=apply(copy(row));this.rows.set(identity.uid,{...next,revision:(row.revision??0)+1,savedAt:row.savedAt});await this.flush();return copy(next);
 }
 // 0.47 guilds live beside the profiles; the realm keeps them in memory and calls these on change.
 async loadGuilds(){try{return JSON.parse(await readFile(path.join(this.directory,'guilds.json'),'utf8'));}catch{return [];}}
 saveGuild(){return this.flushGuilds();}
 // 0.70 market shops and reference prices (one file each, rewritten on change like guilds).
 async loadShops(){try{return JSON.parse(await readFile(path.join(this.directory,'shops.json'),'utf8'));}catch{return [];}}
 saveShop(){const data=JSON.stringify([...(this.realmShops?.values()??[])]),file=path.join(this.directory,'shops.json');this.queue=this.queue.catch(()=>{}).then(async()=>{await writeFile(file+'.tmp',data,{mode:0o600});await rename(file+'.tmp',file);});return this.queue;}
 deleteShop(){return this.saveShop();}
 async loadLeaders(){try{return JSON.parse(await readFile(path.join(this.directory,'leaders.json'),'utf8'));}catch{return {};}}
 saveLeaders(serverId,rows){this.allLeaders={...(this.allLeaders??{}),[serverId]:rows};return writeFile(path.join(this.directory,'leaders.json'),JSON.stringify(this.allLeaders),{mode:0o600});}
 async loadFinance(){try{return JSON.parse(await readFile(path.join(this.directory,'finance.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 saveFinance(doc,baseRev,by){const job=(this.financeQueue??Promise.resolve()).catch(()=>{}).then(async()=>{const cur=await this.loadFinance();if((cur?.rev??0)!==baseRev)throw staleFinance(cur);const next={...doc,rev:(cur?.rev??0)+1,updatedAt:Date.now(),by};await writeFile(path.join(this.directory,'finance.json'),JSON.stringify(next));return next;});this.financeQueue=job;return job;}
 slipPath(id){return path.join(this.directory,'finance-slips',id+'.json');}
 async loadSlip(id){try{return JSON.parse(await readFile(this.slipPath(id),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async saveSlip(s){await mkdir(path.join(this.directory,'finance-slips'),{recursive:true});await writeFile(this.slipPath(s.id),JSON.stringify({type:s.type,data:s.data,at:Date.now()}));}
 deleteSlip(id){return rm(this.slipPath(id),{force:true});}
 // 0.117 terms/privacy acceptance per account (PDPA record: which version, when, which address)
 // 0.118 evidence log: one JSON line per batch in evidence/<stream>/<day>.jsonl
 evidenceDir(stream){return path.join(this.directory,'evidence',stream);}
 async appendEvidence(stream,doc){await mkdir(this.evidenceDir(stream),{recursive:true});await appendFile(path.join(this.evidenceDir(stream),doc.day+'.jsonl'),JSON.stringify(doc)+'\n');}
 async loadEvidence(stream,from,to){let files=[];try{files=await readdir(this.evidenceDir(stream));}catch{return [];}
  const out=[];for(const f of files.filter(f=>f.endsWith('.jsonl')&&f.slice(0,10)>=from&&f.slice(0,10)<=to)){for(const line of (await readFile(path.join(this.evidenceDir(stream),f),'utf8')).split('\n'))if(line.trim())out.push(JSON.parse(line));}return out;}
 async purgeEvidence(stream,before){let files=[];try{files=await readdir(this.evidenceDir(stream));}catch{return;}for(const f of files)if(f.endsWith('.jsonl')&&f.slice(0,10)<before)await rm(path.join(this.evidenceDir(stream),f),{force:true});}
 async loadConsent(uid){try{return JSON.parse(await readFile(path.join(this.directory,'consents.json'),'utf8'))[uid]??null;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 saveConsent(uid,doc){const job=(this.consentQueue??Promise.resolve()).catch(()=>{}).then(async()=>{const file=path.join(this.directory,'consents.json');let all={};try{all=JSON.parse(await readFile(file,'utf8'));}catch{}all[uid]=doc;await writeFile(file,JSON.stringify(all));});this.consentQueue=job;return job;}
 async loadObservers(){try{return JSON.parse(await readFile(path.join(this.directory,'observers.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 saveObservers(emails){return writeFile(path.join(this.directory,'observers.json'),JSON.stringify(emails),{mode:0o600});}
 async loadPrices(){try{return JSON.parse(await readFile(path.join(this.directory,'prices.json'),'utf8'));}catch{return {};}}
 savePrices(serverId,prices){this.allPrices={...(this.allPrices??{}),[serverId]:prices};return writeFile(path.join(this.directory,'prices.json'),JSON.stringify(this.allPrices),{mode:0o600});}
 deleteGuild(){return this.flushGuilds();}
 flushGuilds(){const data=JSON.stringify([...(this.realmGuilds?.values()??[])]);return writeFile(path.join(this.directory,'guilds.json'),data,{mode:0o600});}
 flush(){const data=JSON.stringify([...this.rows]);this.queue=this.queue.catch(()=>{}).then(async()=>{const file=path.join(this.directory,'profiles.json'),tmp=file+'.tmp';await writeFile(tmp,data,{mode:0o600});await rename(tmp,file);});return this.queue;}
}
export class FirebaseStore{
 constructor(db){this.db=db;this.authorityId=randomUUID();this.authorityRef=db.collection('multiplayerRuntime').doc('authority');this.authorityUntil=0;}
 async renewAuthority(){
  const until=await this.db.runTransaction(async tx=>{const snap=await tx.get(this.authorityRef),now=Date.now();
   if(snap.exists&&snap.data().id!==this.authorityId&&snap.data().expires>now)throw new Error('another-authority-active');
   tx.set(this.authorityRef,{id:this.authorityId,expires:now+AUTHORITY_TTL});return now+AUTHORITY_TTL-25000;
  });this.authorityUntil=until;
 }
 async checkAuthority(tx){const snap=await tx.get(this.authorityRef);if(!snap.exists||snap.data().id!==this.authorityId||snap.data().expires<Date.now())throw new Error('authority-lost');}
 async releaseAuthority(){await this.db.runTransaction(async tx=>{const s=await tx.get(this.authorityRef);if(s.exists&&s.data().id===this.authorityId)tx.delete(this.authorityRef);});this.authorityUntil=0;}
 async loadMailAnnouncements(){return this.db.runTransaction(async tx=>{await this.checkAuthority(tx);const snap=await tx.get(this.db.collection('multiplayerRuntime').doc('mailAnnouncements'));return snap.exists?snap.data().messages??[]:[];});}
 saveMailAnnouncement(mail){return this.db.runTransaction(async tx=>{await this.checkAuthority(tx);const ref=this.db.collection('multiplayerRuntime').doc('mailAnnouncements'),snap=await tx.get(ref),r=deliverMail({messages:snap.exists?snap.data().messages??[]:[]},mail);tx.set(ref,{messages:r.mailbox.messages,updatedAt:Date.now()});return r;});}
 async loadGuilds(){return (await this.db.collection('multiplayerGuilds').get()).docs.map(d=>d.data());}
 async loadMapBosses(){return this.db.runTransaction(async tx=>{await this.checkAuthority(tx);const snap=await tx.get(this.db.collection('multiplayerRuntime').doc('mapBossTimers'));return snap.exists?snap.data().rows??[]:[];});}
 saveMapBosses(rows){return this.db.runTransaction(async tx=>{await this.checkAuthority(tx);tx.set(this.db.collection('multiplayerRuntime').doc('mapBossTimers'),{rows,updatedAt:Date.now()});});}
 saveGuild(g){return this.db.collection('multiplayerGuilds').doc(g.id).set(g);}
 async loadShops(){return (await this.db.collection('multiplayerShops').get()).docs.map(d=>d.data());}
 saveShop(s){return this.db.collection('multiplayerShops').doc(s.id).set(s);}
 deleteShop(s){return this.db.collection('multiplayerShops').doc(s.id).delete();}
 async loadLeaders(){const out={};for(const d of (await this.db.collection('multiplayerLeaders').get()).docs)out[d.id]=d.data().rows??{};return out;}
 saveLeaders(serverId,rows){return this.db.collection('multiplayerLeaders').doc(serverId).set({rows});}
 async loadFinance(){const s=await this.db.collection('backofficeFinance').doc('books').get();return s.exists?s.data():null;}
 saveFinance(doc,baseRev,by){const ref=this.db.collection('backofficeFinance').doc('books');return this.db.runTransaction(async tx=>{const s=await tx.get(ref),cur=s.exists?s.data():null;if((cur?.rev??0)!==baseRev)throw staleFinance(cur);const next={...doc,rev:(cur?.rev??0)+1,updatedAt:Date.now(),by};tx.set(ref,next);return next;});}
 async loadSlip(id){const s=await this.db.collection('backofficeFinanceSlips').doc(id).get();return s.exists?s.data():null;}
 saveSlip(s){return this.db.collection('backofficeFinanceSlips').doc(s.id).set({type:s.type,data:s.data,at:Date.now()});}
 deleteSlip(id){return this.db.collection('backofficeFinanceSlips').doc(id).delete();}
 // 0.118 evidence log: batch documents {day, at, events}; range reads and purges use the single field 'day' (no composite index)
 evidenceRef(stream){return this.db.collection(stream==='admin'?'evidenceAdminLogs':'evidenceLogs');}
 appendEvidence(stream,doc){return this.evidenceRef(stream).add(doc);}
 async loadEvidence(stream,from,to){return (await this.evidenceRef(stream).where('day','>=',from).where('day','<=',to).get()).docs.map(d=>d.data());}
 async purgeEvidence(stream,before){for(let round=0;round<20;round++){const snap=await this.evidenceRef(stream).where('day','<',before).limit(300).get();if(snap.empty)return;const batch=this.db.batch();snap.docs.forEach(d=>batch.delete(d.ref));await batch.commit();}}
 async loadConsent(uid){const s=await this.db.collection('playerConsents').doc(uid).get();return s.exists?s.data():null;}
 saveConsent(uid,doc){return this.db.collection('playerConsents').doc(uid).set(doc);}
 // 0.119 observer e-mails added from the back office (server-only doc, written with the admin SDK)
 async loadObservers(){const s=await this.db.collection('multiplayerRuntime').doc('observerEmails').get();return s.exists?s.data().emails??[]:[];}
 saveObservers(emails){return this.db.collection('multiplayerRuntime').doc('observerEmails').set({emails,updatedAt:Date.now()});}
 async loadPrices(){const out={};for(const d of (await this.db.collection('multiplayerPrices').get()).docs)out[d.id]=d.data().prices??{};return out;}
 savePrices(serverId,prices){return this.db.collection('multiplayerPrices').doc(serverId).set({prices});}
 deleteGuild(g){return this.db.collection('multiplayerGuilds').doc(g.id).delete();}
 // 0.103 back office. The private profiles sit in multiplayerProfiles/{uid}/characters; the collection group also
 // matches the legacy players/{uid}/characters mirror, which is skipped. One read per document: the host caches it.
 async listProfiles(limit=2000){
  const snap=await this.db.collectionGroup('characters').limit(limit).get();
  return snap.docs.filter(d=>d.ref.parent.parent?.parent?.id==='multiplayerProfiles'&&d.data().record).map(d=>({uid:d.ref.parent.parent.id,slotId:d.id,record:d.data().record,savedAt:d.data().updatedAt??null}));
 }
 async classRewardPage({after=null,limit=100}={}){
  let query=this.db.collectionGroup('characters').orderBy('__name__').limit(limit);if(after)query=query.startAfter(this.db.doc(after));
  const snap=await query.get();return {rows:snap.docs.filter(d=>d.ref.parent.parent?.parent?.id==='multiplayerProfiles'&&d.data().record).map(d=>({uid:d.ref.parent.parent.id,slotId:d.id,record:d.data().record})),after:snap.docs.at(-1)?.ref.path??after,done:snap.docs.length<limit};
 }
 async loadClassRewardState(){const s=await this.db.collection('multiplayerRuntime').doc('classReward192').get();return s.exists?s.data():null;}
 saveClassRewardState(state){return this.db.runTransaction(async tx=>{await this.checkAuthority(tx);tx.set(this.db.collection('multiplayerRuntime').doc('classReward192'),state);});}
 // Same lease rule as acquire(): a live lease means the character is in a game, and the transaction re-runs if
 // the lease or the profile changes underneath it, so a login in between cannot be overwritten.
 async giveOffline(identity,apply){
  const refs=this.refs(identity);
  return this.db.runTransaction(async tx=>{
   await this.checkAuthority(tx);
   const [profile,lease]=await Promise.all([tx.get(refs.profile),tx.get(refs.lease)]);
   if(lease.exists&&lease.data().expires>Date.now())throw new Error('player-online');
   if(!profile.exists)throw new Error('character-not-found');
   const record=apply(copy(profile.data().record));tx.set(refs.profile,{record,updatedAt:profile.data().updatedAt??Date.now()});return copy(record);
  });
 }
 // 0.114 players delete their own characters from the lobby. Same lease rule as giveOffline. The private profile goes
 // with the mirror (a new character in the slot would otherwise load the old progress), and so does the old
 // players/{uid}/saves/server-N document, or the lobby would migrate slot 1/2 straight back from it.
 async deleteCharacter(identity){
  const refs=this.refs(identity),old=/^slot-[12]$/.test(identity.slotId)?this.db.collection('players').doc(identity.uid).collection('saves').doc(identity.slotId==='slot-1'?'server-1':'server-2'):null;
  return this.db.runTransaction(async tx=>{
   await this.checkAuthority(tx);
   const [legacy,lease]=await Promise.all([tx.get(refs.legacy),tx.get(refs.lease)]);
   if(lease.exists&&lease.data().expires>Date.now())throw new Error('player-online');
   if(!legacy.exists)throw new Error('character-not-found');
   tx.delete(refs.profile);tx.delete(refs.legacy);if(old)tx.delete(old);
  });
 }
 refs(identity){const root=this.db.collection('multiplayerProfiles').doc(identity.uid);return {profile:root.collection('characters').doc(identity.slotId),lease:this.db.collection('multiplayerLeases').doc(identity.uid),legacy:this.db.collection('players').doc(identity.uid).collection('characters').doc(identity.slotId)};}
 async loadDashboardLogs(){try{const snap=await this.db.collection('multiplayerRuntime').doc('dashboardLogs').get();if(snap.exists&&Array.isArray(snap.data().logs))return snap.data().logs;}catch(e){console.error('loadDashboardLogs',e.message);}return [];}
 async saveDashboardLogs(logs){try{const recent=Array.isArray(logs)?logs.slice(-200):[];await this.db.collection('multiplayerRuntime').doc('dashboardLogs').set({logs:recent,updatedAt:Date.now()});}catch(e){console.error('saveDashboardLogs',e.message);}}
 async acquire(identity,leaseId,{takeover=false}={}){
  const refs=this.refs(identity);return this.db.runTransaction(async tx=>{
   await this.checkAuthority(tx);
   const [online,legacy,lease]=await Promise.all([tx.get(refs.profile),tx.get(refs.legacy),tx.get(refs.lease)]);
   if(!takeover&&lease.exists&&lease.data().expires>Date.now())throw new Error('already-online');
   if(!legacy.exists)throw new Error('character-not-found');
   const record=online.exists?online.data().record:legacy.data();if(!online.exists){delete record.rebirthStory;delete record.identityReceipts;delete record.petCollection;delete record.mailbox;delete record.walkRoute;delete record.albumSchema;delete record.albumRewards;} // Never import a premium wallet from the client-writable mirror.
   if(record.serverId!==identity.serverId||legacy.data().serverId!==identity.serverId)throw new Error('character-server');
   // 0.114.1 the mirror is client-writable, so a first join only trusts its progress if it was last written before the
   // cutoff (rules pin updatedAt to request.time). Anything newer starts as a Lv.1 novice with just its name and looks.
   if(!online.exists&&!(legacy.data().updatedAt?.toMillis?.()<MIRROR_CUTOFF)){const c=record.character??{};record.character={name:c.name,gender:c.gender,classId:'novice',...(c.appearance===undefined?{}:{appearance:c.appearance})};record.state=initialSave();}
   character(record.character); // Legacy XP is imported once; later joins use the private server profile.
   if(online.exists){const next=character({...legacy.data().character,classId:record.character.classId,jobId:record.character.jobId??''});validateCharacterChange(record.character,next,record.state);record.character=next;}
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
   const mirror={...next};delete mirror.rebirthStory;delete mirror.identityReceipts;delete mirror.walkRoute;delete mirror.skills;delete mirror.roleSkillBackup;delete mirror.roleCooldowns;delete mirror.training;delete mirror.story;delete mirror.equipment;delete mirror.bag;delete mirror.storage;delete mirror.friends;delete mirror.daily;delete mirror.dungeonDay;delete mirror.pet;delete mirror.petCollection;delete mirror.mailbox;delete mirror.bounty;delete mirror.weekly;delete mirror.rebirth;delete mirror.xpCurve;delete mirror.album;delete mirror.albumSchema;delete mirror.albumRewards;delete mirror.trade;delete mirror.stats;delete mirror.gear;
   tx.set(session.refs.profile,{record:next,updatedAt:Date.now()});tx.set(session.refs.legacy,{...mirror,updatedAt:new Date()});
   if(release)tx.delete(session.refs.lease);else tx.update(session.refs.lease,{expires:Date.now()+ttl});return next.revision;
  });session.mirrorRevision=revision;
 }
}

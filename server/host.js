import {NOVICE_SLOTS,NOVICE_MAX} from '../skill-progress.js';
import {arenaReservation} from './arena-rooms166.js';
import {identityAction} from '../identity166.js';
import {MAIL_ACTIONS,composeMail,deliverMail,mailboxAction,mailboxBulkAction,publicInbox,inboxSummary,hasMailGift} from '../mailbox.js';
import {PET_MUTATIONS,petAccountAction,publicPetAccount} from '../pet-account.js';
import {STORY_VERSION} from '../story-quests.js';
import {statsAfterClassChange} from '../character-stats.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {DROPS} from '../items.js';
import http from 'node:http';
import {discordPoster} from './discord-webhook.js';
import {randomUUID,randomInt} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {RealmServer} from './realm.js';
import {ROLE_GLOBAL_CD} from '../role-combat.js';
import {logTravel} from './dashboard-log.js';
import {equipItem} from '../equipment.js';
import {GAMEPLAY_RUN_ENABLED} from '../character-action-state.js';
import {trainingAction} from '../city-life-data.js';
import {normalizeSkills} from '../skill-progress.js';
import {cleanBalance} from '../balance.js';
import {canObserve,observerEmails,envObservers,cleanObservers,isAdmin,adminEmails,OWNER_EMAILS,configKeys,adminPlayers,adminGive,adminGiveOffline} from './admin.js';
import {cleanFinance,cleanSlip,slipId,FINANCE_MAX_BYTES,SLIP_MAX_BYTES} from './finance.js';
import {EvidenceLog,playerEvent} from './evidence.js';
import {WorldReset} from './world-reset.js';
import {createResetStore} from './world-reset-store.js';
import {balanceText,commitBalance} from './github-balance.js';
import {LocalStore,FirebaseStore,AUTHORITY_RENEW,SAVE_MIN_GAP,SAVE_MAX_GAP} from './storage.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function createHost({mode='firebase',store,catalog,origins=[],capacity=50,authenticate,serveStatic=false}={}){
 if(!['local','firebase'].includes(mode))throw new Error('invalid-auth-mode');
 if(!catalog)catalog=JSON.parse(await readFile(path.join(root,'maps/world.json'),'utf8'));
 // A replacement instance (zero-downtime redeploy) starts while the old one still owns the world.
 // It serves /health and answers sockets with 503 until the old lease is released or expires, then takes over.
 let reset=null,resetReady=true;
 const writes=new Set(),mutations=new Set();
 const trackWrite=p=>{const task=Promise.resolve(p);writes.add(task);task.finally(()=>writes.delete(task)).catch(()=>{});return task;};
 let mailReady=!store?.loadMailAnnouncements;
 let shopsReady=mode==='local'||!store?.loadShops,loadMarket=async()=>{};
 let bossTimersReady=mode==='local'||!store?.loadMapBosses;
 const authoritative=()=>(mode!=='firebase'||Date.now()<=store.authorityUntil)&&resetReady&&bossTimersReady&&mailReady&&shopsReady;
 let renewing=false,authorityError='';
 const renew=async()=>{
  if(mode!=='firebase'||renewing)return;renewing=true;
  if(!(Date.now()<=store.authorityUntil))shopsReady=!store?.loadShops;
  try{
   const held=Date.now()<=store.authorityUntil&&resetReady;if(!held)resetReady=false;
   await store.renewAuthority();
   if(!held){
    if(reset){
     const previous=reset.job;reset.job=await repository.state();
     if(reset.job&&(reset.job.id!==previous?.id||(reset.job.status==='completed'&&previous?.status!=='completed'))){sessions.clear();await clearWorld();}
    }
    // A standby host may have loaded these before the previous host finished its reset.
    if(store.loadGuilds){realm.guilds=new Map((await store.loadGuilds()).map(g=>[g.id,g]));store.realmGuilds=realm.guilds;}
    if(store.loadLeaders){store.allLeaders=await store.loadLeaders();realm.leaders=new Map(Object.entries(store.allLeaders));}
    if(store.loadDashboardLogs)realm.logs=await store.loadDashboardLogs();
    await loadObservers();refreshObservers();
    bossTimersReady=!store.loadMapBosses;mailReady=!store.loadMailAnnouncements;resetReady=true;
   }
   if(!shopsReady){await loadMarket();shopsReady=true;}
   if(!bossTimersReady){realm.mapBosses.restore(await store.loadMapBosses());bossTimersReady=true;}
   if(!mailReady){realm.mailAnnouncements=await store.loadMailAnnouncements();mailReady=true;}
   if(authorityError){console.log('Multiplayer authority acquired');authorityError='';}
  }catch(e){if(e.message!==authorityError)console.error('Multiplayer authority unavailable: '+e.message);authorityError=e.message;}
  finally{renewing=false;}
 };
 if(!Number.isInteger(capacity)||capacity<2||capacity>100)throw new Error('ROOM_CAPACITY must be 2–100');
 let savedList={at:0,rows:[]},lastLogSaveCount=0;
 const realm=new RealmServer({catalog,capacity,runEnabled:GAMEPLAY_RUN_ENABLED,roleSkills:process.env.ROLE_SKILLS!=='off',spiritCompanions:true,warAlways:mode==='local'&&process.env.WAR_ALWAYS==='1'}),sessions=new Map(),joinPending=new Set(),metrics={bytesSent:0,messagesSent:0,startedAt:Date.now()};let closing=false;
 if(mode==='local'&&store?.loadMailAnnouncements){realm.mailAnnouncements=await store.loadMailAnnouncements();mailReady=true;}
 if(mode==='local'&&store?.loadMapBosses)realm.mapBosses.restore(await store.loadMapBosses());
 if(store?.saveMapBosses)realm.mapBosses.onChange=rows=>trackWrite(store.saveMapBosses(rows));
 const toDiscord=discordPoster();if(toDiscord)realm.onAnnounce=toDiscord; // 0.96 war + tournament news (DISCORD_WEBHOOK_URL)
 // 0.47 guilds: loaded once, written on each change (rare: create/join/leave/emblem), outside the per-player saves.
 // 0.70 market: shops stay open while their owners are offline, so they live outside the player saves.
 if(store?.loadShops){loadMarket=async()=>{realm.shops=new Map((await store.loadShops()).map(s=>[s.id,s]));store.realmShops=realm.shops;const prices=await store.loadPrices();store.allPrices=prices;realm.prices=new Map(Object.entries(prices));};realm.onShop=(s,deleted)=>trackWrite(deleted?store.deleteShop(s):store.saveShop(s));realm.onPrices=(id,p)=>trackWrite(store.savePrices(id,p));if(mode==='local')await loadMarket();}
 if(store?.loadLeaders){const l=await store.loadLeaders();store.allLeaders=l;realm.leaders=new Map(Object.entries(l));realm.onLeaders=(id,rows)=>trackWrite(store.saveLeaders(id,rows));}
// 0.119 observer e-mails saved from the back office (see /admin/observers); a peer keeps its verified e-mail so a
 // removed address loses the mode straight away
 let observerSaved=[];
 const loadObservers=async()=>{if(!store?.loadObservers)return;try{observerSaved=cleanObservers(await store.loadObservers());}catch(e){console.error('observers-load',e.message);}};
 const refreshObservers=()=>{if(mode==='local')return;const list=observerEmails(process.env,observerSaved);for(const p of realm.peers.values()){const ok=list.has(p.observerEmail??'');if(p.canObserve===ok)continue;p.canObserve=ok;if(!ok&&p.observer)realm.setObserver(p,false);}};
 await loadObservers();
 if(store?.loadGuilds){realm.guilds=new Map((await store.loadGuilds()).map(g=>[g.id,g]));store.realmGuilds=realm.guilds;realm.onGuild=(g,deleted)=>trackWrite(deleted?store.deleteGuild(g):store.saveGuild(g)).catch(e=>console.error('guild-save',e.message));}
  if(store?.loadDashboardLogs){try{const saved=await store.loadDashboardLogs();if(Array.isArray(saved)&&saved.length)realm.logs=saved;}catch(e){console.error('dashboard-logs-load',e.message);}}
 const repository=createResetStore(store);
 if(repository)reset=await new WorldReset({repository,quiesce:quiesceWorld,finish:clearWorld,online:()=>sessions.size}).init();

 async function quiesceWorld(){
  const until=Date.now()+20000;
  while(mutations.size||joinPending.size){if(Date.now()>until)throw Error('reset-drain-timeout');await new Promise(r=>setTimeout(r,25));}
  const active=[...sessions.values()];
  for(const s of active){s.closing=true;s.explicitLeave=false;s.peer.suspended=true;s.peer.input={x:0,z:0,attack:false,run:false};try{s.ws.send(JSON.stringify({type:'error',code:'world-reset'}));}catch{}}
  // Every queued inventory/mail/character write finishes before the archive is read.
  const results=await Promise.allSettled(active.map(s=>checkpoint(s,true)));
  if(results.some(r=>r.status==='rejected'))throw Error('reset-save-failed');
  for(const s of active){s.ws.close(4012,'world-reset');s.onClosed?.();}sessions.clear();
  await realm.flushShops();await realm.mapBosses.flush();
  for(const g of realm.guildsDirty)if(realm.guilds.get(g.id)===g&&store.saveGuild)await trackWrite(store.saveGuild(g));
  for(const id of realm.leadersDirty)if(store.saveLeaders)await trackWrite(store.saveLeaders(id,realm.leaders.get(id)));
  for(const id of realm.pricesDirty)if(store.savePrices)await trackWrite(store.savePrices(id,realm.prices.get(id)));
  while(writes.size)await Promise.all([...writes]);
  await store.queue;await store.mailQueue;await store.bossQueue;
 }
 async function clearWorld(){
  for(const key of ['peers','rooms','parties','invites','guilds','leaders','shops','prices','mvps','wars','arenaPairs','arenaRooms','weatherOverrides','guildsDirty','leadersDirty','pricesDirty'])realm[key]?.clear();
  realm.mailAnnouncements=[];realm.logs=[];realm.mapBosses.restore([]);realm.mapBosses.dirty=false;
  store.allPrices={};store.allLeaders={};store.leases?.clear();savedList={at:0,rows:[]};lastLogSaveCount=0;
 }
 // 0.118 evidence log (see evidence.js): players' sign-ins, chat, trades and mail; every admin action, kept for disputes
 const evidence=store?.appendEvidence?new EvidenceLog(store).start():null;
 const audit=(type,admin,detail={})=>evidence?.add('admin',{type,admin,...detail});
 realm.evidence=(p,type,detail)=>evidence?.add('players',playerEvent(p,type,detail));
 const requestIp=req=>String(req.headers['do-connecting-ip']||req.socket?.remoteAddress||'?');
 const allowedOrigin=origin=>origins.includes(origin);
 const server=http.createServer(async(req,res)=>{
  let mutationDone;try{
  const origin=req.headers.origin;if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='OPTIONS'){if(!allowedOrigin(origin)){res.writeHead(403).end();return;}res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','POST, GET');res.writeHead(204).end();return;}
  const url=new URL(req.url,'http://localhost'),reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(url.pathname==='/game-status'&&req.method==='GET'){reply(200,{maintenance:!!reset?.maintenance,worldReset:1});return;}
  // Drain requests that started before the reset; no later HTTP mutation can enter the world.
  if(req.method==='POST'&&!url.pathname.startsWith('/admin/world-reset')){
   if(reset?.maintenance){reply(503,{error:'world-reset'});return;}
   let done;const pending=new Promise(r=>{done=r;});mutations.add(pending);
   mutationDone=()=>{mutations.delete(pending);done();};
  }
  if(url.pathname==='/health'){reply(200,{contentVersion:catalog.version??0,commit:process.env.RENDER_GIT_COMMIT?.slice(0,7)??null,ok:!closing,authority:authoritative(),protocol:1,movementPrediction:1,autoWalkSchema:1,adventurerHire:1,bridgeRouting:1,worldReset:1,maintenance:!!reset?.maintenance,shopLifecycle:1,routeRunSchema:1,mapBossSchema:1,evidenceLog:1,consentSchema:1,financeBooks:1,mailGradedGear:1,monsterTypes:MONSTER_TYPES.length,questDialogue:1,storySchema:STORY_VERSION,petPreview:1,petSystem:2,combatTiming:2,bossResults:1,bossDirectory:1,guildDirectory:1,arenaRooms:1,renameCard:1,respawnChoice:1,revivalTalisman:200,spiritCompanion:185,autoTargeting:1,refineSlots:6,refineMax:20,refineTiers:4,refineSequence:1,mailboxSchema:1,mailboxBulk:1,albumDeposits:2,leaderboardAvatars:1,premiumCurrency:'gold-bar',classStatReset:true,noviceTraining:{skills:NOVICE_SLOTS.length,maxRank:NOVICE_MAX},roleSchema:realm.roleSkills?1:0,skillRework:119,skillGcd:ROLE_GLOBAL_CD,observerMode:1,mode,players:realm.peers.size,rooms:realm.rooms.size,capacity,admins:adminEmails().size,configKeys:configKeys(process.env),channels:realm.channelCounts(),bandwidth:metrics});return;}
  if(url.pathname==='/dashboard'){reply(200,{status:'ok',contentVersion:catalog.version??0,commit:process.env.RENDER_GIT_COMMIT?.slice(0,7)??null,ok:!closing,authority:authoritative(),mode,players:realm.peers.size,totalPlayers:realm.peers.size,uptimeSeconds:Math.max(1,Math.round((Date.now()-metrics.startedAt)/1000)),capacity,channels:realm.channelCounts(),rooms:[...realm.rooms.values()].map(r=>({id:r.id,map:r.map.id,mapId:r.map.id,mapName:r.map.name,channel:r.channel??1,players:r.peers.size})),bandwidth:metrics,logs:realm.logs.slice(-100).reverse()});return;}
  // 0.117 terms/privacy acceptance after sign-in: GET the version this account accepted, POST {version} to record it.
  // Firebase mode trusts only the verified ID token's uid; the loopback dev server uses the uid it is given.
  if(url.pathname==='/consent'&&(req.method==='GET'||req.method==='POST')){
   if(origin&&!allowedOrigin(origin)){reply(403,{error:'origin'});return;}
   if(!store?.loadConsent){reply(503,{error:'consent-unsupported'});return;}
   try{
    let uid,email=null;
    if(mode==='firebase'){let d;try{d=await authenticate(String(req.headers.authorization??'').replace(/^Bearer /,''));}catch{reply(401,{error:'bad-token'});return;}uid=d.uid;email=d.email??null;}
    else uid=String(url.searchParams.get('uid')??'local').slice(0,128);
    if(req.method==='GET'){const c=await store.loadConsent(uid);reply(200,{version:c?.version??null,at:c?.at??null});return;}
    let data='';for await(const chunk of req){data+=chunk;if(data.length>500){reply(413,{error:'too-large'});return;}}
    const version=String(JSON.parse(data||'{}').version??'');if(!/^\d{4}-\d{2}-\d{2}$/.test(version)){reply(400,{error:'bad-version'});return;}
    await store.saveConsent(uid,{version,at:Date.now(),email,agent:String(req.headers['user-agent']??'').slice(0,200)});console.log('consent',uid,version);evidence?.add('players',{type:'consent',uid,email,version,ip:requestIp(req)});reply(200,{version});
   }catch(e){console.error('consent',e.message);reply(e instanceof SyntaxError?400:502,{error:e instanceof SyntaxError?'invalid':'consent-failed'});}
   return;
  }
  // 0.99.16 back-office (admin.html): online players and gifts. Production needs a Google ID token whose verified
  // email is in ADMIN_EMAILS; the local server trusts its own origin. Every gift is logged.
  if(url.pathname.startsWith('/admin/')){
   // a same-origin GET carries no Origin header: only the local server (bound to 127.0.0.1) lets that through
   if(origin?!allowedOrigin(origin):mode!=='local'){reply(403,{error:'origin'});return;}
   let who='local';
   if(mode==='firebase'){
    // distinct answers so the page can say what is wrong: no list on the server, a bad sign-in, or an address not on it
    if(!adminEmails().size){reply(403,{error:'admin-unset'});return;}
    let d;try{d=await authenticate(String(req.headers.authorization??'').replace(/^Bearer /,''));}catch{reply(401,{error:'bad-token'});return;}
    if(!isAdmin(d)){console.warn('admin-denied',d.email??d.uid);reply(403,{error:'not-admin'});return;}who=d.email;
   }
   if(url.pathname.startsWith('/admin/world-reset')){
    if(mode!=='local'&&!OWNER_EMAILS.includes(String(who).toLowerCase())){reply(403,{error:'owner-required'});return;}
    if(!reset){reply(503,{error:'reset-unsupported'});return;}
    if(url.pathname==='/admin/world-reset'&&req.method==='GET'){reply(200,reset.status());return;}
    if(!authoritative()){reply(503,{error:'authority-unavailable'});return;}
    if(url.pathname==='/admin/world-reset/preview'&&req.method==='POST'){
     audit('admin-world-reset-preview',who);try{reply(200,await reset.preview(who));}catch(e){reply(409,{error:e.message});}return;
    }
    if(url.pathname==='/admin/world-reset/execute'&&req.method==='POST'){
     let data='';for await(const chunk of req){data+=chunk;if(data.length>4096){reply(413,{error:'too-large'});return;}}
     audit('admin-world-reset-execute',who);try{reply(202,reset.execute(who,JSON.parse(data)));}catch(e){reply(400,{error:e instanceof SyntaxError?'invalid':e.message});}return;
    }
    reply(404,{error:'not-found'});return;
   }
   // 0.103 saved characters come from the store at most every 2 minutes (Firestore bills a read per character);
   // ?fresh=1 (the refresh button) reads again at once.
   if(url.pathname==='/admin/evidence'&&req.method==='GET'){
    if(!evidence){reply(503,{error:'evidence-unsupported'});return;}
    const q={stream:url.searchParams.get('stream')??'players',from:url.searchParams.get('from')??'',to:url.searchParams.get('to')??'',type:String(url.searchParams.get('type')??'').slice(0,40),q:String(url.searchParams.get('q')??'').slice(0,120)};
    try{const r=await evidence.search(q);audit('admin-evidence-search',who,{query:q,results:r.total});reply(200,r);}catch(e){reply(400,{error:e.message});}
    return;
   }
   if(url.pathname==='/admin/map-bosses'&&req.method==='GET'){
    const serverId=url.searchParams.get('serverId')??'server-1',channel=Number(url.searchParams.get('channel')??1);
    if(!['server-1','server-2'].includes(serverId)||!Number.isInteger(channel)||channel<1||channel>5){reply(400,{error:'bad-scope'});return;}
    const bosses=realm.mapBosses.overview(catalog,MONSTER_TYPES,realm.rooms,serverId,channel).map(b=>({...b,drops:DROPS[b.id]?.items??[]}));
    reply(200,{bosses,serverTime:realm.now(),respawnSeconds:3600});return;
   }
   if(url.pathname==='/admin/players'&&req.method==='GET'){
    if(store?.listProfiles&&(url.searchParams.get('fresh')==='1'||Date.now()-savedList.at>120000)){try{savedList={at:Date.now(),rows:await store.listProfiles()};}catch(e){console.error('admin-list',e.message);}}
    reply(200,{players:adminPlayers(realm,savedList.rows),savedAt:savedList.at||null});return;
   }
   if(['/admin/pets','/admin/give','/admin/mail'].includes(url.pathname)&&req.method==='POST'){
    if(!authoritative()){reply(503,{error:'authority-unavailable'});return;}
    let data='';for await(const chunk of req){data+=chunk;if(data.length>12000){reply(413,{error:'too-large'});return;}}
    try{const b=JSON.parse(data),attachments=url.pathname==='/admin/pets'?{goldBars:b.gems??0,pets:b.pet?[b.pet]:[]}:url.pathname==='/admin/give'?{coins:b.coins??0,items:b.items??[]}:b.attachments??{};
     const mail=composeMail({id:b.requestId??randomUUID(),title:b.title??'ของขวัญจากทีมงาน',body:b.body??'ขอบคุณที่ร่วมผจญภัยในอโยธยา กดรับของแนบจากจดหมายฉบับนี้ได้เลยครับ',sender:'ทีมงานอโยธยา',attachments,serverId:b.serverId??'all'});
     if(b.peer==='all'){
      if(hasMailGift(mail.attachments))throw Error('broadcast-gifts-disabled');
      const r=await store.saveMailAnnouncement(mail);realm.mailAnnouncements=r.mailbox.messages;console.log('admin-announcement-mail',who,mail.id);audit('admin-mail-all',who,{mail:mail.id,title:mail.title,serverId:b.serverId??'all',attachments:mail.attachments});reply(200,{ok:true,mail:r.mail,replayed:r.replayed});return;
     }
     let record,replayed=false;
     if(String(b.peer??'').startsWith('off:')){const m=/^off:([^:]{1,128}):(slot-[1-5])$/.exec(b.peer);if(!m)throw Error('player-offline');if([...sessions.values()].some(s=>s.peer.uid===m[1]))throw Error('player-online');record=await store.giveOffline({uid:m[1],slotId:m[2]},r=>{const x=deliverMail(r.mailbox,mail);replayed=x.replayed;return {...r,mailbox:x.mailbox};});}
     else{const session=[...sessions.values()].find(s=>s.peer.id===b.peer&&!s.closing);if(!session)throw Error('player-offline');record=await persistMail(session,r=>{const x=deliverMail(r.mailbox,mail);replayed=x.replayed;return {...r,mailbox:x.mailbox};});}
     savedList.at=0;console.log('admin-mail',who,b.peer,mail.id);audit('admin-mail',who,{to:{peer:b.peer,name:record.character.name},route:url.pathname,mail:mail.id,title:mail.title,attachments:mail.attachments});reply(200,{ok:true,name:record.character.name,mail,replayed});
    }catch(e){reply(400,{error:e.message});}return;
   }
   // 0.116 dashboard books: GET the shared costs + ledger; POST saves them if nobody saved in between (409 = reload)
   if(url.pathname.startsWith('/admin/finance')){
    if(!store?.loadFinance){reply(503,{error:'finance-unsupported'});return;}
    const body=async limit=>{let data='';for await(const chunk of req){data+=chunk;if(data.length>limit)throw Error('too-large');}return JSON.parse(data||'{}');};
    try{
     if(url.pathname==='/admin/finance'&&req.method==='GET'){reply(200,{books:await store.loadFinance()});return;}
     if(url.pathname==='/admin/finance'&&req.method==='POST'){
      const b=await body(FINANCE_MAX_BYTES+20000),doc=cleanFinance(b),baseRev=Number.isInteger(b.baseRev)?b.baseRev:-1;
      try{const books=await store.saveFinance(doc,baseRev,who);console.log('admin-finance',who,books.rev,doc.ledger.length);audit('admin-finance',who,{rev:books.rev,rows:doc.ledger.length,costs:doc.costs.length});reply(200,{books});}
      catch(e){if(e.message!=='finance-stale')throw e;reply(409,{error:'finance-stale',books:e.current});}
      return;
     }
     if(url.pathname==='/admin/finance/slip'&&req.method==='GET'){const s=await store.loadSlip(slipId(url.searchParams.get('id')));if(!s){reply(404,{error:'slip-missing'});return;}reply(200,{type:s.type,data:s.data});return;}
     if(url.pathname==='/admin/finance/slip'&&req.method==='POST'){const s=cleanSlip(await body(SLIP_MAX_BYTES+500));await store.saveSlip(s);console.log('admin-finance-slip',who,s.id,s.data.length);reply(200,{ok:true});return;}
     if(url.pathname==='/admin/finance/slip-delete'&&req.method==='POST'){const id=slipId((await body(500)).id);await store.deleteSlip(id);reply(200,{ok:true});return;}
     reply(404,{error:'not-found'});
    }catch(e){const known=['too-large','finance-invalid','finance-too-large','slip-invalid','slip-type','slip-too-big'];if(!known.includes(e.message)&&!(e instanceof SyntaxError))console.error('admin-finance',e.message);reply(e.message==='too-large'?413:known.includes(e.message)||e instanceof SyntaxError?400:502,{error:e instanceof SyntaxError?'invalid':e.message});}
    return;
   }
   // 0.100.6 balance edits: production commits balance-data.js to GitHub (redeploys game and server); local writes the file
   if(url.pathname==='/admin/balance'&&req.method==='POST'){
    let data='',tooLarge=false;for await(const chunk of req){data+=chunk;if(data.length>200000){tooLarge=true;break;}}if(tooLarge){reply(413,{error:'too-large'});return;}
    let clean;try{clean=cleanBalance(JSON.parse(data));}catch{reply(400,{error:'invalid'});return;}
    const text=balanceText(clean),changes=Object.values(clean).reduce((n,g)=>n+Object.values(g).reduce((m,f)=>m+Object.keys(f).length,0),0);
    try{
     if(mode==='local'){await writeFile(path.join(root,'balance-data.js'),text);await writeFile(path.join(root,'dist','balance-data.js'),text).catch(()=>{});reply(200,{ok:true,changes,local:true});}
     else{const r=await commitBalance(text);console.log('admin-balance',who,changes,r.commit??'unchanged');audit('admin-balance',who,{changes,commit:r.commit??null});reply(200,{ok:true,changes,...r});}
    }catch(e){console.error('admin-balance',e.message);reply(502,{error:e.message});}
    return;
   }
   // 0.119 observer e-mails from the back office: GET the lists, POST {emails} replaces the saved list. Taking an address
   // off turns observer mode off for that player at once; a new address works from that player's next join.
   if(url.pathname==='/admin/observers'&&req.method==='GET'){reply(200,{owner:OWNER_EMAILS,env:envObservers(),emails:observerSaved});return;}
   if(url.pathname==='/admin/observers'&&req.method==='POST'){
    let data='';for await(const chunk of req){data+=chunk;if(data.length>16000){reply(413,{error:'too-large'});return;}}
    try{const emails=cleanObservers(JSON.parse(data)?.emails);if(!store?.saveObservers)throw new Error('store-unsupported');await trackWrite(store.saveObservers(emails));
     const added=emails.filter(e=>!observerSaved.includes(e)),removed=observerSaved.filter(e=>!emails.includes(e));observerSaved=emails;refreshObservers();
     console.log('admin-observers',who,emails.length);audit('admin-observers',who,{added,removed});reply(200,{owner:OWNER_EMAILS,env:envObservers(),emails});}
    catch(e){reply(e.message==='store-unsupported'?503:400,{error:e instanceof SyntaxError?'invalid':e.message});}
    return;
   }
   // 0.109.7 weather override from the back office: GET the current state per realm, POST {serverId, weather|'auto', minutes, mapId}
   if(url.pathname==='/admin/weather'&&req.method==='GET'){reply(200,{servers:Object.fromEntries(['server-1','server-2'].map(id=>[id,realm.weatherState(id)]))});return;}
   if(url.pathname==='/admin/weather'&&req.method==='POST'){
    let data='';for await(const chunk of req){data+=chunk;if(data.length>1024){reply(413,{error:'too-large'});return;}}
    try{const b=JSON.parse(data),serverId=['server-1','server-2'].includes(b?.serverId)?b.serverId:'server-1';
     const state=realm.setWeather({serverId,weather:b?.weather,minutes:b?.minutes,mapId:typeof b?.mapId==='string'&&b.mapId?b.mapId:null});
     console.log('admin-weather',who,serverId,b?.weather,b?.minutes??'',b?.mapId??'all');audit('admin-weather',who,{serverId,weather:b?.weather,minutes:b?.minutes??null,mapId:b?.mapId??'all'});reply(200,{serverId,weather:state});}catch(e){reply(400,{error:e.message});}
    return;
   }
   // 0.109.8 world boss from the back office: POST {serverId, mapId, typeId?}
   if(url.pathname==='/admin/boss'&&req.method==='POST'){
    let data='';for await(const chunk of req){data+=chunk;if(data.length>1024){reply(413,{error:'too-large'});return;}}
    try{const b=JSON.parse(data),serverId=['server-1','server-2'].includes(b?.serverId)?b.serverId:'server-1';
     const num=v=>v===null||v===undefined||v===''?null:Number(v); // the page sends in-game X / Y (Y = -z)
     const r=realm.summonBoss({serverId,mapId:String(b?.mapId??''),channel:b?.channel??null,typeId:b?.typeId??null,count:b?.count??1,x:num(b?.x),z:num(b?.y)===null?null:-num(b?.y)});console.log('admin-boss',who,serverId,b?.mapId,r.name);audit('admin-boss',who,{serverId,mapId:b?.mapId,boss:r.name,count:b?.count??1});reply(200,{serverId,...r});}catch(e){reply(400,{error:e.message});}
    return;
   }
   reply(404,{error:'not-found'});return;
  }
  // 0.114 a signed-in player deletes one of their own characters (lobby). The token names the account; the store
  // refuses while that account is in a game.
  if(url.pathname==='/character/delete'&&req.method==='POST'){
   if(!allowedOrigin(origin)){reply(403,{error:'origin'});return;}
   let data='',tooLarge=false;for await(const chunk of req){data+=chunk;if(data.length>1024){tooLarge=true;break;}}if(tooLarge){reply(413,{error:'too-large'});return;}
   const token=String(req.headers.authorization??'').replace(/^Bearer /,'');let uid;
   try{uid=mode==='local'?store.verifyLocal(token):(await authenticate(token)).uid;}catch{}
   if(!uid){reply(401,{error:'bad-token'});return;}
   try{const slotId=JSON.parse(data)?.slotId;if(!/^slot-[1-5]$/.test(slotId??''))throw new Error('invalid-slot');
    if([...realm.peers.values()].some(p=>p.uid===uid))throw new Error('player-online');
    await store.deleteCharacter({uid,slotId});savedList.at=0;console.log('character-delete',uid,slotId);reply(200,{ok:true});}
   catch(e){reply(e.message==='player-online'?409:400,{error:e.message});}
   return;
  }
  if(mode==='local'&&url.pathname==='/dev/session'&&req.method==='POST'){
   if(!allowedOrigin(origin)){reply(403,{error:'origin'});return;}
   let data='',tooLarge=false;for await(const chunk of req){data+=chunk;if(data.length>1024){tooLarge=true;break;}}if(tooLarge){reply(413,{error:'too-large'});return;}
   try{if(store.rows.size>=1000)throw new Error('local-session-limit');const result=await store.createLocal(JSON.parse(data));reply(201,{token:result.token,slotId:'slot-1',serverId:'server-1',character:result.record.character});}catch{reply(400,{error:'invalid-character'});}return;
  }
  // 0.85 admin dashboard save: only the local development server (the owner's own machine) writes balance-data.js;
  // the production server has no such route. The file then ships with the next git push.
  if(mode==='local'&&url.pathname==='/dev/balance'&&req.method==='POST'){
   if(!allowedOrigin(origin)){reply(403,{error:'origin'});return;}
   let data='',tooLarge=false;for await(const chunk of req){data+=chunk;if(data.length>200000){tooLarge=true;break;}}if(tooLarge){reply(413,{error:'too-large'});return;}
   try{const clean=cleanBalance(JSON.parse(data)),text='// Balance overrides written by the admin dashboard (admin.html). Empty = the numbers in the code.\nexport default '+JSON.stringify(clean,null,1)+';\n';
    await writeFile(path.join(root,'balance-data.js'),text);await writeFile(path.join(root,'dist','balance-data.js'),text).catch(()=>{});
    reply(200,{ok:true,changes:Object.values(clean).reduce((n,g)=>n+Object.values(g).reduce((m,f)=>m+Object.keys(f).length,0),0)});}catch{reply(400,{error:'invalid'});}
   return;
  }
  if(serveStatic&&mode==='local'&&req.method==='GET'){
   try{const decoded=decodeURIComponent(url.pathname),relative=decoded==='/'?'index.html':decoded.slice(1),base=path.join(root,'dist'),file=path.resolve(base,relative);
    if(!file.startsWith(base+path.sep)||relative.includes('..'))throw new Error('path');const body=await readFile(file),ext=path.extname(file);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.ttf':'font/ttf','.webp':'image/webp','.webmanifest':'application/manifest+json'}[ext]??'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(body);
   }catch{res.writeHead(404).end();}return;
  }
  reply(404,{error:'not-found'});
  }finally{mutationDone?.();}
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:true});
 // 0.114.2 per-address socket caps, so one machine can't hold the whole server's slots. DigitalOcean's edge sets
 // do-connecting-ip (clients can't forge it through the proxy); without it we're local and the socket address is real.
 const IP_PENDING=10,IP_ALL=60,perIp=new Map(),clientIp=req=>String(req.headers['do-connecting-ip']||req.socket.remoteAddress||'?');
 server.on('upgrade',(req,socket,head)=>{
  const ip=clientIp(req),ipUse=perIp.get(ip);
  if(closing||req.url!=='/realtime'||!allowedOrigin(req.headers.origin)||wss.clients.size>=capacity*4+20||ipUse?.pending>=IP_PENDING||ipUse?.all>=IP_ALL){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
  if(!authoritative()||reset?.maintenance){socket.write('HTTP/1.1 503 Service Unavailable\r\nRetry-After: 5\r\n\r\n');socket.destroy();return;}
  // Counted here, not on 'connection', so a burst of simultaneous upgrades can't all slip past the check.
  const use=ipUse??{all:0,pending:0};use.all++;use.pending++;perIp.set(ip,use);let pending=true;
  req.settled=()=>{if(pending){pending=false;use.pending--;}};socket.once('close',()=>{req.settled();if(!--use.all&&perIp.get(ip)===use)perIp.delete(ip);});
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 // 0.97.2 a save that hangs fails after 15 s, so a session can never stay busy (and drop commands) forever.
 const checkpoint=(s,release=false)=>{s.queue=s.queue.catch(()=>{}).then(async()=>{if(s.released)return;const record=s.travelRecord??realm.record(s.peer,s.lease.record);let timer;await Promise.race([store.checkpoint(s.lease,record,{release}),new Promise((_,no)=>{timer=setTimeout(()=>no(new Error('save-timeout')),15000);})]).finally(()=>clearTimeout(timer));s.autoSavedAt=Date.now();s.savedJson=JSON.stringify(record);if(release)s.released=true;});return s.queue;};
 // A background destination remains an authoritative, leased simulation until arrival.
 const finishBackground=s=>{if(s.finishingBackground)return s.finishingBackground;s.closing=true;realm.suspend(s.peer.id);s.finishingBackground=checkpoint(s,true).catch(e=>console.error('background-walk-save',e.message)).finally(()=>{if(sessions.get(s.peer.id)===s)sessions.delete(s.peer.id);s.onClosed?.();});return s.finishingBackground;};
 // 0.114.2 durable-write budget per session (the Spark plan allows ~20k writes a day for everyone): 30 at once, then
 // one back every 6 s. Player-triggered immediate saves spend it; the regular autosave does not.
 const WRITE_BURST=30,WRITE_REFILL=6000;
 const spendWrite=s=>{const now=Date.now();s.writeBudget=Math.min(WRITE_BURST,(s.writeBudget??WRITE_BURST)+(now-(s.writeBudgetAt??now))/WRITE_REFILL);s.writeBudgetAt=now;if(s.writeBudget<1)return false;s.writeBudget--;return true;};
 async function persistPets(s,action){
  if(s.trainingBusy||s.closing)throw Error('server-busy');s.trainingBusy=true;s.peer.petMutationBusy=true;
  const job=s.queue.catch(()=>{}).then(async()=>{
   if(!spendWrite(s))throw Error('rate-limit');
   const result=petAccountAction(s.peer.petCollection,action,()=>randomInt(1000000000)/1000000000);if(result.replayed)return result;
   const record=realm.record(s.peer,s.lease.record);record.petCollection=result.state;
   let timer;try{await Promise.race([store.checkpoint(s.lease,record),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('save-timeout')),15000);})]);}
   catch(error){s.closing=true;s.peer.suspended=true;s.released=true;realm.leave(s.peer.id);s.ws.close(4010,'save-failed');throw error;}finally{clearTimeout(timer);} // Reconnect reloads the durable receipt without writing the old collection over it.
   s.peer.petCollection=result.state;realm.refreshStats(s.peer);s.autoSavedAt=Date.now();s.savedJson=null;return result;
  });s.queue=job.catch(()=>{});try{return await job;}finally{s.trainingBusy=false;s.peer.petMutationBusy=false;}
 }
 async function persistMail(s,apply){
  if(s.trainingBusy||s.closing||s.peer.trade)throw Error('server-busy');s.trainingBusy=true;s.peer.petMutationBusy=true;s.peer.mailMutationBusy=true;
  const job=s.queue.catch(()=>{}).then(async()=>{const before=realm.record(s.peer,s.lease.record),same=JSON.stringify(before),record=apply(before);let timer;
   if(JSON.stringify(record)===same)return record; // re-reading a read mail, deleting nothing: no write
   if(!spendWrite(s))throw Error('rate-limit');
   try{await Promise.race([store.checkpoint(s.lease,record),new Promise((_,no)=>{timer=setTimeout(()=>no(Error('save-timeout')),15000);})]);}
   catch(error){s.closing=true;s.released=true;realm.leave(s.peer.id);s.ws.close(4010,'save-failed');throw error;}finally{clearTimeout(timer);}
   Object.assign(s.peer.character,record.character);s.peer.identityReceipts=record.identityReceipts??s.peer.identityReceipts;s.peer.mailbox=record.mailbox;realm.setBag(s.peer,record.bag);s.peer.petCollection=record.petCollection??s.peer.petCollection;realm.refreshStats(s.peer);s.autoSavedAt=Date.now();s.savedJson=null;return record;
  });s.queue=job.catch(()=>{});try{return await job;}finally{s.trainingBusy=false;s.peer.petMutationBusy=false;s.peer.mailMutationBusy=false;if(!s.closing){for(const gift of s.peer.mailLootQueue??[])realm.grantLoot(s.peer,gift.loot,gift.at);}s.peer.mailLootQueue=[];}
 }
 wss.on('connection',(ws,req)=>{
  let session=null,authenticating=false;ws.alive=true;
  const settled=req.settled;
  const send=data=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256000){ws.close(4009,'slow-client');return;}const raw=JSON.stringify(data);metrics.bytesSent+=Buffer.byteLength(raw);metrics.messagesSent++;ws.send(raw);}};
  const timer=setTimeout(()=>{if(!session)ws.close(4001,'authentication-required');},8000);
  ws.on('pong',()=>{ws.alive=true;});
  ws.on('message',async raw=>{
   let message;try{message=JSON.parse(raw.toString());}catch{ws.close(4002,'invalid-json');return;}
   if(!message||typeof message!=='object'||Array.isArray(message)){ws.close(4002,'invalid-message');return;}
   if(reset?.maintenance){send({type:'error',code:'world-reset'});ws.close(4012,'world-reset');return;}
   if(session){if(session.closing||session.trainingBusy){if(message.type==='save'&&typeof message.id==='string'){const id=message.id.slice(0,50);session.queue.then(()=>send({type:'saved',id}),()=>{});return;} // the busy job checkpoints; answer once it lands
    if(!['input','ping'].includes(message.type)){const reply=['renameBuy','renameUse','revivalBuy'].includes(message.type)?'identityError':MAIL_ACTIONS.includes(message.type)?'mailError':PET_MUTATIONS.includes(message.type)?'petError':{equip:'equipment-error',train:'training-error',walkTo:'walkError',walkPace:'walkError'}[message.type];send(reply&&typeof message.id==='string'?{type:reply,id:message.id,code:'server-busy'}:{type:'error',code:'server-busy'});}return;}if(Date.now()>session.expires){ws.close(4001,'token-expired');return;}
    if(['renameBuy','renameUse','revivalBuy'].includes(message.type)){
     const p=session.peer,id=message.id;
     if(typeof id!=='string'||id.length>80||!Number.isSafeInteger(message.seq)||message.seq<=p.seq||p.bucket<1){send({type:'identityError',id,code:'rate-limit'});return;}p.seq=message.seq;p.bucket--;
     if(p.duel||p.room.map.id==='duel-arena'){send({type:'identityError',id,code:'arena-busy'});return;}
     try{await persistMail(session,r=>identityAction(r,message));if(message.type!=='revivalBuy'){realm.renamed(p);realm.evidence(p,'rename',{action:message.type});}else realm.evidence(p,'revivalPurchase',{gold:200});send({type:'identityChanged',id,character:p.character,bag:p.bag,petCollection:publicPetAccount(p.petCollection)});}
     catch(e){send({type:'identityError',id,code:e.message});}return;
    }
    if(MAIL_ACTIONS.includes(message.type)){
     const p=session.peer,id=message.id;if(typeof id!=='string'||id.length>80||!Number.isSafeInteger(message.seq)||message.seq<=p.seq||p.bucket<1){send({type:'mailError',id,code:'rate-limit'});return;}p.seq=message.seq;p.bucket--;
     if(message.type!=='mailList')realm.evidence(p,'mail',{action:message.type,mail:typeof message.mailId==='string'?message.mailId.slice(0,80):null});
     try{let bulk;if(message.type!=='mailList')await persistMail(session,r=>{if(['mailClaimAll','mailDeleteAll'].includes(message.type)){const result=mailboxBulkAction(r,message,realm.mailAnnouncements??[]);bulk=result.summary;return result.record;}return mailboxAction(r,message,realm.mailAnnouncements??[]);});send({type:'mailChanged',id,mails:publicInbox(p.mailbox,realm.mailAnnouncements??[],p.serverId),summary:inboxSummary(p.mailbox,realm.mailAnnouncements??[],p.serverId),petCollection:publicPetAccount(p.petCollection),bag:p.bag,...(bulk?{bulk}:{})});}
     catch(e){send({type:'mailError',id,code:e.message});}return;
    }
    if(PET_MUTATIONS.includes(message.type)){
     const p=session.peer,id=message.id;
     if(!Number.isSafeInteger(message.seq)||message.seq<=p.seq||p.bucket<1){send({type:'petError',id,code:'rate-limit'});return;}p.seq=message.seq;p.bucket--;
     realm.evidence(p,'pet',{action:message.type,request:typeof id==='string'?id.slice(0,80):null});
     try{const r=await persistPets(session,{...message,requestId:id});send({type:'petChanged',id,petCollection:publicPetAccount(r.state),results:r.result.results??[],replayed:r.replayed});}
     catch(e){send({type:'petError',id,code:e.message});}return;
    }
    // 0.97 outfit changes carry a request id; stat gear from the bag (equip without id) goes on to the realm.
    if(message.type==='equip'&&typeof message.id==='string'){
     if(message.id.length>50)return;
     if(Date.now()-(session.equippedAt??0)<350||!spendWrite(session)){send({type:'equipment-error',id:message.id,code:'action-rate'});return;}
     let equipment;try{equipment=equipItem(session.peer.equipment,session.peer.character.classId,message.item);}catch(e){send({type:'equipment-error',id:message.id,code:e.message});return;}
     session.equippedAt=Date.now();session.trainingBusy=true;
     const previous=session.peer.equipment;session.peer.equipment=equipment;
     try{await checkpoint(session);send({type:'equipped',id:message.id,equipment});}
     catch{session.peer.equipment=previous;session.closing=true;send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}
     finally{session.trainingBusy=false;}return;
    }
    if(message.type==='train'){
     if(typeof message.id!=='string'||message.id.length>50)return;
     if(Date.now()-(session.trainedAt??0)<1200){send({type:'training-error',id:message.id,code:'action-rate'});return;}session.trainedAt=Date.now();
     let result;try{result=trainingAction(realm.record(session.peer,session.lease.record),message.mentor,message.action,message.jobId,session.peer.bag);}catch(e){send({type:'training-error',id:message.id,code:e.message});return;}
     session.trainingBusy=true;session.peer.suspended=true;session.peer.input={x:0,z:0,attack:false};session.peer.training=result.training;if(result.bag){realm.setBag(session.peer,result.bag);delete result.bag;} // 0.98 trial materials and cowries paid
     if(result.advanced){session.closing=true;session.explicitLeave=true;session.peer.stats=statsAfterClassChange(session.peer.character,result.character,session.peer.stats);result.statReset=true;session.peer.character=result.character;session.peer.world.jobXp=0;session.peer.skills=normalizeSkills(session.peer.skills,result.character.classId);}
     try{await checkpoint(session,result.advanced);send({type:'trained',id:message.id,...result});if(result.advanced){realm.leave(session.peer.id);ws.close(1000,'trained');}else session.peer.suspended=false;}
     catch{session.closing=true;send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}finally{session.trainingBusy=false;}return;
    }
    if(message.type==='save'){if(typeof message.id!=='string'||message.id.length>50)return;
     const settings=message.settings;if(settings&&Number.isFinite(settings.zoom)&&Number.isFinite(settings.azimuth)&&typeof settings.motion==='boolean')session.peer.settings={zoom:Math.max(.65,Math.min(2.7,settings.zoom)),azimuth:settings.azimuth%(Math.PI*2),motion:settings.motion};
     const recent=Date.now()-(session.savedAt??0)<2500;session.savedAt=Date.now();
     // Out of budget: the next autosave tick (10 s) writes it instead.
     const deferred=!recent&&!spendWrite(session);if(deferred)session.peer.saveNow=true;
     try{if(recent||deferred)await session.queue;else await checkpoint(session);send({type:'saved',id:message.id});}catch{send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}return;}
    if(message.type==='travel'){
     if(typeof message.id!=='string'||message.id.length>50||typeof message.destination!=='string')return;
     let destination;try{destination=realm.travelDestination(session.peer,message.destination,{warp:message.warp===true,respawn:message.respawn===true});}catch(e){send({type:'travel-error',id:message.id,code:e.message});return;}
     session.closing=true;session.explicitLeave=true;session.peer.suspended=true;
     const record=realm.record(session.peer,session.lease.record);record.state.mapId=destination.id;record.state.position={...destination.spawn};
     if(message.respawn===true){record.state.traveler.hp=session.peer.world.player.maxHp;record.state.traveler.mp=session.peer.world.player.maxMp;if(record.roleCooldowns)record.roleCooldowns.down=0;}
     session.travelRecord=record;
     realm.evidence(session.peer,'travel',{to:destination.id,warp:message.warp===true,respawn:message.respawn===true});
     logTravel(realm.logs,realm.now(),session.peer.character.name,session.peer.channel??1,session.peer.room?.map?.id,destination.id,message.warp===true);
     try{await checkpoint(session,true);realm.leave(session.peer.id,{travel:true});send({type:'traveled',id:message.id});ws.close(1000,'traveled');}catch{send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}return;
    }
    if(message.type==='leave'){session.closing=true;session.explicitLeave=true;session.peer.suspended=true;try{await checkpoint(session,true);send({type:'left'});ws.close(1000,'left');}catch{send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}return;}
    realm.receive(session.peer.id,message);return;
   }
   if(authenticating)return;authenticating=true;let lease,identity,claimed=false,observer=false;
   try{
    if(message.type!=='join'||typeof message.token!=='string'||message.token.length>4000)throw new Error('authentication-required');
    let verified;if(mode==='local'){const uid=store.verifyLocal(message.token);if(!uid)throw new Error('invalid-token');verified={uid,exp:Math.floor(Date.now()/1000)+3600};}else verified=await authenticate(message.token);
    identity={uid:verified.uid,serverId:message.serverId,slotId:message.slotId};
    // 0.119 observer mode: only the verified e-mails on its own list (a local dev realm has no e-mail, so every local player may test it)
    observer=mode==='local'||canObserve(verified,observerEmails(process.env,observerSaved));
    if(reset?.maintenance)throw Error('world-reset');
    if(!['server-1','server-2'].includes(identity.serverId)||!/^slot-[1-5]$/.test(identity.slotId??''))throw new Error('invalid-identity');
    if(joinPending.has(identity.uid))throw new Error('already-online');joinPending.add(identity.uid);claimed=true;
    // 0.61.2 the newest login wins (Ragnarok style): the old window is told it was replaced, saves and closes first.
    const old=[...sessions.values()].find(s=>s.lease?.identity?.uid===identity.uid&&!s.closing);
    if(old?.background){await finishBackground(old);}else if(old){const closed=new Promise(r=>{old.onClosed=r;});try{old.ws.send(JSON.stringify({type:'error',code:'replaced'}));}catch{}old.ws.close(4009,'replaced');await Promise.race([closed,new Promise(r=>setTimeout(r,8000))]);}
    if(reset?.maintenance)throw Error('world-reset');
    lease=await store.acquire(identity,randomUUID(),{takeover:true});if(reset?.maintenance)throw Error('world-reset');if(ws.readyState!==WebSocket.OPEN)throw new Error('connection-closed');
    // Send welcome after the full authenticated session exists.
    if(lease.record.state.mapId==='duel-arena'&&!arenaReservation(realm,identity.uid+':'+identity.slotId)){lease.record.state.mapId=catalog.capital;lease.record.state.position={...catalog.maps.find(m=>m.id===catalog.capital).spawn};await store.checkpoint(lease,lease.record);}
    if(reset?.maintenance)throw Error('world-reset');
    const queued=[],peer=realm.join({...identity,canObserve:observer,...(message.channel!==undefined?{channel:message.channel}:{}),record:lease.record,send:data=>queued.push(data)});
    peer.ip=requestIp(req);peer.observerEmail=verified.email_verified===true?String(verified.email??'').toLowerCase():'';realm.evidence(peer,'login',{agent:String(req.headers['user-agent']??'').slice(0,200)});
    session={peer,lease,ws,queue:Promise.resolve(),autoSavedAt:Date.now(),savedJson:null,expires:verified.exp*1000,closing:false,released:false};sessions.set(peer.id,session);peer.send=send;clearTimeout(timer);settled();queued.forEach(send);
   }catch(e){if(lease)await store.checkpoint(lease,lease.record,{release:true}).catch(()=>{});send({type:'error',code:['world-reset','already-online','room-full','character-not-found','character-server'].includes(e.message)?e.message:'authentication-failed'});ws.close(4003,'join-rejected');}
   finally{if(claimed)joinPending.delete(identity.uid);}
  });
  ws.on('close',()=>{clearTimeout(timer);settled();if(session)realm.evidence(session.peer,'logout',{explicit:!!session.explicitLeave});if(session&&!session.explicitLeave&&!session.closing&&session.peer.routeWalker?.active){session.background=true;session.backgroundUntil=Math.min(session.expires,Date.now()+600000);session.peer.input={x:0,z:0,attack:false,run:false};checkpoint(session).catch(()=>finishBackground(session));return;}if(session){session.closing=true;realm.suspend(session.peer.id);checkpoint(session,true).catch(()=>{}).finally(()=>{if(sessions.get(session.peer.id)===session){if(session.explicitLeave)realm.leave(session.peer.id);sessions.delete(session.peer.id);}session.onClosed?.();});}});
  ws.on('error',()=>{});
 });
 // Step by real elapsed time in fixed 50 ms slices: timers fire late (especially on Windows), and a fixed
 // step per callback ran the world ~20% slow, so predicted clients were pulled back when they stopped.
 let lastTick=performance.now(),carry=0;
 const tick=setInterval(()=>{const now=performance.now();carry=Math.min(.25,carry+(now-lastTick)/1000);lastTick=now;if(reset?.maintenance){carry=0;return;}if(!authoritative()){carry=0;for(const s of sessions.values()){s.peer.suspended=true;s.closing=true;s.ws.close(4011,'authority-lost');}return;}while(carry>=.05){carry-=.05;realm.step(.05);}},50);
 // Waiting for authority: retry every 5 s (a read while another host holds it). Holding it: renew every 40 s, but
 // after a failed renewal retry in 5 s (0.114.2) - two 40 s misses used to outlive the lease and kick everyone.
 let authority=null;const scheduleRenew=()=>{authority=setTimeout(async()=>{await renew();if(!closing)scheduleRenew();},authoritative()&&!authorityError?AUTHORITY_RENEW:5000);};await renew();scheduleRenew();
 // Save only what changed, at most once a minute; an idle player just keeps the lease alive (see storage.js budget).
 const dueForSave=s=>{if(s.peer.saveNow){s.peer.saveNow=false;return true;} // trades / stall sales save at once
  const age=Date.now()-(s.autoSavedAt??0);if(age<SAVE_MIN_GAP)return false;return age>=SAVE_MAX_GAP||JSON.stringify(realm.record(s.peer,s.lease.record))!==s.savedJson;};
 const autosave=setInterval(()=>{if(reset?.maintenance)return;for(const s of sessions.values())if(!s.closing&&dueForSave(s))checkpoint(s).catch(()=>{s.closing=true;s.peer.send({type:'error',code:'save-failed'});s.ws.close(4010,'save-failed');});},10000);
 const backgroundWalks=setInterval(()=>{if(reset?.maintenance)return;for(const s of sessions.values())if(s.background&&!s.closing&&(!s.peer.routeWalker?.active||Date.now()>=s.backgroundUntil))finishBackground(s);},250);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
  lastLogSaveCount=realm.logs.length;
  const logSaver=setInterval(()=>{if(reset?.maintenance)return;if(authoritative())realm.mapBosses.persist()?.catch(()=>{});if(realm.logs.length!==lastLogSaveCount){lastLogSaveCount=realm.logs.length;trackWrite(store?.saveDashboardLogs?.(realm.logs)).catch(()=>{});}},10000);
 return {server,realm,wss,evidence,async close(){closing=true;await evidence?.stop();clearInterval(tick);clearInterval(authority);clearInterval(autosave);clearInterval(heartbeat);clearInterval(backgroundWalks);clearInterval(logSaver);if(!reset?.maintenance){
  // 0.114.2 a redeploy gives us ~9 s: players' progress first (all at once, 6 s cap), then shops, bosses, guild/leader/
  // price changes and logs together, and the authority release last so the next host can start at once.
  const capped=(p,ms)=>{let t;return Promise.race([Promise.resolve(p).catch(()=>{}),new Promise(r=>{t=setTimeout(r,ms);})]).finally(()=>clearTimeout(t));};
  await capped(Promise.allSettled([...sessions.values()].map(s=>{s.closing=true;s.peer.suspended=true;return checkpoint(s,true);})),6000);
  const later=f=>Promise.resolve().then(f); // one failing save (even a synchronous throw) never stops the shutdown
  const dirty=[...[...realm.guildsDirty].filter(g=>realm.guilds.get(g.id)===g&&store?.saveGuild).map(g=>later(()=>store.saveGuild(g))),...[...realm.leadersDirty].filter(()=>store?.saveLeaders).map(id=>later(()=>store.saveLeaders(id,realm.leaders.get(id)))),...[...realm.pricesDirty].filter(()=>store?.savePrices).map(id=>later(()=>store.savePrices(id,realm.prices.get(id))))];
  await capped(Promise.allSettled([later(()=>realm.flushShops()),later(()=>realm.mapBosses.flush()).catch(e=>console.error('map-boss-save',e.message)),later(()=>store?.saveDashboardLogs?.(realm.logs)),...dirty]),1500);
 }for(const ws of wss.clients)ws.close(1012,'restart');await new Promise(resolve=>wss.close(resolve));server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));if(mode==='firebase')await store.releaseAuthority().catch(()=>{});}};
}
export async function start(){
 const mode=process.env.AUTH_MODE??'firebase',port=Number(process.env.PORT??8787),host=mode==='local'?'127.0.0.1':(process.env.HOST??'0.0.0.0');
 const origins=(process.env.ALLOWED_ORIGINS??(mode==='local'?`http://127.0.0.1:${port},http://localhost:${port},http://127.0.0.1:8870`:'' )).split(',').filter(Boolean);
 if(!origins.length)throw new Error('Set ALLOWED_ORIGINS to the exact game origins');
 let store,authenticate;
 if(mode==='local')store=await new LocalStore(path.join(root,'.local-multiplayer')).init();
 else{const {initializeApp,applicationDefault,cert}=await import('firebase-admin/app'),{getAuth}=await import('firebase-admin/auth'),{getFirestore}=await import('firebase-admin/firestore');
  const projectId=process.env.FIREBASE_PROJECT_ID;if(!projectId)throw new Error('FIREBASE_PROJECT_ID is required');
  const rawKey=process.env.FIREBASE_SERVICE_ACCOUNT??(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim().startsWith('{')?process.env.GOOGLE_APPLICATION_CREDENTIALS:null);const credential=rawKey?cert(JSON.parse(rawKey)):applicationDefault();const app=initializeApp({credential,projectId});store=new FirebaseStore(getFirestore(app));authenticate=token=>getAuth(app).verifyIdToken(token,true);
 }
 const service=await createHost({mode,store,authenticate,origins,capacity:Number(process.env.ROOM_CAPACITY??50),serveStatic:mode==='local'});
 await new Promise(resolve=>service.server.listen(port,host,resolve));console.log(`Multiplayer ${mode} listening on ${host}:${port}`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{const timer=setTimeout(()=>process.exit(1),9000);service.close().finally(()=>{clearTimeout(timer);process.exit(0);});});return service;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))start().catch(e=>{console.error(e.message);process.exitCode=1;});

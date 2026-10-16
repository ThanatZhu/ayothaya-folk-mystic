import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {RealmServer} from './realm.js';
import {equipItem} from '../equipment.js';
import {trainingAction} from '../city-life-data.js';
import {normalizeSkills} from '../skill-progress.js';
import {LocalStore,FirebaseStore,AUTHORITY_RENEW,SAVE_MIN_GAP,SAVE_MAX_GAP} from './storage.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function createHost({mode='firebase',store,catalog,origins=[],capacity=50,authenticate,serveStatic=false}={}){
 if(!['local','firebase'].includes(mode))throw new Error('invalid-auth-mode');
 if(!catalog)catalog=JSON.parse(await readFile(path.join(root,'maps/world.json'),'utf8'));
 // A replacement instance (zero-downtime redeploy) starts while the old one still owns the world.
 // It serves /health and answers sockets with 503 until the old lease is released or expires, then takes over.
 const authoritative=()=>mode!=='firebase'||Date.now()<=store.authorityUntil;
 let renewing=false,authorityError='';
 const renew=async()=>{if(mode!=='firebase'||renewing)return;renewing=true;try{await store.renewAuthority();if(authorityError){console.log('Multiplayer authority acquired');authorityError='';}}catch(e){if(e.message!==authorityError)console.error('Multiplayer authority unavailable: '+e.message);authorityError=e.message;}finally{renewing=false;}};
 if(!Number.isInteger(capacity)||capacity<2||capacity>100)throw new Error('ROOM_CAPACITY must be 2–100');
 const realm=new RealmServer({catalog,capacity}),sessions=new Map(),joinPending=new Set();let closing=false;
 // 0.47 guilds: loaded once, written on each change (rare: create/join/leave/emblem), outside the per-player saves.
 if(store?.loadGuilds){realm.guilds=new Map((await store.loadGuilds()).map(g=>[g.id,g]));store.realmGuilds=realm.guilds;realm.onGuild=(g,deleted)=>Promise.resolve(deleted?store.deleteGuild(g):store.saveGuild(g)).catch(e=>console.error('guild-save',e.message));}
 const allowedOrigin=origin=>origins.includes(origin);
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='OPTIONS'){if(!allowedOrigin(origin)){res.writeHead(403).end();return;}res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, GET');res.writeHead(204).end();return;}
  const url=new URL(req.url,'http://localhost'),reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(url.pathname==='/health'){reply(200,{contentVersion:catalog.version??0,commit:process.env.RENDER_GIT_COMMIT?.slice(0,7)??null,ok:!closing,authority:authoritative(),protocol:1,mode,players:realm.peers.size,rooms:realm.rooms.size,capacity});return;}
  if(mode==='local'&&url.pathname==='/dev/session'&&req.method==='POST'){
   if(!allowedOrigin(origin)){reply(403,{error:'origin'});return;}
   let data='',tooLarge=false;for await(const chunk of req){data+=chunk;if(data.length>1024){tooLarge=true;break;}}if(tooLarge){reply(413,{error:'too-large'});return;}
   try{if(store.rows.size>=1000)throw new Error('local-session-limit');const result=await store.createLocal(JSON.parse(data));reply(201,{token:result.token,slotId:'slot-1',serverId:'server-1',character:result.record.character});}catch{reply(400,{error:'invalid-character'});}return;
  }
  if(serveStatic&&mode==='local'&&req.method==='GET'){
   try{const decoded=decodeURIComponent(url.pathname),relative=decoded==='/'?'index.html':decoded.slice(1),base=path.join(root,'dist'),file=path.resolve(base,relative);
    if(!file.startsWith(base+path.sep)||relative.includes('..'))throw new Error('path');const body=await readFile(file),ext=path.extname(file);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.woff2':'font/woff2'}[ext]??'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(body);
   }catch{res.writeHead(404).end();}return;
  }
  reply(404,{error:'not-found'});
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  if(closing||req.url!=='/realtime'||!allowedOrigin(req.headers.origin)||wss.clients.size>=capacity*4+20){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
  if(!authoritative()){socket.write('HTTP/1.1 503 Service Unavailable\r\nRetry-After: 5\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 const checkpoint=(s,release=false)=>{s.queue=s.queue.catch(()=>{}).then(async()=>{if(s.released)return;const record=s.travelRecord??realm.record(s.peer,s.lease.record);await store.checkpoint(s.lease,record,{release});s.autoSavedAt=Date.now();s.savedJson=JSON.stringify(record);if(release)s.released=true;});return s.queue;};
 wss.on('connection',ws=>{
  let session=null,authenticating=false;ws.alive=true;
  const send=data=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256000){ws.close(4009,'slow-client');return;}ws.send(JSON.stringify(data));}};
  const timer=setTimeout(()=>{if(!session)ws.close(4001,'authentication-required');},8000);
  ws.on('pong',()=>{ws.alive=true;});
  ws.on('message',async raw=>{
   let message;try{message=JSON.parse(raw.toString());}catch{ws.close(4002,'invalid-json');return;}
   if(!message||typeof message!=='object'||Array.isArray(message)){ws.close(4002,'invalid-message');return;}
   if(session){if(session.closing||session.trainingBusy)return;if(Date.now()>session.expires){ws.close(4001,'token-expired');return;}
    if(message.type==='equip'){
     if(typeof message.id!=='string'||message.id.length>50)return;
     if(Date.now()-(session.equippedAt??0)<350){send({type:'equipment-error',id:message.id,code:'action-rate'});return;}
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
     let result;try{result=trainingAction(realm.record(session.peer,session.lease.record),message.mentor,message.action,message.jobId);}catch(e){send({type:'training-error',id:message.id,code:e.message});return;}
     session.trainingBusy=true;session.peer.suspended=true;session.peer.input={x:0,z:0,attack:false};session.peer.training=result.training;
     if(result.advanced){session.closing=true;session.explicitLeave=true;session.peer.character=result.character;session.peer.world.jobXp=0;session.peer.skills=normalizeSkills(session.peer.skills,result.character.classId);}
     try{await checkpoint(session,result.advanced);send({type:'trained',id:message.id,...result});if(result.advanced){realm.leave(session.peer.id);ws.close(1000,'trained');}else session.peer.suspended=false;}
     catch{session.closing=true;send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}finally{session.trainingBusy=false;}return;
    }
    if(message.type==='save'){if(typeof message.id!=='string'||message.id.length>50)return;
     const settings=message.settings;if(settings&&Number.isFinite(settings.zoom)&&Number.isFinite(settings.azimuth)&&typeof settings.motion==='boolean')session.peer.settings={zoom:Math.max(.65,Math.min(2.7,settings.zoom)),azimuth:settings.azimuth%(Math.PI*2),motion:settings.motion};
     const recent=Date.now()-(session.savedAt??0)<2500;session.savedAt=Date.now();try{if(recent)await session.queue;else await checkpoint(session);send({type:'saved',id:message.id});}catch{send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}return;}
    if(message.type==='travel'){
     if(typeof message.id!=='string'||message.id.length>50||typeof message.destination!=='string')return;
     let destination;try{destination=realm.travelDestination(session.peer,message.destination);}catch(e){send({type:'travel-error',id:message.id,code:e.message});return;}
     session.closing=true;session.explicitLeave=true;session.peer.suspended=true;
     const record=realm.record(session.peer,session.lease.record);record.state.mapId=destination.id;record.state.position={...destination.spawn};session.travelRecord=record;
     try{await checkpoint(session,true);realm.leave(session.peer.id,{travel:true});send({type:'traveled',id:message.id});ws.close(1000,'traveled');}catch{send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}return;
    }
    if(message.type==='leave'){session.closing=true;session.explicitLeave=true;session.peer.suspended=true;try{await checkpoint(session,true);send({type:'left'});ws.close(1000,'left');}catch{send({type:'error',code:'save-failed'});ws.close(4010,'save-failed');}return;}
    realm.receive(session.peer.id,message);return;
   }
   if(authenticating)return;authenticating=true;let lease,identity,claimed=false;
   try{
    if(message.type!=='join'||typeof message.token!=='string'||message.token.length>4000)throw new Error('authentication-required');
    let verified;if(mode==='local'){const uid=store.verifyLocal(message.token);if(!uid)throw new Error('invalid-token');verified={uid,exp:Math.floor(Date.now()/1000)+3600};}else verified=await authenticate(message.token);
    identity={uid:verified.uid,serverId:message.serverId,slotId:message.slotId};
    if(!['server-1','server-2'].includes(identity.serverId)||!/^slot-[1-5]$/.test(identity.slotId??''))throw new Error('invalid-identity');
    if(joinPending.has(identity.uid))throw new Error('already-online');joinPending.add(identity.uid);claimed=true;
    lease=await store.acquire(identity,randomUUID());if(ws.readyState!==WebSocket.OPEN)throw new Error('connection-closed');
    // Send welcome after the full authenticated session exists.
    const queued=[],peer=realm.join({...identity,record:lease.record,send:data=>queued.push(data)});
    session={peer,lease,ws,queue:Promise.resolve(),autoSavedAt:Date.now(),savedJson:null,expires:verified.exp*1000,closing:false,released:false};sessions.set(peer.id,session);peer.send=send;clearTimeout(timer);queued.forEach(send);
   }catch(e){if(lease)await store.checkpoint(lease,lease.record,{release:true}).catch(()=>{});send({type:'error',code:['already-online','room-full','character-not-found','character-server'].includes(e.message)?e.message:'authentication-failed'});ws.close(4003,'join-rejected');}
   finally{if(claimed)joinPending.delete(identity.uid);}
  });
  ws.on('close',()=>{clearTimeout(timer);if(session){session.closing=true;realm.suspend(session.peer.id);checkpoint(session,true).catch(()=>{}).finally(()=>{if(sessions.get(session.peer.id)===session){if(session.explicitLeave)realm.leave(session.peer.id);sessions.delete(session.peer.id);}});}});
  ws.on('error',()=>{});
 });
 // Step by real elapsed time in fixed 50 ms slices: timers fire late (especially on Windows), and a fixed
 // step per callback ran the world ~20% slow, so predicted clients were pulled back when they stopped.
 let lastTick=performance.now(),carry=0;
 const tick=setInterval(()=>{const now=performance.now();carry=Math.min(.25,carry+(now-lastTick)/1000);lastTick=now;if(mode==='firebase'&&Date.now()>store.authorityUntil){carry=0;for(const s of sessions.values()){s.peer.suspended=true;s.closing=true;s.ws.close(4011,'authority-lost');}return;}while(carry>=.05){carry-=.05;realm.step(.05);}},50);
 // Waiting for authority: retry every 5 s (a read while another host holds it). Holding it: renew every 40 s.
 let authority=null;const scheduleRenew=()=>{authority=setTimeout(async()=>{await renew();if(!closing)scheduleRenew();},authoritative()?AUTHORITY_RENEW:5000);};await renew();scheduleRenew();
 // Save only what changed, at most once a minute; an idle player just keeps the lease alive (see storage.js budget).
 const dueForSave=s=>{if(s.peer.saveNow){s.peer.saveNow=false;return true;} // trades / stall sales save at once
  const age=Date.now()-(s.autoSavedAt??0);if(age<SAVE_MIN_GAP)return false;return age>=SAVE_MAX_GAP||JSON.stringify(realm.record(s.peer,s.lease.record))!==s.savedJson;};
 const autosave=setInterval(()=>{for(const s of sessions.values())if(!s.closing&&dueForSave(s))checkpoint(s).catch(()=>{s.closing=true;s.peer.send({type:'error',code:'save-failed'});s.ws.close(4010,'save-failed');});},10000);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
 return {server,realm,wss,async close(){closing=true;clearInterval(tick);clearInterval(authority);clearInterval(autosave);clearInterval(heartbeat);await Promise.allSettled([...sessions.values()].map(s=>{s.closing=true;s.peer.suspended=true;return checkpoint(s,true);}));for(const ws of wss.clients)ws.close(1012,'restart');await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));if(mode==='firebase')await store.releaseAuthority().catch(()=>{});}};
}
export async function start(){
 const mode=process.env.AUTH_MODE??'firebase',port=Number(process.env.PORT??8787),host=mode==='local'?'127.0.0.1':(process.env.HOST??'0.0.0.0');
 const origins=(process.env.ALLOWED_ORIGINS??(mode==='local'?`http://127.0.0.1:${port},http://localhost:${port},http://127.0.0.1:8870`:'' )).split(',').filter(Boolean);
 if(!origins.length)throw new Error('Set ALLOWED_ORIGINS to the exact game origins');
 let store,authenticate;
 if(mode==='local')store=await new LocalStore(path.join(root,'.local-multiplayer')).init();
 else{const {initializeApp,applicationDefault}=await import('firebase-admin/app'),{getAuth}=await import('firebase-admin/auth'),{getFirestore}=await import('firebase-admin/firestore');
  const projectId=process.env.FIREBASE_PROJECT_ID;if(!projectId)throw new Error('FIREBASE_PROJECT_ID is required');
  const app=initializeApp({credential:applicationDefault(),projectId});store=new FirebaseStore(getFirestore(app));authenticate=token=>getAuth(app).verifyIdToken(token,true);
 }
 const service=await createHost({mode,store,authenticate,origins,capacity:Number(process.env.ROOM_CAPACITY??50),serveStatic:mode==='local'});
 await new Promise(resolve=>service.server.listen(port,host,resolve));console.log(`Multiplayer ${mode} listening on ${host}:${port}`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{const timer=setTimeout(()=>process.exit(1),9000);service.close().finally(()=>{clearTimeout(timer);process.exit(0);});});return service;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))start().catch(e=>{console.error(e.message);process.exitCode=1;});

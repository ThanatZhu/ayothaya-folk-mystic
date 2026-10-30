import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import http from 'node:http';import {pathToFileURL} from 'node:url';
import {createHost} from '../server/host.js';import {LocalStore} from '../server/storage.js';import {readPublicFile} from '../server/public-files223.js';import {initialSave} from '../realm-state.js';import {thaiDay} from '../daily.js';import {levelStart,XP_CURVE} from '../experience.js';import {petAccountAction} from '../pet-account.js';import {ITEMS} from '../items.js';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);}
const out=path.resolve(process.env.QA_LIVE_RELEASE_URL?'outputs/update-farming-live':'outputs/update-farming227');fs.mkdirSync(out,{recursive:true});
const next=JSON.parse(fs.readFileSync('release.json','utf8')).id,previous=process.env.QA_PREVIOUS_RELEASE??'r226-20261030';
assert.notEqual(next,previous);assert.ok(fs.existsSync('dist/releases/'+previous+'/viewer-world.js'));
let active=previous;const currentHTML=fs.readFileSync('dist/game.html','utf8'),catalog=JSON.parse(fs.readFileSync('maps/world.json','utf8')),map=catalog.maps.find(m=>m.id==='rice-fields');
const store=await new LocalStore(fs.mkdtempSync(path.join(out,'store-'))).init(),origins=[],host=await createHost({mode:'local',store,catalog,origins,serveStatic:false,prologue:false});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const backend='http://127.0.0.1:'+host.server.address().port;
const front=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://front'),file=decodeURIComponent(url.pathname.slice(1));
 if(file==='release.json'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({schema:1,id:active,protocol:1}));return;}
 if(file==='game.html'){res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');res.end(currentHTML.replace(/<base href="[^"]*">/,'<base href="/releases/'+active+'/">').replace(/(<meta name="ayothaya-release" content=")[^"]*"/,'$1'+active+'"'));return;}
 let bytes=await readPublicFile(path.resolve('dist'),file);
 if(file.endsWith('/multiplayer-config.js'))bytes=Buffer.from(bytes.toString().replace('ws://127.0.0.1:8787/realtime',backend.replace('http','ws')+'/realtime'));
 if(file.endsWith('/viewer-world.js'))bytes=Buffer.from(bytes.toString().replace('window.__ayothaya={game,','window.__ayothaya={get account(){return account;},game,'));
 const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg'})[ext]??'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404).end();}});
await new Promise(r=>front.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+front.address().port;origins.push(base);
const browser=await playwright.chromium.launch({channel:process.env.QA_BROWSER_CHANNEL??'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const clients=[],errors=[],missing=[];let failed=false;
async function join(name,channel){
 const who=await store.createLocal({name,gender:'male'}),record=store.rows.get(who.uid);
 let pets=petAccountAction(null,{type:'petGrant',pet:'rice-rabbit',gems:0,requestId:'qa-update-grant-001'}).state;pets=petAccountAction(pets,{type:'petEquip',pet:'rice-rabbit',requestId:'qa-update-equip-001'}).state;pets.auto=false;
 const weapon=Object.keys(ITEMS).find(id=>{const it=ITEMS[id];return it.kind==='gear'&&it.slot==='weapon'&&it.classes?.includes('swordsman')&&(it.level??1)<=30&&(it.atk??0)>40;})??'weapon-swordsman-one';
 Object.assign(record,{character:{...record.character,classId:'swordsman'},state:{...initialSave(),mapId:map.id,channel,position:map.spawn,traveler:{...initialSave().traveler,baseXp:levelStart(30),jobXp:0,hp:99999}},daily:{day:thaiDay(Date.now()),streak:1},xpCurve:XP_CURVE,bag:{coins:0,slots:100,items:{}},gear:{weapon},petCollection:pets});
 const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:path.join(out,name),size:{width:1280,height:800}}}),page=await context.newPage(),client={context,page,who,closes:0,urls:[]};clients.push(client);
 page.on('websocket',ws=>ws.on('close',()=>client.closes++));page.on('framenavigated',f=>{if(f===page.mainFrame())client.urls.push(f.url());});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.addInitScript(({token,record,channel})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya-channel-v1',String(channel));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:15}));localStorage.setItem('ayothaya-audio',JSON.stringify({music:0,sfx:0}));},{token:who.token,record,channel});
 await page.goto(base+'/game.html?server=server-1&map='+map.id+'&channel='+channel,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__ayothaya?.game.world.networkSelfId,{},{timeout:120000});
 client.peer=[...host.realm.peers.values()].find(p=>p.uid===who.uid);assert.ok(client.peer);client.peer.story=null;for(const m of client.peer.room.mobs){m.hp=0;m.dead=1e9;}
 await page.waitForTimeout(600);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));return client;
}
const progress=peer=>({kills:peer.world.kills,xp:peer.world.baseXp,coins:peer.bag.coins,items:Object.values(peer.bag.items).reduce((a,b)=>a+b,0)});
function wave(peer,start){
 const p=peer.world.player,mobs=peer.room.mobs.slice(start,start+3);assert.equal(mobs.length,3);
 for(let i=0;i<mobs.length;i++){const m=mobs[i];m.x=p.x+1.3+i*.22;m.z=p.z+i*.1;m.homeX=m.x;m.homeZ=m.z;m.hp=m.maxHp=12;m.dead=0;m.leader=false;m.deadBy=null;}
}
async function until(test,label,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(test())return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out: '+label);}
try{
 const stay=await join('FarmStay',1),update=await join('FarmUpdate',2),peer=stay.peer,initial=progress(peer);
 assert.equal(await stay.page.locator('meta[name="ayothaya-release"]').getAttribute('content'),previous);
 wave(peer,0);await stay.page.evaluate(()=>__ayothaya.game.world.setAuto(true));
 await until(()=>peer.world.kills>initial.kills&&peer.world.baseXp>initial.xp&&peer.bag.coins>initial.coins,'baseline combat and companion pickup',45000);
 const before=progress(peer),stayURL=stay.page.url(),peerId=peer.id,closes=stay.closes,navsBefore=stay.urls.length;
 console.log(JSON.stringify({phase:'ready-for-publication',previous,next,before}));
 if(process.env.QA_LIVE_RELEASE_URL){const deadline=Date.now()+360000;let ready=false;while(Date.now()<deadline){try{const r=await fetch(process.env.QA_LIVE_RELEASE_URL+'?qa='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(8000)});if(r.ok&&(await r.json()).id===next){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,2000));}assert.equal(ready,true,'published release must become visible');}
 active=next;await stay.page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await update.page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await stay.page.locator('#game-update223:not([hidden])').waitFor({timeout:15000});await update.page.locator('#game-update223:not([hidden])').waitFor({timeout:15000});
 wave(peer,3);await until(()=>peer.world.kills>before.kills&&peer.world.baseXp>before.xp&&peer.bag.coins>before.coins,'farming while update notice remains unclicked',45000);
 const during=progress(peer);assert.equal(stay.closes,closes);assert.equal(stay.page.url(),stayURL);assert.equal(host.realm.peers.get(peerId),peer);
 await stay.page.screenshot({path:path.join(out,'old-client-still-farming.png')});
 const late=await stay.page.evaluate(async url=>{const r=await fetch(url,{cache:'reload'});return {status:r.status,text:await r.text()};},'/releases/'+previous+'/update-notice223.js');assert.equal(late.status,200);assert.equal(late.text,fs.readFileSync('dist/releases/'+previous+'/update-notice223.js','utf8'));
 await update.page.evaluate(()=>{const a=__ayothaya.account,save=a.save.bind(a);a.save=()=>new Promise((resolve,reject)=>{window.releaseSaved=async()=>{try{resolve(await save());}catch(e){reject(e);}};});});
 const updaterURL=update.page.url();await update.page.locator('#game-update223 button').click();await update.page.waitForFunction(()=>typeof releaseSaved==='function');assert.equal(update.page.url(),updaterURL);assert.equal(stay.closes,closes);
 wave(peer,6);await update.page.evaluate(()=>releaseSaved());await update.page.waitForURL(url=>url.searchParams.get('release')===next,{timeout:40000});await update.page.waitForFunction(()=>!!window.__ayothaya?.game.world.networkSelfId,{},{timeout:120000});
 assert.equal(await update.page.locator('meta[name="ayothaya-release"]').getAttribute('content'),next);
 await until(()=>peer.world.kills>during.kills&&peer.world.baseXp>during.xp&&peer.bag.coins>during.coins,'other player continues through manual update',45000);
 const after=progress(peer);assert.equal(stay.urls.length,navsBefore,'old client must never navigate');assert.equal(stay.closes,closes);assert.equal(stay.page.url(),stayURL);assert.equal(host.realm.peers.get(peerId),peer);assert.equal(await stay.page.evaluate(()=>__ayothaya.game.networkStatus),'online');
 assert.equal(await stay.page.locator('meta[name="ayothaya-release"]').getAttribute('content'),previous);assert.deepEqual(errors,[]);
 const known=/\/assets\/audio180\/(?:swing[0-2]|hit[0-2]|crit|cast|potion|defeat|dodge|hurt|level|fanfare|chime|rare|coin|forge|click)\.mp3/;assert.deepEqual(missing.filter(u=>!known.test(u)),[]);
 await stay.page.screenshot({path:path.join(out,'after-other-player-updated.png')});await update.page.screenshot({path:path.join(out,'updated-player.png')});
 const report={previous,next,realWebGL:true,separateFrontendAndAuthority:true,authorityNeverReplaced:true,oldClientSocketCloses:stay.closes-closes,oldClientNavigations:stay.urls.length-navsBefore,oldClientReleaseRemains:previous,newClientRelease:next,baseline:before,whileNoticeVisible:during,afterOtherPlayerUpdates:after,lateOldRuntimeLoads:true,saveBeforeNavigation:true,errors,changedAssetFailures:0,knownAudioFailures:missing.filter(u=>known.test(u)).length};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){failed=true;console.error(e);for(const c of clients){console.error(c.who.uid,progress(c.peer??{world:{},bag:{coins:0,items:{}}}));try{await c.page.screenshot({path:path.join(out,'failure-'+c.who.uid+'.png')});}catch{}}process.exitCode=1;
}finally{for(const c of clients)await c.context.close();await browser.close();await host.close();front.closeAllConnections?.();await new Promise(r=>front.close(r));}

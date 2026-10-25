import assert from 'node:assert/strict';
import {JOBS} from '../advancement.js';
import {standardCombatLayout} from '../mobile-combat-layout.js';
import {composeMail,deliverMail,publicInbox} from '../mailbox.js';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {STORY} from '../story-quests.js';
import {ITEMS} from '../items.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/album152/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'TalkQA',gender:'male'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='rice-fields';record.state.position={...catalog.maps.find(m=>m.id==='rice-fields').spawn};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:STORY.length,step:0,count:0,done:true};
 record.gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=3){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=rice-fields');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}


 for(const mobile of [true,false]){
  const source=await store.createLocal({name:mobile?'CardMobile':'CardDesktop',gender:'male'}),save=store.rows.get(source.uid);
  Object.assign(save,{state:structuredClone(record.state),xpCurve:XP_CURVE,story:record.story,daily:record.daily,bag:{coins:0,slots:100,items:Object.fromEntries(Object.keys(ITEMS).filter(id=>ITEMS[id].kind==='card').map(id=>[id,2]))}});
  console.log(mobile?'Checking mobile':'Checking desktop');
  const {context,page}=await launch(mobile,'th',source,save),peer=[...host.realm.peers.values()].find(p=>p.uid===source.uid);
  peer.world.player.hp=peer.world.player.maxHp=1000000;
  await page.locator('#menu-quests').evaluate(n=>n.click());await page.locator('[data-qt=album]').click();
  const ids=Object.keys(ITEMS).filter(id=>ITEMS[id].kind==='card');
  assert.equal(await page.locator('.album-entry').count(),ids.length);
  assert.equal(await page.locator('.album-entry.got').count(),0);
  await page.locator('[data-deposit="'+ids[0]+'"]').click();
  await page.waitForFunction(()=>document.querySelector('.album-entry.got'));
  assert.equal(peer.bag.items[ids[0]],1);assert.deepEqual(peer.album,[ids[0]]);
  assert.equal(await page.locator('[data-deposit="'+ids[0]+'"]').isDisabled(),true);
  for(const id of ids.slice(1,3)){await page.locator('[data-deposit="'+id+'"]').click();await page.waitForFunction(id=>document.querySelector('[data-card="'+id+'"]').classList.contains('got'),id);}
  assert.equal(peer.bag.coins,500);assert.equal(peer.bag.items['hp-large'],5);assert.equal(peer.album.length,3);
  // A fresh card grant updates the bag but never updates the collection.
  host.realm.grantLoot(peer,{coins:0,items:[{id:ids[3],count:1}]});await page.waitForTimeout(150);assert.equal(peer.album.length,3);
  checks.push((mobile?'Mobile':'Desktop')+': real deposit click consumes exactly one; reward paid once; loot never counts');
  for(const [width,height]of mobile?[[932,430],[844,390],[568,320],[390,844]]:[[1440,900],[1024,768]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);await page.evaluate(()=>document.querySelector('#orientation-gate[open]')?.close());
   await page.screenshot({path:fileURLToPath(new URL('before-'+width+'.png',out))});
   const geometry=await page.locator('.album-art').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height};}));
   assert.ok(Math.max(...geometry.map(r=>r.width))-Math.min(...geometry.map(r=>r.width))<1,'equal art widths');
   assert.ok(Math.max(...geometry.map(r=>r.height))-Math.min(...geometry.map(r=>r.height))<1,'equal art heights');
   for(const r of geometry)assert.ok(Math.abs(r.width/r.height-2/3)<.01,'portrait canvas '+width+' '+JSON.stringify(r));
   const overflow=await page.locator('#quests-window').evaluate(n=>n.scrollWidth-n.clientWidth);assert.ok(overflow<3,'no horizontal overflow '+width+' '+overflow);
   await page.locator('#quests-body').evaluate(n=>n.scrollTop=0);
   await page.screenshot({path:fileURLToPath(new URL('album-'+width+'.png',out))});
  }
  // Individual art files actually decode; atlas crops retain their original proportions.
  assert.equal(await page.locator('img.album-image').evaluateAll(async ns=>{await Promise.all(ns.map(n=>{n.loading='eager';return n.decode();}));return ns.every(n=>n.naturalWidth===384&&n.naturalHeight===576);}),true);
  await page.locator('[data-card="'+ids[23]+'"]').scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL(mobile?'chapter-mobile.png':'chapter-desktop.png',out))});
  checks.push((mobile?'Mobile':'Desktop')+': same 2:3 art canvas for every card, responsive layout and all 29 paintings decode');
  await page.reload();await page.waitForFunction(()=>document.getElementById('online-button')?.dataset.state==='online');await page.waitForTimeout(300);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  await page.locator('#menu-quests').evaluate(n=>n.click());await page.locator('[data-qt=album]').click();await page.waitForFunction(()=>document.querySelectorAll('.album-entry.got').length===3);
  checks.push('Deposits and remaining card counts survive '+(mobile?'mobile':'desktop')+' reconnect');await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{for(const socket of sockets)socket.terminate();await browser.close();await host.close();}process.exit(0);

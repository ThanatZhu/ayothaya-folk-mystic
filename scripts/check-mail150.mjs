import assert from 'node:assert/strict';
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
const out=new URL('../outputs/mail150/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'TalkQA',gender:'male'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='rice-fields';record.state.position={...catalog.maps.find(m=>m.id==='rice-fields').spawn};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:STORY.length,step:0,count:0,done:true};
 record.gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=rice-fields');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}

 const mk=(id,attachments={},createdAt=Date.now()-1000)=>composeMail({id:'browser150-'+id,title:id,body:'ขอบคุณที่ร่วมผจญภัยในอโยธยา',attachments},createdAt);
 const read=mk('read-note',{},Date.now()+10000),claimed=mk('claimed',{coins:2}),unread=mk('unread-note'),fits=mk('fits',{coins:23,goldBars:15,pets:['rice-rabbit','rice-rabbit']}),blocked=mk('blocked',{coins:50,goldBars:100,items:[{id:'hp-small',count:2}]}),news=mk('news'),unreadNews=mk('unread-news');
 read.readAt=claimed.readAt=claimed.claimedAt=100;
 record.mailbox={messages:[read,claimed,unread,fits,blocked],broadcastRead:{[news.id]:100}};record.bag={coins:200,slots:100,items:{'hp-small':999}};host.realm.mailAnnouncements=[news,unreadNews];
 let {context,page}=await launch(false),peer=[...host.realm.peers.values()].find(p=>p.uid===seed.uid);
 async function tap(selector){const n=page.locator(selector);await n.waitFor({state:'visible'});await n.scrollIntoViewIfNeeded();const box=await n.boundingBox();assert.ok(box,selector);assert.ok(await n.evaluate(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===n||n.contains(h);}),selector+' is covered');if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await n.click();}
 const idle=()=>page.waitForFunction(()=>!document.querySelector('#mail-refresh').disabled);
 const openMail=async()=>{await page.evaluate(()=>document.querySelector('#menu-mail').click());await page.locator('#mail-window[open]').waitFor();await idle();};
 async function geometry(id){return page.locator(id).evaluate(n=>{const r=n.getBoundingClientRect();return {rect:r.toJSON(),border:getComputedStyle(n).borderImageSource,width:innerWidth,height:innerHeight};});}
 async function mailBounds(){const g=await geometry('#mail-window');assert.ok(g.rect.x>=0&&g.rect.right<=g.width+1&&g.rect.y>=0&&g.rect.bottom<=g.height+1,JSON.stringify(g));assert.match(g.border,/mail-frame/);
 const rows=await page.locator('.mail-layout').boundingBox(),foot=await page.locator('.mail-toolbar').boundingBox();assert.ok(rows.height>75&&rows.y+rows.height<=foot.y+1,JSON.stringify({rows,foot}));for(const s of ['#mail-close','#mail-refresh','#mail-delete-all','#mail-claim-all']){const r=await page.locator(s).boundingBox();assert.ok(r&&r.height>=44&&r.y+r.height<=g.rect.bottom&&r.x+r.width<=g.rect.right,JSON.stringify({s,r,g}));}}
 await openMail();assert.equal(await page.locator('[data-mail]').count(),7);await tap('#mail-delete-all');await idle();assert.equal(await page.locator('[data-mail]').count(),4);assert.ok(await page.locator('#mail-delete-all').isDisabled());
 assert.equal(peer.mailbox.messages.find(m=>m.id===unread.id).readAt,0);assert.ok(await page.locator('[data-mail="'+blocked.id+'"]').count());
 await tap('#mail-claim-all');await idle();assert.match(await page.locator('#mail-status').textContent(),/รับแล้ว 1 ฉบับ · ค้างรับ 1 ฉบับ/);assert.equal(peer.bag.coins,223);assert.equal(peer.petCollection.balance,15);assert.equal(peer.bag.items['hp-small'],999);
 await tap('#mail-delete-all');await idle();assert.equal(await page.locator('[data-mail]').count(),3);assert.equal(peer.mailbox.messages.find(m=>m.id===unread.id).readAt,0);
 await tap('[data-mail="'+blocked.id+'"]');await idle();assert.ok(await page.locator('#mail-delete-all').isDisabled());assert.ok(await page.locator('#mail-claim-all').isEnabled());
 host.realm.setBag(peer,{...peer.bag,items:{'hp-small':990}});await page.waitForTimeout(200);await tap('#mail-claim-all');await idle();assert.equal(peer.bag.items['hp-small'],992);assert.equal(peer.petCollection.balance,115);assert.equal(peer.bag.coins,273);assert.ok(await page.locator('#mail-claim-all').isDisabled());
 checks.push('Native desktop bulk delete preserves unread/pending gifts; claim all reports partial success and safely retries after bag space is freed');
 for(const [width,height]of [[1440,900],[1920,1080],[1024,768]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);await mailBounds();await page.screenshot({path:fileURLToPath(new URL('mail-'+width+'.png',out))});}
 await tap('#mail-close');await page.evaluate(()=>document.querySelector('#menu-boss-result').click());await page.locator('#boss-browser[open]').waitFor();
 for(const [width,height]of [[1440,900],[1920,1080]]){await page.setViewportSize({width,height});await page.waitForTimeout(500);const g=await geometry('#boss-browser');assert.match(g.border,/boss-frame/);await page.screenshot({path:fileURLToPath(new URL('boss-'+width+'.png',out))});}
 await tap('[data-boss-tab="mini"]');await page.waitForTimeout(200);assert.ok(await page.locator('.boss-directory-row').count());await tap('[data-boss-tab="results"]');await page.waitForTimeout(200);assert.ok(await page.locator('#boss-browser-results').isVisible());await tap('#boss-browser-close');await context.close();
 ({context,page}=await launch(true));peer=[...host.realm.peers.values()].find(p=>p.uid===seed.uid);await openMail();
 for(const [width,height]of [[844,390],[932,430],[568,320],[390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);await mailBounds();await page.screenshot({path:fileURLToPath(new URL('mail-mobile-'+width+'.png',out))});}
 await page.setViewportSize({width:844,height:390});await tap('#mail-delete-all');await idle();assert.equal(await page.locator('[data-mail="'+blocked.id+'"]').count(),0);assert.equal(peer.mailbox.messages.find(m=>m.id===unread.id).readAt,0);assert.ok(publicInbox(peer.mailbox,host.realm.mailAnnouncements,peer.serverId).some(m=>m.id===unreadNews.id));
 const touchGift=mk('touch-gift',{goldBars:2});peer.mailbox=deliverMail(peer.mailbox,touchGift).mailbox;await tap('#mail-refresh');await idle();await tap('#mail-claim-all');await idle();assert.equal(peer.petCollection.balance,117);assert.ok(await page.locator('#mail-claim-all').isDisabled());await tap('#mail-close');
 await page.evaluate(()=>document.querySelector('#menu-boss-result').click());await page.locator('#boss-browser[open]').waitFor();
 for(const [width,height]of [[844,390],[568,320],[390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(250);const g=await geometry('#boss-browser');assert.ok(g.rect.x>=0&&g.rect.right<=width&&g.rect.y>=0&&g.rect.bottom<=height,JSON.stringify(g));await page.screenshot({path:fileURLToPath(new URL('boss-mobile-'+width+'.png',out))});}
 checks.push('Generated frames and buttons retain bounds at desktop and four phone sizes; native touch bulk actions, boss tabs and close controls work');
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));await context.close();
}finally{for(const socket of sockets)socket.terminate();await browser.close();await host.close();}process.exit(0);

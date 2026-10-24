import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {ITEMS} from '../items.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/mobile147/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'TalkQA',gender:'male'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='rice-fields';record.state.position={...catalog.maps.find(m=>m.id==='rice-fields').spawn};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:12,step:0,count:0,done:false};
 record.gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th'){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record,token:seed.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=rice-fields');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}

 let {context,page}=await launch(true);const checks=[],peer=[...host.realm.peers.values()].find(p=>p.uid===seed.uid);peer.world.player.maxHp=peer.world.player.hp=1000000;
 const tap=async selector=>{if(selector==='#dock-toggle'&&!await page.locator(selector).isVisible())selector='#mobile-chat-back';if(selector==='#auto-settings-open'&&!await page.locator(selector).isVisible()){await tap('#auto-attack');selector='#auto-target-gear';}const n=page.locator(selector);await n.waitFor({state:'visible'});await n.scrollIntoViewIfNeeded();await page.waitForTimeout(100);const r=await n.boundingBox();assert.ok(r,selector);const hit=await n.evaluate(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {ok:h===n||n.contains(h),hit:h?.outerHTML?.slice(0,240),rect:r.toJSON()};});if(!hit.ok)await page.screenshot({path:fileURLToPath(new URL('blocked-target.png',out))});assert.ok(hit.ok,JSON.stringify({selector,...hit}));await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
 async function shot(name){await page.waitForTimeout(150);await page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});}

 for(const [width,height] of [[844,390],[568,320],[320,568]]){await page.setViewportSize({width,height});await page.waitForTimeout(250);await tap('#mobile-bag-shortcut');await tap('#bag-tabs [data-cat=use]');await tap('#bag-grid [data-id=hp-small]');peer.world.player.hp=Math.floor(peer.world.player.maxHp*.5);const before=peer.bag.items['hp-small'];await page.waitForTimeout(200);await shot('before-use-'+width);console.log(JSON.stringify({width,height,geometry:await page.evaluate(()=>Object.fromEntries(['bag-window','bag-grid','bag-detail'].map(id=>{const n=document.getElementById(id),r=n.getBoundingClientRect();return [id,{rect:r.toJSON(),scrollHeight:n.scrollHeight,height:n.clientHeight}];})))}));await tap('#bag-detail [data-act=use]');await page.waitForFunction(n=>window.__ayothaya.game.world.bag.items['hp-small']<n,before);await tap('#bag-close');}
 await context.close();console.log('PASS small-screen inventory use');
}finally{for(const socket of sockets)socket.terminate();await browser.close();await host.close();}process.exit(0);

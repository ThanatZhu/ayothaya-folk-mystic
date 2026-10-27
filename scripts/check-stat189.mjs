import assert from 'node:assert/strict';
import {MARKET_ZONE} from '../market-board.js';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {STORY} from '../story-quests.js';
import {ITEMS} from '../items.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/stat189/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'StoryQA',gender:'female'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.character.appearance={outfit:'crimson',hair:'original',hairColor:'original',eyes:'original',beard:'none',tattoo:'none',garment:'original'};record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={x:npc.x,z:npc.z+1};record.state.traveler.baseXp=levelStart(99);record.story={v:4,quest:STORY.findIndex(q=>q.id==='t17-craft'),step:0,count:0,done:false};
 record.gear={weapon:'weapon-swordsman-one',head:null,armor:null,garment:null,shoes:null,accessory:null};record.bag={coins:1000000,slots:100,items:{'weapon-fragment-rice':500,'iron-ore':500,'lek-lai':100}};
 record.stats={str:10,agi:1,vit:2,int:1,dex:1,luk:1};record.rebirth=2;record.petCollection={balance:500};record.bag.items['stat-reset-scroll']=1;
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=1){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-cinematic155:server-1:slot-1',JSON.stringify(Array.from({length:24},(_,q)=>Array.from({length:8},(_,s)=>'story:t'+q+':'+s)).flat()));localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}





 

 console.log('Launching desktop game');
 const {context,page}=await launch();console.log('Desktop online');
 const peer=()=>[...host.realm.peers.values()][0];
 await page.locator('#menu-status').click();await page.waitForTimeout(350);
 const button=page.locator('[data-stat="str"]'),before=peer().stats.str,rect=await button.boundingBox();
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.waitForTimeout(1200);await page.mouse.up();await page.waitForTimeout(300);
 const after=peer().stats.str;console.log('Mouse hold',before,after);assert.ok(after>=before+4,`hold did not repeat: ${before}->${after}`);await page.waitForTimeout(500);assert.equal(peer().stats.str,after,'release stops immediately');
 await button.focus();await page.keyboard.press('Enter');await page.waitForTimeout(250);assert.equal(peer().stats.str,after+1,'keyboard adds once');
 const r2=await button.boundingBox();await page.mouse.move(r2.x+r2.width/2,r2.y+r2.height/2);await page.mouse.down();await page.mouse.move(0,0);await page.waitForTimeout(700);const left=peer().stats.str;await page.mouse.up();await page.waitForTimeout(250);assert.equal(peer().stats.str,left,'moving outside stops');
 await page.screenshot({path:fileURLToPath(new URL('status-hold-desktop.png',out))});
 await page.locator('#status-close').click();await page.locator('#menu-premium-store').click();await page.locator('[data-buy="stat-reset-scroll"]').click();await page.locator('.premium-confirm').click();await page.waitForFunction(()=>window.__ayothaya.game.world.bag.items['stat-reset-scroll']===2);assert.equal(peer().petCollection.balance,400);await page.screenshot({path:fileURLToPath(new URL('reset-shop-desktop.png',out))});await page.locator('#premium-store-window .premium-close').click();
 await page.evaluate(()=>document.getElementById('menu-bag').click());console.log('Bag opened');await page.locator('#bag-grid [data-id="stat-reset-scroll"]').click();assert.equal(await page.locator('#bag-detail [data-act="recall"]').count(),0);
 await page.locator('[data-act="stat-reset"]').click();await page.screenshot({path:fileURLToPath(new URL('reset-confirm-desktop.png',out))});await page.locator('#stat-reset-window [data-reset]').click();await page.waitForFunction(()=>!document.querySelector('#stat-reset-window').open);assert.equal(peer().stats.str,1);assert.equal(peer().stats.vit,1);assert.equal(peer().bag.items['stat-reset-scroll'],1);assert.equal(peer().rebirth,2);assert.ok(peer().gear.weapon);assert.equal(peer().derived.rebirthBonus,4);
 await page.locator('#menu-status').click();peer().stats.str=99;host.realm.refreshStats(peer());await page.waitForFunction(()=>document.querySelector('[data-stat="str"]').disabled);assert.equal(await button.isDisabled(),true);
 // Closing the window while pressed prevents subsequent allocations.
 const vit=page.locator('[data-stat="vit"]'),vr=await vit.boundingBox();await page.mouse.move(vr.x+vr.width/2,vr.y+vr.height/2);await page.mouse.down();await page.evaluate(()=>document.querySelector('#status-window').close());await page.waitForTimeout(250);const closed=peer().stats.vit;await page.waitForTimeout(500);assert.equal(peer().stats.vit,closed);await page.mouse.up();
 console.log('Desktop reset verified');await context.close();await new Promise(r=>setTimeout(r,300));
 const mobile=await launch(true),mp=mobile.page;await mp.evaluate(()=>document.getElementById('menu-status').click());const mr=await mp.locator('[data-stat="agi"]').boundingBox(),cdp=await mobile.context.newCDPSession(mp),initial=peer().stats.agi;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mr.x+mr.width/2,y:mr.y+mr.height/2}]});await mp.waitForTimeout(1100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mp.waitForTimeout(300);const mobileAfter=peer().stats.agi;assert.ok(mobileAfter>=initial+3,`touch hold: ${initial}->${mobileAfter}`);await mp.waitForTimeout(500);assert.equal(peer().stats.agi,mobileAfter);
 await mp.screenshot({path:fileURLToPath(new URL('status-hold-mobile.png',out))});
 const r3=await mp.locator('[data-stat="dex"]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r3.x+r3.width/2,y:r3.y+r3.height/2}]});await mp.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await mp.waitForTimeout(300);const canceled=peer().stats.dex;await mp.waitForTimeout(600);assert.equal(peer().stats.dex,canceled,'touch cancel stops');
 peer().stats={str:1,agi:1,vit:1,int:1,dex:1,luk:1};peer().rebirth=0;peer().world.baseXp=levelStart(2);host.realm.refreshStats(peer());await mp.waitForFunction(()=>document.querySelector('[data-stat="str"]').disabled===false);const endRect=await mp.locator('[data-stat="str"]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:endRect.x+endRect.width/2,y:endRect.y+endRect.height/2}]});await mp.waitForTimeout(1000);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(peer().stats.str,2,'insufficient points stops after one affordable raise');assert.equal(await mp.locator('[data-stat="str"]').isDisabled(),true);
 assert.deepEqual(errors,[]);checks.push('mouse and touch hold repeat across server snapshots','release, pointer leave, dialog close and touch cancel stop','keyboard increments once; stat cap disables button','real shop charges 100 gold bars and grants generated item','bag reset confirms, consumes one and preserves rebirth and equipment');console.log(JSON.stringify({checks,errors,statCommands:commands.filter(m=>m.type==='statUp').length},null,2));await writeFile(new URL('validation.json',out),JSON.stringify({checks,errors},null,2));await mobile.context.close();
}finally{for(const s of sockets)s.terminate();await browser.close();await host.close();}

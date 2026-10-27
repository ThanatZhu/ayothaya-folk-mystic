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
const out=new URL('../outputs/quest-scroll190/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'StoryQA',gender:'female'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='novice';record.character.appearance={outfit:'crimson',hair:'original',hairColor:'original',eyes:'original',beard:'none',tattoo:'none',garment:'original'};record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={x:npc.x,z:npc.z+1};record.state.traveler.baseXp=levelStart(99);record.story={v:4,quest:STORY.findIndex(q=>q.id==='t17-craft'),step:0,count:0,done:false};
 record.gear={weapon:'weapon-swordsman-one',head:null,armor:null,garment:null,shoes:null,accessory:null};record.bag={coins:1000000,slots:100,items:{'weapon-fragment-rice':500,'iron-ore':500,'lek-lai':100}};
 record.stats={str:10,agi:1,vit:2,int:1,dex:1,luk:1};record.rebirth=2;record.petCollection={balance:500};record.bag.items['stat-reset-scroll']=1;
 record.training={classId:'swordsman',tier:'class',startKills:0,boss:'mill-keeper',bossDone:true};record.state.traveler.kills=40;Object.assign(record.bag.items,{'tough-vine':10,'betel-nut':10,'lantern-paper':5});
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=1,viewport){
 const context=await browser.newContext({viewport:viewport??{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-cinematic155:server-1:slot-1',JSON.stringify(Array.from({length:24},(_,q)=>Array.from({length:8},(_,s)=>'story:t'+q+':'+s)).flat()));localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}





 

 for(const [mobile,width,height] of [[false,1440,900],[true,844,390],[true,1068,480],[true,720,320]]){
 const {context,page}=await launch(mobile,'th',seed,record,1,{width,height});await page.waitForTimeout(400);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();const dock=document.getElementById('activity-dock');if(dock.dataset.collapsed==='true')document.getElementById('activity-quest-tab').click();if(document.querySelector('#training-details').hidden)document.getElementById('training-toggle').click();});
 await page.evaluate(()=>document.fonts.ready);await page.locator('.training-completed summary').click();await page.waitForFunction(()=>document.querySelector('.training-completed')?.open);await page.waitForTimeout(350);
 const content=page.locator('#activity-content');await content.evaluate(n=>n.scrollTop=n.scrollHeight);await page.waitForTimeout(100);
 const metrics=()=>page.evaluate(()=>Object.fromEntries(['activity-content','training-journal','training-details'].map(id=>{const n=document.getElementById(id),s=getComputedStyle(n);return [id,{h:n.clientHeight,total:n.scrollHeight,y:n.scrollTop,overflow:s.overflowY,touch:s.touchAction,rect:n.getBoundingClientRect().toJSON()}]})));
 const initial=await metrics();assert.equal(initial['training-journal'].overflow,'visible');assert.equal(initial['training-details'].overflow,'visible');console.log(mobile?'Mobile':'Desktop','single scroll owner',width,height);
 await content.evaluate(n=>n.scrollTop=Math.max(0,n.scrollTop-80));await page.waitForTimeout(100);const before=await content.evaluate(n=>n.scrollTop);
 const point=await page.evaluate(()=>{const c=document.getElementById('activity-content').getBoundingClientRect();for(const n of [...document.querySelectorAll('.training-completed .training-objective')].reverse()){const r=n.getBoundingClientRect(),top=Math.max(c.top+5,r.top),bottom=Math.min(c.bottom-5,r.bottom),x=r.x+r.width/2,y=(top+bottom)/2;if(bottom-top>=10&&document.elementFromPoint(x,y)?.closest('.training-objective')===n)return {x,y};}return null;});
 assert.ok(point,'gesture begins over completed requirement');const {x,y}=point;const position={...host.realm.peers.values().next().value.world.player};if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-90*i/8,id:1}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.mouse.move(x,y);await page.mouse.wheel(0,180);}
 await page.waitForTimeout(400);const after=await content.evaluate(n=>n.scrollTop);assert.ok(after>before+20,'native scroll must move over completed items: '+before+' -> '+after);console.log('SCROLL',mobile,before,after);const peer=host.realm.peers.values().next().value;assert.equal(peer.world.player.x,position.x);assert.equal(peer.world.player.z,position.z);
 const stable=await content.evaluate(n=>n.scrollTop);peer.bag.coins-=1;host.realm.setBag(peer,peer.bag);await page.waitForTimeout(500);assert.equal(await page.locator('.training-completed').evaluate(n=>n.open),true,'snapshot keeps completed list expanded');assert.ok(Math.abs(await content.evaluate(n=>n.scrollTop)-stable)<=1,'snapshot preserves scroll position');
 
 await page.screenshot({path:fileURLToPath(new URL('fixed-'+width+'.png',out))});
 checks.push((mobile?'Touch':'Mouse')+' '+width+'x'+height+' scrolls over completed requirements; live bag update preserves expansion/position');await context.close();await new Promise(r=>setTimeout(r,250));
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('validation.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{for(const s of sockets)s.terminate();await browser.close();await host.close();}

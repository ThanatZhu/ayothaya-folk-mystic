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
const out=new URL('../outputs/weapon188/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'StoryQA',gender:'female'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.character.appearance={outfit:'crimson',hair:'original',hairColor:'original',eyes:'original',beard:'none',tattoo:'none',garment:'original'};record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={x:npc.x,z:npc.z+1};record.state.traveler.baseXp=levelStart(99);record.story={v:4,quest:STORY.findIndex(q=>q.id==='t17-craft'),step:0,count:0,done:false};
 record.gear={weapon:'weapon-swordsman-one',head:null,armor:null,garment:null,shoes:null,accessory:null};record.bag={coins:1000000,slots:100,items:{'weapon-fragment-rice':500,'iron-ore':500,'lek-lai':100}};
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





 

 const {context,page}=await launch();
 const teacher=()=>page.locator('.npc-label').filter({hasText:'ครูแสนดาบ'}).first().click({force:true});
 await page.waitForTimeout(700);assert.equal(await page.locator('#quest-cinematic').evaluate(n=>n.open),false);
 await teacher();await page.waitForFunction(()=>document.querySelector('#quest-cinematic').open&&document.querySelector('#quest-cinematic').dataset.artState==='ready',null,{timeout:60000});
 assert.equal(await page.locator('#quest-cinematic button').count(),1);assert.equal(await page.locator('#quest-cinematic footer').count(),0);
 for(let shot=0;shot<3;shot++){
  await page.waitForFunction(s=>document.querySelector('#quest-cinematic').dataset.shot===String(s),shot);await page.locator('.cinematic-stage').click({position:{x:100,y:100}});await page.locator('.cinematic-stage').click({position:{x:100,y:100}});
  await page.waitForFunction(()=>document.querySelector('#quest-cinematic').dataset.textComplete==='true');
  for(const [w,h]of [[1440,900],[844,390]]){await page.setViewportSize({width:w,height:h});await page.screenshot({path:fileURLToPath(new URL('craft-story-shot-'+shot+'-'+w+'.png',out))});const r=await page.locator('#quest-cinematic').boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=w+1&&r.y+r.height<=h+1);}
  await page.setViewportSize({width:1440,height:900});if(shot<2)await page.locator('.cinematic-stage').click({position:{x:100,y:100}});
 }
 if(await page.locator('#quest-cinematic').evaluate(n=>n.open))await page.locator('#cinematic-skip').click();
 assert.equal(host.realm.peers.values().next().value.story.step,0,'watching or skipping never accepts the quest');
 while(await page.locator('#npc-text').getAttribute('data-page')!=='2')await page.locator('#npc-story-next').click();await page.locator('#npc-story-next').click();await page.waitForFunction(()=>window.__ayothaya.game.world.story.step===1);
 if(await page.locator('#npc-dialog').evaluate(n=>n.open))await page.locator('#close-npc').click();await page.locator('#quest-go').click();await page.locator('#craft-window').waitFor({state:'visible'});
 assert.equal(await page.locator('#craft-list [aria-selected=true]').getAttribute('data-recipe'),'weapon-swordsman-one');assert.match(await page.locator('#craft-item-name').textContent(),/สีฟ้า/);
 const foreign=await page.locator('#craft-list [data-recipe^="boss-"]').evaluateAll(es=>es.map(e=>e.dataset.recipe));assert.ok(foreign.every(id=>id.includes('swordsman')));
 await page.screenshot({path:fileURLToPath(new URL('craft-blue-desktop.png',out))});await page.locator('#craft-make').click();await page.waitForFunction(()=>window.__ayothaya.game.world.story.step===2);
 await page.waitForFunction(()=>document.querySelector('#craft-window').getAttribute('aria-busy')==='false');
 for(const grade of [2,3,4]){const id='weapon-swordsman-one^'+grade;await page.locator('[data-recipe="'+id+'"]').click();await page.locator('#craft-make').click();await page.waitForFunction(()=>document.querySelector('#craft-window').getAttribute('aria-busy')==='false');await new Promise(r=>setTimeout(r,150));assert.equal(host.realm.peers.values().next().value.bag.items[id],1);await page.screenshot({path:fileURLToPath(new URL('craft-colour-'+grade+'.png',out))});}
 await page.locator('#craft-close').click();await teacher();if(await page.locator('#quest-cinematic').evaluate(n=>n.open))throw Error('unexpected duplicate automatic cinematic');while(await page.locator('#npc-text').getAttribute('data-page')!=='2')await page.locator('#npc-story-next').click();await page.locator('#npc-story-next').click();await page.waitForFunction(q=>window.__ayothaya.game.world.story.quest===q,STORY.findIndex(q=>q.id==='t18'));
 assert.deepEqual(errors,[]);checks.push('new three-shot story uses existing NPC-only cinematic entry, text speed and Skip controls','tutorial opens the blue class recipe and only an actual craft advances it','server-backed blue, purple, orange and red crafting succeeds in order','only own-class rainbow gear is listed');await writeFile(new URL('validation.json',out),JSON.stringify({checks,errors,commands:commands.filter(m=>m.type==='craft')},null,2));console.log(JSON.stringify({checks,errors},null,2));await context.close();
}finally{for(const s of sockets)s.terminate();await browser.close();await host.close();}

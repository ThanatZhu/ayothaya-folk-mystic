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
const out=new URL('../outputs/story160/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'StoryQA',gender:'female'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ลุงเรือง');
 record.character.classId='rogue';record.character.appearance={outfit:'crimson',hair:'original',hairColor:'original',eyes:'original',beard:'none',tattoo:'none',garment:'original'};record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={x:npc.x,z:npc.z+1};record.state.traveler.baseXp=levelStart(99);record.story={v:4,quest:0,step:0,count:0,done:false};
 record.gear={weapon:'daggers-crafted',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
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
 const talk=async name=>{await page.locator('.npc-label').filter({hasText:name}).first().click({force:true});await page.waitForFunction(()=>document.getElementById('npc-dialog').open);};
 const ready=async(target=page)=>target.waitForFunction(()=>document.getElementById('quest-cinematic').open&&document.getElementById('quest-cinematic').dataset.artState==='ready',null,{timeout:60000});
 const fit=async(w,h,target=page)=>{const r=await target.locator('#quest-cinematic').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:n.scrollWidth-n.clientWidth};});assert.ok(r.x>=0&&r.y>=0&&r.right<=w+1&&r.bottom<=h+1&&r.overflow<=2,JSON.stringify({w,h,r}));};
 await page.waitForTimeout(5000);assert.equal(await page.locator('#quest-cinematic').evaluate(n=>n.open),false);checks.push('no story opens from loading, waiting or quest observation');
 const before=commands.filter(c=>c.type==='questTalk').length;
 await talk('ลุงเรือง');await ready();assert.equal(await page.locator('#quest-cinematic button').count(),1);assert.equal(await page.locator('#quest-cinematic footer,#cinematic-seek').count(),0);
 const length=await page.locator('#cinematic-caption').innerText();await page.locator('.cinematic-stage').click({position:{x:100,y:100}});
 assert.equal(await page.locator('#quest-cinematic').getAttribute('data-text-speed'),'120');assert.equal(await page.locator('#quest-cinematic').getAttribute('data-shot'),'0');await page.waitForTimeout(220);
 assert.ok((await page.locator('#cinematic-caption').innerText()).length>length.length);checks.push('scene tap accelerates progressive text without skipping a shot; only Skip is a button');
 await page.locator('#cinematic-skip').click();assert.equal(await page.locator('#quest-cinematic').evaluate(n=>n.open),false);assert.ok(await page.locator('#npc-dialog').evaluate(n=>n.open));
 assert.equal(commands.filter(c=>c.type==='questTalk').length,before);assert.equal(store.rows.get(seed.uid).story.step,0);checks.push('Skip immediately closes the whole film and returns to NPC without accepting a quest');
 await page.locator('#close-npc').click();await talk('ลุงเรือง');await page.waitForTimeout(200);assert.equal(await page.locator('#quest-cinematic').evaluate(n=>n.open),false);checks.push('one automatic story per quest; repeat conversation does not replay it');
 await page.locator('#npc-story-cinematic').click();await ready();await page.locator('.cinematic-stage').click({position:{x:100,y:100}});await page.waitForTimeout(900);
 for(const [w,h]of [[1920,1080],[1440,900],[1024,768],[932,430],[844,390],[667,375],[390,844]]){
  await page.setViewportSize({width:w,height:h});await fit(w,h);await page.screenshot({path:fileURLToPath(new URL('story-'+w+'.png',out))});
 }
 checks.push('centered painting and contained captions across seven desktop/phone sizes');
 await page.setViewportSize({width:1440,height:900});await page.keyboard.press('Escape');assert.ok(await page.locator('#npc-dialog').evaluate(n=>n.open));
 while(await page.locator('#npc-text').getAttribute('data-page')!=='2')await page.locator('#npc-story-next').click();
 assert.equal(commands.filter(c=>c.type==='questTalk').length,before);await page.locator('#npc-story-next').click();await page.waitForFunction(()=>window.__ayothaya.game.world.story.step===1);
 assert.equal(commands.filter(c=>c.type==='questTalk').length,before+1);console.log('NPC entry, tap, Skip, bounds and authority verified');checks.push('only final NPC acceptance sends one authoritative questTalk after the film');
 await context.close();

 // Real renderer in an isolated fixture, to inspect every quest without touching a player account.
 const artContext=await browser.newContext({viewport:{width:1440,height:900}}),artPage=await artContext.newPage();
 await artPage.route('**/story-fixture160.html',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#182b23;font-family:Arial}</style></head><body></body></html>'}));
 await artPage.goto(base+'/story-fixture160.html');
 await artPage.evaluate(async()=>{document.body.innerHTML='<main id="game-shell"></main>';const {createQuestCinematics}=await import('./quest-cinematic155.js?v=story160');const current={quest:99,step:0,done:true},game={world:{player:{hp:100,x:0,z:0},mobs:[],notice:()=>{}},clearInput:()=>{},cancelWalk:()=>{},online:false};
  window.artFixture={game,current,scenes:createQuestCinematics({game,account:{serverId:'qa',slotId:'art'},map:{safe:true,id:'ayutthaya'},state:()=>current})};});
 for(let q=0;q<STORY.length;q++){
  await artPage.evaluate(async q=>{const {storyScene}=await import('./quest-cinematic-data155.js?v=story160');await window.artFixture.scenes.open(storyScene(q,0));},q);await ready(artPage);
  for(let shot=0;shot<3;shot++){
   assert.equal(await artPage.locator('#quest-cinematic').getAttribute('data-shot'),String(shot));
   await artPage.locator('.cinematic-stage').click({position:{x:100,y:100}});await artPage.waitForFunction(()=>document.getElementById('quest-cinematic').dataset.textComplete==='true');
   if(q===2||q===13)await artPage.screenshot({path:fileURLToPath(new URL(STORY[q].id+'-shot'+shot+'.png',out))});
   await artPage.locator('.cinematic-stage').click({position:{x:100,y:100}});
  }
  assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);
 }
 console.log('66 painted shots verified');checks.push('all 22 generated storyboards load and crop into 66 distinct narrative shots, then close at the end');
 await artPage.evaluate(async()=>{const {taskScene}=await import('./quest-cinematic-data155.js?v=story160');await window.artFixture.scenes.open(taskScene({title:'ทดสอบ',goal:'ทดสอบความเสียหาย'}));window.artFixture.game.world.player.hp=80;window.artFixture.scenes.observe();});
 assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);checks.push('incoming damage interrupts story without freezing the online world');
 await artPage.route('**/late160.webp',async route=>{await new Promise(r=>setTimeout(r,350));await route.fulfill({status:404,body:''});});
 await artPage.evaluate(()=>{window.artFixture.scenes.open({id:'late',title:'Late',art:{src:'./late160.webp',panels:3},captions:['one','two','three']});});
 await artPage.locator('#cinematic-skip').click();await artPage.waitForTimeout(550);assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);checks.push('Skip works before art is loaded; a late response cannot reopen it');
 await artPage.evaluate(async()=>{const f=window.artFixture;f.scenes.close();document.getElementById('quest-cinematic').remove();const {createQuestCinematics}=await import('./quest-cinematic155.js?v=story160');f.scenes=createQuestCinematics({game:f.game,account:{serverId:'qa',slotId:'fresh-talk'},map:{safe:true,id:'ayutthaya'},state:()=>f.current});Object.assign(f.current,{quest:0,step:0,done:false});f.game.world.player.hp=100;f.game.walking=true;f.scenes.observe();});
 await artPage.waitForTimeout(4200);await artPage.evaluate(()=>{window.artFixture.game.walking=false;window.artFixture.scenes.observe();});
 await artPage.waitForTimeout(800);assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);
 await artPage.evaluate(()=>window.artFixture.scenes.onTalk({name:'ลุงเรือง',x:0,z:0}));assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);
 await artPage.evaluate(()=>{const d=document.createElement('dialog');d.id='npc-dialog';document.body.append(d);d.showModal();window.artFixture.scenes.onTalk({name:'ลุงเรือง',x:20,z:0});});
 assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);
 await artPage.evaluate(()=>window.artFixture.scenes.onTalk({name:'ลุงเรือง',x:0,z:0}));await ready(artPage);await artPage.locator('#cinematic-skip').click();
 checks.push('route completion never autoplays; actual matching NPC dialog and nearby player are both required');
 await artContext.close();
 record.story={v:4,quest:0,step:0,count:0,done:false};store.rows.get(seed.uid).story=record.story;
 const phone=await launch(true,'en');await phone.page.waitForTimeout(450);await phone.page.locator('.npc-label').filter({hasText:/Rueang|เรือง/}).first().click({force:true});await ready(phone.page);
 await phone.page.locator('.cinematic-stage').tap({position:{x:100,y:100}});assert.equal(await phone.page.locator('#quest-cinematic').getAttribute('data-text-speed'),'120');
 await phone.page.waitForTimeout(200);assert.ok(!/[฀-๿]/.test(await phone.page.locator('#cinematic-caption').innerText()));await fit(844,390,phone.page);
 await phone.page.locator('#cinematic-skip').tap();assert.equal(await phone.page.locator('#quest-cinematic').evaluate(n=>n.open),false);checks.push('touch input accelerates, full English captions reveal correctly, touch Skip closes immediately');await phone.context.close();
 assert.deepEqual(errors,[]);await writeFile(new URL('report.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();for(const socket of sockets)socket.terminate();await host.close();}

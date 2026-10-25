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
const out=new URL('../outputs/boss-travel161/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'StoryQA',gender:'female'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ลุงเรือง');
 record.character.classId='rogue';record.character.appearance={outfit:'crimson',hair:'original',hairColor:'original',eyes:'original',beard:'none',tattoo:'none',garment:'original'};record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={x:npc.x,z:npc.z+1};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:0,step:0,count:0,done:false};
 record.gear={weapon:'daggers-crafted',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=1){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-cinematic155:server-1:slot-1',JSON.stringify(Array.from({length:24},(_,q)=>Array.from({length:8},(_,s)=>'story:t'+q+':'+s)).flat()));localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map='+save.state.mapId);await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}





 
 
 async function fresh(mapId='ayutthaya',coins=50000,mobile=false){
  const source=await store.createLocal({name:'TravelQA'+checks.length,gender:'female'}),row=store.rows.get(source.uid);
  for(const key of ['xpCurve','daily','gear','skills'])if(record[key]!=null)row[key]=structuredClone(record[key]);
  row.character.classId='rogue';row.story={v:3,quest:0,step:0,count:0,done:false};row.state=initialSave();row.state.mapId=mapId;row.state.position={...catalog.maps.find(m=>m.id===mapId).spawn};row.state.traveler.baseXp=levelStart(99);row.bag={coins,slots:100,items:{'hp-small':5}};
  const ui=await launch(mobile,'th',source,row);return {...ui,source,row};
 }
 async function choose(page,prefix){
  if(!await page.locator('#menu-boss-result').isVisible())await page.locator('#menu-toggle').click();await page.locator('#menu-boss-result').click();await page.locator('.boss-directory-row[data-boss^="'+prefix+':"]').first().click();await page.locator('.boss-travel').scrollIntoViewIfNeeded();
 }
 async function atlas(page,destination,cost){
  await page.waitForSelector('#world-atlas-dialog[open]');assert.equal(await page.locator('#atlas-destination').inputValue(),destination);
  assert.ok((await page.locator('#atlas-warp').innerText()).includes(String(cost)));
 }
 const rich=await fresh();await choose(rich.page,'moonlit-mill');const initial=commands.filter(c=>c.type==='travel').length;
 await rich.page.locator('.boss-travel').click();await atlas(rich.page,'moonlit-mill',150);
 assert.equal(commands.filter(c=>c.type==='travel').length,initial);assert.equal([...host.realm.peers.values()].find(p=>p.uid===rich.source.uid).bag.coins,50000);
 await rich.page.screenshot({path:fileURLToPath(new URL('destination-confirmation.png',out))});
 await rich.page.locator('#atlas-close').click();assert.equal(commands.filter(c=>c.type==='travel').length,initial);checks.push('distant boss selects correct atlas destination and fare; opening/cancelling charges nothing');
 await choose(rich.page,'moonlit-mill');await rich.page.locator('.boss-travel').click();await atlas(rich.page,'moonlit-mill',150);
 await rich.page.locator('#atlas-warp').click();await rich.page.waitForURL('**map=moonlit-mill',{timeout:60000});assert.equal(store.rows.get(rich.source.uid).bag.coins,49850);
 const paid=commands.filter(c=>c.type==='travel').slice(initial);assert.equal(paid.length,1);assert.equal(paid[0].destination,'moonlit-mill');assert.equal(paid[0].warp,true);checks.push('confirmed distant travel changes real map and server deducts exactly the existing 150 fare once');await rich.context.close();
 const near=await fresh();await choose(near.page,'rice-fields');const start=commands.filter(c=>c.type==='travel').length;await near.page.locator('.boss-travel').click();await near.page.waitForURL('**map=rice-fields',{timeout:60000});
 assert.equal(store.rows.get(near.source.uid).bag.coins,50000);assert.equal(commands.filter(c=>c.type==='travel').slice(start)[0].warp,false);checks.push('adjacent town gate still travels directly for free');await near.context.close();
 const phone=await fresh('old-orchard',50000,true);await choose(phone.page,'moonlit-mill');await phone.page.locator('.boss-travel').tap();await atlas(phone.page,'moonlit-mill',50);
 await phone.page.screenshot({path:fileURLToPath(new URL('touch-confirmation.png',out))});
 await phone.page.locator('#atlas-warp').tap();await phone.page.waitForURL('**map=moonlit-mill',{timeout:60000});assert.equal(store.rows.get(phone.source.uid).bag.coins,49950);checks.push('touch button outside town opens valid warp rather than failing an out-of-range gate request');await phone.context.close();
 const poor=await fresh('old-orchard',10);await choose(poor.page,'moonlit-mill');const poorBefore=commands.filter(c=>c.type==='travel').length;await poor.page.locator('.boss-travel').click();await atlas(poor.page,'moonlit-mill',50);
 assert.ok(await poor.page.locator('#atlas-warp').isDisabled());assert.equal(commands.filter(c=>c.type==='travel').length,poorBefore);assert.equal([...host.realm.peers.values()].find(p=>p.uid===poor.source.uid).bag.coins,10);checks.push('insufficient funds show disabled confirmation without losing coins or sending invalid travel');await poor.context.close();
 assert.deepEqual(errors,[]);await writeFile(new URL('report.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();for(const socket of sockets)socket.terminate();await host.close();}

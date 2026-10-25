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
const out=new URL('../outputs/market154/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'TalkQA',gender:'male'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={...catalog.maps.find(m=>m.id==='ayutthaya').spawn};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:STORY.length,step:0,count:0,done:true};
 record.gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=1){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}




 async function fit(page,width,height,tab){
  const r=await page.locator('#market-board').evaluate(n=>{const r=n.getBoundingClientRect(),c=n.querySelector('#board-close').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,overflow:n.scrollWidth-n.clientWidth,bodyOverflow:n.querySelector('#board-body').scrollWidth-n.querySelector('#board-body').clientWidth,close:c.bottom};});
  assert.ok(r.x>=-1&&r.y>=-1&&r.right<=width+1&&r.bottom<=height+1&&r.close<=height&&r.overflow<2&&r.bodyOverflow<2,JSON.stringify({width,height,tab,r}));if(width>=1024)assert.ok(r.width>=950);
  if(width>=1024&&tab==='open'){
   const footer=await page.locator('#shop-open').boundingBox();assert.ok(footer.y>=r.y&&footer.y+footer.height<=r.bottom);
   await page.locator('#market-board .market-list').evaluate(n=>n.scrollTop=n.scrollHeight);const f=await page.locator('#shop-open').boundingBox();assert.ok(f.y+f.height<=r.bottom);
  }
 }
 for(const mobile of [false,true]){
  console.log(mobile?'Checking mobile market':'Checking desktop market');
  const source=await store.createLocal({name:mobile?'MarketMobile':'MarketDesktop',gender:'male'}),save=store.rows.get(source.uid);
  Object.assign(save,{character:{name:mobile?'MarketMobile':'MarketDesktop',gender:'male',classId:'swordsman'},state:structuredClone(record.state),xpCurve:XP_CURVE,story:record.story,daily:record.daily,bag:structuredClone(record.bag)});
  save.state.position={x:MARKET_ZONE.x+5,z:MARKET_ZONE.z+5};
  const {context,page}=await launch(mobile,'th',source,save),peer=[...host.realm.peers.values()].find(p=>p.uid===source.uid);Object.assign(peer.world.player,save.state.position);
  await page.locator('#menu-bag').evaluate(n=>n.click());await page.locator('#open-market-board').click();
  await page.locator('#market-board [data-tab=open]').click();
  const item=page.locator('#market-board li[data-id="hp-small"]');await item.locator('[type=checkbox]').check();await item.locator('.shop-count').fill('2');await item.locator('.shop-price').fill('10');await page.locator('#market-board #shop-title').fill('Layout test');
  await page.waitForTimeout(500);assert.equal(await page.locator('#market-board #shop-title').inputValue(),'Layout test');assert.equal(await item.locator('.shop-count').inputValue(),'2');assert.equal(await item.locator('[type=checkbox]').isChecked(),true);
  await page.locator('#shop-open').click();await page.locator('#market-board [data-tab=mine]').click();await page.locator('#market-board .market-stall').waitFor();
  assert.equal(peer.bag.items['hp-small'],6);await page.screenshot({path:fileURLToPath(new URL(mobile?'mine-mobile.png':'mine-desktop.png',out))});
  await page.locator('#market-board [data-tab=search]').click();await page.locator('#board-q').fill(ITEMS['hp-small'].name);await page.locator('#market-board .board-search button').click();await page.locator('#market-board [data-go]').first().waitFor();
  checks.push((mobile?'Mobile':'Desktop')+': real shop creation consumes escrow correctly, typing survives updates, mine/search show the listing');
  for(const [width,height]of mobile?[[844,390],[568,320],[390,844]]:[[1920,1080],[1440,900],[1024,768]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);await page.evaluate(()=>document.querySelector('#orientation-gate[open]')?.close());
   for(const tab of ['search','open','mine']){
    await page.locator('#market-board [data-tab='+tab+']').click();await page.waitForTimeout(60);await fit(page,width,height,tab);await page.locator('#board-body').evaluate(n=>n.scrollTop=0);
    if(tab==='open')await page.locator('#market-board .market-list').evaluate(n=>n.scrollTop=0);
    await page.screenshot({path:fileURLToPath(new URL('market-'+width+'-'+tab+'.png',out))});
   }
  }
  // Close the test sell shop, then verify the buying-store form still submits the same authoritative command.
  await page.locator('#market-board [data-tab=mine]').click();await page.locator('#market-board [data-a=shopClose]').click();await page.waitForFunction(()=>!document.querySelector('#market-board .market-stall'));assert.equal(peer.bag.items['hp-small'],8);
  await page.locator('#market-board [data-tab=open]').click();await page.locator('#market-board [data-kind=buy]').click();await page.locator('#market-board #shop-title').fill('Buy layout test');await page.locator('#want-item').fill(ITEMS['hp-small'].name);await page.locator('#want-count').fill('2');await page.locator('#want-price').fill('5');const coins=peer.bag.coins;
  await page.locator('#shop-open').click();await page.locator('#market-board [data-tab=mine]').click();await page.locator('#market-board .market-stall').waitFor();assert.equal(peer.bag.coins,coins-10);
  checks.push((mobile?'Mobile':'Desktop')+': original close/refund and buying-store escrow actions remain functional');await page.locator('#market-board [data-a=shopClose]').click();await page.waitForFunction(()=>!document.querySelector('#market-board .market-stall'));host.realm.setBag(peer,{coins:50000,slots:100,items:{}});await page.waitForFunction(()=>Object.keys(window.__ayothaya.game.world.bag?.items??{}).length===0);await page.locator('#market-board [data-tab=open]').click();await page.locator('#market-board [data-kind=sell]').click();const empty=await page.locator('#market-board .market-list>.empty').boundingBox(),body=await page.locator('#board-body').boundingBox();assert.ok(empty.width>body.width*.5);checks.push('Empty sell inventory retains a full-width readable message');await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{for(const socket of sockets)socket.terminate();await browser.close();await host.close();}process.exit(0);

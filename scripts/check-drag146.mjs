import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/drag146/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const store=await new LocalStore(fileURLToPath(new URL('store/',out))).init(),base='http://127.0.0.1:8926';
const host=await createHost({mode:'local',store,catalog,origins:[base],serveStatic:true});await new Promise(r=>host.server.listen(8926,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
try{
 const seeded=await store.createLocal({name:'ActionbarQA',gender:'male'}),record=store.rows.get(seeded.uid);
 record.character.classId='shaman';record.character.jobId='spirit-master';record.xpCurve=XP_CURVE;record.state.mapId='ayutthaya';record.state.traveler.baseXp=levelStart(59);record.skills={_tree84:Array(15).fill(0),_roles116:Array(15).fill(0),shaman:Array(15).fill(10)};
 record.bag={coins:2000,items:{'hp-small':8,'mp-small':8,'fly-wing':2,'return-incense':2}};record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{
  const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];
  route.onMessage(m=>socket.readyState===1?socket.send(m):pending.push(m));socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));
  socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));
 });
 await context.addInitScript(({record,token})=>{
  sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));
  sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
  localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));
 },{record,token:seeded.token});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});
 await page.waitForTimeout(1200);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();if(document.getElementById('dock-toggle')?.getAttribute('aria-expanded')==='true')document.getElementById('dock-toggle').click();});

 const checks=[];
 async function drag(source,target,ghostClass){
  const a=await source.boundingBox(),b=await target.boundingBox(),start={x:a.x+a.width/2,y:a.y+a.height/2},end={x:b.x+b.width/2,y:b.y+b.height/2};
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  for(const t of [.2,.5,1]){const point={x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};await page.mouse.move(point.x,point.y,{steps:4});await page.waitForTimeout(40);const ghost=await page.locator(ghostClass).boundingBox();await page.screenshot({path:fileURLToPath(new URL('drag-'+ghostClass.slice(1)+'-'+t+'.png',out))});assert.ok(ghost&&Math.hypot(ghost.x+ghost.width/2-point.x,ghost.y+ghost.height/2-point.y)<2,JSON.stringify({point,ghost}));assert.ok(await page.locator(ghostClass+' .item-icon,'+ghostClass+' strong').count());}
  await page.mouse.up();await page.waitForTimeout(150);assert.equal(await page.locator(ghostClass).count(),0);assert.ok(!await page.locator('#bag-discard').isVisible());
 }
 await page.keyboard.press('b');const before=await page.evaluate(()=>window.__ayothaya.game.world.bag.items['hp-small']);
 await drag(page.locator('#bag-grid [data-id="hp-small"]'),page.locator('.action-slot[data-index="0"]'),'.bag-drag');
 assert.deepEqual(await page.evaluate(()=>window.__ayothaya.game.actionBar.state.slots[0]),{kind:'item',id:'hp-small'});assert.equal(await page.evaluate(()=>window.__ayothaya.game.world.bag.items['hp-small']),before);checks.push('Bag icon follows native mouse at three points inside/outside the bag and assignment preserves inventory');
 const cancel=async(kind)=>{const r=await page.locator('#bag-grid [data-id="hp-small"]').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x-40,r.y+40,{steps:5});await page.locator('.bag-drag').waitFor();await page.evaluate(kind=>kind==='close'?document.getElementById('bag-window').close():dispatchEvent(new Event('blur')),kind);assert.equal(await page.locator('.bag-drag').count(),0);await page.mouse.up();assert.ok(!await page.locator('#bag-discard').isVisible());};
 await cancel('blur');await cancel('close');checks.push('Losing focus or closing the bag cancels the preview without discarding items');
 await drag(page.locator('.action-slot[data-index="0"]'),page.locator('.action-slot[data-index="2"]'),'.actionbar-ghost');assert.deepEqual(await page.evaluate(()=>window.__ayothaya.game.actionBar.state.slots[2]),{kind:'item',id:'hp-small'});checks.push('Slot-to-slot dragging still follows the mouse and reorders the shortcut');
 const fold=page.locator('#activity-fold'),party=await page.locator('#activity-party-tab').boundingBox(),r=await fold.boundingBox();assert.ok(r.width>=64&&r.height>=44&&r.y>=party.y+party.height,JSON.stringify({party,r}));assert.ok(await fold.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return n===hit||n.contains(hit);}));const art=await fold.evaluate(n=>{const s=getComputedStyle(n,'::before');return {width:s.width,height:s.height};});assert.deepEqual(art,{width:'64px',height:'44px'});const old=await fold.getAttribute('aria-expanded');await fold.click();assert.notEqual(await fold.getAttribute('aria-expanded'),old);await fold.click();assert.equal(await fold.getAttribute('aria-expanded'),old);await page.screenshot({path:fileURLToPath(new URL('fold-1440.png',out))});checks.push('64x44 desktop fold button sits below Party and toggles both ways');
 for(const [width,height]of [[1920,1080],[1440,900],[1280,720],[1024,768],[1280,600]]){await page.setViewportSize({width,height});await page.waitForTimeout(150);const r=await fold.boundingBox();assert.ok(!r||(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height),JSON.stringify({width,height,r}));}
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));await context.close();
}finally{await browser.close();await host.close();}process.exit(0);

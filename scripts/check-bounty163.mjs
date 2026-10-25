import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {WebSocket} from 'ws';
import {initialSave} from '../realm-state.js';
import {XP_CURVE} from '../experience.js';
import {cbtEntryKey} from '../cbt-event.js';
const out=new URL('../outputs/bounty163/',import.meta.url);await mkdir(out,{recursive:true});
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[],sockets=[];
let service;
try{
 if(!process.argv.includes('--game-only')){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8924/bounty-story-lab.html?rev=163');
 await page.waitForFunction(()=>document.querySelectorAll('article[data-art-state=ready]').length===14);
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:fileURLToPath(new URL('gallery.png',out)),fullPage:true});
 const ids=await page.locator('[data-target]').evaluateAll(nodes=>nodes.map(n=>n.dataset.target));
 for(const id of ids){
  await page.locator(`[data-target="${id}"] button`).click();
  await page.waitForFunction(id=>{const d=document.querySelector('#quest-cinematic');return d.open&&d.dataset.scene==='bounty:'+id&&d.dataset.artState==='ready';},id);
  const hashes=[];
  for(let shot=0;shot<3;shot++){
   assert.equal(await page.locator('#quest-cinematic').getAttribute('data-shot'),String(shot));
   await page.locator('.cinematic-stage').click({clickCount:2,delay:20});
   await page.waitForFunction(()=>document.querySelector('#quest-cinematic').dataset.textComplete==='true');
   hashes.push(await page.locator('.cinematic-stage canvas').evaluate(c=>{
    const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261;for(let i=0;i<a.length;i+=127)hash=Math.imul(hash^a[i],16777619);return hash;
   }));
   if(shot===0&&['hopper','vine','leader-camp'].includes(id))await page.screenshot({path:fileURLToPath(new URL(`scene-${id}.png`,out))});
   if(shot<2)await page.locator('.cinematic-stage').click();
  }
  assert.equal(new Set(hashes).size,3,id+' must render three distinct panels');
  assert.equal(await page.locator('#quest-cinematic header button').count(),1);
  await page.locator('#cinematic-skip').click();assert.equal(await page.locator('#quest-cinematic').evaluate(d=>d.open),false);
 }
 checks.push('All 14 targets load, reveal Thai text, render 3 distinct measured crops, and Skip immediately');
 // A contact sheet of the actual browser canvas crops makes scene-edge review practical.
 await page.evaluate(async()=>{
  const {BOUNTY_STORYBOARDS,bountyScene}=await import('./bounty-storyboards163.js?v=163');
  const sheet=document.createElement('div');sheet.id='contact';sheet.style='width:1250px;background:#102c23;padding:10px;display:grid;grid-template-columns:repeat(3,400px);gap:10px';
  for(const id of Object.keys(BOUNTY_STORYBOARDS)){
   const s=bountyScene({monster:id,leader:id==='leader-camp'}),img=new Image();img.src=s.art.src;await img.decode();
   for(let n=0;n<3;n++){
    const box=document.createElement('div'),label=document.createElement('div'),canvas=document.createElement('canvas');label.textContent=id+' · '+(n+1);canvas.width=400;canvas.height=200;canvas.getContext('2d').drawImage(img,...s.art.frames[n],0,0,400,200);box.append(label,canvas);sheet.append(box);
   }
  }
  document.body.replaceChildren(sheet);
 });
 await page.locator('#contact').screenshot({path:fileURLToPath(new URL('contact-sheet.png',out))});await context.close();
 }
 const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init();
 service=await createHost({mode:'local',store,catalog,origins,serveStatic:true});service.realm.now=()=>Date.UTC(2026,9,24,5);
 await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;origins.push(base);
 const seed=await store.createLocal({name:'Bounty Review',gender:'female'}),record=store.rows.get(seed.uid);record.xpCurve=XP_CURVE;record.state=initialSave();record.daily={day:'2026-10-24',streak:1};await store.flush();
 const real=await browser.newContext({viewport:{width:1440,height:900}});
 await real.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await real.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{
  const ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(ws);
  route.onMessage(m=>ws.readyState===1?ws.send(m):pending.push(m));ws.on('open',()=>pending.splice(0).forEach(m=>ws.send(m)));ws.on('message',m=>route.send(m.toString()));ws.on('error',()=>{});route.onClose(()=>ws.close());ws.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));
 });
 await real.addInitScript(({record,token,cbtKey})=>{
  sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem(cbtKey,'1');
  localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');
 },{record,token:seed.token,cbtKey:cbtEntryKey({owner:'guest',serverId:'server-1',slotId:'slot-1'})});
 const game=await real.newPage();game.on('pageerror',e=>errors.push(e.message));await game.goto(base+'/game.html?server=server-1&map=ayutthaya');
 await game.waitForFunction(()=>window.__ayothaya&&!document.querySelector('#journey-loading:not([hidden])'),null,{timeout:120000});
 await game.waitForFunction(()=>window.__ayothaya.game.online);await game.waitForTimeout(2000);
 await game.evaluate(()=>{Date.now=()=>Date.UTC(2026,9,24,5);for(const d of document.querySelectorAll('dialog[open]'))d.close();document.getElementById('menu-quests').click();});
 await game.locator('[data-qt=bounty]').click();
 const before=await game.evaluate(()=>JSON.stringify({story:window.__ayothaya.game.world.story,bounty:window.__ayothaya.game.world.bounty}));
 assert.equal(await game.locator('#quests-body .quest-watch').count(),4);
 for(const [w,h]of [[1920,1080],[1440,900],[1024,768],[844,390],[667,375],[568,320],[390,844]]){
  await game.setViewportSize({width:w,height:h});await game.waitForTimeout(250);
  await game.evaluate(()=>{if(!document.getElementById('quests-window').open)document.getElementById('menu-quests').click();});await game.locator('[data-qt=bounty]').click();await game.locator('#quests-body .quest-watch').first().waitFor({state:'visible'});
  const rows=await game.locator('#quests-body .social-list li').evaluateAll(nodes=>{
   const box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
   return nodes.map(n=>({small:box(n.querySelector('small')),watch:box(n.querySelector('.quest-watch')),claim:box(n.querySelector('[data-claim],.claimed')),row:box(n)}));
  });
  const overlaps=(a,b)=>a.x<b.x+b.w-.5&&a.x+a.w>b.x+.5&&a.y<b.y+b.h-.5&&a.y+a.h>b.y+.5;
  for(const row of rows){assert.ok(row.watch.w>0&&row.watch.h>=40,'Watch button must be visible and touchable');assert.ok(!overlaps(row.small,row.watch),JSON.stringify({w,h,row}));assert.ok(!overlaps(row.watch,row.claim),JSON.stringify({w,h,row}));assert.ok(row.watch.x>=row.row.x&&row.watch.x+row.watch.w<=row.row.x+row.row.w+1,JSON.stringify({w,h,row}));}
  if(!await game.locator('#quests-body').evaluate(n=>n.scrollWidth<=n.clientWidth+1)){
   await game.screenshot({path:fileURLToPath(new URL(`overflow-${w}.png`,out))});
   console.log(await game.locator('#quests-body').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth,nodes:[...n.querySelectorAll('*')].map(e=>({tag:e.tagName,cls:e.className,w:e.clientWidth,scroll:e.scrollWidth})).filter(e=>e.scroll>e.w+2)})));
   assert.fail(w+' body overflow');
  }
  if([1440,844,390].includes(w))await game.screenshot({path:fileURLToPath(new URL(`quest-rows-${w}.png`,out))});
  checks.push(`Real-game reward text, watch and claim controls do not overlap at ${w}x${h}`);
 }
 await game.setViewportSize({width:1440,height:900});
 for(const [i,target]of ['rat','vine','marsh-ape','leader-camp'].entries()){
  await game.locator('#quests-body .quest-watch').nth(i).click();
  await game.waitForFunction(target=>{const d=document.querySelector('#quest-cinematic');return d.open&&d.dataset.scene==='bounty:'+target&&d.dataset.artState==='ready';},target);
  await game.locator('#cinematic-skip').click();
 }
 const after=await game.evaluate(()=>JSON.stringify({story:window.__ayothaya.game.world.story,bounty:window.__ayothaya.game.world.bounty}));assert.equal(after,before);
 checks.push('The four current daily bounties dispatch the right monster/leader scene; viewing leaves story and bounty progress unchanged');
 await real.close();assert.deepEqual(errors,[]);await writeFile(new URL('report.json',out),JSON.stringify({ok:true,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks},null,2));
}finally{for(const s of sockets)s.close();await browser.close();await service?.close();}

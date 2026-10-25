import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {WebSocket} from 'ws';
import {initialSave} from '../realm-state.js';
import {XP_CURVE} from '../experience.js';
const out=new URL('../outputs/cbt162/',import.meta.url);await mkdir(out,{recursive:true});
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
let service;const sockets=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8924/cbt-event-lab.html');
 await page.locator('#cbt-event[open]').waitFor();await page.evaluate(()=>document.fonts.ready);
 assert.match(await page.locator('#cbt-event').innerText(),/วันสิ้นสุด: ยังไม่กำหนด/);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#cbt-event').evaluate(d=>d.open),false);
 await page.locator('#cbt-event-chip').click();await page.locator('#cbt-event[open]').waitFor();
 checks.push('Automatic popup, Escape close and right event-icon reopening');
 for(const [w,h]of [[1920,1080],[1440,900],[1024,768],[844,390],[667,375],[568,320],[390,844]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(100);
  const r=await page.locator('#cbt-event').boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=w+1&&r.y+r.height<=h+1,JSON.stringify({w,h,r}));
  assert.ok(await page.locator('#cbt-close').isVisible());assert.ok(await page.locator('#cbt-return').isVisible());
  await page.locator('button[data-cbt-tab=overview]').click();
  assert.equal(await page.locator('.cbt-poster img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
  if(w>h&&h<=550){const a=await page.locator('.cbt-poster').boundingBox(),b=await page.locator('#cbt-content>.cbt-note').boundingBox();assert.ok(b.y>=a.y+a.height,`${w} overview note must follow the poster`);}
  if(w===1440||w===844||w===390)await page.screenshot({path:fileURLToPath(new URL(`preview-${w}.png`,out))});
  for(const tab of ['rebirth','power','arena','ideas']){
   await page.locator(`button[data-cbt-tab=${tab}]`).click();
   assert.equal(await page.locator('#cbt-content').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,`${w} ${tab} overflows horizontally`);
   if(tab==='power'||tab==='arena'){
    assert.equal(await page.locator('[data-reward-rank="4–9"]').count(),1);
    assert.equal(await page.locator('[data-reward-rank="10"]').count(),0);
   }
   if(tab==='arena')assert.ok(await page.locator('.cbt-fairplay button').isDisabled());
  }
  checks.push(`Contained, scrollable preview and reward tabs ${w}x${h}`);
 }
 await page.reload();await page.waitForFunction(()=>window.__cbtLab);await page.waitForTimeout(900);
 assert.equal(await page.locator('#cbt-event').evaluate(d=>d.open),false);checks.push('Same-tab reload does not nag; icon remains available');
 // Other blocking panels must finish before the automatic activity opens.
 await page.evaluate(()=>{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k.startsWith('cbt-lab:'))sessionStorage.removeItem(k);}});
 await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const d=document.createElement('dialog');d.id='test-blocker';document.body.append(d);d.showModal();}));
 await page.reload();await page.waitForFunction(()=>window.__cbtLab);await page.waitForTimeout(900);assert.equal(await page.locator('#cbt-event').evaluate(d=>d.open),false);
 await page.locator('#test-blocker').evaluate(d=>d.close());await page.locator('#cbt-event[open]').waitFor();checks.push('Automatic popup waits behind an existing blocking dialog');await context.close();
 // Load the real game through a disposable local realm; no production data is touched.
 const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init();
 service=await createHost({mode:'local',store,catalog,origins,serveStatic:true});await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;origins.push(base);
 const seed=await store.createLocal({name:'CBT Preview',gender:'female'}),record=store.rows.get(seed.uid);record.xpCurve=XP_CURVE;record.state=initialSave();record.rebirth=4;record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};await store.flush();
 const real=await browser.newContext({viewport:{width:1440,height:900}});
 await real.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await real.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(ws);route.onMessage(m=>ws.readyState===1?ws.send(m):pending.push(m));ws.on('open',()=>pending.splice(0).forEach(m=>ws.send(m)));ws.on('message',m=>route.send(m.toString()));ws.on('error',()=>{});route.onClose(()=>ws.close());ws.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await real.addInitScript(({record,token})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record,token:seed.token});
 const game=await real.newPage();game.on('pageerror',e=>errors.push(e.message));await game.goto(base+'/game.html?server=server-1&map=ayutthaya');
 await game.waitForFunction(()=>window.__ayothaya&&!document.querySelector('#journey-loading:not([hidden])'),null,{timeout:120000});
 // Any pre-existing welcome/daily dialog is explicitly dismissed for this integration assertion.
 await game.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))if(d.id!=='cbt-event')d.close();});
 try{await game.locator('#cbt-event[open]').waitFor({timeout:15000});}catch(e){console.log(JSON.stringify({errors,debug:await game.evaluate(()=>({ready:!!document.getElementById('cbt-event'),actions:window.__ayothaya.game.canUseActions,online:window.__ayothaya.game.online,blocking:[...document.querySelectorAll('dialog[open],#account-panel[data-blocking="true"]')].map(n=>({id:n.id,text:n.textContent.slice(0,300)})),inert:document.getElementById('game-shell').inert,loading:document.getElementById('journey-loading').hidden}))}));await game.screenshot({path:fileURLToPath(new URL('game-failure.png',out))});throw e;}assert.equal(await game.locator('#hud-chips>#cbt-event-chip').count(),1);
 await game.screenshot({path:fileURLToPath(new URL('game-popup-desktop.png',out))});await game.locator('#cbt-close').click();
 await game.setViewportSize({width:844,height:390});await game.waitForTimeout(700);await game.locator('#cbt-event-chip').click();await game.locator('button[data-cbt-tab=rebirth]').click();assert.match(await game.locator('.cbt-progress').innerText(),/4 \/ 10/);await game.screenshot({path:fileURLToPath(new URL('game-popup-mobile.png',out))});
 await game.locator('#cbt-close').click();await game.screenshot({path:fileURLToPath(new URL('game-chip-mobile.png',out))});
 const icons=await game.locator('#hud-chips>button').evaluateAll(nodes=>nodes.filter(n=>!n.hidden).map(n=>{const r=n.getBoundingClientRect();return{id:n.id,x:r.x,y:r.y,w:r.width,h:r.height};}));
 assert.ok(icons.some(i=>i.id==='cbt-event-chip'&&i.w>0));
 for(let i=0;i<icons.length;i++)for(let j=i+1;j<icons.length;j++){const a=icons[i],b=icons[j];assert.ok(!(a.x<b.x+b.w-1&&a.x+a.w>b.x+1&&a.y<b.y+b.h-1&&a.y+a.h>b.y+1),JSON.stringify({overlap:[a,b]}));}
 checks.push('Real game boot, authority-owned rebirth progress, event rail placement and mobile nonoverlapping icons');await real.close();
 assert.deepEqual(errors,[]);await writeFile(new URL('report.json',out),JSON.stringify({ok:true,checks,errors,icons},null,2));console.log(JSON.stringify({ok:true,checks},null,2));
}finally{for(const s of sockets)s.close();await browser.close();await service?.close();}

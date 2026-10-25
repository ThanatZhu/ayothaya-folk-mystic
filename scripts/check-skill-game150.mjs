// Real game integration, isolated account/server; never touches production saves.
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {XP_CURVE} from '../experience.js';
const out=new URL('../outputs/skill150/',import.meta.url);await mkdir(out,{recursive:true});const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),origins=[],service=await createHost({mode:'local',store,catalog,origins,serveStatic:true});await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
try{
 const seeded=await store.createLocal({name:'FrameReview',gender:'male'}),record=store.rows.get(seeded.uid);record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};record.xpCurve=XP_CURVE;record.story={v:3,quest:0,step:0,count:0,done:false};record.bag={coins:1234,items:{}};record.state={...initialSave(),mapId:'ayutthaya',position:{...catalog.maps.find(m=>m.id==='ayutthaya').spawn}};
 const context=await browser.newContext({viewport:{width:1440,height:900}});await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),queue=[];route.onMessage(m=>socket.readyState===1?socket.send(m):queue.push(m));socket.on('open',()=>queue.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record,token:seeded.token});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});await page.locator('#menu-skills').evaluate(el=>el.click());await page.waitForFunction(()=>document.querySelector('link[data-skill-tree]')?.sheet);await page.waitForTimeout(300);
 for(const [width,height] of [[1440,900],[1024,768],[844,390],[667,375]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(180);await page.evaluate(()=>document.getElementById('orientation-gate')?.close());
  for(const tab of ['base','master']){
   await page.locator('#skill-window [data-tab='+tab+']').click();await page.waitForTimeout(80);
   const fit=await page.locator('#skill-window').evaluate(d=>{const r=d.getBoundingClientRect(),s=getComputedStyle(d),c=d.querySelector('#skill-close').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,scroll:d.scrollHeight-d.clientHeight,padding:s.padding,frame:getComputedStyle(d,'::before').borderImageSource,closeVisible:c.bottom<=innerHeight};});assert.ok(fit.x>=-1&&fit.y>=-1&&fit.right<=width+1&&fit.bottom<=height+1&&fit.scroll<2&&fit.closeVisible,JSON.stringify(fit));assert.ok(fit.frame.includes('ui-skill150/window.webp'));assert.notEqual(fit.padding,'0px');checks.push({width,height,tab,fit});await page.screenshot({path:fileURLToPath(new URL('game-'+width+'-'+tab+'.png',out))});
  }
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('game-checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,errors}));await context.close();
}finally{await browser.close();await service.close();}

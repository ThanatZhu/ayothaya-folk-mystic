import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {XP_CURVE} from '../experience.js';
import {cbtEntryKey} from '../cbt-event.js';
const out=new URL('../outputs/bridge164/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),map=catalog.maps.find(m=>m.id==='lotus-marsh');
// Keep the production collision grid and bridge geometry; remove combat from this disposable walking realm.
map.mobs=[];map.safe=true;map.npcs=[];
const start={x:-7.662980499118266,z:48.423674683134365},goal={x:-24.262980499118264,z:34.33367468313436};
const store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),origins=[];
const service=await createHost({mode:'local',store,catalog,origins,serveStatic:true});await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),sockets=[],errors=[],checks=[];
try{
 const seed=await store.createLocal({name:'Bridge Review',gender:'male'}),record=store.rows.get(seed.uid);
 record.xpCurve=XP_CURVE;record.state={...initialSave(),mapId:map.id,position:start};record.daily={day:new Date(Date.now()+7*3600e3).toISOString().slice(0,10),streak:1};await store.flush();
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{
  const ws=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),queue=[];sockets.push(ws);route.onMessage(m=>ws.readyState===1?ws.send(m):queue.push(m));ws.on('open',()=>queue.splice(0).forEach(m=>ws.send(m)));ws.on('message',m=>route.send(m.toString()));ws.on('error',()=>{});route.onClose(()=>ws.close());ws.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));
 });
 await context.addInitScript(({record,token,cbtKey})=>{
  sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem(cbtKey,'1');
  localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');
 },{record,token:seed.token,cbtKey:cbtEntryKey({owner:'guest',serverId:'server-1',slotId:'slot-1'})});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=lotus-marsh');
 await page.waitForFunction(()=>window.__ayothaya?.game.online&&document.getElementById('journey-loading').hidden,null,{timeout:120000});await page.waitForTimeout(1800);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 const peer=[...service.realm.peers.values()].find(p=>p.uid===seed.uid);assert.ok(Math.hypot(peer.world.player.x-start.x,peer.world.player.z-start.z)<.2);
 await page.screenshot({path:fileURLToPath(new URL('start.png',out))});
 for(const [index,target]of [goal,start].entries()){
  assert.equal(await page.evaluate(target=>window.__ayothaya.game.walkTo(target,{kind:'ground'}),target),true);
  for(let i=0;i<30&&peer.walkRoute?.status!=='walking';i++)await page.waitForTimeout(50);
  assert.equal(peer.walkRoute.status,'walking');await page.waitForTimeout(2200);
  await page.screenshot({path:fileURLToPath(new URL(`bridge-${index}.png`,out))});
  for(let i=0;i<180&&peer.walkRoute.status==='walking';i++)await page.waitForTimeout(100);
  assert.equal(peer.walkRoute.status,'arrived');assert.ok(Math.hypot(peer.world.player.x-target.x,peer.world.player.z-target.z)<.2);
  await page.waitForTimeout(500);const player=await page.evaluate(()=>{const p=window.__ayothaya.game.world.player;return{x:p.x,z:p.z};});
  assert.ok(Math.hypot(player.x-target.x,player.z-target.z)<.7);checks.push({direction:index?'return':'outbound',server:{x:peer.world.player.x,z:peer.world.player.z},client:player,status:peer.walkRoute.status});
 }
 await page.screenshot({path:fileURLToPath(new URL('returned.png',out))});assert.deepEqual(errors,[]);
 await writeFile(new URL('browser-report.json',out),JSON.stringify({ok:true,map:map.id,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks,errors},null,2));await context.close();
}finally{for(const ws of sockets)ws.close();await browser.close();await service.close();}
